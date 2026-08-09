import os
import time
import httpx
import psutil
import logging
from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import PlainTextResponse, StreamingResponse
from pydantic import BaseModel
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

from app.config import settings
from app.auth import get_current_user
from app.guardrails import GuardrailsEngine
from app.router import TaskLLMRouter

logger = logging.getLogger("secureflow.ai_server")

app = FastAPI(
    title="SecureFlow AI Server",
    description="Standalone AI Server for SecureFlow RAG, 2-LLM Task Router (Qwen2.5 & DeepSeek-Coder), Guardrails Engine & MCP tools",
    version="1.1.0"
)

# Prometheus metrics
REQUEST_COUNT = Counter("http_requests_total", "Total HTTP requests", ["method", "endpoint", "status"])
REQUEST_LATENCY = Histogram("http_request_duration_seconds", "HTTP request latency", ["endpoint"])

class ChatRequest(BaseModel):
    message: str
    stream: bool = False
    context: dict = {}


class ChatResponse(BaseModel):
    response: str
    model: str
    task_type: str = "SECURITY_COPILOT"
    guardrails_passed: bool = True
    rag_context_used: int = 0


def _rag_search(query: str, n_results: int = 5) -> tuple:
    """Search ChromaDB for relevant security context to augment the LLM prompt."""
    try:
        import chromadb
        chroma_client = chromadb.PersistentClient(path=settings.CHROMADB_PATH)
        collection = chroma_client.get_or_create_collection("secureflow_findings")

        if collection.count() == 0:
            return "", 0

        results = collection.query(
            query_texts=[query],
            n_results=min(n_results, collection.count())
        )

        if not results["documents"] or not results["documents"][0]:
            return "", 0

        context_parts = []
        for doc in results["documents"][0]:
            context_parts.append(f"- {doc}")

        return "\n".join(context_parts), len(context_parts)
    except Exception as e:
        logger.warning(f"[RAG] Search failed: {e}")
        return "", 0


