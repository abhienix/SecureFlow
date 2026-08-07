# SecureFlow 2.0 — Enterprise Architecture Specifications

This document defines the production-grade, layered system architecture of the SecureFlow DevSecOps platform, detailing the operational layers, communications protocols, and transaction sequences.

---

## 1. High-Level Layered Architecture

This diagram maps the platform components into 8 horizontal operational layers:

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#ffffff', 'primaryTextColor': '#000000', 'primaryBorderColor': '#000000', 'lineColor': '#333333'}}}%%
flowchart TD
    classDef default fill:#ffffff,stroke:#0f172a,stroke-width:1px,color:#000000;

    %% ----------------------------------------------------
    %% Layers Definitions
    %% ----------------------------------------------------
    subgraph Dev_Layer [💻 Developer Layer]
        dev[Developer Workstation]
    end

    subgraph CICD_Layer [⚙️ CI/CD Execution Layer]
        github[GitHub Repository]
        subgraph GHA_Pipeline [GitHub Actions Runner]
            c1[Checkout] --> c2[Gitleaks] --> c3[Semgrep] --> c4[Docker Build] --> c5[Trivy] --> c6[Policy Engine] --> c7[Deploy Staging] --> c8[Trigger DAST] --> c9[Deploy Production]
        end
    end

    subgraph Client_Layer [📊 Client Interface Layer]
        dashboard[React Executive Dashboard]
        void_drawer[Void AI Copilot Drawer]
        console[Admin Management Console]
        notifs[Notification Center]
    end

    subgraph Backend_Layer [⚡ Cloud Backend Layer - API Gateway & Services]
        gateway[API Gateway / Auth Router]
        repo_svc[Repository Service]
        pipe_svc[Pipeline Service]
        find_svc[Findings Service]
        dep_svc[Deployment Service]
        pol_svc[Policy Evaluator]
        ai_gtw[AI Gateway]
        obs_svc[Observability Service]
        ws_mgr[WebSocket Manager]
        
        gateway --> repo_svc
        gateway --> pipe_svc
        gateway --> find_svc
        gateway --> dep_svc
        gateway --> pol_svc
        gateway --> ai_gtw
        gateway --> obs_svc
        gateway --> ws_mgr
    end

    subgraph AI_Layer [🧠 AI Intelligence Layer]
        conv_mgr[Conversation Manager]
        ctx_bld[Context Builder RAG]
        rag_eng[RAG Embeddings Engine]
        mcp_srv[MCP Server Context]
        guardrails[Guardrails & Safety Filters]
        prompt_mgr[Prompt Manager]
        ollama[Ollama Engine Host]
        qwen[Qwen2.5 3B Model]
        nomic[nomic-embed-text]
        chroma[ChromaDB Vector Store]
        remedy[Remediation Engine]

        ai_gtw --> conv_mgr
        conv_mgr --> ctx_bld
        ctx_bld --> rag_eng
        rag_eng --> mcp_srv
        mcp_srv --> prompt_mgr
        prompt_mgr --> guardrails
        guardrails --> ollama
        ollama --> qwen
        ollama --> nomic
        rag_eng --> chroma
        ctx_bld --> remedy
    end

    subgraph Data_Layer [🗄️ Databases & Cache Layer]
        pg[(PostgreSQL DB)]
        redis[Redis Queue & PubSub]
        prom[(Prometheus Server)]
    end

    subgraph Worker_Layer [🖥️ Worker Execution Layer]
        celery[Celery Task Consumer]
        docker[Docker Engine Socket]
        zap[OWASP ZAP Container]
        health[Worker Health Agent]
        heartbeat[Heartbeat Service]

        celery --> docker
        docker --> zap
        health --> heartbeat
    end

    subgraph Ext_Layer [🌐 External Integrations Layer]
        github_api[GitHub REST API]
        slack[Slack Webhook App]
        staging_env[Cloud Run Staging]
        prod_env[Cloud Run Production]
    end

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
    dashboard ==>|HTTP REST Calls| gateway
    void_drawer ==>|HTTP REST Calls| gateway
    console ==>|HTTP REST Calls| gateway
    notifs ==>|HTTP REST Calls| gateway
    gateway -.->|Sub-15ms WebSocket push| dashboard

    %% Backend Data Access
    repo_svc ==>|SQL Queries| pg
    pipe_svc ==>|SQL Queries| pg
    find_svc ==>|SQL Queries| pg
    dep_svc ==>|SQL Queries| pg
    pol_svc ==>|SQL Queries| pg
    obs_svc ==>|SQL Queries| pg
    
    pipe_svc -.->|Enqueue DAST / Cache| redis
    dep_svc -.->|Enqueue DAST / Cache| redis
    obs_svc -.->|Scrape Metrics| prom

    %% Worker DAST Flow (Out of process)
    redis -.->|DAST Task Queue| celery
    zap -->|Attack Scan Target| staging_env
    celery ==>|Persist Findings| pg
    heartbeat -.->|Worker Heartbeat| redis

    %% AI Integrations
    ctx_bld ==>|Read DB Findings| pg
    remedy -.->|Create Pull Requests| github_api
    obs_svc -.->|Send Slack Alerts| slack

    %% Subgraph Styling
    style Dev_Layer fill:#f8fafc,stroke:#334155,stroke-width:2px,stroke-dasharray:5 5
    style CICD_Layer fill:#f8fafc,stroke:#334155,stroke-width:2px,stroke-dasharray:5 5
    style Client_Layer fill:#f8fafc,stroke:#334155,stroke-width:2px,stroke-dasharray:5 5
    style Backend_Layer fill:#f8fafc,stroke:#334155,stroke-width:2px,stroke-dasharray:5 5
    style AI_Layer fill:#f8fafc,stroke:#334155,stroke-width:2px,stroke-dasharray:5 5
    style Data_Layer fill:#f8fafc,stroke:#334155,stroke-width:2px,stroke-dasharray:5 5
    style Worker_Layer fill:#f8fafc,stroke:#334155,stroke-width:2px,stroke-dasharray:5 5
    style Ext_Layer fill:#f8fafc,stroke:#334155,stroke-width:2px,stroke-dasharray:5 5
