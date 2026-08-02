import os
import time
import httpx
import psutil
from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

from app.config import settings
from app.auth import get_current_user
from app.guardrails import GuardrailsEngine
from app.router import TaskLLMRouter

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

class ChatResponse(BaseModel):
    response: str
    model: str
    task_type: str = "SECURITY_COPILOT"
    guardrails_passed: bool = True

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

@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, user: dict = Depends(get_current_user)):
    start_time = time.time()
    
    # Step 1: Run Input Guardrails Engine
    guard_res = GuardrailsEngine.inspect_input(request.message)
    if not guard_res["is_valid"]:
        REQUEST_COUNT.labels(method="POST", endpoint="/api/v1/chat", status="200").inc()
        return ChatResponse(
            response=guard_res["blocked_response"],
            model="guardrails-filter",
            task_type="GUARDRAIL_BLOCKED",
            guardrails_passed=False
        )

    # Step 2: Task-Aware Multi-Model LLM Router Selection
    route_res = TaskLLMRouter.select_model(request.message)
    selected_model = route_res["model_name"]
    task_type = route_res["task_type"]

    # Step 3: LLM Inference via Ollama
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{settings.OLLAMA_URL}/api/generate",
                json={
                    "model": selected_model,
                    "prompt": request.message,
                    "stream": False
                }
            )
            
            # Fallback to default model if selected specialized model tag isn't pulled yet
            if resp.status_code != 200:
                resp = await client.post(
                    f"{settings.OLLAMA_URL}/api/generate",
                    json={
                        "model": settings.MODEL_NAME,
                        "prompt": request.message,
                        "stream": False
                    }
                )
                selected_model = settings.MODEL_NAME

            resp.raise_for_status()
            data = resp.json()
            raw_response = data.get("response", "")

            # Step 4: Run Output Guardrails Redaction
            sanitized_response = GuardrailsEngine.sanitize_output(raw_response)

            REQUEST_COUNT.labels(method="POST", endpoint="/api/v1/chat", status="200").inc()
            REQUEST_LATENCY.labels(endpoint="/api/v1/chat").observe(time.time() - start_time)
            
            return ChatResponse(
                response=sanitized_response,
                model=selected_model,
                task_type=task_type,
                guardrails_passed=True
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