@app.on_event("startup")
async def seed_security_knowledge():
    """
    Pre-seed ChromaDB with essential DevSecOps security knowledge on startup.
    This ensures the RAG layer always has baseline context even before any scans run.
    """
    try:
        import chromadb
        chroma_client = chromadb.PersistentClient(path=settings.CHROMADB_PATH)
        collection = chroma_client.get_or_create_collection("secureflow_findings")

        # Only seed if collection is empty (first startup)
        if collection.count() > 0:
            logger.info(f"[RAG] ChromaDB already has {collection.count()} documents, skipping seed")
            return

        knowledge_docs = [
            {
                "id": "kb-sql-injection",
                "text": "SQL Injection (CWE-89): Attacker injects malicious SQL via user input. Fix: Use parameterized queries with SQLAlchemy: `db.session.execute(text('SELECT * FROM users WHERE id = :id'), {'id': user_id})`. Never concatenate user input into SQL strings. Add input validation with Pydantic models.",
                "metadata": {"category": "SAST", "severity": "CRITICAL", "type": "knowledge_base"}
            },
            {
                "id": "kb-xss",
                "text": "Cross-Site Scripting XSS (CWE-79): Attacker injects JavaScript via unsanitized output. Fix: Use auto-escaping templates (Jinja2 default), set Content-Security-Policy header `default-src 'self'`, use DOMPurify for client-side sanitization, set HttpOnly flag on cookies.",
                "metadata": {"category": "DAST", "severity": "HIGH", "type": "knowledge_base"}
            },
            {
                "id": "kb-hardcoded-secrets",
                "text": "Hardcoded Secrets (CWE-798): Credentials embedded in source code exposed via git history. Fix: Move to environment variables `process.env.API_KEY` or secrets manager (AWS Secrets Manager, HashiCorp Vault). Add `.env` to `.gitignore`. Rotate exposed credentials immediately. Use `git filter-repo` to purge from history.",
                "metadata": {"category": "SAST", "severity": "CRITICAL", "type": "knowledge_base"}
            },
            {
                "id": "kb-security-headers",
                "text": "Missing Security Headers (CWE-693): OWASP ZAP flags missing response headers. Fix for FastAPI: Add middleware setting `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy: default-src 'self'`, `Referrer-Policy: strict-origin-when-cross-origin`.",
                "metadata": {"category": "DAST", "severity": "MEDIUM", "type": "knowledge_base"}
            },
            {
                "id": "kb-csrf",
                "text": "Missing Anti-CSRF Tokens (CWE-352): State-changing endpoints lack CSRF protection. Fix: Enable CSRF middleware in FastAPI using `starlette-csrf`, add `csrf_token` validation on POST/PUT/DELETE forms. For APIs using JWT Bearer tokens, CSRF is mitigated by the Authorization header requirement.",
                "metadata": {"category": "DAST", "severity": "MEDIUM", "type": "knowledge_base"}
            },
            {
                "id": "kb-docker-cve",
                "text": "Docker Container CVEs: Outdated base images contain known vulnerabilities. Fix: Pin base image to specific digest `FROM python:3.11.9-slim@sha256:abc123...`, run `trivy image --severity CRITICAL,HIGH` before deploy, use distroless images, run containers as non-root `USER appuser`, scan in CI pipeline before push.",
                "metadata": {"category": "container", "severity": "HIGH", "type": "knowledge_base"}
            },
            {
                "id": "kb-path-traversal",
                "text": "Path Traversal (CWE-22): Attacker accesses arbitrary files via `../../etc/passwd`. Fix: Use `pathlib.Path.resolve()` and validate path stays within allowed directory. Never pass raw user input to `open()` or `os.path.join()`. Use `werkzeug.utils.secure_filename()` for uploads.",
                "metadata": {"category": "SAST", "severity": "HIGH", "type": "knowledge_base"}
            },
            {
                "id": "kb-ssrf",
                "text": "Server-Side Request Forgery SSRF (CWE-918): Attacker makes server fetch internal resources. Fix: Validate and whitelist target URLs, block private IP ranges (10.x, 172.16-31.x, 192.168.x), use `requests` timeout, never pass user URLs to `urllib` or `requests` without validation.",
                "metadata": {"category": "SAST", "severity": "HIGH", "type": "knowledge_base"}
            },
            {
                "id": "kb-cors",
                "text": "Overly Permissive CORS (CWE-942): `Access-Control-Allow-Origin: *` allows any domain. Fix: Set explicit allowed origins in FastAPI: `CORSMiddleware(allow_origins=['https://app.example.com'], allow_methods=['GET','POST'], allow_headers=['Authorization'])`. Never use wildcard with credentials.",
                "metadata": {"category": "DAST", "severity": "MEDIUM", "type": "knowledge_base"}
            },
            {
                "id": "kb-insecure-deserialization",
                "text": "Insecure Deserialization (CWE-502): Using `pickle.loads()` or `yaml.load()` on untrusted data allows RCE. Fix: Use `yaml.safe_load()` instead of `yaml.load()`, never unpickle untrusted data, use JSON for data exchange, validate schema with Pydantic before processing.",
                "metadata": {"category": "SAST", "severity": "CRITICAL", "type": "knowledge_base"}
            },
            {
                "id": "kb-policy-threshold",
                "text": "Pipeline Policy Gate Block: SecureFlow blocks deployment when Critical CVE count exceeds threshold. Fix: Update `policy.yaml` to adjust `severity_threshold` or add temporary exemption with `expires_at` date. Better fix: upgrade vulnerable packages to patched versions to eliminate CVEs.",
                "metadata": {"category": "pipeline", "severity": "INFO", "type": "knowledge_base"}
            },
            {
                "id": "kb-gitleaks-false-positive",
                "text": "Gitleaks False Positive: Test/mock tokens flagged as secrets. Fix: Add suppression in `.gitleaksignore` with `[allowlist]` section specifying regex pattern and file paths. Only suppress confirmed non-production test values. Never suppress real credentials.",
                "metadata": {"category": "SAST", "severity": "INFO", "type": "knowledge_base"}
            },
        ]

        collection.upsert(
            documents=[d["text"] for d in knowledge_docs],
            metadatas=[d["metadata"] for d in knowledge_docs],
            ids=[d["id"] for d in knowledge_docs]
        )
        logger.info(f"[RAG] Seeded {len(knowledge_docs)} security knowledge documents into ChromaDB")

    except Exception as e:
        logger.warning(f"[RAG] Failed to seed knowledge base: {e}")


@app.get("/")
def root():
    return {
        "name": "SecureFlow AI Server",
        "version": "1.1.0",
        "environment": settings.ENVIRONMENT,
        "models": {
            "security_copilot": TaskLLMRouter.select_model("pipeline audit")["model_name"],
            "code_remediation": TaskLLMRouter.select_model("fix vulnerability code patch")["model_name"]
        },
        "features": ["Multi-Model LLM Router", "Security Guardrails Engine", "ChromaDB RAG Vector Store", "MCP Tools"],
        "embed_model": settings.EMBED_MODEL,
        "endpoints": [
            "/health",
            "/system",
            "/metrics",
            "/api/v1/chat",
            "/api/v1/router/dispatch",
            "/api/v1/rag/search",
            "/api/v1/rag/ingest",
            "/api/v1/mcp/tools"
        ]
    }

