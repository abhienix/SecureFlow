# 🛡️ SecureFlow

> A **DevSecOps security pipeline** that automatically scans every push for secrets, insecure code patterns, and container vulnerabilities — then enforces a policy gate before deploying to Google Cloud Run. Every scan result is reported to a live dashboard in real time.

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)
![GCP](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)
![Trivy](https://img.shields.io/badge/Trivy-1904DA?style=for-the-badge&logo=aqua-security&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-F46800?style=for-the-badge&logo=grafana&logoColor=white)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Pipeline Flow](#pipeline-flow)
- [Pipeline Steps](#pipeline-steps)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Security Policy Configuration](#security-policy-configuration)
- [Smart Deploy Logic](#smart-deploy-logic)
- [Dashboard & Monitoring](#dashboard--monitoring)
- [Contributing](#contributing)

---

## Overview

SecureFlow is a **GitHub Actions–driven DevSecOps pipeline** that runs on every push to `main` or `dev`. It:

1. Scans code for **hardcoded secrets** using Gitleaks
2. Detects **insecure code patterns** using Semgrep (OWASP Top 10, Python security rules)
3. Builds a **Docker image** of the backend and scans it for **CVEs** using Trivy
4. Sends all findings to a **Node.js backend API** that evaluates them against `policy.yaml`
5. Either **ALLOWS** (deploys to Cloud Run) or **BLOCKS** based on severity
6. Reports every step result — pass, fail, skip — to a **live dashboard** backed by PostgreSQL and Redis
7. Sends **real-time progress** patches so the dashboard never shows a stale "running" state

---

## Pipeline Flow

```
Push to main/dev
       │
       ▼
┌──────────────────┐
│  Step 0          │  Checkout (full history via fetch-depth: 0)
│  Checkout Code   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Step 1          │  POST /api/scan-results/start → creates dashboard row
│  Notify Start    │  returns run_id used by every subsequent step
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Step 2          │  Downloads Gitleaks v8.24.3 with 3-attempt retry + backoff
│  Install         │  continue-on-error → install failure is reported, not silent
│  Gitleaks        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Step 3          │  Scans only commits in this push (BEFORE_SHA..AFTER_SHA)
│  Run Gitleaks    │  Redacts secrets from logs. Exits 1 on any finding.
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Step 4          │  Runs: p/python · p/secrets · p/security-audit · p/owasp-top-ten
│  Run Semgrep     │  Outputs semgrep-results.json with finding count
└────────┬─────────┘
         │
       PASS?
      ╱     ╲
    YES       NO
     │         │
     │         ▼
     │   ┌─────────────┐
     │   │  Step 6     │  Reports BLOCK to dashboard with finding detail
     │   │  BLOCK       │  Exits 1 — no Docker build, no deploy
     │   └─────────────┘
     │
     ▼
┌──────────────────┐
│  Step 7          │  Diffs BEFORE_SHA..AFTER_SHA
│  Change          │  Sets image_changed and frontend_changed flags
│  Detection       │  Supports [deploy] in commit message to force deploy
└────────┬─────────┘
         │
    image_changed?
      ╱     ╲
    YES       NO
     │         │
     │         ▼
     │   ┌─────────────┐
     │   │  Step 8     │  Reports CLEAN + ALLOW — no image scan needed
     │   │  Clean Run  │
     │   └─────────────┘
     │
     ▼
┌──────────────────┐
│  Steps 9–10      │  GCP auth → Artifact Registry → docker build → docker push
│  Docker Build    │  Image tagged with commit SHA
│  & Push          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Step 11         │  Scans CRITICAL, HIGH, MEDIUM, LOW CVEs
│  Trivy CVE Scan  │  Uploads trivy-results.json as GitHub artifact
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Step 12         │  POST /api/scan-results with full Trivy findings
│  Policy Gate     │  Backend evaluates policy.yaml and returns ALLOW or BLOCK
└────────┬─────────┘
         │
      ALLOW?
      ╱     ╲
    YES       NO
     │         │
     │         ▼
     │   ┌─────────────┐
     │   │  BLOCKED    │  Deploy skipped. Dashboard updated.
     │   └─────────────┘
     │
     ▼
┌──────────────────┐
│  Steps 13–15     │  gcloud run deploy → backend → frontend (if changed)
│  Deploy to       │  Each tagged with commit SHA
│  Cloud Run       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Step 16         │  always() guard — catches any unhandled failure
│  Failsafe        │  Closes the dashboard row so it never sticks at "running"
│  Notifier        │
└──────────────────┘
```

---

## Pipeline Steps

| Step | Name | What It Does |
|------|------|--------------|
| 0 | Checkout | Full git history (`fetch-depth: 0`) for complete Gitleaks coverage |
| 1 | Notify Start | Creates a `running` record in the dashboard via `POST /api/scan-results/start` |
| 2 | Install Gitleaks | Downloads v8.24.3 with 3-attempt retry + exponential backoff |
| 2a | Gitleaks Install Failure | Reports install failure to dashboard if download fails after 3 retries |
| 3 | Run Gitleaks | Scans only commits in this push; redacts secrets from logs |
| 4 | Run Semgrep | Scans with `p/python`, `p/secrets`, `p/security-audit`, `p/owasp-top-ten` |
| 5 | Code Scan Progress | PATCHes dashboard with PASS or BLOCK for the code scan step |
| 6 | Block on Scan Failure | Reports BLOCK with first finding detail; exits 1 to stop pipeline |
| 7 | Change Detection | Diffs `BEFORE_SHA..AFTER_SHA`; sets `image_changed` and `frontend_changed` |
| 8 | Report Clean | Reports ALLOW if code passed and no image/frontend files changed |
| 9 | GCP Auth | Authenticates to Google Cloud using service account key |
| 10 | Docker Build & Push | Builds backend image; pushes to GCP Artifact Registry tagged with SHA |
| 10a | Docker Failure Notify | Reports build/push failure to dashboard with specific error detail |
| 11 | Trivy CVE Scan | Scans the pushed image for CRITICAL, HIGH, MEDIUM, LOW CVEs |
| 12 | Policy Gate | Sends Trivy findings to backend; deploys only if backend returns `ALLOW` |
| 13 | Deploy Backend | `gcloud run deploy secureflow-backend` to `us-central1` |
| 14 | Build & Push Frontend | Builds frontend image with `REACT_APP_API_URL` build arg |
| 15 | Deploy Frontend | `gcloud run deploy secureflow-frontend` on port 8080 |
| 16 | Failsafe Notifier | `always()` guard — closes any dashboard row that would otherwise hang |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **CI/CD Pipeline** | GitHub Actions |
| **Secret Scanning** | Gitleaks v8.24.3 |
| **SAST / Code Scanning** | Semgrep (OWASP Top 10, Python, Secrets) |
| **Container Scanning** | Trivy (Aqua Security) |
| **Container Registry** | GCP Artifact Registry |
| **Deployment** | Google Cloud Run (us-central1) |
| **Backend API** | Node.js |
| **Database** | PostgreSQL 15 |
| **Cache** | Redis 7 |
| **Metrics** | Prometheus |
| **Dashboard** | Grafana |
| **Frontend** | JavaScript / React |
| **Policy Engine** | Custom `policy.yaml` evaluated by backend |

---

## Project Structure

```
SecureFlow/
├── .github/
│   └── workflows/
│       └── secureflow.yml       # Main CI/CD + security pipeline
├── backend/                     # Node.js backend API
├── frontend/                    # React frontend (dashboard UI)
├── docker/
│   └── Dockerfile               # Backend container definition
├── prometheus/
│   └── prometheus.yml           # Prometheus scrape config
├── scripts/                     # Utility scripts
├── docker-compose.yml           # Local dev stack
├── policy.yaml                  # Security policy (block/warn thresholds)
├── send_trivy_results.py        # Manual Trivy result submission script
└── trivy-results.json           # Last scan output (gitignored in prod)
```

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A Google Cloud project with Cloud Run and Artifact Registry enabled
- A GCP Service Account key with Cloud Run and Artifact Registry permissions
- GitHub repository secrets configured (see below)

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `BACKEND_URL` | URL of your deployed backend API (e.g. `https://secureflow-backend-xxx.run.app`) |
| `GCP_SA_KEY` | GCP Service Account JSON key (base64 or raw JSON) |

### Local Development

```bash
# Clone the repo
git clone https://github.com/abhienix/SecureFlow.git
cd SecureFlow

# Start the full local stack
docker compose up -d
```

| Service | URL | Credentials |
|---|---|---|
| Grafana Dashboard | http://localhost:3001 | admin / admin |
| Prometheus | http://localhost:9090 | — |
| Backend API | http://localhost:8000 | — |
| PostgreSQL | localhost:5432 | postgres / password |
| Redis | localhost:6379 | — |

### Triggering the Pipeline

```bash
# Normal push — pipeline auto-detects what changed
git push origin main

# Force deploy both services regardless of file changes
git commit -m "fix: update config [deploy]"
git push origin main

# Or use workflow_dispatch in GitHub Actions UI
# → Run workflow → toggle deploy_backend / deploy_frontend
```

### Manual Trivy Scan (local)

```bash
trivy image your-image:tag -f json -o trivy-results.json
python send_trivy_results.py
```

---

## Security Policy Configuration

Edit `policy.yaml` to control what gets blocked, warned, or allowed:

```yaml
default:
  block_on: [CRITICAL, HIGH]
  warn_on: [MEDIUM]
  cvss_threshold: 7.0

repos:
  SecureFlow:
    block_on: [CRITICAL]
    warn_on: [HIGH, MEDIUM]
    cvss_threshold: 8.0

allowlist:
  - cve: CVE-2024-1234
    expires: 2026-08-01
    reason: "no fix available yet, monitoring"

notifications:
  slack: true
  on_block: true
  on_allow: false
```

The backend evaluates these rules against Trivy findings and returns `ALLOW` or `BLOCK` to the pipeline at Step 12.

---

## Smart Deploy Logic

The pipeline avoids unnecessary rebuilds by diffing the exact set of files changed in a push:

| Changed Files | image_changed | frontend_changed | Behaviour |
|---|---|---|---|
| `backend/**`, `docker/**`, `policy.yaml`, `Dockerfile` | ✅ true | — | Full image build + Trivy scan + deploy |
| `frontend/**` | — | ✅ true | Frontend rebuild + deploy only |
| CI/config only | false | false | Code scan only, no build/deploy |
| Commit contains `[deploy]` | ✅ true | ✅ true | Force full deploy regardless |
| `workflow_dispatch` with flags | configurable | configurable | Manual override via GitHub UI |

---

## Dashboard & Monitoring

Every pipeline run reports structured JSON to the backend at multiple points:

- **On start** — `POST /api/scan-results/start` → creates dashboard row with status `running`
- **On progress** — `PATCH /api/scan-results/:id/progress` → updates individual step results
- **On finish** — `POST /api/scan-results` → final record with action (`ALLOW` / `BLOCK`), severity, findings

Each step reports one of: `PASS` · `BLOCK` · `FAILED` · `skipped`

A **failsafe step** (`always()`) ensures any run that dies unexpectedly — OOM kill, concurrency cancellation, unhandled exit — still closes its dashboard row rather than hanging at `running` indefinitely.

Grafana at `http://localhost:3001` visualises scan trends via Prometheus metrics.

---

## Contributing

1. Fork this repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/): `git commit -m "feat: add your feature"`
4. Push and open a Pull Request

### Open TODOs

- [ ] Add Grafana dashboard JSON export for one-click provisioning
- [ ] Slack webhook integration for BLOCK notifications
- [ ] Helm chart for Kubernetes deployment
- [ ] Unit tests for the policy engine
- [ ] SBOM generation with Syft alongside Trivy

---

## License

MIT — see [LICENSE](LICENSE)

---

<p align="center">
  Built by <a href="https://github.com/abhienix">Abhimanyu Kumar</a> ·
  <a href="https://www.linkedin.com/in/abhimanyu-sec">LinkedIn</a>
</p>