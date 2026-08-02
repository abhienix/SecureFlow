# SecureFlow

**AI-Powered DevSecOps Security Orchestration Platform**

[![CI/CD Pipeline](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue?logo=github-actions)](https://github.com/abhienix/SecureFlow/actions)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.12-009688?logo=python)](backend/)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript-61DAFB?logo=react)](frontend/)
[![AI](https://img.shields.io/badge/AI-Ollama%20%7C%20Qwen2.5%20%7C%20ChromaDB-76B900?logo=nvidia)](ai-server/)
[![DAST](https://img.shields.io/badge/DAST-OWASP%20ZAP%20%7C%20Celery-FF6F00?logo=owasp)](worker/)

---

## What Is SecureFlow?

SecureFlow is a full-stack security orchestration platform that automates vulnerability scanning across every stage of a CI/CD pipeline — from secret detection on commit to dynamic API testing on staging — and surfaces results on a real-time dashboard with an AI copilot for remediation guidance.

It runs four security scanners (**Gitleaks**, **Semgrep**, **Trivy**, **OWASP ZAP**) inside a GitHub Actions workflow, evaluates findings against a YAML policy engine with CVSS thresholds and CVE allowlisting, and blocks deployments when critical issues are found. A local GPU AI server powers the **Void AI** copilot — a security-focused assistant that explains findings and generates code patches without sending source code to external APIs.

---

## Architecture

SecureFlow operates across eight layers:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Developer ──► git push ──► GitHub Actions (9-stage pipeline)       │
│                                                                     │
│  ┌─ Static Analysis ─┐  ┌─ Container ──┐  ┌─ Policy ──┐  ┌─ DAST ─┐│
│  │ Gitleaks + Semgrep│  │ Docker+Trivy │  │ Gate Eval │  │ ZAP    ││
│  └───────────────────┘  └──────────────┘  └───────────┘  └────────┘│
└────────────────────────────────┬────────────────────────────────────┘
                                 │ HTTP telemetry
┌────────────────────────────────▼────────────────────────────────────┐
│  FastAPI Backend (API Gateway)                                      │
│  ├─ Pipeline State Machine (9 stages, strict transitions)           │
│  ├─ Policy Engine (severity + CVSS blocking, CVE allowlisting)      │
│  ├─ WebSocket Manager (Redis pub/sub, <15ms broadcast)             │
│  ├─ AI Analysis Module (Void copilot, scan analysis, fallback)      │
│  ├─ Celery Producer (DAST task dispatch to Redis queue)             │
│  └─ SQLAlchemy ORM (PostgreSQL / SQLite, 12+ tables)               │
├─────────────────────────────────────────────────────────────────────┤
│  React 19 Dashboard              │  Local GPU AI Server (Machine B) │
│  ├─ Overview (metrics, charts)   │  ├─ FastAPI Gateway (:8100)     │
│  ├─ Pipeline Timeline            │  ├─ Ollama (Qwen2.5:3b)         │
│  ├─ Security Center (findings)   │  ├─ DeepSeek-coder:6.7b         │
│  ├─ Deployments (rollback)       │  ├─ ChromaDB (RAG vectors)      │
│  ├─ Observability (topology)     │  ├─ Model Router                │
│  ├─ Policy Editor (live YAML)    │  ├─ Guardrails Engine           │
│  ├─ Void AI Copilot (streaming)  │  └─ JWT Authentication          │
│  └─ Settings & Notifications     │                                  │
├──────────────────────────────────┼──────────────────────────────────┤
│  Celery Worker Node              │  Data Layer                      │
│  ├─ Redis Task Consumer          │  ├─ PostgreSQL (production)      │
│  ├─ Docker-based ZAP Scanner     │  ├─ SQLite (local dev)           │
│  └─ Result Parser + Callback     │  ├─ Redis (pub/sub + queue)      │
└──────────────────────────────────┘  └─ ChromaDB (vector store)      │
                                      └──────────────────────────────┘
```

---

## Pipeline Stages

Every commit triggers a 9-stage pipeline executed by GitHub Actions. The backend tracks each stage as a finite state machine with strict transitions: `WAITING → RUNNING → {PASSED | FAILED | BLOCKED | SKIPPED | CANCELLED}`.

| # | Stage | Scanner / Action | What It Catches |
|---|-------|-----------------|-----------------|
| 1 | **Checkout** | Git clone | — |
| 2 | **Code Scan** | Gitleaks + Semgrep | Leaked secrets, API keys, tokens, OWASP Top 10 code patterns |
| 3 | **Docker Build** | Multi-stage Dockerfile build | Build failures, missing dependencies |
| 4 | **Trivy CVE** | Trivy container scan | Known CVEs in base images and OS packages |
| 5 | **Policy Gate** | Policy engine evaluation | Severity/CVSS threshold violations, unexpired allowlist checks |
| 6 | **Deploy Staging** | Google Cloud Run deploy | Deployment failures |
| 7 | **OWASP ZAP** | Celery worker → ZAP container | XSS, SQLi, missing headers, CSRF on live staging endpoints |
| 8 | **ZAP Gate** | Policy evaluation on DAST results | Dynamic security alerts from ZAP findings |
| 9 | **Deploy Prod** | Google Cloud Run deploy | — |

Failed or blocked stages cascade — downstream stages are automatically marked `SKIPPED`. The pipeline supports concurrency control (cancel-in-progress), retry logic (3 attempts for Gitleaks install), and change detection (only rebuilds when relevant files change).

---

## Policy Engine

The policy engine (`policy.yaml`) enforces security gates before code reaches production:

- **Severity-based blocking**: Default blocks `CRITICAL` + `HIGH`, warns on `MEDIUM`. Per-repo overrides available (e.g., SecureFlow itself relaxes to block `CRITICAL` only with CVSS threshold 9.8).
- **CVSS threshold**: Secondary block trigger — a `MEDIUM` CVE with a CVSS score above the threshold still blocks the pipeline.
- **CVE allowlisting**: Individual CVEs can be exempted with a reason and expiry date. Expired allowlist entries automatically revert to normal evaluation.
- **Multi-scanner evaluation**: ZAP findings → immediate `BLOCK`. Gitleaks findings → immediate `BLOCK`. Semgrep findings → immediate `BLOCK`. Trivy findings → evaluated against severity/CVSS policy.
- **Slack notifications**: Triggered on `BLOCK` actions only.

---

## Void AI Copilot

Void is a security-focused AI assistant that runs **100% locally** on a dedicated GPU machine (Machine B). No source code is sent to external AI providers.

**Architecture:**
- **Ollama** hosts `Qwen2.5:3b` (security reasoning) and `nomic-embed-text` (vector embeddings)
- **ChromaDB** provides RAG (Retrieval-Augmented Generation) over security findings and policy documents
- **Model Router** directs queries to `Qwen2.5:3b` for security analysis or `DeepSeek-coder:6.7b` for code remediation based on prompt intent classification
- **Guardrails Engine** validates prompts against off-topic terms and prompt injection patterns; sanitizes outputs by redacting secrets (GitHub tokens, AWS keys, JWTs, Slack tokens)
- **JWT Authentication** secures the AI server gateway

**Capabilities:**
- Scan analysis: Explains top CVEs with attacker impact scenarios and numbered remediation steps
- Code scan failure analysis: Explains why a Gitleaks/Semgrep scan blocked the pipeline with containment steps
- Free-form Q&A: Answers questions about scan history, pipeline status, and vulnerability remediation with context from recent scan data
- Smart fallback: 590-line data-driven fallback engine that answers common questions from the database when the LLM is unavailable
- Security boundary: Rejects off-topic queries (weather, sports, etc.) with a clear scope message

---

## Real-Time Dashboard

The React 19 dashboard provides live visibility into the entire security pipeline:

**Pages:**
- **Overview**: Security metrics (total scans, blocked count, block rate, severity distribution), Prometheus sparkline charts (throughput, latency, errors, CPU, memory), threat category rankings by scanner
- **Pipelines**: Run history with pagination, stage timeline visualization, blocked pipeline analysis with AI remediation guidance, stage detail drawer with logs
- **Security Center**: Unified findings from all 4 scanners, comparison chart, filters by severity/scanner/status, finding detail drawer with AI explanation and fix recommendations, status update mutation
- **Deployments**: Cloud Run revision history, active revision banner, rollback capability, environment tracking (staging/production)
- **Observability**: Prometheus metric cards (CPU, memory, latency, request rate), Alertmanager warnings, interactive topology graph showing service connection health
- **Policy Editor**: Form-based editor with block/warn severity toggles, CVSS threshold slider with histogram simulation, CVE allowlist management, live `policy.yaml` preview, impact simulation on last 10 pipelines
- **Settings**: Appearance (theme, compact mode, animations), integrations (GitHub, Cloud Run, Slack), notification thresholds, API key management, system health status
- **Notifications**: Alert registry with category filtering (pipeline, security, deploy), severity-based icons, read/unread tracking

**Real-time updates** use WebSockets backed by Redis pub/sub for cross-instance broadcasting. The frontend connects to `/ws/events` and invalidates TanStack Query caches on each event, keeping the UI current with <15ms latency.

**AI Copilot drawer** is globally accessible from any page — it shows conversation history, injects live pipeline context and vulnerability data into the system prompt, and streams responses token-by-token via SSE.

**Tech stack:** React 19, TypeScript, TanStack Query, Zustand (state), Recharts (charts), Framer Motion (animations), Lucide (icons), React Window (virtualization).

---

## Backend

The backend is a monolithic FastAPI application serving as the API gateway, telemetry ingestor, WebSocket broadcaster, and policy evaluator.

**API architecture:**
- Dual versioning: Legacy endpoints (`/api/scan`, `/api/progress`, `/api/dast/start`) for GitHub Actions runners + modern V1 router (`/api/v1/repositories`, `/api/v1/pipelines`, `/api/v1/findings`, `/api/v1/deployments`, `/api/v1/copilot/chat`) for the dashboard
- GitHub webhook handler processes `workflow_run` events in real-time with instant WebSocket broadcast
- Scan result ingestion merges findings from all 4 scanners (Gitleaks, Semgrep, Trivy, ZAP) into unified security findings
- DAST orchestration publishes Celery tasks to Redis with idempotent enqueueing via task IDs

**Database:** SQLAlchemy ORM with async drivers — PostgreSQL for production, SQLite fallback for local development. 12+ tables: `scan_results`, `repositories`, `pipeline_runs`, `pipeline_stages`, `pipeline_steps`, `security_findings`, `deployments`, `policies`, `policy_violations`, `notifications`, `events`, `metric_snapshots`.

**Observability:** Prometheus instrumentation via `prometheus-fastapi-instrumentator` for request counting, latency histograms, and error rates. Health check endpoints monitor FastAPI, PostgreSQL, Redis, Celery workers, and AI engine availability.

---

## DAST Worker

Dynamic Application Security Testing runs out-of-process via a Celery worker on a separate VM:

- **Task queue**: Redis broker receives `run_zap_scan` tasks with `scan_id` and `target_url`
- **Execution**: Worker spawns an OWASP ZAP Docker container against the staging URL using a baseline scan profile
- **Parsing**: ZAP JSON reports are parsed into structured findings (name, risk level, confidence, description, solution, reference URLs, instance counts)
- **Callback**: Findings are posted back to the backend for aggregation with other scanner results and policy evaluation

This decoupling means ZAP's long-running scans (up to 10 minutes with 15s polling × 40 retries) never block the API server or dashboard.

---

## Deployment

SecureFlow deploys to **Google Cloud Run** with separate staging and production environments:

| Service | Staging | Production |
|---------|---------|------------|
| Backend | `secureflow-backend-staging` | `secureflow-backend` |
| Frontend | `secureflow-frontend-staging` | `secureflow-frontend` |

Docker images are pushed to Google Artifact Registry (`us-central1-docker.pkg.dev/secureflow-499814/secureflow-repo/`).

**CI/CD workflows:**
- `security-pipeline.yml` — Full 9-stage security pipeline triggered on push/PR
- `quick-deploy-backend.yml` — Manual or branch-triggered (`deploy/backend-*`) backend deployment to both environments
- `quick-deploy-frontend.yml` — Manual or branch-triggered (`deploy/frontend-*`) frontend deployment to both environments

Commit message tags control targeted deployments: `[deploy]`, `[deploy:backend]`, `[deploy:frontend]`.

---

## Repository Structure

```text
SecureFlow/
├── backend/              # FastAPI API gateway, pipeline engine, policy engine, AI analysis
│   ├── main.py           #   Monolithic server: REST APIs, WebSockets, DB, GitHub webhooks
│   ├── pipeline_engine.py#   State machine with 9 stages and strict transition validation
│   ├── policy_engine.py  #   YAML policy evaluation with CVSS thresholds and allowlisting
│   ├── ai_analysis.py    #   Void AI: scan analysis, copilot Q&A, smart fallback (590 lines)
│   ├── models.py         #   SQLAlchemy ORM: 12+ tables for scans, pipelines, findings, deployments
│   ├── celery_client.py  #   DAST task publisher to Redis queue
│   └── redis_pubsub.py   #   Cross-instance WebSocket broadcast via Redis pub/sub
├── ai-server/            # Local GPU AI server (Machine B)
│   ├── app/main.py       #   FastAPI gateway with health checks, GPU detection, chat endpoint
│   ├── app/router.py     #   TaskLLMRouter: security reasoning vs code remediation intent
│   ├── app/guardrails.py #   Prompt validation + output secret redaction
│   ├── app/auth.py       #   JWT authentication (HS256)
│   └── docker-compose.yml#   Ollama + NVIDIA GPU + ChromaDB orchestration
├── worker/               # Distributed DAST scanner
│   ├── app/tasks/zap.py  #   Celery task definition for ZAP baseline scan
│   ├── app/scanners/     #   Docker-based ZAP execution
│   └── app/parsers/      #   ZAP JSON report parser
├── frontend/             # React 19 executive security dashboard
│   └── src/
│       ├── App.jsx       #   Router: 8 pages + command palette
│       ├── features/     #   Page components (overview, pipelines, security, deployments, etc.)
│       └── components/   #   GlobalAICopilot drawer with streaming SSE responses
├── .github/workflows/    # CI/CD pipelines (security-pipeline, quick-deploy-backend/frontend)
├── docs/                 # Architecture, API, Backend, Frontend, Worker, AI, Pipeline docs
├── policy.yaml           # Security policy rules, CVE allowlists with expiry dates
└── .gitleaks.toml        # Secret scan allowlist configuration
```

---

## Quick Start

### 1. AI Server (Machine B — GPU required)
```bash
cd ai-server
docker compose up -d --build
# Starts Ollama (qwen2.5:3b + nomic-embed-text) + ChromaDB + FastAPI on :8100
```

### 2. Backend API
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. DAST Worker
```bash
cd worker
pip install -r requirements.txt
celery -A app.celery_app worker --loglevel=info
```

### 4. Frontend Dashboard
```bash
cd frontend
npm install
npm start
```

Open `http://localhost:3000` to access the dashboard.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Backend | Python 3.12, FastAPI, SQLAlchemy, asyncpg/aiosqlite, Celery, Redis, PyYAML, Prometheus |
| AI Server | Python 3.11, FastAPI, Ollama, Qwen2.5:3b, DeepSeek-coder:6.7b, ChromaDB, nomic-embed-text, python-jose (JWT) |
| Worker | Python 3.12, Celery, Redis, Docker SDK, OWASP ZAP |
| Frontend | React 19, TypeScript, TanStack Query, Zustand, Recharts, Framer Motion, Lucide Icons, React Window |
| CI/CD | GitHub Actions, Gitleaks, Semgrep, Trivy, OWASP ZAP, Docker |
| Infrastructure | Google Cloud Run, Artifact Registry, PostgreSQL, Redis, Nginx |

---

## Author

Designed and built by **Abhimanyu Kumar**. Licensed under the [MIT License](LICENSE).
