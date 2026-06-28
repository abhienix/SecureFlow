# 🛡️ SecureFlow

> Automated DevSecOps pipeline — scans every push for secrets, vulnerable code, and container CVEs, then deploys or blocks based on policy. Every result streams to a live React dashboard in real time.

![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=github-actions&logoColor=white)
![Python](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![GCP](https://img.shields.io/badge/Cloud_Run-4285F4?style=flat-square&logo=google-cloud&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)

**Live demo → https://secureflow-frontend-1083585992526.us-central1.run.app/**

---

## Architecture

```mermaid
graph TB
    DEV([👨‍💻 git push]) --> GHA

    subgraph GHA["⚙️ GitHub Actions — 16 Steps"]
        GL[🔑 Gitleaks\nSecret Scan]
        SG[🔍 Semgrep\nSAST · OWASP Top 10]
        CHK{Files\nchanged?}
        DB[🐳 Docker Build\n& Push]
        TV[📦 Trivy\nCVE Scan]
        GL --> SG --> CHK
        CHK -->|no backend changes| SKIP([✅ ALLOW\nno build needed])
        CHK -->|yes| DB --> TV
    end

    TV --> PG

    subgraph PG["🛡️ Policy Gate — policy.yaml"]
        SEV[Severity check\nblock_on · warn_on]
        CV[CVSS threshold\n≥ 7.0 also blocks]
        AL[Allowlist\nper-CVE expiry dates]
    end

    GL -->|secrets found| BLK1([🚫 BLOCK])
    SG -->|pattern found| BLK2([🚫 BLOCK])
    PG -->|violations| BLK3([🚫 BLOCK])
    PG -->|clear| CR([✅ Blue-Green\nDeploy → Cloud Run])

    BLK1 & BLK2 & BLK3 --> AI

    subgraph AI["🤖 AI Engine — ai_analysis.py"]
        GR[Groq · llama-3.3-70b\nPrimary]
        GM[Gemini · flash-lite\nFallback]
        OL[Ollama · qwen2.5:7b\nLocal last resort]
        GR -->|fail| GM -->|fail| OL
    end

    AI -->|explanation + fix\n+ risk score 1–10| BE

    subgraph BE["🐍 FastAPI Backend — Cloud Run"]
        WS[WebSocket\nBroadcaster]
        WD[Stale Run Watchdog\ntimeout after 20 min]
        PG2[(PostgreSQL\nScan History)]
        RD[(Redis\nCache)]
    end

    WS -->|real-time push| DASH

    subgraph DASH["⚛️ React Dashboard — 4 Tabs"]
        OV[Overview\nKPIs · Charts · Activity]
        PL[Pipeline\nLive Step Status]
        INS[AI Insights\nGauges · Heatmap · Scatter]
        MT[Metrics\nBlock rate · Stage stats]
        COP[🤖 AI Copilot\nFloating chat · context-aware]
    end

    style BLK1 fill:#e03131,color:#fff
    style BLK2 fill:#e03131,color:#fff
    style BLK3 fill:#e03131,color:#fff
    style SKIP fill:#2f9e44,color:#fff
    style CR   fill:#2f9e44,color:#fff
    style GR   fill:#4dabf7,color:#fff
    style GM   fill:#74c0fc,color:#333
    style OL   fill:#a5d8ff,color:#333
    style COP  fill:#845ef7,color:#fff
```

---

## Key Features

**Three-layer scanning** — Gitleaks scans full git history for secrets (not just the working tree). Semgrep checks OWASP Top 10 patterns across four rulesets. Trivy scans the built Docker image for CVEs. Each is a hard gate.

**Policy gate** — `policy.yaml` controls block/warn thresholds per repo with per-CVE allowlisting and expiry dates. Reloads on every request, no server restart needed. A dual blocking condition catches MEDIUM CVEs with a CVSS score above the threshold.

**AI analysis** — Every block triggers a Groq → Gemini → Ollama fallback chain that generates a specific explanation (CVE IDs, exploit paths) and numbered fix steps with exact package versions. Never fails silently.

**AI Copilot** — Floating chat panel on the dashboard. Sends full scan context (recent 25 scans, aggregate stats, conversation history) with every question so answers are grounded in your actual pipeline data. Quick-action buttons for common queries. Read-only by design — cannot retrigger scans or flip decisions.

**Real-time WebSocket dashboard** — Single React page, four tabs. Pipeline step indicators update live as GitHub Actions runs. A stale-run watchdog automatically closes any run stuck at "running" after 20 minutes so the dashboard never shows stale state.

**Smart change detection** — Only rebuilds Docker if backend files changed. Frontend-only pushes skip the image build and Trivy scan entirely. Add `[deploy]` to a commit message to force a full deploy regardless.

**Blue-green deployment** — New Cloud Run revision deploys at 0% traffic, gets health-checked, then promoted. Previous revision stays live until promotion succeeds.

---

## Dashboard — 4 Tabs

| Tab | What's inside |
|---|---|
| **Overview** | Health score, avg risk, block rate KPIs · Risk trend area chart · Allow vs block pie · Severity distribution bar · Security posture radar · Daily activity · Latest 5 commits |
| **Pipeline** | Live running pipelines with animated step nodes · Recent completed runs · Expand any commit to see full stage detail + AI analysis |
| **AI Insights** | Prometheus-style arc gauges (block rate, AI coverage, confidence) · Confidence histogram · Risk-by-repo heatmap · AI confidence vs risk scatter plot · All blocked commits with full AI explanations and remedies |
| **Metrics** | Daily scan volume · Risk distribution · Cumulative block rate · AI confidence over time · Pipeline stage pass rates |

---

## Policy Gate

```yaml
default:
  block_on: [CRITICAL, HIGH]
  warn_on: [MEDIUM]
  cvss_threshold: 7.0        # blocks MEDIUM CVEs with CVSS ≥ 7.0 too

repos:
  SecureFlow:
    block_on: [CRITICAL]     # relaxed: base image has unfixable OS-level HIGHs
    warn_on: [HIGH, MEDIUM]
    allowlist:
      - cve: CVE-2005-2541
        expires: 2026-12-01
        reason: "tar, no upstream fix, Debian ships it unfixed by design"
```

---

## AI Fallback Chain

```
Groq (llama-3.3-70b-versatile) → Gemini (gemini-2.5-flash-lite) → Ollama (qwen2.5:7b, local)
```

Each provider only tried if its API key is configured. Ollama runs locally — pipeline never fully fails without internet access.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Pipeline | GitHub Actions (16 steps) |
| Secret scan | Gitleaks v8.24.3 |
| SAST | Semgrep (OWASP Top 10, Python, Secrets) |
| Container scan | Trivy |
| Backend | FastAPI + PostgreSQL + Redis |
| AI | Groq → Gemini → Ollama |
| Frontend | React + Recharts + Framer Motion + WebSockets |
| Infra | GCP Cloud Run + Artifact Registry |
| Metrics | Prometheus + Grafana |

---

## Local Setup

```bash
git clone https://github.com/abhienix/SecureFlow.git
cd SecureFlow
docker compose up -d
```

| Service | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Grafana | http://localhost:3001 (admin / admin) |

**Required GitHub Secrets:** `BACKEND_URL` · `GCP_SA_KEY`

---

## Project Structure

```
SecureFlow/
├── .github/workflows/secureflow.yml   # 16-step CI/CD pipeline
├── backend/
│   ├── main.py                        # FastAPI — REST + WebSocket + Copilot API
│   ├── policy_engine.py               # Evaluates policy.yaml per repo
│   └── ai_analysis.py                 # Groq → Gemini → Ollama fallback chain
├── frontend/
│   └── src/App.jsx                    # Single-page dashboard (4 tabs + AI Copilot)
├── policy.yaml                        # Security thresholds + CVE allowlist
└── docker-compose.yml                 # Local dev stack
```

---

<p align="center">
Built by <a href="https://github.com/abhienix">Abhimanyu Kumar</a> ·
<a href="https://www.linkedin.com/in/abhimanyu-sec">LinkedIn</a>
</p>