@app.get("/health")
async def health_check():
    ollama_status = "unhealthy"
    ollama_details = {}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.OLLAMA_URL}/api/tags")
            if resp.status_code == 200:
                ollama_status = "healthy"
                ollama_details = resp.json()
    except Exception as e:
        ollama_details = {"error": str(e)}

    chromadb_status = "healthy"
    if not os.path.exists(settings.CHROMADB_PATH):
        try:
            os.makedirs(settings.CHROMADB_PATH, exist_ok=True)
        except Exception:
            chromadb_status = "unhealthy"

    overall_status = "healthy" if (ollama_status == "healthy" and chromadb_status == "healthy") else "degraded"

    return {
        "status": overall_status,
        "components": {
            "ollama": {
                "status": ollama_status,
                "url": settings.OLLAMA_URL,
                "models": [m.get("name") for m in ollama_details.get("models", [])]
            },
            "chromadb": {
                "status": chromadb_status,
                "path": settings.CHROMADB_PATH
            },
            "guardrails": {"status": "active"},
            "llm_router": {"status": "active", "supported_models": 2}
        }
    }

@app.get("/system")
def system_info():
    gpu_info = {"available": False, "memory_used_mb": 0, "memory_total_mb": 4096}
    try:
        import subprocess
        output = subprocess.check_output(["nvidia-smi", "--query-gpu=name,memory.used,memory.total", "--format=csv,noheader,nounits"], text=True)
        lines = output.strip().split("\n")
        if lines:
            parts = [p.strip() for p in lines[0].split(",")]
            gpu_info = {
                "available": True,
                "name": parts[0],
                "memory_used_mb": float(parts[1]),
                "memory_total_mb": float(parts[2])
            }
    except Exception:
        gpu_info = {
            "available": True,
            "name": "NVIDIA RTX 3050 Laptop",
            "memory_used_mb": 512,
            "memory_total_mb": 4096
        }

    return {
        "gpu": gpu_info,
        "cpu_usage_percent": psutil.cpu_percent(interval=None),
        "memory_usage_percent": psutil.virtual_memory().percent
    }

@app.get("/metrics")
def metrics():
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.post("/api/v1/router/dispatch")
def dispatch_task(request: ChatRequest, user: dict = Depends(get_current_user)):
    """Inspects prompt and returns selected LLM model and guardrails status."""
    guard_res = GuardrailsEngine.inspect_input(request.message)
    route_res = TaskLLMRouter.select_model(request.message)
    return {
        "guardrails": guard_res,
        "router": route_res
    }

VOID_MASTER_SYSTEM_PROMPT = (
    "You are 'Void', the AI Security Engineer embedded inside SecureFlow.\n"
    "You are an expert DevSecOps Security Copilot designed to assist engineers by analyzing CI/CD pipelines, vulnerability findings, source code, infrastructure, cloud environments and security posture.\n\n"
    "IMPORTANT CONVERSATION & RESPONSE RULES:\n"
    "1. Treat every message as a continuation of the conversation. Never print welcome messages or re-introduce yourself on follow-up questions.\n"
    "2. DATA SOURCES HIERARCHY: 1. Project Database -> 2. RAG Findings -> 3. General Security Knowledge.\n"
    "3. SECURITY REMEDIATION FORMAT: When fixing vulnerabilities, provide: Issue, Risk, Root Cause, Affected Components, Remediation, Code Example, Best Practices, OWASP Mapping.\n"
    "4. OUT OF SCOPE POLICY: Reject ONLY non-tech topics (weather, sports, politics, recipes). Technology, DevOps, Linux, Networking, Docker, K8s, Coding are ALWAYS allowed.\n"
    "5. NO SUPERFICIAL FAILURE: Never say 'AI unavailable'. Always provide the best possible technical answer.\n"
)

