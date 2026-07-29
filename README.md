# SecureFlow — Enterprise DevSecOps Security Gate & Intelligence Platform

CI/CD Security Intelligence platform that scans every commit for exposed secrets (Gitleaks), SAST security flaws (Semgrep), container vulnerabilities (Trivy), and live API runtime vulnerabilities (OWASP ZAP DAST). Enforces dynamic security policies via a policy engine, streams real-time telemetry to an executive dashboard, and runs a 100% local AI stack for confidential remediation.

## Architecture

```
Developer Push/PR
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│              GitHub Actions Pipeline                             │
│  Gitleaks → Semgrep → Docker Build → Trivy → Policy Gate        │
└──────────────────────────────────────────────────────────────────┘
       │                                              │
       │ BLOCK                                        │ ALLOW
       ▼                                              ▼
  Findings Posted                              Deploy to Staging
       │                                              │
       ▼                                              ▼
  ┌─────────────────┐                    ┌────────────────────────┐
  │  FastAPI Backend │◄───────────────────│ OWASP ZAP DAST Worker │
  │  + SQLAlchemy    │                    │  (Celery/Redis)       │
  └────────┬────────┘                    └────────────────────────┘
           │
     ┌─────┴──────┐──────────────────┐
     ▼            ▼                  ▼
  Ollama AI   Qdrant Vector DB   Prometheus/Grafana
  (Local LLM)  (Local RAG)       (Observability)
```

## Key Features

- **Multi-Layered Security Funnel**: Gitleaks (secrets), Semgrep (SAST), Trivy (SCA/container), OWASP ZAP (DAST) — each stage gates the next
- **Fail-Closed Policy Engine**: Dynamic policy rules with CVSS thresholds, severity gating, and CVE allowlists. Zero-trust default-deny — if the policy service is unreachable, builds block
- **100% Local AI Stack (Zero Data Leakage)**: Ollama (Qwen 2.5 3B for chat + DeepSeek-Coder 6.7B for remediation) with an embedded Qdrant vector database for RAG — no data ever leaves your network
- **Distributed DAST Orchestration**: OWASP ZAP scans offloaded to an isolated Celery worker via Redis, decoupling long-running scans from CI runner timeouts
- **Real-Time WebSocket Dashboard**: Live pipeline stage updates, animated toast notifications, and a full executive dashboard powered by React + TanStack Query
- **Observability**: Prometheus metrics + Grafana dashboards tracking throughput, latency, error rates, CPU, and memory

## Tech Stack

| Domain | Technologies |
| :--- | :--- |
| CI/CD & Security | GitHub Actions, Gitleaks, Semgrep, Trivy, OWASP ZAP, Docker, GCP Artifact Registry |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.0 (Async), Celery, Redis |
| Local AI | Ollama, Qwen 2.5 3B, DeepSeek-Coder 6.7B, Qdrant, nomic-embed-text |
| Frontend | React 18, TypeScript, TanStack Query v5, Zustand, Lucide Icons |
| Observability | Prometheus v2.52, Grafana, Alertmanager |
| Notifications | Slack Webhooks, WebSocket Server |

## Setup

```bash
git clone https://github.com/abhienix/SecureFlow.git
cd SecureFlow

# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Local AI models (Ollama)
ollama pull qwen2.5:3b
ollama pull deepseek-coder:6.7b
ollama pull nomic-embed-text

# Frontend
cd ../frontend
npm install
npm start
```

## Environment Variables

```env
PORT=8000
DATABASE_URL=sqlite+aiosqlite:///./secureflow_dev.db
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
OLLAMA_URL=http://localhost:11434
OLLAMA_FAST_MODEL=qwen2.5:3b
OLLAMA_DEEP_MODEL=deepseek-coder:6.7b
REACT_APP_API_URL=http://localhost:8000
```
