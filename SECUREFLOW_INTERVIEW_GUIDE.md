# SecureFlow — Master Interview Document

> Everything about the project: what it is, why I built it, how to introduce it, every technical decision, every alternative considered, and every question an interviewer can ask.

---

## Table of Contents

1. [How to Introduce SecureFlow](#1-how-to-introduce-secureflow)
2. [Why I Built This](#2-why-i-built-this)
3. [What SecureFlow Does — The Full Picture](#3-what-secureflow-does--the-full-picture)
4. [Architecture — What Each Piece Does & Why](#4-architecture--what-each-piece-does--why)
5. [Technology Choices — Why This, Not That](#5-technology-choices--why-this-not-that)
6. [The 9-Stage Pipeline — Step by Step](#6-the-9-stage-pipeline--step-by-step)
7. [Policy Engine — How Blocking Works](#7-policy-engine--how-blocking-works)
8. [Void AI — The Local Copilot](#8-void-ai--the-local-copilot)
9. [Real-Time Dashboard — How Live Updates Work](#9-real-time-dashboard--how-live-updates-work)
10. [DAST Worker — Why Separate](#10-dast-worker--why-separate)
11. [Database Design — Why This Schema](#11-database-design--why-this-schema)
12. [Security — Defense in Depth](#12-security--defense-in-depth)
13. [Deployment — How It Goes Live](#13-deployment--how-it-goes-live)
14. [Challenges I Faced & How I Solved Them](#14-challenges-i-faced--how-i-solved-them)
15. [What I Would Do Differently](#15-what-i-would-do-differently)
16. [What I Learned Building This](#16-what-i-learned-building-this)
17. [Every Possible Interview Question & Answer](#17-every-possible-interview-question--answer)

---

## 1. How to Introduce SecureFlow

### 30-Second Pitch (Elevator)

> "SecureFlow is a DevSecOps platform I built that automates security scanning in CI/CD pipelines. Every git push triggers four scanners — secret detection, static analysis, container vulnerability scanning, and live API testing. A policy engine blocks deployments if critical issues are found, and everything is visible on a real-time React dashboard. It also has a local AI copilot that explains findings and suggests fixes — running entirely on a GPU server with zero external API costs."

### 1-Minute Pitch (Phone Screen)

> "I built SecureFlow to solve a problem I noticed in every team I've worked with — security scans run silently in CI/CD and developers only find out about vulnerabilities hours later, buried in GitHub Actions logs. SecureFlow runs four security scanners on every push: Gitleaks catches leaked secrets, Semgrep finds insecure code patterns, Trivy scans Docker images for CVEs, and OWASP ZAP tests live APIs for runtime flaws like XSS and missing headers. A YAML-based policy engine evaluates all findings against severity thresholds and CVSS scores, and blocks deployments if anything critical slips through. The results show up on a React dashboard in real time via WebSockets — under 15 milliseconds latency. I also built an AI copilot called Void that runs 100% locally on a GPU server with Ollama and Qwen2.5 — it explains why a pipeline was blocked and generates code patches without sending any source code to external APIs. The whole system has five services: a FastAPI backend, React frontend, Celery worker for DAST scanning, a GPU AI server, and a 9-stage GitHub Actions pipeline."

### 2-Minute Pitch (Technical Interview)

> "SecureFlow is an AI-powered DevSecOps security orchestration platform. The core idea is: every time a developer pushes code, an automated security pipeline runs four scanners, evaluates findings against policy, and either allows or blocks the deployment — all visible on a real-time dashboard.
>
> The pipeline has 9 stages modeled as a finite state machine. It starts with checkout, then Gitleaks scans for leaked secrets and Semgrep runs static analysis. If either finds something, the pipeline blocks immediately — no point continuing. Then Docker builds, Trivy scans the container image for known CVEs, and the policy engine evaluates everything. The policy engine uses dual blocking — a CVE is blocked if its severity is CRITICAL or HIGH, OR if its CVSS score exceeds a configurable threshold. This catches cases where a CVE is labeled MEDIUM by the distro but actually scores 9.0 on CVSS. There's also a CVE allowlist with expiry dates so exceptions don't become permanent.
>
> If the policy passes, the code deploys to Cloud Run staging. Then a Celery worker spawns OWASP ZAP in a Docker container to test the live staging API for dynamic vulnerabilities — missing security headers, CSRF, XSS. ZAP takes up to 10 minutes, which is why it runs in a separate worker process on a different VM — it would block the API server if it ran in-process. Results come back to the backend, get evaluated against policy again, and if clean, production deploys.
>
> The React 19 dashboard connects via WebSocket and shows live pipeline progress with under 15ms latency. It has 8 pages — overview with Prometheus metrics, pipeline timeline, security center with findings from all 4 scanners, deployment history with rollback, infrastructure observability with a topology map, a policy editor with live YAML preview, settings, and notifications.
>
> The AI copilot — Void — runs on a dedicated GPU server with Ollama, Qwen2.5:3b, and ChromaDB for RAG. It has a multi-model router that sends code patch questions to DeepSeek-coder and security reasoning to Qwen2.5. There's a guardrails engine that blocks off-topic queries and redacts secrets from AI responses. And if the AI is down, a 590-line smart fallback answers common questions from the database."

### 5-Minute Deep Dive (System Design Interview)

Use the 2-minute pitch above, then add:

> "Let me walk through the architecture decisions. The backend is a FastAPI monolith — I chose monolith over microservices because all the pipeline logic, WebSocket management, policy evaluation, and AI integration are tightly coupled. The only component I decoupled is the DAST worker, because it has fundamentally different resource requirements — it needs Docker socket access and runs CPU-intensive scans for up to 10 minutes. Running that in-process would starve the API.
>
> For real-time updates, I use Redis pub/sub for cross-instance WebSocket broadcasting. When the backend scales to multiple Cloud Run instances, any instance can publish an event and all instances receive it via Redis and broadcast to their local WebSocket connections. This was a deliberate choice over Server-Sent Events or polling because WebSockets give bidirectional communication and sub-20ms latency.
>
> The AI server runs on a separate GPU machine because Ollama needs NVIDIA CUDA runtime and persistent model storage — about 4GB for Qwen2.5:3b and the nomic-embed-text embedding model. Putting that in Cloud Run would bloat the image from 200MB to 2GB+ and Cloud Run doesn't support GPU anyway. The AI server has JWT authentication, so the backend authenticates with bearer tokens.
>
> For the database, I use PostgreSQL in production with SQLAlchemy's async driver (asyncpg) and SQLite for local development with aiosqlite. The same ORM code works on both. I chose JSON columns for scanner output because each tool (Gitleaks, Semgrep, Trivy, ZAP) returns different schemas that change frequently.
>
> The policy engine reloads policy.yaml from disk on every request — no caching. This means if there's a security incident and you need to allowlist a CVE immediately, you edit the file and it takes effect on the next pipeline run without restarting the server.
>
> For deployment, I use Google Cloud Run with separate staging and production services. Docker images go to Artifact Registry. The pipeline deploys to staging first, runs DAST against it, and only then deploys to production. There are also quick-deploy workflows for manual deployments."

---

## 2. Why I Built This

### The Problem I Saw

In every development team, security is treated as an afterthought. Developers push code, and security scans run silently in CI/CD. When something fails, you get a red X on GitHub Actions. You have to:

1. Click through to the Actions tab
2. Find the failed job
3. Scroll through hundreds of log lines
4. Figure out which scanner failed and why
5. Manually look up CVE databases
6. Figure out the fix
7. Repeat for the next push

This whole cycle takes 30-60 minutes per failure. And most developers don't even check — they just re-push and hope it passes.

### What I Wanted to Build

I wanted a system where:
- **Every push is automatically audited** — 4 scanners covering secrets, code, containers, and live APIs
- **Bad code never reaches production** — policy engine blocks it before deployment
- **Developers see results instantly** — real-time dashboard, not "check GitHub Actions"
- **Someone explains what went wrong** — AI copilot that tells you exactly what to fix
- **Code stays private** — no sending source code to OpenAI or Gemini

### The Three Problems SecureFlow Solves

| Problem | Before SecureFlow | After SecureFlow |
|---------|------------------|-----------------|
| **No visibility** | Scans run silently in CI/CD logs | Real-time dashboard with <15ms WebSocket updates |
| **Slow feedback** | 30-60 min to understand a failure | AI explains it in seconds with specific fix steps |
| **Privacy concerns** | Cloud AI APIs see your source code | 100% local GPU AI, zero external API calls |

---

## 3. What SecureFlow Does — The Full Picture

### In One Sentence
SecureFlow turns every `git push` into a full security audit — scanning for secrets, code vulnerabilities, container CVEs, and live API flaws — then blocks bad deployments and explains findings through a local AI copilot.

### The Five Services

| Service | What It Does | Tech Stack |
|---------|-------------|------------|
| **Backend** | API gateway, pipeline engine, policy evaluator, WebSocket manager, AI integration | FastAPI, Python 3.12, SQLAlchemy, Redis, Celery |
| **Frontend** | Real-time security dashboard with 8 pages | React 19, TypeScript, TanStack Query, Zustand |
| **AI Server** | Local GPU AI for scan analysis and copilot chat | Ollama, Qwen2.5:3b, ChromaDB, FastAPI, JWT |
| **Worker** | Distributed DAST scanning with OWASP ZAP | Celery, Redis, Docker, ZAP |
| **Pipeline** | 9-stage security CI/CD workflow | GitHub Actions, Gitleaks, Semgrep, Trivy, ZAP |

### How They Talk to Each Other

```
Developer → git push → GitHub Actions (9-stage pipeline)
                              │
                              │ HTTP PATCH/POST (stage progress, scan results)
                              ▼
                    FastAPI Backend (API Gateway)
                     ┌────────┼────────┐
                     │        │        │
                     ▼        ▼        ▼
               PostgreSQL  Redis    WebSocket
               (database)  (queue   (dashboard
                            +pubsub)  updates)
                     │        │
                     │        │ Celery task
                     ▼        ▼
               AI Server   DAST Worker
               (GPU VM)    (ZAP in Docker)
```

---

## 4. Architecture — What Each Piece Does & Why

### 4.1 Pipeline Engine (177 lines)

**What it does:** Models every pipeline as a finite state machine with 9 stages and 7 statuses. Validates transitions so stages can only move forward (WAITING → RUNNING → terminal state). If a stage fails, all downstream stages are automatically SKIPPED.

**Why a state machine:** Without it, you get race conditions. GitHub Actions sends progress updates asynchronously — a later stage might report PASSED before an earlier stage finishes. The state machine prevents this by checking: "Can this stage transition from its current state to the new state?" Terminal states (PASSED, FAILED, BLOCKED) have no outgoing transitions — once done, they're done forever.

**Why not just use GitHub Actions status directly:** GitHub reports results as "pass", "PASS", "success", "complete", "ALLOW" — different formats from different tools. My `normalize()` function maps 15+ raw strings to 7 canonical states. The frontend only renders what the backend reports, so the backend is the single source of truth.

**Alternative I considered:** Using a workflow engine like Apache Airflow or Temporal. Rejected because: (1) massive infrastructure overhead for what is essentially a linear 9-step process, (2) Airflow requires a metadata database, scheduler, and web server — three more services to manage, (3) the state machine is 177 lines of pure Python with no dependencies — it's testable, deterministic, and has zero operational cost.

### 4.2 Policy Engine (284 lines)

**What it does:** Takes scan findings from all 4 scanners and decides ALLOW or BLOCK. Evaluates against severity rules (block CRITICAL+HIGH), CVSS thresholds (block anything ≥7.0), and CVE allowlists with expiry dates.

**Why dual blocking (severity OR CVSS):** A CVE labeled MEDIUM by Debian might have a CVSS score of 9.2. Severity labels are vendor-specific and inconsistent. CVSS is standardized. By checking both, I catch mislabeled CVEs that would otherwise slip through.

**Why hot reload (no caching):** If there's an active security incident and you need to allowlist a CVE immediately, you edit `policy.yaml` and it takes effect on the next pipeline run. No server restart, no deployment, no cache invalidation. For a security tool, operational speed during incidents matters more than the microseconds saved by caching.

**Why immediate BLOCK for ZAP/Gitleaks/Semgrep:** These scanners find different things than Trivy. Trivy finds known CVEs in packages — sometimes acceptable with an allowlist. Gitleaks finds leaked secrets — there's no acceptable level of leaked credentials. Semgrep finds insecure code patterns — these are bugs, not known vulnerabilities. ZAP finds live API flaws — if your staging API has XSS, it should never reach production. These are binary pass/fail by nature.

**Alternative I considered:** Using Open Policy Agent (OPA) with Rego. Rejected because: (1) Rego has a steep learning curve for what is essentially "if severity ≥ HIGH then block", (2) adds an external dependency (OPA server) to the deployment, (3) my YAML-based engine is readable by non-engineers — a security manager can edit `policy.yaml` without learning Rego.

### 4.3 Backend / API Gateway (4129 lines)

**What it does:** The central nervous system. Handles REST APIs, WebSocket connections, database operations, GitHub webhooks, scan result ingestion, DAST task publishing, AI analysis, background tasks, and Prometheus metrics.

**Why monolith over microservices:** All the pipeline logic, policy evaluation, WebSocket management, and AI integration are tightly coupled. Splitting them into microservices would add network latency, distributed tracing complexity, and deployment overhead — for a system where everything needs to coordinate around a single pipeline execution. The only component worth decoupling is the DAST worker, which has genuinely different resource needs.

**Why dual API versioning:** The legacy `/api/scan` and `/api/progress` endpoints are used by GitHub Actions runners — they're simple POST endpoints that accept raw scanner output. The modern `/api/v1/*` router serves the React dashboard with structured endpoints for repositories, pipelines, findings, deployments, metrics, etc. Keeping both avoids breaking the CI/CD integration while giving the dashboard a clean API.

**Alternative I considered:** Using Express.js or NestJS (Node.js). Rejected because: (1) the entire security scanning ecosystem (Trivy parsers, Gitleaks, Semgrep) is Python-native, (2) FastAPI's async support and Pydantic validation are purpose-built for this kind of API gateway, (3) SQLAlchemy ORM for dual PostgreSQL/SQLite support doesn't have a Node.js equivalent this mature, (4) Celery for task queues is the Python standard — Bull/BullMQ in Node is less battle-tested at scale.

### 4.4 AI Server

**What it does:** Runs on a dedicated GPU machine. Hosts Ollama with two models (Qwen2.5:3b for security reasoning, DeepSeek-coder:6.7b for code patches). Provides ChromaDB for RAG, a model router for task-based model selection, guardrails for safety, and JWT authentication.

**Why a separate machine:**
- GPU inference needs NVIDIA CUDA runtime — adds ~1.5GB to Docker image
- Models need persistent storage (~4GB for Qwen2.5:3b + nomic-embed-text)
- Cloud Run doesn't support GPU
- Isolating AI prevents GPU memory pressure from affecting API response times
- The AI server can be independently restarted without affecting the dashboard

**Alternative I considered:** Using OpenAI GPT-4 or Google Gemini API. Rejected because: (1) sends source code snippets to external servers — unacceptable for security-sensitive codebases, (2) costs money per request — at ~50 pipeline runs/day with AI analysis on each, that's $15-30/day just for AI, (3) external APIs have rate limits and downtime — my local server has neither, (4) latency: local GPU inference takes 200-300ms vs 1-3 seconds for cloud API round-trips.

### 4.5 DAST Worker

**What it does:** Consumes `run_zap_scan` tasks from Redis queue, spawns OWASP ZAP in a Docker container against the staging URL, parses the ZAP JSON report into structured findings, and posts results back to the backend.

**Why Celery + Redis:** ZAP scans take 5-10 minutes. Running them in-process would block all API requests. Celery provides: (1) task serialization and routing, (2) retry logic on failure, (3) monitoring with Flower, (4) horizontal scaling (add more workers). Redis is both the task broker AND the pub/sub channel for WebSocket broadcasting — one service, two purposes.

**Why Docker-based ZAP:** ZAP requires Java runtime, browser dependencies, and proxy configuration. Containerizing it means: (1) clean isolation — no Java on the worker VM, (2) fresh state every scan — no data leakage between scans, (3) automatic cleanup — container is removed after completion.

**Alternative I considered:** Running ZAP as a long-lived service (ZAP daemon). Rejected because: (1) state leakage between scans — a daemon accumulates session data, (2) harder to scale — one daemon = one scan at a time, Docker containers = parallel scans, (3) resource management — daemon consumes memory even when idle.

### 4.6 Frontend Dashboard

**What it does:** React 19 + TypeScript SPA with 8 pages showing pipeline status, security findings, deployments, observability metrics, policy management, and AI copilot.

**Why React over Vue/Angular:**
- React 19's concurrent rendering improves responsiveness when rendering large findings lists
- TanStack Query (React-native) gives excellent server state management with caching, background refetch, and mutations
- Largest component ecosystem — Recharts, Framer Motion, Lucide icons all have first-class React support
- TypeScript integration is most mature in React

**Why TanStack Query over Redux:**
- Redux is client state management — it doesn't handle server data caching, background refetching, or API mutations
- TanStack Query is purpose-built for server state: automatic caching, stale-while-revalidate, optimistic mutations, pagination
- Eliminates 80% of the Redux boilerplate (no actions, reducers, thunks, sagas)

**Why Zustand over Redux/Context for client state:**
- Only need client state for: copilot drawer open/close, theme, WebSocket connection status
- Zustand: 3 lines to create a store, no providers, no boilerplate
- Redux for this would be 50+ lines of actions/reducers/providers
- React Context causes unnecessary re-renders on every state change

**Alternative I considered:** Using Next.js. Rejected because: (1) SecureFlow is a dashboard, not a content site — SSR/SSG provide no benefit, (2) WebSocket connections are per-client — server-side rendering would complicate the WebSocket lifecycle, (3) adds build complexity (server components, API routes) for a pure SPA use case.

---

## 5. Technology Choices — Why This, Not That

### Backend

| Choice | Alternatives Considered | Why Rejected |
|--------|----------------------|--------------|
| **FastAPI** | Django, Flask, Express.js | Django: too heavy (ORM, admin, auth) for an API gateway. Flask: no async, no auto-docs. Express: wrong ecosystem (Python scanners). FastAPI: async-native, Pydantic validation, auto OpenAPI docs, fastest Python web framework. |
| **SQLAlchemy** | Raw SQL, Peewee, Tortoise ORM | Raw SQL: no dual-database support, no migrations. Peewee: limited async support. Tortoise: smaller ecosystem. SQLAlchemy: most mature Python ORM, async drivers, PostgreSQL+SQLite dual support. |
| **PostgreSQL** | MySQL, MongoDB, DynamoDB | MySQL: no JSON columns as flexible, no partial unique indices. MongoDB: no relational joins (pipeline_runs → stages → steps is deeply relational). DynamoDB: vendor lock-in, limited query flexibility. |
| **Redis** | RabbitMQ, Kafka, NATS | RabbitMQ: overkill for a task queue + pub/sub. Kafka: designed for event streaming at massive scale — overkill for ~50 events/min. NATS: smaller ecosystem. Redis: task queue AND pub/sub in one service, <1ms latency, Celery's default broker. |
| **Celery** | RQ, Dramatiq, Bull (Node) | RQ: no retry logic, no task routing, no monitoring. Dramatiq: smaller community. Bull: wrong ecosystem. Celery: production-proven at scale, Flower monitoring, robust retry, standard for Python task queues. |
| **uvicorn** | gunicorn, Hypercorn | gunicorn: no native async worker support (needs uvicorn workers anyway). Hypercorn: smaller community. uvicorn: ASGI standard, fastest async Python server, FastAPI's recommended server. |

### Frontend

| Choice | Alternatives Considered | Why Rejected |
|--------|----------------------|--------------|
| **React 19** | Vue 3, Angular, Svelte | Vue: smaller enterprise adoption, fewer component libraries. Angular: too opinionated, heavy for a dashboard. Svelte: immature ecosystem. React: largest ecosystem, concurrent rendering, most mature TypeScript support. |
| **TypeScript** | JavaScript | Type safety prevents bugs in a complex dashboard with 15+ API endpoints. Catches interface mismatches at compile time instead of runtime. |
| **TanStack Query** | Redux Toolkit, SWR, Apollo | Redux Toolkit: client state tool, not designed for server caching. SWR: less feature-rich (no mutations, no pagination). Apollo: GraphQL-only. TanStack Query: purpose-built for REST server state with caching, mutations, and background refetch. |
| **Zustand** | Redux, MobX, Context API | Redux: 50+ lines for 3 state variables. MobX: learning curve. Context: re-renders everything. Zustand: 3 lines per store, no providers, no boilerplate. |
| **Recharts** | D3.js, Chart.js, Victory | D3: too low-level, 1000+ lines for simple charts. Chart.js: not React-native (imperative API). Victory: less maintained. Recharts: declarative React API, good TypeScript, built-in responsive containers. |
| **Framer Motion** | CSS animations, React Spring | CSS: no spring physics, no gesture support, no layout animations. React Spring: more complex API. Framer Motion: spring physics, gesture support, layout animations, exit animations. |

### AI / ML

| Choice | Alternatives Considered | Why Rejected |
|--------|----------------------|--------------|
| **Ollama** | llama.cpp, vLLM, text-generation-webui | llama.cpp: raw C++ binary, no REST API, no model management. vLLM: designed for high-throughput serving at scale — overkill for one user. text-generation-webui: UI-focused, not API-first. Ollama: simple setup, REST API, model pull/list management, Docker-friendly. |
| **Qwen2.5:3b** | Llama 3 8B, Mistral 7B, Phi-3 | Llama 3 8B: needs 16GB VRAM — too much for RTX 3050 (4GB). Mistral 7B: same VRAM issue. Phi-3: weaker at security reasoning. Qwen2.5:3b: fits in 4GB VRAM, best security reasoning at 3B parameters, strong structured JSON output. |
| **ChromaDB** | Pinecone, Weaviate, FAISS, Milvus | Pinecone: cloud-only, sends data externally. Weaviate: heavy infrastructure (Kubernetes). FAISS: no persistence, no metadata filtering. Milvus: distributed system, overkill. ChromaDB: local-first, persistent, Python-native, zero infrastructure, free. |
| **nomic-embed-text** | OpenAI embeddings, sentence-transformers | OpenAI: external API, sends data to cloud, costs money. sentence-transformers: larger models, slower inference. nomic-embed-text: runs locally on GPU, free, 8192 token context, purpose-built for code and security text. |

### Infrastructure

| Choice | Alternatives Considered | Why Rejected |
|--------|----------------------|--------------|
| **Google Cloud Run** | AWS ECS, AWS Lambda, Heroku, Kubernetes | ECS: requires cluster management. Lambda: 15-min timeout limit (DAST polling takes 10 min), cold starts. Heroku: no container support. Kubernetes: massive overhead for 4 services. Cloud Run: serverless containers, auto-scaling, pay-per-request, no cluster management. |
| **GitHub Actions** | Jenkins, CircleCI, GitLab CI | Jenkins: self-hosted, Java-based, XML configuration. CircleCI: costs money for private repos. GitLab CI: wrong platform (code is on GitHub). GitHub Actions: native integration, free for public repos, YAML config, marketplace actions. |
| **Artifact Registry** | Docker Hub, GitHub Container Registry | Docker Hub: rate limits, no VPC integration. GHCR: less Google Cloud integration. Artifact Registry: native Cloud Run integration, VPC support, built-in vulnerability scanning. |

### Scanners

| Scanner | Alternatives Considered | Why Rejected |
|---------|----------------------|--------------|
| **Gitleaks** | TruffleHog, detect-secrets, GitGuardian | TruffleHog: slower, more false positives. detect-secrets: less maintained, fewer patterns. GitGuardian: cloud service, sends code externally. Gitleaks: fast, 90+ patterns, GitHub-native (used by GitHub's own secret scanning). |
| **Semgrep** | SonarQube, CodeQL, Bandit | SonarQube: self-hosted Java server, heavy. CodeQL: GitHub-only, complex query language. Bandit: Python-only. Semgrep: multi-language, YAML rules, fast, low false positive rate, free tier. |
| **Trivy** | Snyk, Grype, Clair | Snyk: cloud service, costs money. Grype: less maintained, fewer CVEs. Clair: complex setup, requires PostgreSQL. Trivy: fast, comprehensive CVE database, JSON output, single binary, free. |
| **OWASP ZAP** | Burp Suite, Nuclei, Nikto | Burp Suite: costs $449/year for Pro. Nuclei: template-based, less comprehensive. Nikto: outdated, limited checks. ZAP: free, open-source, OWASP flagship project, comprehensive DAST, Docker support, JSON reports. |

---

## 6. The 9-Stage Pipeline — Step by Step

| # | Stage | Scanner | What It Catches | Why This Order |
|---|-------|---------|-----------------|---------------|
| 1 | **Checkout** | Git | — | Must have code before scanning |
| 2 | **Code Scan** | Gitleaks + Semgrep | Leaked secrets, API keys, tokens, OWASP code patterns | Fail fast — if secrets or insecure code exist, no point building Docker |
| 3 | **Docker Build** | Dockerfile | Build failures, missing dependencies | Can't scan containers if they don't build |
| 4 | **Trivy CVE** | Trivy | Known CVEs in base images and OS packages | Scan the container before deploying it |
| 5 | **Policy Gate** | Policy engine | Severity/CVSS violations, unexpired allowlists | Evaluate ALL static findings before any deployment |
| 6 | **Deploy Staging** | Cloud Run | Deployment failures | Need a live target for DAST |
| 7 | **OWASP ZAP** | ZAP via Celery | XSS, SQLi, missing headers, CSRF on live endpoints | Can only test live APIs after staging is deployed |
| 8 | **ZAP Gate** | Policy engine | Dynamic security alerts | Evaluate DAST findings before production |
| 9 | **Deploy Prod** | Cloud Run | — | Only deploy if all 8 prior stages pass |

**Why this specific order:** It's a "fail fast, fail cheap" strategy. Code scanning (stage 2) takes seconds — if it fails, you skip Docker build, Trivy, deployment, and DAST (saving 15+ minutes). Docker build (stage 3) catches missing dependencies before wasting time on CVE scanning. The expensive operations (deployment, DAST) only run after all cheap checks pass.

**Cascading failures:** If stage 2 (Code Scan) fails, stages 3-9 are automatically SKIPPED by the state machine. The dashboard shows: Code Scan = FAILED, Docker = SKIPPED, Trivy = SKIPPED, etc. No wasted compute, no ambiguous partial results.

---

## 7. Policy Engine — How Blocking Works

### Evaluation Priority (first match wins)

```
1. ZAP findings exist?     → BLOCK immediately (any DAST alert = live exploit)
2. Gitleaks findings exist? → BLOCK immediately (secrets in code = credential exposure)
3. Semgrep findings exist?  → BLOCK immediately (insecure code = exploitable bug)
4. Trivy findings?          → Evaluate against policy rules:
   a. CVE is allowlisted and not expired? → Skip (approved exception)
   b. Severity in block_on list?          → BLOCK
   c. CVSS score ≥ threshold?             → BLOCK (catches mislabeled CVEs)
   d. Severity in warn_on list?           → Warn (logged, doesn't block)
   e. Everything else                     → Ignore
```

### Policy Configuration (policy.yaml)

```yaml
default:                          # Applied to all repos
  block_on: [CRITICAL, HIGH]      # Block these severities
  warn_on: [MEDIUM]               # Warn but don't block
  cvss_threshold: 7.0             # Also block if CVSS ≥ this

repos:
  SecureFlow:                     # Override for this specific repo
    block_on: [CRITICAL]          # More relaxed — only block CRITICAL
    warn_on: [HIGH, MEDIUM]       # Warn on HIGH and MEDIUM
    cvss_threshold: 9.8           # Only block very high CVSS
```

### CVE Allowlist Example

```yaml
allowlist:
  - cve: CVE-2024-1234
    reason: "No fix available, vendor acknowledged, low exploitability"
    expires: 2025-06-30
```

After `2025-06-30`, this CVE goes back to normal evaluation. **This prevents permanent "we'll fix it later" exceptions.**

---

## 8. Void AI — The Local Copilot

### Three-Tier Fallback Chain

```
User asks a question
    │
    ▼
Tier 1: AI Server (Machine B, GPU)
    ├─ JWT Authentication
    ├─ Guardrails: block off-topic + prompt injection
    ├─ Model Router: security reasoning (Qwen2.5) or code patches (DeepSeek)
    ├─ Ollama inference on GPU
    ├─ Guardrails: redact secrets from output
    │
    ▼ (if fails)
Tier 2: Direct Ollama (localhost:11434)
    ├─ Same model, same prompts
    ├─ No guardrails or routing
    │
    ▼ (if fails)
Tier 3: Smart Fallback (590 lines of Python)
    ├─ Pattern matching on database context
    ├─ Handles: greetings, blocked queries, ordinal lookups,
    │   scan IDs, architecture questions, health summaries
    └─ Never echoes the question or gives empty boilerplate
```

### How to Talk About Void AI in Interviews

> "Void is a security-focused AI copilot that runs 100% locally. I chose local over cloud AI for three reasons: privacy (no code leaves the network), cost (zero per-request fees), and latency (200-300ms GPU inference vs 1-3 seconds cloud round-trip).
>
> It has a multi-model router that classifies prompts by intent — code patch questions go to DeepSeek-coder which is optimized for code generation, while security reasoning questions go to Qwen2.5:3b which is better at explaining CVE impact.
>
> There's a guardrails engine with two layers: input validation blocks off-topic queries and prompt injection attempts, output sanitization redacts any secrets that might appear in responses using regex patterns for GitHub PATs, AWS keys, JWTs, etc.
>
> The most interesting part is the fallback chain. If the GPU server is down, it tries direct Ollama. If that fails too, a 590-line smart fallback engine reads the database and answers common questions using pattern matching. It handles things like 'why was the last pipeline blocked?' by looking up the latest blocked scan and returning the commit SHA, the reason, and AI-generated fix steps. This means the dashboard is never useless just because the AI is down."

---

## 9. Real-Time Dashboard — How Live Updates Work

### The WebSocket Flow (step by step)

```
1. Frontend opens WebSocket to backend /ws/events
2. GitHub Actions runner finishes a stage (e.g., Trivy: PASS)
3. Runner PATCHes backend /api/progress
4. Backend validates transition via PipelineStateMachine
5. Backend upserts pipeline_stages table
6. Backend publishes event to Redis channel "secureflow:ws:broadcast"
7. ALL backend instances receive Redis message (pub/sub)
8. Each instance broadcasts to its local WebSocket connections
9. Frontend receives event
10. Frontend calls queryClient.invalidateQueries("pipelines")
11. TanStack Query refetches pipeline data
12. React re-renders pipeline timeline with new status
Total: <15ms from step 6 to step 12
```

### How to Explain This in Interviews

> "I use WebSockets backed by Redis pub/sub for real-time updates. The key insight is that when the backend scales to multiple Cloud Run instances, a WebSocket client connected to Instance A won't see events published by Instance B. Redis pub/sub solves this — every instance subscribes to a shared channel, so events are broadcast to all instances and all connected clients.
>
> On the frontend, I use TanStack Query for server state management. When a WebSocket event arrives, I don't manually update the UI — I just invalidate the relevant query cache, and TanStack Query handles the refetch. This gives me the best of both worlds: instant push notifications with reliable polling as a fallback.
>
> I also implemented version counters on events to prevent stale data. If the frontend already has version 5 of a pipeline's state, it ignores events with version 4 or lower. This handles out-of-order delivery."

---

## 10. DAST Worker — Why Separate

### How to Explain This in Interviews

> "OWASP ZAP scans take 5-10 minutes and are CPU-intensive. If I ran them in the main API process, every dashboard user would be blocked for the entire scan duration. Also, Cloud Run doesn't support Docker-in-Docker, which ZAP needs.
>
> So I decoupled DAST into a Celery worker on a separate VM. The backend publishes a task to Redis — just a scan_id and target_url — and immediately returns. The worker picks up the task, spawns ZAP in a Docker container, waits for it to finish, parses the JSON report, and posts findings back to the backend.
>
> This gives me three benefits: (1) the API stays fast regardless of scan duration, (2) the worker can be scaled independently — add more workers for parallel scans, (3) ZAP gets full Docker socket access on a VM that's designed for it."

---

## 11. Database Design — Why This Schema

### 15 Tables Across Three Domains

**Pipeline Domain:**
- `repositories` — repo metadata (name, owner, branch, URL)
- `pipeline_runs` — one row per pipeline execution (commit, status, duration)
- `pipeline_stages` — 9 rows per run, one per stage (status, detail, retry count)
- `pipeline_steps` — sub-steps within stages (logs, exit codes)

**Security Domain:**
- `scan_results` — legacy table with merged scanner output + DAST lifecycle
- `security_findings` — unified findings from all 4 scanners with AI explanations
- `scan_runs` — scanner execution metadata (which scanner, how long)

**Operations Domain:**
- `deployments` — Cloud Run revisions (environment, URL, status, rollback tracking)
- `policies` — security policy definitions
- `policy_violations` — per-pipeline policy enforcement records
- `notifications` — user-facing alerts
- `events` — system events with deduplication keys
- `metric_snapshots` — time-series metrics for Prometheus-style charts

### Key Design Decisions

**Why JSON columns for findings:** Each scanner (Gitleaks, Semgrep, Trivy, ZAP) returns completely different schemas that change between versions. JSON columns let me store raw scanner output without fragile schema mapping. The policy engine reads specific fields from the JSON, and the dashboard renders it.

**Why partial unique index:** `CREATE UNIQUE INDEX ... WHERE status != 'superseded'` — prevents duplicate active rows for the same commit+repo+branch while allowing superseded rows to coexist for history.

**Why UUIDs for primary keys:** The `pipeline_runs`, `pipeline_stages`, etc. tables use UUID primary keys instead of auto-increment integers. This prevents enumeration attacks and allows distributed ID generation without coordination.

**Alternative I considered:** Using MongoDB for flexible scanner output. Rejected because: (1) pipeline data is deeply relational (runs → stages → steps → findings), (2) MongoDB joins are painful and slow, (3) PostgreSQL JSON columns give the flexibility of document storage with the power of relational queries.

---

## 12. Security — Defense in Depth

### How to Talk About Security in Interviews

> "SecureFlow implements defense in depth — security at every layer, not just the scanners."

| Layer | What I Built | Why |
|-------|-------------|-----|
| **Secret Detection** | Gitleaks scans for 90+ secret patterns | Catch leaked credentials before they're committed |
| **Code Analysis** | Semgrep detects OWASP Top 10 patterns | Catch insecure code before it's deployed |
| **Container Scanning** | Trivy scans for CVEs in base images | Catch vulnerable dependencies |
| **API Testing** | OWASP ZAP tests live endpoints | Catch runtime flaws (XSS, CSRF, missing headers) |
| **Policy Enforcement** | YAML gates with severity + CVSS blocking | Automated ALLOW/BLOCK decisions |
| **AI Safety** | Guardrails block off-topic + redact secrets | Prevent AI from leaking credentials or going off-topic |
| **API Auth** | JWT tokens + API secrets | Prevent unauthorized access to backend and AI server |
| **DAST Isolation** | ZAP in Docker against staging only | Never scan production, isolate scan environment |
| **Deployment Gates** | Production only after all 8 stages pass | No partial deployments |

---

## 13. Deployment — How It Goes Live

### Production Architecture

```
Google Cloud Run
├── secureflow-backend-staging   (staging API)
├── secureflow-backend           (production API)
├── secureflow-frontend-staging  (staging dashboard)
└── secureflow-frontend          (production dashboard)

Google Artifact Registry
└── us-central1-docker.pkg.dev/secureflow-499814/secureflow-repo/
    ├── backend:<commit-sha>
    └── frontend:<commit-sha>

Machine B (GPU VM — not in Cloud Run)
├── Ollama (qwen2.5:3b + nomic-embed-text)
├── ChromaDB vector store
└── FastAPI AI Server (:8100)

Worker VM (not in Cloud Run)
├── Celery worker
├── Docker (ZAP containers)
└── Connected to Redis queue
```

### How to Explain Deployment in Interviews

> "I deploy to Google Cloud Run because it's serverless containers — no Kubernetes cluster to manage, auto-scaling based on request count, and pay-per-request pricing. Docker images go to Artifact Registry with the commit SHA as the tag, so every deployment is traceable to a specific commit.
>
> The pipeline deploys to staging first (stage 6), runs DAST against staging (stage 7), evaluates DAST results (stage 8), and only then deploys to production (stage 9). If any stage fails, production is never touched. This is a blue-green deployment pattern — staging is always the canary.
>
> The AI server and DAST worker run on separate VMs because they need GPU and Docker socket access respectively — neither is supported on Cloud Run."

---

## 14. Challenges I Faced & How I Solved Them

### Challenge 1: Race Conditions in Pipeline State

**Problem:** Multiple GitHub Actions steps report progress simultaneously. A later stage could be marked PASSED before an earlier stage completed, creating an inconsistent timeline on the dashboard.

**How I solved it:** Finite state machine with validated transitions. Terminal states (PASSED, FAILED, BLOCKED) have empty outgoing transition sets — literally `set()` in the code. `compute_stage_status()` is a pure function that deterministically computes each stage's status from its dependency chain. If any dependency is still RUNNING, the stage stays WAITING.

### Challenge 2: Inconsistent Status Strings

**Problem:** GitHub Actions reports results as "pass", "PASS", "success", "complete", "ALLOW", "SCANNED", etc.

**How I solved it:** A `normalize()` method with a dictionary mapping 15+ raw strings to 7 canonical states. Centralized in one place, easy to extend when new formats appear.

### Challenge 3: LLM Producing Unreliable JSON

**Problem:** When asked to analyze CVEs, the LLM sometimes wraps JSON in markdown code fences, adds conversational text, or produces malformed JSON.

**How I solved it:** A `_parse_json()` function with multiple fallback strategies: (1) strip markdown fences, (2) collapse newlines, (3) try direct `json.loads()`, (4) fall back to regex extraction of the first `{...}` block. Combined with tightly constrained prompts that specify exact field counts and sentence lengths.

### Challenge 4: Cross-Instance WebSocket Broadcasting

**Problem:** When the backend runs as multiple Cloud Run instances, WebSocket clients on Instance A don't see events from Instance B.

**How I solved it:** Redis pub/sub. Every backend instance subscribes to `secureflow:ws:broadcast` on startup. When any instance publishes an event, all instances receive it and broadcast to their local WebSocket connections. If Redis is unavailable, the system gracefully degrades to single-instance mode.

### Challenge 5: AI Giving Misleading Responses When Down

**Problem:** Returning "AI unavailable" is unhelpful — the dashboard user still needs information about their blocked pipeline.

**How I solved it:** Built `smart_fallback()` — 590 lines of pattern matching that reads database context and answers common questions. Handles greetings (with system posture snapshot), blocked pipeline queries (with commit SHA, reason, fix steps), ordinal lookups ("87th commit"), scan ID lookups, architecture questions, and health summaries. The dashboard is never useless just because the AI is down.

### Challenge 6: Secrets Leaking Through AI Responses

**Problem:** The LLM might include secret tokens in its responses if they appear in the context or training data.

**How I solved it:** Output guardrails scan every response against 5 regex patterns (GitHub PATs `ghp_...`, GitLab PATs `glpat-...`, AWS keys, JWTs `eyJ...`, Slack tokens `xox...`) and replace matches with `[REDACTED_SECRET]`.

### Challenge 7: Stuck Dashboard Rows

**Problem:** If a GitHub Actions runner crashes mid-pipeline, the dashboard row stays "running" forever.

**How I solved it:** Two mechanisms: (1) a background watchdog task runs periodically and marks scans older than a threshold as "timeout", (2) a failsafe step in the workflow gated on `always()` ensures the dashboard gets updated even when earlier steps crash.

---

## 15. What I Would Do Differently

### 1. Event Sourcing for Pipeline State
Instead of status columns that get overwritten, I'd store every state transition as an immutable event. This would give a complete audit trail ("stage 4 was RUNNING at 14:02, PASSED at 14:03") instead of just the current status. It would also make debugging race conditions much easier.

### 2. Structured Logging from Day One
I used `print()` statements and Python's logging module with plain text. In production, JSON-structured logging would integrate with Google Cloud Logging for searchable, filterable log analysis. Right now, finding a specific pipeline run's logs requires grepping through text.

### 3. End-to-End Tests with Testcontainers
I relied heavily on manual testing and unit tests. Adding integration tests with testcontainers (PostgreSQL, Redis, Ollama in Docker) would catch cross-component bugs that unit tests miss — like a policy evaluation that works in isolation but fails when the database has unexpected data.

### 4. Separate DAST Results Table
Right now, ZAP findings are stored in the `scan_results.zap_findings` JSON column. A dedicated `dast_findings` table with normalized columns (alert name, risk, confidence, URL, parameter) would enable better querying, filtering, and trending of DAST results over time.

---

## 16. What I Learned Building This

1. **State machines are worth the effort.** The 177-line pipeline engine prevented dozens of bugs that would have appeared with ad-hoc status management. Every minute spent on the state machine saved hours of debugging.

2. **Decouple things with different resource profiles.** The DAST worker was the best architectural decision. It keeps the API fast, allows independent scaling, and makes the system resilient to ZAP failures.

3. **Fallback chains beat single points of failure.** The 3-tier AI fallback (GPU server → Ollama → smart fallback) means the dashboard is never broken. This pattern should be applied to every external dependency.

4. **Hot configuration saves lives during incidents.** Reloading `policy.yaml` from disk every request means a security team can allowlist a CVE during an incident without waiting for a deployment cycle.

5. **LLMs need tight constraints.** Without specifying exact field counts, sentence lengths, and output format, the LLM produces verbose, inconsistent output. The more constrained the prompt, the more useful the response.

6. **WebSocket + pub/sub is the right pattern for real-time dashboards.** Redis pub/sub made horizontal scaling trivial. Version counters prevented stale data. TanStack Query's cache invalidation bridged push and pull seamlessly.

7. **Security tools need security.** Guardrails on the AI, JWT auth on the AI server, secret scanning in the pipeline, output redaction — every layer needs its own security. A security tool with a security vulnerability is the worst kind of irony.

---

## 17. Every Possible Interview Question & Answer

### Architecture & Design

**Q: Explain the architecture of SecureFlow.**
> Five services: FastAPI backend (API gateway + pipeline engine + policy evaluator + WebSocket manager), React 19 frontend (8-page real-time dashboard), Celery worker (distributed DAST with OWASP ZAP in Docker), GPU AI server (Ollama + Qwen2.5 + ChromaDB + guardrails), and GitHub Actions (9-stage CI/CD pipeline). Backend is the central hub — it receives scan results, evaluates policy, manages WebSocket connections, publishes DAST tasks, and calls the AI server for analysis.

**Q: Why monolith and not microservices?**
> All pipeline logic, WebSocket management, policy evaluation, and AI integration are tightly coupled — they share database connections, pipeline state, and event broadcasting. Splitting into microservices would add network latency, distributed tracing, and deployment overhead for tightly-coupled operations. The only component worth decoupling is DAST, which has genuinely different resource requirements (Docker socket, 10-minute CPU tasks).

**Q: How does the pipeline state machine work?**
> 9 stages in immutable order, 7 statuses with strict transitions. WAITING → RUNNING → terminal states. Terminal states have no outgoing transitions — once PASSED, FAILED, or BLOCKED, it's done forever. `compute_stage_status()` is a pure function that determines each stage's status from its dependency chain. If any dependency failed, the stage is SKIPPED. If any dependency is still running, the stage stays WAITING.

**Q: How do you handle pipeline failures?**
> Cascading: if stage N fails, stages N+1 through 9 are automatically SKIPPED by the state machine. The dashboard shows exactly which stage failed and why. Stuck pipelines are caught by a background watchdog that marks timeout runs. A failsafe step in GitHub Actions on `always()` ensures the dashboard is updated even on crashes.

### Security

**Q: How does the policy engine work?**
> Priority-based evaluation: ZAP findings → immediate BLOCK. Gitleaks → immediate BLOCK. Semgrep → immediate BLOCK. Trivy → evaluated against severity rules AND CVSS thresholds (dual blocking). CVE allowlists with expiry dates provide temporary exceptions. Binary decision: ALLOW or BLOCK, no partial blocks.

**Q: What is dual blocking and why?**
> A CVE is blocked if its severity label is CRITICAL/HIGH OR if its CVSS score exceeds the threshold. This catches CVEs labeled MEDIUM by the vendor but scored 9.0+ on CVSS. Severity labels are vendor-specific and inconsistent; CVSS is standardized.

**Q: How do you prevent secrets from leaking?**
> Four layers: (1) Gitleaks scans source code for 90+ secret patterns before deployment. (2) Policy engine blocks the pipeline if any secrets are found. (3) AI guardrails redact secrets from AI responses using 5 regex patterns. (4) `.env` files are gitignored — secrets are environment variables only.

**Q: How do guardrails work?**
> Input: block off-topic terms (weather, sports, etc.) and prompt injection attempts ("ignore previous instructions", "you are now DAN"). Output: scan for secret patterns (GitHub PATs, AWS keys, JWTs, Slack tokens) and replace with `[REDACTED_SECRET]`.

### AI

**Q: Why local AI instead of OpenAI/Gemini?**
> Three reasons: privacy (source code never leaves the network), cost (zero per-request vs $15-30/day), and latency (200-300ms GPU inference vs 1-3 seconds cloud round-trip).

**Q: How does the model router work?**
> `TaskLLMRouter.select_model()` checks for code patch keywords (fix vulnerability, remediate, parameterized query, etc.) or code blocks. Code tasks → DeepSeek-coder:6.7b. Security reasoning → Qwen2.5:3b. This improves response quality because each model specializes.

**Q: What happens when the AI goes down?**
> Three-tier fallback: (1) AI server on GPU machine, (2) direct Ollama on localhost, (3) 590-line smart fallback that reads database context and answers common questions with pattern matching. The dashboard is never useless.

**Q: What is RAG and how do you use it?**
> ChromaDB stores vector embeddings of past security findings using nomic-embed-text. When a user asks a question, the system searches for semantically similar past findings and includes them in the AI's context. This means the AI references specific CVEs and past scans instead of giving generic advice.

### Real-Time & Performance

**Q: How does the real-time dashboard work?**
> WebSocket from frontend to backend, Redis pub/sub for cross-instance broadcasting. Backend publishes events, all instances receive them, all connected clients see updates. TanStack Query cache invalidation triggers refetch. <15ms total latency.

**Q: How do you handle multiple backend instances?**
> Redis pub/sub. Every instance subscribes to `secureflow:ws:broadcast`. Any instance can publish. All instances receive and broadcast to their local WebSocket connections. If Redis is unavailable, graceful degradation to single-instance mode.

**Q: How do you prevent stale data?**
> Version counters on events. Frontend ignores events with older versions than what it already has. TanStack Query's periodic polling serves as a fallback for missed WebSocket events.

### DAST

**Q: Why run DAST separately?**
> ZAP scans take 5-10 minutes and need Docker socket access. Running in-process would block the API and isn't possible on Cloud Run. Celery worker on a separate VM with Docker gives async, isolated, scalable scanning.

**Q: How does the DAST flow work?**
> Backend publishes Celery task to Redis with scan_id and target_url. Worker picks up task, spawns ZAP Docker container against staging URL. ZAP runs baseline scan. Worker parses JSON report, posts findings to backend. Backend evaluates against policy and broadcasts results.

**Q: What if ZAP takes too long?**
> GitHub Actions polls every 15 seconds with 40 retries (10-minute timeout). If ZAP doesn't complete, the stage is marked failed. The worker also has Docker container wait with automatic cleanup.

### Database

**Q: Why PostgreSQL and SQLite?**
> PostgreSQL in production for JSON columns, partial unique indices, async driver (asyncpg). SQLite for local dev with aiosqlite. Same SQLAlchemy ORM code works on both.

**Q: Why JSON columns?**
> Each scanner returns different schemas that change between versions. JSON columns store raw output flexibly. The policy engine reads specific fields; the dashboard renders the full JSON.

**Q: Why partial unique index?**
> `WHERE status != 'superseded'` prevents duplicate active rows for the same commit+repo+branch while allowing superseded rows for history.

### Deployment

**Q: How do you deploy?**
> Google Cloud Run with staging and production. Pipeline deploys to staging first, runs DAST against it, evaluates results, then deploys to production. Docker images tagged with commit SHA in Artifact Registry.

**Q: How do you handle rollbacks?**
> Cloud Run revisions are immutable. The Deployments page shows revision history with rollback capability. Each deployment tracks the commit SHA and pipeline run ID for traceability.

**Q: Why Cloud Run over Kubernetes?**
> Serverless containers — no cluster management, auto-scaling, pay-per-request. For 4 services with modest traffic, Kubernetes would be massive overkill.

### Personal / Behavioral

**Q: What was the hardest part?**
> The pipeline state machine. Getting the transition logic right — especially cascading failures, status normalization from 15+ formats, and dependency-based SKIPPED computation — took the most iteration. But it also prevented the most bugs.

**Q: What would you do differently?**
> Event sourcing for pipeline state (immutable event log instead of status columns), structured JSON logging from day one, and end-to-end tests with testcontainers.

**Q: How would you scale this?**
> Cloud Run auto-scales. Redis pub/sub enables multiple backend instances. Add more Celery workers for parallel DAST. PostgreSQL read replicas for dashboard queries. The main bottleneck is DAST scan time — could be parallelized by splitting ZAP scans across workers.

**Q: What makes this project stand out?**
> Full-stack depth (I built every layer), real engineering problems (state machines, cross-instance broadcasting, async task decoupling, LLM output parsing), production-grade patterns (finite state machines, pub/sub, 3-tier fallback, defense in depth), and 100% local AI with RAG and multi-model routing.

---

*This document is grounded in the actual SecureFlow source code — every answer references real implementation details, not theoretical concepts.*