```

---

## 2. Sequence Diagrams

### CI/CD Workflow Sequence
This sequence diagram maps the progression of the GitHub Actions pipeline:

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
    
    Note over Runner: Static Security Analysis
    Runner->>Runner: Checkout Code
    Runner->>Runner: Run Gitleaks (Secrets)
    Runner->>Runner: Run Semgrep (SAST)

    Note over Runner: Container Packaging & SCA
    Runner->>Runner: Docker Build
    Runner->>Runner: Run Trivy Scan (SCA / CVE)

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

### Asynchronous DAST Workflow Sequence
This diagram details the sequence for the asynchronous, out-of-process DAST worker scanning lifecycle:

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
    
    Note over Worker, ZAP: Execute DAST Docker Container
    Worker->>ZAP: docker run ghcr.io/zaproxy/zaproxy:stable
    ZAP->>Target: HTTP Dynamic Attack Vectors (XSS, SQLi, etc.)
    Target-->>ZAP: HTTP Responses
    ZAP-->>Worker: Export ZAP Report (JSON findings)

    Worker->>DB: Persist SecurityFinding records
    Worker->>DB: Update ScanResult (dast_status = "completed", zap_gate = PASS/BLOCK)
    Worker->>API: Trigger WebSocket Broadcast
    API->>UI: Stream updates (ws/events - Telemetry)
```

### Void AI Copilot Request Flow Sequence
All Void AI Copilot requests are routed through the secure FastAPI AI Gateway:

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

### Slack Incident Notification Sequence Flow
This sequence shows automated Slack Block Kit dispatch and real-time Notification Center synchronization:

```mermaid
sequenceDiagram
    autonumber
    participant CI as GitHub Actions Runner
    participant Gateway as FastAPI Backend
    participant Policy as Policy Engine
    participant Slack as Slack Webhook (#devsecops-alerts)
    participant WS as WebSocket Dispatcher
    participant Dashboard as React UI (Bell Notification Drawer)

    CI->>Gateway: PATCH /api/progress (Scan Complete + Findings)
    Gateway->>Policy: Evaluate Policy Rules & Thresholds
    Policy-->>Gateway: Result: BLOCK (Critical Secret / DAST Flaw)
    Gateway->>Slack: POST /services/... (Block Kit Payload)
    Slack-->>Gateway: HTTP 200 OK (Posted to #devsecops-alerts)
    Gateway->>WS: Broadcast event: slack.alert_sent & notification
    WS-->>Dashboard: Sub-15ms WebSocket Push
    Dashboard->>Dashboard: Pulse Red Bell Badge & Stream Alert into Slack Notification Tab
```

### Automated Code Remediation Sequence
This sequence shows the path for automated code remediation:

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
