# 🛡️ SecureFlow — Enterprise DevSecOps Security Gate & Intelligence Platform

> **Full-Spectrum DevSecOps CI/CD Pipeline & Security Platform** — Scans every commit for exposed secrets (**Gitleaks**), SAST patterns (**Semgrep**), container vulnerabilities (**Trivy**), and live API runtime flaws (**OWASP ZAP DAST**). Enforces dynamic security policies (`policy.yaml`) and streams real-time telemetry to an interactive React dashboard with an AI Copilot.

![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=github-actions&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![GCP Cloud Run](https://img.shields.io/badge/Cloud_Run-4285F4?style=flat-square&logo=google-cloud&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![OWASP ZAP](https://img.shields.io/badge/OWASP_ZAP-DAST-FF6B6B?style=flat-square&logo=owasp&logoColor=white)

**🚀 Live Production Dashboard → [https://secureflow-frontend-1083585992526.us-central1.run.app/](https://secureflow-frontend-1083585992526.us-central1.run.app/)**

---

## 💡 The "Why" Behind the Project (Interview Talking Points)

### 1. Why a Multi-Scanner Gate? (SAST + SCA + Secrets + DAST)
Single-scanner approaches leave massive blind spots. An application can pass dependency scans but ship with hardcoded API keys, or pass static code analysis but expose severe security gaps at runtime. 

SecureFlow addresses this by building an **end-to-end security pipeline** spanning four distinct layers:
*   **Secret Scanning (Gitleaks)**: Prevents exposed credentials from entering version control history.
*   **Static Application Security Testing (Semgrep)**: Identifies bad code patterns (SQL injection, weak cryptography) inside Python source files.
*   **Software Composition Analysis (Trivy)**: Inspects the final Docker container image layers for package CVEs.
*   **Dynamic Application Security Testing (OWASP ZAP)**: Actively probes live API endpoints on Google Cloud Run to verify that runtime configuration is robust.

### 2. Heuristics vs. AI Decision Model
Using LLMs as hard-blocking gates is a bad idea—they are slow, expensive, and subject to hallucinations (e.g. declaring a clean library malicious).

SecureFlow implements a **fast local security funnel** with **deferred AI intelligence**:
1.  **Local Policy Engine**: Instantly evaluates scan results against [`policy.yaml`](policy.yaml) rules (CVSS score thresholds and allowlists). It runs at **~0ms latency** with **100% cost-efficiency**, deciding whether to `ALLOW` or `BLOCK` the build.
2.  **Void AI Remedy Engine**: Escapes to the LLM **after the policy decision is made** to generate explanations, remediation patches, and step-by-step containment instructions. The AI never controls the gate directly, protecting pipeline stability.

### 3. Comparison: Local Policies vs. AI Remediation

| Metric | Local Policy Engine (`policy.yaml`) | Void AI Remediation Engine |
| :--- | :--- | :--- |
| **Execution Latency** | ~0ms (Instantaneous) | ~1.2s (Groq LPU Inference) |
| **Cost Profile** | $0.00 (Local CPU execution) | Extremely low (Structured fallback chain) |
| **Primary Goal** | Binary decision (`ALLOW` / `BLOCK`) | High-fidelity diagnostic explanations & patches |
| **Failure Mode Resilience** | Deterministic (Zero false positives/negatives) | Graceful degradation (Static fallbacks on failure) |
| **Active Rules** | Severity levels, CVSS, allowlist expiries | Groq (Llama 3.3) $\rightarrow$ Gemini $\rightarrow$ local Ollama |

---

## 📐 System Architecture

### 1. Operational DevSecOps Lifecycle
This flow shows how code commits travel from a local Git push through the multi-stage GitHub Actions runner, policy evaluation gate, production deployment, and live API dynamic tests:

```mermaid
graph TB
    DEV([👨‍💻 git push]) --> GHA

    subgraph GHA["⚙️ GitHub Actions CI/CD Pipeline — 7 Stages"]
        CK[🔄 Stage 0: Checkout]
        GL[🔑 Stage 1: Code Scan\nGitleaks & Semgrep SAST]
        DB[🐳 Stage 2: Docker Build\n& Artifact Registry Push]
        TV[📦 Stage 3: Trivy CVE Scan]
        CK --> GL --> DB --> TV
    end

    TV --> PG

    subgraph PG["🛡️ Stage 4: Policy Gate — policy.yaml"]
        SEV[Severity Rules\nblock_on · warn_on]
        CV[CVSS Threshold\n≥ 7.0 blocks build]
        AL[Allowlist Engine\nper-CVE auto-expiry]
    end

    GL -->|secrets/SAST flaw| BLK1([🚫 BLOCK])
    PG -->|policy violation| BLK2([🚫 BLOCK])

    PG -->|ALLOW| CR[☁️ Stage 5: Cloud Run Deploy\nBackend & Frontend]
    CR --> ZAP[⚡ Stage 6: OWASP ZAP DAST Scan\nLive API Security Probe]

    BLK1 & BLK2 --> AI

    subgraph AI["🤖 AI Engine — ai_analysis.py"]
        GR[Groq · llama-3.3-70b\nPrimary]
        GM[Gemini · flash-lite\nFallback]
        OL[Ollama · qwen2.5:7b\nLocal Resort]
        GR -->|fail| GM -->|fail| OL
    end

    AI -->|explanation + fix\n+ risk score 1–10| BE

    subgraph BE["🐍 FastAPI Backend — Google Cloud Run"]
        WS[WebSocket Broadcaster]
        SLK[Slack Webhook Dispatcher\n#devsecops-alerts]
        DB_PG[(PostgreSQL Scan History)]
    end

    WS -->|real-time push| DASH

    subgraph DASH["⚛️ React Dashboard — 4 Interactive Tabs"]
        OV[Security Command Center\nTelemetry Matrix · Compliance Radar · Real-time Feed]
        PL[Pipeline Execution\n7-Stage Flow · Terminal Inspector · Deduplicated Live Banner]
        INS[AI Insights\nRemedies · Feedback Rating]
        MT[Metrics & Policy\nPolicy Sandbox · Active Rules · Webhook Dispatcher]
        COP[🤖 AI Security Copilot\nContext-aware Q&A Chat]
    end

    style BLK1 fill:#e03131,color:#fff
    style BLK2 fill:#e03131,color:#fff
    style CR   fill:#0c8599,color:#fff
    style ZAP  fill:#2f9e44,color:#fff
    style GR   fill:#4dabf7,color:#fff
    style COP  fill:#845ef7,color:#fff
```

### 2. Telemetry & AI Copilot Loop
This diagram highlights the database-to-UI real-time streaming pipeline and the context-aware chatbot (Void) data flow:

```mermaid
flowchart LR
    Ingest["Ingested Scan Results"] --> DB[(PostgreSQL DB)]
    DB --> FastAPI["FastAPI Server"]
    FastAPI -->|WebSocket Stream| WebUI["React Dashboard UI"]
    
    subgraph Void Chatbot [Void AI Security Copilot]
        WebUI -->|Question + Scan Context| CopilotAPI["POST /api/copilot/ask"]
        CopilotAPI -->|Context + Prompt| LPU["Groq Llama 3.3 (Fallback: Gemini/Ollama)"]
        LPU -->|Plain Text Answer| CopilotAPI
        CopilotAPI -->|Rendered Answer| WebUI
    end
    
    FastAPI -->|Slack Webhook Alert| Slack["Slack Channel (#devsecops-alerts)"]
```

---

## 🛠️ The Tech Stack: Simple Choices, Big Engineering Impact

*   **Backend: FastAPI (Python)**
    *   *Why?* FastAPI delivers high-concurrency event loops, making it perfect for handling WebSocket streams from multiple CI/CD agents concurrently.
*   **Database Access: SQLAlchemy 2.0 (Async Driver via `asyncpg`)**
    *   *Why?* The backend leverages non-blocking PostgreSQL pools (`create_async_engine` and `async_sessionmaker`), protecting server performance during high-throughput security event logs telemetry spikes.
*   **Frontend: React + Recharts + Framer Motion**
    *   *Why?* React allows us to build a responsive, modular tab structure. Recharts provides high-density rendering for severity lines and area gradients. Framer Motion provides smooth layout animations for tabs and drawers.
*   **AI Engine Fallback Chain: Groq Llama 3.3 ➔ Gemini Flash-Lite ➔ Local Ollama**
    *   *Why?* Ensures our developer diagnostics never go offline. If the primary cloud LPU limits are exceeded or the network is down, the engine falls back to Gemini and then to a locally hosted Ollama model.
*   **Slack Webhook Alert Integration**
    *   *Why?* Delivers instantaneous pipeline blocks directly into Slack channels (`#devsecops-alerts`) so engineering teams can immediately trigger remediation tasks.

---

## 🚀 Key UX & Hardening Upgrades

1.  **Async Database Transaction Hardening**:
    *   Migrated the FastAPI database layer from synchronous psycopg2 blocking database sessions to asyncpg pools.
    *   Refactored 9 distinct endpoints and the background watchdog timer to use modern SQLAlchemy 2.0 `select()` syntax and `await db.execute()`.
2.  **App Layout Modularization**:
    *   Refactored a monolithic `App.jsx` by decoupling modular tab panels and common widgets under `/components/` and `/utils/`.
    *   Converted the rigid stacked bar charts into a glowing smooth monotone AreaChart using transparent gradient overlays.
3.  **Mobile Viewport & Responsiveness Polish**:
    *   Hides the text logo `.brand-name` on viewports $\le 600\text{px}$, keeping navigation controls on a single line.
    *   Uses `.hide-mobile` to collapse header labels (such as "Live" status and "Export Audit" text) into simple icons on small mobile screens.
    *   Adjusts chart grid columns in the Overview Tab using `minmax(280px, 1fr)` to prevent layout overflows.
    *   Constrains the floating Slack alert toast with `maxWidth: "calc(100vw - 48px)"` to prevent off-screen rendering.

---

## ⚙️ Running Locally

### 1. Run the Backend Service (FastAPI)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables in `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/secureflow
   GROQ_API_KEY=gsk_your_key_here
   GEMINI_API_KEY=your_gemini_key
   SLACK_WEBHOOK_URL=your_slack_webhook
   ```
5. Launch the FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### 2. Launch the React Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Launch the development server:
   ```bash
   npm start
   ```
   Open `http://localhost:3000` in your browser.

---

## 📜 License

MIT License. Developed for enterprise security gating, CI/CD telemetry analysis, and developer interviews.

<p align="center">
  Built by <a href="https://github.com/abhienix">Abhimanyu Kumar</a> · 
  <a href="https://www.linkedin.com/in/abhimanyu-sec">LinkedIn</a>
</p>
