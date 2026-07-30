# 🛡️ SecureFlow — Enterprise DevSecOps Security Gate & Intelligence Platform

[![Build Status](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue?logo=github-actions)](https://github.com/abhienix/SecureFlow/actions)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Backend-Python%203.11%20%7C%20FastAPI-009688?logo=python)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript-61DAFB?logo=react)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Containerization-Docker%20%7C%20Cloud%20Run-2496ED?logo=docker)](https://www.docker.com/)
[![OWASP ZAP](https://img.shields.io/badge/DAST-OWASP%20ZAP-FF6F00?logo=owasp)](https://www.zaproxy.org/)
[![Trivy](https://img.shields.io/badge/Container%20Security-Trivy-1976D2)](https://trivy.dev/)
[![Semgrep](https://img.shields.io/badge/SAST-Semgrep-6B5B95)](https://semgrep.dev/)
[![Gitleaks](https://img.shields.io/badge/Secret%20Detection-Gitleaks-E040FB)](https://github.com/gitleaks/gitleaks)
[![Ollama](https://img.shields.io/badge/Local%20AI-Ollama%20%7C%20Qwen2.5-43A047?logo=ollama)](https://ollama.ai/)

**SecureFlow** is an enterprise-grade, shift-left DevSecOps Security Intelligence & Automated Gating Platform. It scans every commit and pull request for exposed secrets, SAST code vulnerabilities, container CVEs, and live DAST API vulnerabilities. SecureFlow enforces zero-trust security policies, streams real-time telemetry to an executive React dashboard, and features **Void** — a 100% confidential local AI copilot for automated vulnerability remediation without data leakage.

---

## 🏛️ Platform Architecture

```text
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DEVELOPER WORKFLOW & CODE PUSH                                         │
│                                           git push / PR                                                   │
└─────────────────────────────────────────────────────┬─────────────────────────────────────────────────────┘
                                                      │
                                                      ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     GITHUB ACTIONS CI/CD PIPELINE                                         │
│                                                                                                           │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────────┐     │
│  │ 1. Secret Scan   │───►│  2. SAST Audit   │───►│ 3. Container Scan│───►│  4. Policy Gate Check    │     │
│  │    (Gitleaks)    │    │    (Semgrep)     │    │     (Trivy)      │    │  (policy.yaml Evaluator) │     │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘    └────────────┬─────────────┘     │
└───────────────────────────────────────────────────────────────────────────────────────│───────────────────┘
                                                                                        │ ALLOW
                                                                                        ▼
                                                                            ┌───────────────────────┐
                                                                            │   Deploy to Staging   │
                                                                            │ (Google Cloud Run App)│
                                                                            └───────────┬───────────┘
                                                                                        │
                                                                                        ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 DISTRIBUTED DAST SCANNING ARCHITECTURE                                    │
│                                                                                                           │
│  ┌───────────────────────┐    Celery Task    ┌────────────────────────┐    Docker SDK    ┌─────────────┐  │
│  │  FastAPI Backend API  │──────────────────►│ Redis Queue + Worker VM│─────────────────►│ OWASP ZAP   │  │
│  │   (Cloud Run Host)    │◄──────────────────│  (Compute Engine Host) │◄─────────────────│  Container  │  │
│  └───────────────────────┘   PATCH Progress  └────────────────────────┘   Scan Report    └─────────────┘  │
└──────────────────────────┬────────────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              TELEMETRY, AI COPILOT & DASHBOARD LAYER                                      │
│                                                                                                           │
│  ┌───────────────────────┐   WebSocket/SSE   ┌────────────────────────┐   Ollama / RAG   ┌─────────────┐  │
│  │  PostgreSQL Storage   │──────────────────►│ React + TS Dashboard   │◄─────────────────│ Void AI     │  │
│  │  (Managed Database)   │                   │ (Live Telemetry UI)    │                  │ Copilot     │  │
│  └───────────────────────┘                   └────────────────────────┘                  └─────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Key Platform Features

### 1. 🛡️ Multi-Layered Security Funnel
- **Secret Detection (Gitleaks)**: Scans complete git commit histories for leaked API keys, tokens, SSH keys, and credentials.
- **SAST Code Analysis (Semgrep)**: Audits source code for OWASP Top 10 vulnerabilities, SQL injection, XSS, and insecure code patterns.
- **Container & SCA Scanning (Trivy)**: Audits Docker container images and dependency manifests for known CVEs.
- **Distributed DAST Runtime Scanning (OWASP ZAP)**: Offloads dynamic baseline security scanning of deployed staging applications to dedicated GCP Compute Engine Worker VMs via Celery and Redis.

### 2. ⚙️ Zero-Trust Dynamic Policy Engine (`policy.yaml`)
- **Centralized Rules**: Define maximum allowable CVSS severity scores, critical vulnerability thresholds, and explicit CVE allowlists.
- **Fail-Closed Security Gating**: Enforces automatic `PASS` / `BLOCK` deployment decisions. If policy services are unreachable or unconfigured, builds block by default.

### 3. 🤖 Confidential Local AI Stack (**Void Copilot**)
- **100% Privacy & Data Confidentiality**: Runs locally using **Ollama** (`qwen2.5:7b` / `deepseek-coder:6.7b`) paired with a **Qdrant** vector database for Retrieval-Augmented Generation (RAG).
- **Zero External Data Leakage**: Sensitive source code, findings, and logs never leave your private infrastructure.
- **Automated Remediation**: Synthesizes exact code patches, line-by-line fixes, and mitigation steps for flagged vulnerabilities.

### 4. 📊 Real-Time Telemetry & Executive Dashboard
- **WebSocket & SSE Integration**: Streams live pipeline stage transitions, scan durations, and status updates (`PENDING` → `RUNNING` → `PASS` / `BLOCK`).
- **Interactive Visualizations**: Stage flow graphs, severity breakdown charts, finding detail drawers, and security scorecards built with React 18, TypeScript, and TanStack Query v5.
- **Instant Alerts**: Webhook dispatchers post critical gate blocks directly to Slack channels (`#devsecops-alerts`).

---

## 🧰 Tech Stack Breakdown

| Category | Component / Tool | Purpose / Usage |
| :--- | :--- | :--- |
| **CI/CD & Security** | GitHub Actions, Gitleaks, Semgrep, Trivy, OWASP ZAP | Pipeline automation, static analysis, container scanning & DAST |
| **Backend Core** | Python 3.11, FastAPI, Uvicorn, SQLAlchemy 2.0 (Async) | High-performance async REST API, WebSocket server, and database ORM |
| **Asynchronous Queue**| Celery, Redis, GCP Compute Engine | Distributed DAST worker queue and task orchestration |
| **Database** | PostgreSQL 15, asyncpg | Persistent storage for scan results, pipeline stages, events, and metrics |
| **Local AI Engine** | Ollama, Qwen 2.5 7B, DeepSeek-Coder 6.7B, Qdrant | Offline LLM inference, vector embeddings, and RAG copilot |
| **Frontend UI** | React 18, TypeScript, TanStack Query v5, Tailwind CSS | Executive security intelligence dashboard |
| **Cloud & Hosting** | Google Cloud Run, Artifact Registry, GCP Compute Engine | Production serverless backend hosting and worker node management |

---

## 📁 Repository Structure

```text
SecureFlow/
├── .github/
│   └── workflows/
│       └── security-pipeline.yml     # Complete CI/CD Security Pipeline & Policy Gate
├── backend/
│   ├── main.py                       # FastAPI Application, WebSockets & REST Endpoints
│   ├── models.py                     # SQLAlchemy Database Schema Models
│   ├── ai_analysis.py                # Void AI Copilot & Provider Fallback Chain (Groq/Gemini/Ollama)
│   ├── celery_client.py              # Celery Producer & Redis Broker Client
│   ├── policy_engine.py              # Zero-Trust Policy Evaluator
│   └── requirements.txt              # Backend Dependencies
├── worker/
│   └── app/
│       ├── tasks/
│       │   └── zap.py                # Celery DAST Worker Task & Docker ZAP Execution
│       └── clients/
│           └── backend.py            # Async Progress Telemetry Callback Client
├── frontend/
│   ├── src/
│   │   ├── components/               # React UI Components, Charts & Global AI Copilot Modal
│   │   ├── features/                 # Pipelines, Overview & Security Analytics Workspaces
│   │   ├── hooks/                    # Custom Hooks for WebSockets, SSE & Telemetry
│   │   └── App.jsx                   # Main React Dashboard Application
│   ├── package.json
│   └── Dockerfile
├── policy.yaml                       # Global Security Rules, CVSS Thresholds & Allow lists
└── README.md
```

---

## ⚡ Quick Start & Local Setup

### Prerequisites
- **Python**: 3.11+
- **Node.js**: 18+ & `npm`
- **Docker**: Desktop / Engine
- **Ollama**: (Optional, for offline AI copilot features)

---

### 1. Clone Repository & Setup Backend

```bash
git clone https://github.com/abhienix/SecureFlow.git
cd SecureFlow

# Navigate to backend
cd backend

# Create & activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

### 2. Setup & Run Frontend Dashboard

```bash
cd ../frontend

# Install dependencies
npm install

# Start React development server
npm start
```

The executive dashboard will be accessible at `http://localhost:3000`.

---

### 3. Local AI Setup (Ollama & Models)

To run the local AI copilot offline:

```bash
# Install Ollama (https://ollama.ai)
ollama pull qwen2.5:7b
ollama pull deepseek-coder:6.7b
ollama pull nomic-embed-text
```

---

## ⚙️ Environment Configuration (`.env`)

Create a `.env` file in the `backend/` directory:

```env
# Backend API Configuration
PORT=8000
BACKEND_API_SECRET=devsecops-pipeline-secret-2026
DATABASE_URL=postgresql+asyncpg://postgres:password@8.231.119.203:5432/secureflow

# Celery & Redis Worker Broker
CELERY_BROKER_URL=redis://10.128.0.2:6379/0
REDIS_URL=redis://10.128.0.2:6379/0

# Optional AI Providers (Cloud or Offline Fallback)
GROQ_API_KEY=gsk_your_groq_key_here
GEMINI_API_KEY=AIzaSy_your_gemini_key_here
OLLAMA_URL=http://localhost:11434

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

---

## 🔑 Key API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/scan-results/start` | Trigger a new pipeline scan run and enqueue DAST tasks |
| `GET` | `/api/scan-results/{id}/progress` | Query real-time scan progress, stage states, and DAST status |
| `PATCH`| `/api/scan-results/{id}/progress` | Progress telemetry callback endpoint used by Worker VM & CI |
| `GET` | `/api/scan-results` | Fetch all historical scan runs and telemetry summaries |
| `POST` | `/api/copilot/ask` | Submit free-form questions to Void AI Copilot |
| `GET` | `/api/policy` | View active security policies loaded from `policy.yaml` |
| `WS` | `/ws/scans` | Live WebSocket feed for real-time dashboard updates |

Interactive OpenAPI documentation is available at `http://localhost:8000/docs` when running the backend.

---

## 🛡️ Security Policy Configuration (`policy.yaml`)

SecureFlow uses `policy.yaml` to enforce repository-level security policies:

```yaml
default:
  cvss_threshold: 7.0
  block_on: [CRITICAL, HIGH]
  warn_on: [MEDIUM]
  allow_cves:
    - CVE-2023-12345 # Approved exception

repos:
  abhienix/SecureFlow:
    cvss_threshold: 6.5
    block_on: [CRITICAL, HIGH]
```

---

## 📜 License & Credits

Developed by **Abhimanyu Kumar** as an Enterprise DevSecOps Security Intelligence Platform. Licensed under the [MIT License](LICENSE).
