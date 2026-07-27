# 🛡️ SecureFlow — Enterprise DevSecOps Security Gate & Intelligence Platform

> **Full-Spectrum DevSecOps CI/CD Pipeline & Security Platform** — Scans every commit for exposed secrets (**Gitleaks**), SAST security flaws (**Semgrep**), container vulnerabilities (**Trivy**), and live API runtime vulnerabilities (**OWASP ZAP DAST**). Enforces dynamic security policies (`policy.yaml`) and streams real-time telemetry to an interactive React dashboard with automated AI remediation routing.

[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=github-actions&logoColor=white)](#)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](#)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)](#)
[![GCP Cloud Run](https://img.shields.io/badge/Cloud_Run-4285F4?style=flat-square&logo=google-cloud&logoColor=white)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](#)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)](#)
[![OWASP ZAP](https://img.shields.io/badge/OWASP_ZAP-DAST-FF6B6B?style=flat-square&logo=owasp&logoColor=white)](#)

---

## 📌 1. Project Overview

**SecureFlow** is an end-to-end DevSecOps security automation platform designed to prevent insecure code, leaked credentials, vulnerable container packages, and live API vulnerabilities from reaching production environment deployments.

Whenever a developer pushes code to GitHub, SecureFlow automatically runs a multi-layered security checking pipeline. If any severe vulnerability or secret is detected, the pipeline **fails closed**, blocking the deployment instantly and reporting structured diagnostics to a live dashboard. If all security gates pass, code is deployed seamlessly to staging, tested dynamically with OWASP ZAP via a distributed Celery worker, and promoted to production.

---

## 🔑 2. Key Features & Problems Solved

- **Multi-Layered Security Funnel**: Combines Secret Detection (Gitleaks), Static Application Security Testing (Semgrep SAST), Software Composition Analysis (Trivy SCA), and Dynamic Application Security Testing (OWASP ZAP DAST) to eliminate blind spots.
- **Fail-Closed Policy Gate**: Enforces deterministic, high-speed policy rules via `policy.yaml` (CVSS threshold enforcement, severity blocking, allowlists with expiration dates).
- **Distributed Celery/Redis DAST Orchestration**: Offloads resource-heavy OWASP ZAP scanning to an isolated Compute Engine VM worker (`secureflow-worker`), decoupling long-running scans from CI runners.
- **Real-Time Live Dashboard**: React frontend syncs instantly with the FastAPI backend over WebSockets and TanStack Query, rendering build progress and security findings in real-time.
- **AI Remediation Engine**: Automatically generates natural-language explanation summaries, risk scoring, and drop-in code fix patches using Groq (Llama 3.3) and Gemini with graceful local heuristic fallbacks.

---

## 🛠️ 3. Tech Stack

| Domain | Technologies Used |
| :--- | :--- |
| **Compute & Cloud Hosting** | Google Cloud Run (Production & Staging Serverless Services), Compute Engine VM (`secureflow-worker`) |
| **Database & Caching** | Cloud SQL PostgreSQL (`secureflow-db`), Asyncpg, Redis (Pub/Sub & Celery Message Broker) |
| **Backend API** | Python 3.11, FastAPI, SQLAlchemy 2.0 (Async), Celery, Pydantic, Prometheus Fastapi Instrumentator |
| **CI/CD & Scanners** | GitHub Actions, Docker, GCP Artifact Registry, Gitleaks, Semgrep, Trivy, OWASP ZAP DAST |
| **AI Intelligence** | Groq API (Llama 3.3 70B), Google Gemini API (2.0 Flash Lite), Heuristic Remediation Fallback Engine |
| **Frontend UI** | React 19, TypeScript, TanStack Query v5, Zustand, Lucide React, Nginx (Alpine Container) |

---

## 📐 4. System Architecture

The diagram below illustrates the end-to-end flow from developer push to security gate evaluation, worker VM execution, and real-time dashboard rendering:

```mermaid
flowchart TD
    DEV(["👨‍💻 Developer Push"]) --> GHA["⚙️ GitHub Actions Pipeline"]

    subgraph CI["1. CI/CD Security Pipeline"]
        GHA --> GL["🔑 Gitleaks (Secret Scan)"]
        GL --> SG["🔍 Semgrep (SAST Scan)"]
        SG --> DB["🐳 Docker Build & Artifact Registry"]
        DB --> TV["📦 Trivy (Container SCA)"]
    end

    TV --> POL{"🛡️ Policy Gate\n(policy.yaml)"}
    
    POL -->|BLOCK| FAIL(["🚫 Pipeline Blocked\nPost structured findings"])
    POL -->|ALLOW| STG["☁️ Deploy to Staging\n(Cloud Run)"]

    STG --> CEL["📨 Dispatch Celery DAST Job\n(Redis Broker)"]

    subgraph WORKER["2. Worker VM (secureflow-worker @ 10.128.0.2)"]
        CEL --> ZAP["⚡ OWASP ZAP DAST Worker\nProbes Staging API"]
    end

    ZAP --> GATE{"⚡ ZAP Gate"}
    GATE -->|FAIL| FAIL
    GATE -->|PASS| PROD["🚀 Deploy to Production\n(Cloud Run)"]

    FAIL & PROD --> BE["🐍 FastAPI Backend\n(Cloud SQL Postgres)"]

    subgraph RT["3. Real-Time Telemetry"]
        BE --> WS["📡 WebSocket Broadcaster\n(/ws/scans)"]
        WS --> UI["⚛️ React Dashboard\n(TanStack Query Cache Sync)"]
    end
```

---

## 🔄 5. CI/CD Pipeline Stages

1. **Checkout & Registration**: Checks out repo history and registers `run_id` with backend `POST /api/scan-results/start`.
2. **Gitleaks Secret Scan**: Scans git commit diff for exposed tokens, private keys, or API credentials.
3. **Semgrep SAST Scan**: Analyzes code for unsafe SQL execution, unhandled exceptions, or weak cryptography.
4. **Smart Build Diff Check**: Derives changed files to skip Docker rebuilds on frontend/doc-only changes.
5. **Docker Build & Push**: Builds image container and pushes artifact to GCP Artifact Registry.
6. **Trivy Container Scan**: Scans container OS packages and application dependencies for CRITICAL/HIGH CVEs.
7. **Policy Gate Evaluation**: Evaluates vulnerability findings against `policy.yaml` rules.
8. **Staging Deployment**: Deploys container to Cloud Run staging environment.
9. **Distributed ZAP DAST Scan**: Dispatches DAST scan job to Celery worker on GCP VM.
10. **Production Deployment**: Promotes verified build to production Cloud Run environment.

---

## 📡 6. Real-Time Data Flow

1. When a pipeline runs, backend receives execution status events (`scan_started`, `scan_progress`, `scan_complete`).
2. The FastAPI backend broadcasts structured JSON events to all connected WebSocket clients on `/ws/scans`.
3. The React frontend hook `useScanWebSocket` receives the WebSocket frame and invalidates relevant TanStack Query caches (`queryKeys.scans`).
4. The dashboard UI updates instantaneously without requiring browser page reloads or manual refreshes.
5. If WebSocket connectivity drops, TanStack Query automatically falls back to 5-second polling background refetches.

---

## ⚡ 7. Setup & Installation

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/abhienix/SecureFlow.git
cd SecureFlow

# 2. Configure Backend Environment
cp .env.example backend/.env
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Start Backend Server
uvicorn main:app --reload --port 8000

# 4. Start Frontend UI (in a new terminal)
cd ../frontend
npm install
npm start
```

---

## 🔐 8. Environment Variables

Refer to `.env.example` for local setup configuration:

```env
# Backend API Configuration
PORT=8000
DATABASE_URL=postgresql+asyncpg://postgres:password@8.231.119.203:5432/secureflow
STALE_RUN_TIMEOUT_MINUTES=20
WATCHDOG_INTERVAL_SECONDS=30

# Redis & Celery Configuration
REDIS_URL=redis://10.128.0.2:6379/0
CELERY_BROKER_URL=redis://10.128.0.2:6379/0

# AI Provider Credentials (Optional)
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Frontend Configuration
REACT_APP_API_URL=https://secureflow-backend-1083585992526.us-central1.run.app
```

---

## 💡 9. Engineering Highlights (Interview Discussion Points)

1. **Fail-Closed Security Design**: The policy engine uses zero-trust default-deny logic. If the backend or policy service is unreachable, builds fail closed (`BLOCK`) to guarantee zero insecure deployments.
2. **Decoupled Architecture**: OWASP ZAP DAST scans are offloaded to an isolated Compute Engine VM worker via Redis and Celery, keeping CI pipeline execution fast and preventing runner timeout issues.
3. **Multi-Model AI Fallback Chain**: Remediation AI calls prioritize Groq (Llama 3.3 70B), fallback to Google Gemini Flash Lite, and finally fall back to deterministic local rule heuristics if all AI APIs fail.
4. **Optimized Container Rebuild Logic**: Git diff scope checks dynamically analyze incoming commits to avoid expensive Docker container rebuilds when only frontend assets or documentation files change.
