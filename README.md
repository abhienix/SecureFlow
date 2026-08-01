# 🛡️ SecureFlow — Enterprise DevSecOps Security Gate & Intelligence Platform

[![CI/CD Pipeline](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue?logo=github-actions)](https://github.com/abhienix/SecureFlow/actions)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Backend](https://img.shields.io/badge/Backend-Python%203.11%20%7C%20FastAPI-009688?logo=python)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript-61DAFB?logo=react)](https://reactjs.org/)
[![Containers](https://img.shields.io/badge/Containers-Docker%20%7C%20Cloud%20Run-2496ED?logo=docker)](https://www.docker.com/)
[![DAST](https://img.shields.io/badge/DAST-OWASP%20ZAP-FF6F00?logo=owasp)](https://www.zaproxy.org/)
[![Container Security](https://img.shields.io/badge/SCA-Trivy-1976D2)](https://trivy.dev/)
[![SAST](https://img.shields.io/badge/SAST-Semgrep-6B5B95)](https://semgrep.dev/)
[![Secret Detection](https://img.shields.io/badge/Secrets-Gitleaks-E040FB)](https://github.com/gitleaks/gitleaks)
[![Void AI](https://img.shields.io/badge/Copilot-Void%20AI-6366F1?logo=sparkles)](#-void-ai-copilot--enterprise-ai-server-architecture)

**SecureFlow** is an enterprise-grade, shift-left DevSecOps Security Intelligence & Automated Gating Platform. It monitors every commit and pull request for exposed secrets (Gitleaks), static analysis flaws (Semgrep), container vulnerabilities (Trivy), and dynamic web vulnerabilities (OWASP ZAP). SecureFlow enforces zero-trust security policies (`policy.yaml`), streams real-time telemetry over WebSockets (< 15ms latency), and features **Void AI** — an autonomous security copilot trained on codebase topology and scan findings.

---

## 🏛️ Master System Architecture (One-View Map)

Below is the complete, single-view architectural map showing how all core operational layers of SecureFlow interact:

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#ffffff', 'primaryTextColor': '#000000', 'primaryBorderColor': '#000000', 'lineColor': '#333333'}}}%%
flowchart TD
    classDef layer fill:#f8fafc,stroke:#334155,stroke-width:2px,stroke-dasharray: 5 5;
    classDef service fill:#ffffff,stroke:#0f172a,stroke-width:1px;

    %% ----------------------------------------------------
    %% Layers Definitions
    %% ----------------------------------------------------
    subgraph Dev_Layer [💻 Developer Layer]
        dev[Developer Workstation]:::service
    end
    class Dev_Layer layer;

    subgraph CICD_Layer [⚙️ CI/CD Execution Layer]
        github[GitHub Repository]:::service
        subgraph GHA_Pipeline [GitHub Actions Runner]
            c1[Checkout] --> c2[Gitleaks] --> c3[Semgrep] --> c4[Docker Build] --> c5[Trivy] --> c6[Policy Engine] --> c7[Deploy Staging] --> c8[Trigger DAST] --> c9[Deploy Production]
        end
    end
    class CICD_Layer layer;

    subgraph Client_Layer [📊 Client Interface Layer]
        dashboard[React Executive Dashboard]:::service
        void_drawer[Void AI Copilot Drawer]:::service
        console[Admin Management Console]:::service
        notifs[Notification Center]:::service
    end
    class Client_Layer layer;

    subgraph Backend_Layer [⚡ Cloud Backend Layer - API Gateway & Internal Services]
        gateway[API Gateway / Auth Router]:::service
        repo_svc[Repository Service]:::service
        pipe_svc[Pipeline Service]:::service
        find_svc[Findings Service]:::service
        dep_svc[Deployment Service]:::service
        pol_svc[Policy Evaluator]:::service
        ai_gtw[AI Gateway]:::service
        obs_svc[Observability Service]:::service
        ws_mgr[WebSocket Manager]:::service
        
        gateway --> repo_svc & pipe_svc & find_svc & dep_svc & pol_svc & ai_gtw & obs_svc & ws_mgr
    end
    class Backend_Layer layer;

    subgraph AI_Layer [🧠 AI Intelligence Layer]
        conv_mgr[Conversation Manager]:::service
        ctx_bld[Context Builder RAG]:::service
        rag_eng[RAG Embeddings Engine]:::service
        mcp_srv[MCP Server Context]:::service
        guardrails[Guardrails & Safety Filters]:::service
        prompt_mgr[Prompt Manager]:::service
        ollama[Ollama Engine Host]:::service
        qwen[Qwen2.5 3B Model]:::service
        nomic[nomic-embed-text]:::service
        chroma[(ChromaDB Vector Store)]:::service
        remedy[Remediation Engine]:::service

        ai_gtw --> conv_mgr --> ctx_bld --> rag_eng --> mcp_srv --> prompt_mgr --> guardrails --> ollama
        ollama --> qwen & nomic
        rag_eng --> chroma
        ctx_bld --> remedy
    end
    class AI_Layer layer;

    subgraph Data_Layer [🗄️ Databases & Cache Layer]
        pg[(PostgreSQL DB)]:::service
        redis[Redis Queue & PubSub]:::service
        prom[(Prometheus Server)]:::service
    end
    class Data_Layer layer;

    subgraph Worker_Layer [🖥️ Worker Execution Layer]
        celery[Celery Task Consumer]:::service
        docker[Docker Engine Socket]:::service
        zap[OWASP ZAP Container]:::service
        health[Worker Health Agent]:::service
        heartbeat[Heartbeat Service]:::service

        celery --> docker --> zap
        health --> heartbeat
    end
    class Worker_Layer layer;

    subgraph Ext_Layer [🌐 External Integrations Layer]
        github_api[GitHub REST API]:::service
        slack[Slack Webhook App]:::service
        staging_env[Cloud Run Staging Staging]:::service
        prod_env[Cloud Run Production Prod]:::service
    end
    class Ext_Layer layer;

    %% ----------------------------------------------------
    %% Communication & Flows Between Layers
    %% ----------------------------------------------------
    dev ==>|1. git push / PR| github
    github -->|2. Trigger| GHA_Pipeline
    
    %% CI progress to Backend (HTTP Sync)
    GHA_Pipeline -->|3. HTTP Progress PATCH| gateway
    
    %% Deployments to Cloud Run
    c7 -->|Deploy Image| staging_env
    c9 -->|Deploy Image| prod_env

    %% Client Dashboard connections
    dashboard & void_drawer & console & notifs ==>|HTTP REST Calls| gateway
    gateway -.->|Sub-15ms WebSocket push| dashboard

    %% Backend Data Access (All data flows through Backend Services)
    repo_svc & pipe_svc & find_svc & dep_svc & pol_svc & obs_svc ==>|SQL Queries| pg
    pipe_svc & dep_svc -.->|Enqueue DAST / Cache| redis
    obs_svc -.->|Scrape Metrics| prom

    %% Worker DAST Flow (Out of process)
    redis -.->|DAST Task Queue| celery
    zap -->|Attack Scan Target| staging_env
    celery ==>|Persist Findings| pg
    heartbeat -.->|Worker Heartbeat (30s)| redis

    %% AI Integrations
    ctx_bld ==>|Read DB Findings| pg
    remedy -.->|Create Pull Requests| github_api
    obs_svc -.->|Send Slack Alerts| slack

    %% Styling / Legend Links (Mermaid default class association)
    class dev,github,c1,c2,c3,c4,c5,c6,c7,c8,c9,dashboard,void_drawer,console,notifs,gateway,repo_svc,pipe_svc,find_svc,dep_svc,pol_svc,ai_gtw,obs_svc,ws_mgr,conv_mgr,ctx_bld,rag_eng,mcp_srv,guardrails,prompt_mgr,ollama,qwen,nomic,chroma,remedy,pg,redis,prom,celery,docker,zap,health,heartbeat,github_api,slack,staging_env,prod_env service;
```

### 🔄 Enterprise Workflow Sequence Diagrams

Expand the sections below to view the detailed operational sequences and data flows across layers:

<details>
<summary><b>1. CI/CD Workflow Sequence</b></summary>

This sequence diagram maps the progression of the GitHub Actions pipeline, showing static analysis, docker packaging, and policy evaluation before staging deployments are triggered.

```mermaid
sequenceDiagram
    autonumber
    actor Developer
    participant GitHub
    participant Runner as GHA Runner
    participant Backend as FastAPI Gateway
    participant Staging as Cloud Run Staging

    Developer->>GitHub: git push / Pull Request
    GitHub->>Runner: Trigger Workflow (security-pipeline.yml)
    
    critical Static Security Analysis
        Runner->>Runner: Checkout Code
        Runner->>Runner: Run Gitleaks (Secrets)
        Runner->>Runner: Run Semgrep (SAST)
    end

    critical Container Packaging & SCA
        Runner->>Runner: Docker Build
        Runner->>Runner: Run Trivy Scan (SCA / CVE)
    end

    Runner->>Backend: POST /api/scan-results/start (Static Metrics)
    Backend-->>Runner: 200 OK (run_id)

    Runner->>Backend: GET /api/policy (Verify policy.yaml gate)
    Backend-->>Runner: Policy Evaluation Result (PASS / FAIL)

    alt Policy Gate Pass
        Runner->>Staging: Deploy Backend Container to Staging Cloud Run
        Staging-->>Runner: Deployment Successful (Return Staging URL)
        Runner->>Backend: PATCH /api/scan-results/{run_id}/progress (Staging Deployment Completed)
    else Policy Gate Fail
        Runner->>Developer: Terminate pipeline & Send Slack Alert
    end
```

</details>

<details>
<summary><b>2. Asynchronous DAST Workflow Sequence</b></summary>

This diagram details the sequence for the asynchronous, out-of-process DAST worker scanning lifecycle. It shows how the tasks are queued, executed via Docker, and persisted.

```mermaid
sequenceDiagram
    autonumber
    participant GHA as GHA Runner
    participant API as FastAPI Gateway
    participant Redis as Redis Queue
    participant Worker as DAST Worker VM
    participant ZAP as OWASP ZAP Container
    participant Target as Cloud Run Staging
    participant DB as PostgreSQL DB
    participant UI as React Dashboard

    GHA->>API: POST /api/v1/dast/start (target_url, run_id)
    API->>DB: Update ScanResult (dast_status = "queued")
    API->>Redis: Enqueue task: tasks.run_zap_scan
    API-->>GHA: 202 Accepted (DAST Enqueued)

    Note over Worker: Polls Redis Queue
    Worker->>Redis: Pop task (scan_id, target_url)
    Worker->>DB: Update ScanResult (dast_status = "running", worker_name)
    
    critical Execute DAST Docker Container
        Worker->>ZAP: docker run ghcr.io/zaproxy/zaproxy:stable
        ZAP->>Target: HTTP Dynamic Attack Vectors (XSS, SQLi, etc.)
        Target-->>ZAP: HTTP Responses
        ZAP-->>Worker: Export ZAP Report (JSON findings)
    end

    Worker->>DB: Persist SecurityFinding records
    Worker->>DB: Update ScanResult (dast_status = "completed", zap_gate = PASS/BLOCK)
    Worker->>API: Trigger WebSocket Broadcast
    API->>UI: Stream updates (ws/events - Telemetry)
```

</details>

<details>
<summary><b>3. Void AI Copilot Request Flow Sequence</b></summary>

All Void AI Copilot requests are routed through the secure FastAPI AI Gateway, incorporating database scan context, local RAG document stores, and system prompts.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as React UI (Void Drawer)
    participant Gateway as FastAPI AI Gateway
    participant Context as Context Builder
    participant DB as PostgreSQL DB
    participant RAG as RAG Embeddings Engine
    participant Chroma as ChromaDB Vector Store
    participant Prompt as Prompt Manager & Guardrails
    participant Ollama as Ollama / Groq Engine

    User->>UI: Submit Security Query ("How do I fix finding 102?")
    UI->>Gateway: POST /api/copilot/ask (query, scan_id)
    
    Gateway->>Context: Request Scan & Finding Context
    Context->>DB: Fetch Finding 102 & Scan Metadata
    DB-->>Context: Return finding details, CVE, code snippet
    Context-->>Gateway: Return Structured Scan Context
    
    Gateway->>RAG: Retrieve Semantically Similar Security Rules
    RAG->>Chroma: Query embeddings for CVE / OWASP guidelines
    Chroma-->>RAG: Return reference solutions
    RAG-->>Gateway: Return RAG Context
    
    Gateway->>Prompt: Compile prompt (System Instructions + Context + Query)
    Prompt->>Prompt: Filter Prompt against Security Guardrails
    Prompt-->>Gateway: Sanitized Payload
    
    Gateway->>Ollama: Dispatch LLM Request (Qwen2.5 / DeepSeek / Gemini)
    Ollama-->>Gateway: Generate Text Response
    
    Gateway->>UI: Return Markdown Response + Suggested Actions
    UI->>User: Display Explanation & Fix Recommendations
```

</details>

<details>
<summary><b>4. Automated Code Remediation Sequence</b></summary>

This sequence shows the path for automated code remediation, where Void AI synthesizes a line-by-line patch and pushes a Pull Request directly to GitHub for developer review.

```mermaid
sequenceDiagram
    autonumber
    actor Developer
    participant UI as React UI (Findings Details)
    participant API as FastAPI Backend
    participant Remedy as Remediation Engine
    participant AI as Void AI LLM Router
    participant GitAPI as GitHub REST API

    Developer->>UI: Click "Generate Automated Pull Request"
    UI->>API: POST /api/v1/findings/{id}/remediate
    
    API->>Remedy: Trigger Code Patch Generation
    Remedy->>API: Retrieve local repository file contents
    API-->>Remedy: Return file source code & target line numbers
    
    Remedy->>AI: Generate Patch Diff (Source Code + Finding Description)
    AI-->>Remedy: Return Sanitized unified diff patch
    
    Remedy->>Remedy: Validate diff structure against target file
    
    Remedy->>GitAPI: Create Git Branch (e.g., secureflow-patch-102)
    Remedy->>GitAPI: Commit modified file patch
    Remedy->>GitAPI: Open Pull Request ("fix(security): resolve vulnerability 102")
    GitAPI-->>Remedy: Pull Request Created Successfully (PR URL)
    
    Remedy-->>API: Return PR URL & Success Code
    API-->>UI: Return PR URL to UI
    UI-->>Developer: Show "Pull Request #15 Created! Click to Review"
```

</details>

### ✏️ Eraser.io Diagram-as-Code Specs

For a clean, uncoloured, whiteboard-style visual architecture, copy and paste the following specifications directly into [Eraser.io](https://www.eraser.io/):

<details>
<summary><b>1. Master System Architecture Flow (Click to Expand)</b></summary>

```text
// Nodes
developer [icon: "terminal", label: "Developer Git Push / PR"]

// CI/CD Workflow Group
subgraph CI_Pipeline [label: "GitHub Actions 9-Stage Pipeline"] {
  checkout [label: "1. Checkout"]
  code_scan [icon: "shield", label: "2. SAST & Secrets Scan"]
  docker_build [icon: "docker", label: "3. Docker Build"]
  trivy_scan [icon: "shield-check", label: "4. Trivy CVE Scan"]
  policy_gate [icon: "lock", label: "5. Policy Gate (yaml)"]
  deploy_staging [icon: "cloud", label: "6. Deploy Staging"]
  owasp_zap [icon: "bug", label: "7. OWASP ZAP DAST"]
  zap_gate [icon: "shield-alert", label: "8. ZAP Gate"]
  deploy_prod [icon: "rocket", label: "9. Deploy Production"]
}

// FastAPI Backend & DAST Cluster Group
subgraph Backend_Cluster [label: "FastAPI Backend & DAST Cluster"] {
  fastapi [icon: "cpu", label: "FastAPI Gateway"]
  redis_queue [icon: "database", label: "Redis & Celery Queue"]
  dast_worker [icon: "server", label: "DAST Worker Process"]
  zap_container [icon: "docker", label: "ZAP Docker Container"]
}

// Databases Group
subgraph Data_Layer [label: "Data & Cache Layer"] {
  postgres [icon: "postgresql", label: "PostgreSQL Database"]
  redis_cache [icon: "database", label: "Redis Cache"]
}

// AI Copilot Group
subgraph AI_Engine [label: "Void AI Copilot Engine"] {
  context_builder [icon: "settings", label: "Context Builder"]
  llm_router [icon: "cpu", label: "LLM Provider Chain"]
}

// Frontend Group
subgraph Frontend_App [label: "React 19 Executive Dashboard"] {
  node_graph [icon: "layout", label: "9-Node Animated Graph"]
  copilot_drawer [icon: "message-square", label: "Void AI Copilot Drawer"]
  security_hub [icon: "activity", label: "Security Center & Findings"]
}

// Connections
developer > checkout : "push / PR"
checkout > code_scan
code_scan > docker_build
docker_build > trivy_scan
trivy_scan > policy_gate
policy_gate > deploy_staging : "ALLOW"
deploy_staging > owasp_zap
owasp_zap > zap_gate
zap_gate > deploy_prod : "ALLOW"

// CI Progress streams to FastAPI
CI_Pipeline > fastapi : "Micro Progress PATCH"

// DAST Enqueue and execution
fastapi > redis_queue : "Enqueue Task"
redis_queue > dast_worker : "Pull Task"
dast_worker > zap_container : "Execute (Docker Socket)"
zap_container > deploy_staging : "HTTP Attack Vectors"
zap_container > dast_worker : "Scan Results (JSON)"
dast_worker > postgres : "Insert Findings"
dast_worker > fastapi : "WS Broadcast Trigger"

// Data persistence & cache
fastapi > postgres : "Read/Write State"
fastapi > redis_cache : "Heartbeat / Cache"

// WebSocket push to UI
fastapi > node_graph : "sub-15ms WebSocket"
fastapi > security_hub

// AI Context & flow
postgres > context_builder : "DB Scan History"
context_builder > llm_router : "RAG Context"
llm_router > copilot_drawer : "Security Insights & Patches"
```

</details>

<details>
<summary><b>2. DAST Out-of-Process Worker Flow (Click to Expand)</b></summary>

```text
// Define participants
GHA [icon: "github", label: "GitHub Actions"]
FastAPI [icon: "cpu", label: "FastAPI Gateway"]
Redis [icon: "database", label: "Redis Queue"]
Worker [icon: "server", label: "DAST Worker"]
Docker [icon: "docker", label: "ZAP Docker"]
DB [icon: "postgresql", label: "PostgreSQL DB"]
ReactApp [icon: "layout", label: "React Dashboard"]

// Sequence Flow
GHA > FastAPI : "POST /api/v1/dast/start"
FastAPI > DB : "Create ScanResult (status: QUEUED)"
FastAPI > Redis : "Push Job to dast_queue"
FastAPI > GHA : "200 OK / 202 Accepted"

Worker > Redis : "Pop Job from dast_queue"
Worker > DB : "Update status: RUNNING & assign worker"
Worker > Docker : "docker run -v ZAP scan target_url"
Docker > Worker : "Return scan findings JSON"

Worker > DB : "Store findings & update status: COMPLETED"
Worker > FastAPI : "WS Event trigger callback"
FastAPI > ReactApp : "Broadcast WS update (telemetry)"
```

</details>

<details>
<summary><b>3. Component Dependency Topology (Click to Expand)</b></summary>

```text
// Components
frontend [icon: "layout", label: "React 19 Frontend"]
api_gateway [icon: "cpu", label: "FastAPI API Gateway"]
worker_pool [icon: "server", label: "Out-of-Process Workers"]
db_pg [icon: "postgresql", label: "PostgreSQL DB"]
broker_redis [icon: "database", label: "Redis Queue & PubSub"]

// Layout groupings
Infrastructure {
  db_pg
  broker_redis
}

Services {
  api_gateway
  worker_pool
}

// Dependency Paths
frontend > api_gateway : "REST / WebSocket"
api_gateway > db_pg : "CRUD (SQLAlchemy)"
api_gateway > broker_redis : "Heartbeats & Queuing"
worker_pool > broker_redis : "Job Queue Poll"
worker_pool > db_pg : "Persist scan findings"
```

</details>

---

## 🌟 9-Stage DevSecOps Pipeline Flow

SecureFlow visualizes pipeline execution using an 9-node animated visual graph in 1-to-1 sync with GitHub Actions logs:

$$\begin{aligned}
\text{Checkout} &\longrightarrow \text{Code Scan} \longrightarrow \text{Docker Build} \longrightarrow \text{Trivy CVE} \longrightarrow \text{Policy Gate ①} \\
&\longrightarrow \text{Deploy Staging} \longrightarrow \text{OWASP ZAP DAST} \longrightarrow \text{ZAP Gate ②} \longrightarrow \text{Deploy Prod}
\end{aligned}$$

| Stage | Icon | Scanner / Tool | Description |
| :--- | :---: | :--- | :--- |
| **1. Checkout** | `GitBranch` | Git | Codebase checkout & HEAD SHA resolution |
| **2. Code Scan** | `Shield` | Gitleaks + Semgrep | SAST vulnerability audit & secret exposure check |
| **3. Docker Build** | `Box` | Docker | Container image assembly & Artifact Registry push |
| **4. Trivy CVE** | `ScanSearch` | Trivy SCA | Base image & package dependency CVE scanning |
| **5. Policy Gate ①** | `Lock` | Policy Engine | Evaluates `policy.yaml` rules against SAST/CVE findings |
| **6. Deploy Staging** | `Server` | Cloud Run | Deploys backend application to GCP staging environment |
| **7. OWASP ZAP** | `Bug` | OWASP ZAP | Executes dynamic DAST security scanning against staging URL |
| **8. ZAP Gate ②** | `ShieldCheck` | ZAP Gate | Verifies runtime DAST risk thresholds (Blocks on High/Critical) |
| **9. Deploy Prod** | `Rocket` | Cloud Run | Promotes approved image to production environment |

---

## 🚀 The 4 Pillars of 1-to-1 Real-Time Sync

1. **Step-by-Step Micro-Triggers**: Every step in `.github/workflows/security-pipeline.yml` fires a progress payload to `/api/scan-results/$RUN_ID/progress` when it starts and completes.
2. **Sub-15ms WebSocket Push (`/ws/events`)**: FastAPI broadcasts `scan_update` events over WebSockets to all connected dashboard clients in < 15ms.
3. **Sequential Stage Resolution (`PipelineNodeGraph.tsx`)**: Enforces `hasIncompleteSteps` so downstream nodes (`Deploy Staging`, `OWASP ZAP`, `ZAP Gate`, `Deploy Prod`) remain ⚪ `PENDING` until GitHub Actions actually executes them.
4. **3-Tier Reliability Safety Nets**:
   - **Tier 1 (Instant)**: Step-by-step CI progress curl calls.
   - **Tier 2 (Real-time)**: GitHub Webhooks (`/api/webhooks/github`).
   - **Tier 3 (Fallback)**: GitHub Actions API Watchdog (`github_polling_watchdog`) querying every 10s.

---

## 🤖 Void AI Copilot & Enterprise AI Server Architecture

Void is an autonomous security intelligence copilot built directly into the SecureFlow dashboard, backed by an enterprise RAG and multi-model AI Server architecture:

```text
AI Server
├── Ollama Engine
│      ├── DeepSeek (deepseek-coder:6.7b / deepseek-r1)
│      ├── Qwen (qwen2.5:7b / qwen2.5:3b)
│      └── nomic-embed-text (Vector Embedding Pipeline)
├── ChromaDB / Vector Store (RAG Storage)
├── MCP Server (Model Context Protocol)
├── RAG Engine (Retrieval-Augmented Generation)
├── Embedding Pipeline (Codebase & Finding Indexing)
├── AI Gateway (FastAPI REST & Sub-15ms WebSockets)
├── LLM Router (Task-Aware Model Dispatcher)
├── Context Builder (Real-Time DB State Ingestion)
├── Conversation Memory (Zustand State)
├── Prompt Manager & Security System Instructions
├── Remediation Engine (Line-by-Line Code Patches)
├── Security Knowledge Base (OWASP, CWE, CVE Rules)
└── Security Guardrails Engine (Context & Safety Boundary Filter)
```

### AI Component Architecture
- **RAG & Embedding Pipeline**: Uses `nomic-embed-text` with ChromaDB to index codebase snippets, CVE definitions, and OWASP remediation guidelines for semantic retrieval.
- **Intelligent LLM Router**: Dynamically dispatches code patch synthesis to **DeepSeek** (`deepseek-coder:6.7b` / `llama-3.3-70b`), general security analysis to **Qwen** (`qwen2.5:7b` / `gemini-2.0`), and fallback queries to local offline models.
- **AI Gateway & Context Builder**: Serves `/api/copilot/ask` REST queries and WebSocket events while ingesting real-time DB state (latest 50 scans, 50 earliest scans, 500 security findings, active Cloud Run deployments, policy definitions).
- **Exact Query Parsing**: Handles single commit lookups (`"tell me no 1 commit"` returns Commit #1 from repository history), range queries (`"show last 10 commits"`), negation filtering (`"not 610"`), and exact ID lookups (`"show scan 608"`).
- **Remediation Engine**: Synthesizes line-by-line code patches, sanitized query parameters, and credential rotation steps.
- **Security Guardrails Engine**: Enforces strict security domain boundaries, redacting sensitive tokens and rejecting off-topic prompts.

---

## 🧰 Tech Stack Breakdown

| Category | Component / Tool | Purpose / Usage |
| :--- | :--- | :--- |
| **CI/CD Pipeline** | GitHub Actions, Gitleaks, Semgrep, Trivy, OWASP ZAP | Pipeline automation, static analysis, container scanning & DAST |
| **Backend Core** | Python 3.11, FastAPI, Uvicorn, SQLAlchemy 2.0 (Async) | Async REST API, WebSockets, ORM data layer |
| **Worker & Queue** | Celery, Redis, GCP Compute Engine | Distributed DAST worker queue and container execution |
| **Database** | PostgreSQL 15 / SQLite, asyncpg, aiosqlite | Persistent storage for scan results, stages, findings, and policies |
| **AI Copilot** | Void AI Engine, Groq / Ollama / Gemini fallback | Autonomous vulnerability reasoning and remediation |
| **Frontend UI** | React 19, TypeScript, TanStack Query v5, Zustand, Recharts | Real-time executive security intelligence dashboard |
| **Hosting & Cloud** | Google Cloud Run, Artifact Registry, GCP Compute Engine | Production serverless backend hosting and worker node management |

---

## 📁 Repository Structure

```text
SecureFlow/
├── .github/
│   └── workflows/
│       ├── security-pipeline.yml     # Master CI/CD Security Pipeline & Policy Gate
│       ├── quick-deploy-backend.yml  # Backend Cloud Run Quick Deploy Workflow
│       └── quick-deploy-frontend.yml # Frontend Quick Deploy Workflow
├── backend/
│   ├── main.py                       # FastAPI Server, Routes, WebSockets & Watchdog
│   ├── models.py                     # SQLAlchemy Database Schema Models
│   ├── ai_analysis.py                # Void AI Copilot & Remediation Engine
│   ├── celery_client.py              # Celery Producer & Redis Broker Client
│   ├── pipeline_engine.py            # Monotonic Stage State Machine
│   ├── policy_engine.py              # Zero-Trust Policy Evaluator
│   └── requirements.txt              # Backend Dependencies
├── frontend/
│   ├── src/
│   │   ├── api/                      # Axios API Client & Endpoint Wrappers
│   │   ├── components/               # Layout, Navigation, TopBar & Global AI Copilot
│   │   ├── features/                 # Overview, Pipelines, Security, Deployments, Policies, Settings
│   │   ├── hooks/                    # Custom Hooks for WebSockets, Telemetry & Querying
│   │   ├── stores/                   # Consolidated Zustand Stores (uiStore, voidStore, etc.)
│   │   └── App.jsx                   # React 19 Main Application Shell
│   └── package.json
├── policy.yaml                       # Global Security Rules, CVSS Thresholds & Allow lists
└── README.md
```

---

## ⚡ Quick Start & Local Setup

### Prerequisites
- **Python**: 3.11+
- **Node.js**: 18+ & `npm`
- **Docker Engine**: Required for container build and DAST scanning

---

### 1. Backend Setup

```bash
git clone https://github.com/abhienix/SecureFlow.git
cd SecureFlow/backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

### 2. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start React development server
npm start
```

The executive dashboard will be accessible at `http://localhost:3000`.

---

## ⚙️ Environment Configuration (`.env`)

Create `.env` in `backend/`:

```env
PORT=8000
BACKEND_API_SECRET=devsecops-pipeline-secret-2026
DATABASE_URL=sqlite+aiosqlite:///./secureflow_dev.db

# Celery & Redis Worker Broker
CELERY_BROKER_URL=redis://localhost:6379/0
REDIS_URL=redis://localhost:6379/0

# Optional AI Providers (Cloud or Local Ollama)
GROQ_API_KEY=gsk_your_groq_key_here
GEMINI_API_KEY=AIzaSy_your_gemini_key_here
OLLAMA_URL=http://localhost:11434

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

---

## 🔑 Primary API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/scan-results/start` | Start a new scan run & trigger automated pipeline |
| `GET` | `/api/scan-results/{id}/progress` | Query scan progress, stage states, and DAST status |
| `PATCH`| `/api/scan-results/{id}/progress` | Progress telemetry callback endpoint for CI/CD & Worker VM |
| `GET` | `/api/scan-results` | Fetch historical scan runs & telemetry summaries |
| `POST` | `/api/copilot/ask` | Query Void AI Security Copilot |
| `GET` | `/api/policy` | View active security policies loaded from `policy.yaml` |
| `WS` | `/ws/events` | Real-time WebSocket event stream for dashboard updates |

Interactive OpenAPI documentation is available at `http://localhost:8000/docs`.

---

## 📜 License & Credits

Developed by **Abhimanyu Kumar** as an Enterprise DevSecOps Security Intelligence Platform. Licensed under the [MIT License](LICENSE).