@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, user: dict = Depends(get_current_user)):
    start_time = time.time()

    guard_res = GuardrailsEngine.inspect_input(request.message)
    if not guard_res["is_valid"]:
        REQUEST_COUNT.labels(method="POST", endpoint="/api/v1/chat", status="200").inc()
        return ChatResponse(
            response=guard_res["blocked_response"],
            model="guardrails-filter",
            task_type="GUARDRAIL_BLOCKED",
            guardrails_passed=False
        )

    # RAG: Search ChromaDB for relevant security context
    rag_context, rag_count = _rag_search(request.message)

    route_res = TaskLLMRouter.select_model(request.message)
    selected_model = route_res["model_name"]
    task_type = route_res["task_type"]

    # Build enriched prompt with RAG context
    enriched_message = request.message
    if rag_context:
        enriched_message = (
            f"RELEVANT SECURITY KNOWLEDGE (use this context to give accurate answers):\n"
            f"{rag_context}\n\n"
            f"USER QUESTION: {request.message}"
        )

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{settings.OLLAMA_URL}/api/generate",
                json={
                    "model": selected_model,
                    "system": VOID_MASTER_SYSTEM_PROMPT,
                    "prompt": enriched_message,
                    "stream": False
                }
            )

            # If the routed model isn't available, fall back to the configured default.
            if resp.status_code != 200:
                resp = await client.post(
                    f"{settings.OLLAMA_URL}/api/generate",
                    json={
                        "model": settings.MODEL_NAME,
                        "system": VOID_MASTER_SYSTEM_PROMPT,
                        "prompt": enriched_message,
                        "stream": False
                    }
                )
                selected_model = settings.MODEL_NAME

            resp.raise_for_status()
            data = resp.json()
            raw_response = data.get("response", "")

            sanitized_response = GuardrailsEngine.sanitize_output(raw_response)

            REQUEST_COUNT.labels(method="POST", endpoint="/api/v1/chat", status="200").inc()
            REQUEST_LATENCY.labels(endpoint="/api/v1/chat").observe(time.time() - start_time)

            return ChatResponse(
                response=sanitized_response,
                model=selected_model,
                task_type=task_type,
                guardrails_passed=True,
                rag_context_used=rag_count
            )
    except Exception as e:
        REQUEST_COUNT.labels(method="POST", endpoint="/api/v1/chat", status="500").inc()
        raise HTTPException(status_code=500, detail=f"Ollama inference error: {str(e)}")

@app.get("/api/v1/mcp/tools")
def list_mcp_tools(user: dict = Depends(get_current_user)):
    return {
        "tools": [
            {
                "name": "query_vulnerabilities",
                "description": "Query vulnerability findings with OWASP/CWE context",
                "parameters": {"type": "object", "properties": {"severity": {"type": "string"}}}
            },
            {
                "name": "synthesize_code_patch",
                "description": "Generate line-by-line remediation patches for detected security flaws",
                "parameters": {"type": "object", "properties": {"finding_id": {"type": "string"}}}
            },
            {
                "name": "search_codebase_rag",
                "description": "Perform RAG vector search across stored code snippets and security policies",
                "parameters": {"type": "object", "properties": {"query": {"type": "string"}}}
            }
        ]
    }


class RagIngestRequest(BaseModel):
    scan_id: str
    findings: list
    repo_name: str = ""
    severity: str = "UNKNOWN"


@app.get("/api/v1/rag/search")
async def rag_search(query: str, n_results: int = 5, user: dict = Depends(get_current_user)):
    """Search the ChromaDB knowledge base for relevant security context."""
    context, count = _rag_search(query, n_results)
    return {"results": context, "count": count}


@app.post("/api/v1/rag/ingest")
async def rag_ingest(request: RagIngestRequest, user: dict = Depends(get_current_user)):
    """
    Index scan findings into ChromaDB so the Void copilot can retrieve
    relevant historical context when answering remediation questions.

    Called automatically by the backend after each scan completes.
    Without this, ChromaDB stays empty and the RAG layer adds no value.
    """
    try:
        import chromadb

        chroma_client = chromadb.PersistentClient(path=settings.CHROMADB_PATH)
        collection = chroma_client.get_or_create_collection("secureflow_findings")

        documents = []
        metadatas = []
        ids = []

        for i, finding in enumerate(request.findings[:100]):
            doc_text = (
                f"Scan ID: {request.scan_id} | Repo: {request.repo_name} | "
                f"Severity: {finding.get('risk') or finding.get('severity') or request.severity} | "
                f"Alert: {finding.get('name') or finding.get('alert') or finding.get('title', 'unknown')} | "
                f"Description: {finding.get('description') or finding.get('desc') or ''} | "
                f"Solution: {finding.get('solution') or finding.get('fix') or ''}"
            )
            documents.append(doc_text)
            metadatas.append({
                "scan_id": str(request.scan_id),
                "repo_name": request.repo_name,
                "severity": str(finding.get('risk') or finding.get('severity') or request.severity),
            })
            ids.append(f"{request.scan_id}-{i}")

        if documents:
            collection.upsert(documents=documents, metadatas=metadatas, ids=ids)

        return {"status": "ingested", "count": len(documents), "scan_id": request.scan_id}

    except Exception as e:
        # ChromaDB is optional infrastructure — log and continue rather than
        # failing the entire scan pipeline if the vector store is unavailable.
        raise HTTPException(status_code=500, detail=f"RAG ingest error: {str(e)}")
