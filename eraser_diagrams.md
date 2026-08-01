# SecureFlow 2.0 — Eraser.io Diagram-as-Code Specifications

This file contains the clean, uncoloured **Eraser.io** Diagram-as-Code (DSL) specifications for the SecureFlow 2.0 platform architecture. You can copy and paste these code blocks directly into [Eraser.io](https://www.eraser.io/) to generate clean whiteboard-style architecture diagrams.

---

## 1. Master System Architecture Flow

This diagram illustrates the end-to-end flow from developer commits through the 9-stage GitHub Actions pipeline, the out-of-process FastAPI backend, Redis/Celery worker queues, ZAP Docker execution, PostgreSQL persistence, and React dashboard streaming.

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

---

## 2. DAST Out-of-Process Worker Execution (Sequence Flow)

This diagram details the sequence flow for the standalone DAST worker, showing how tasks are picked up from the Redis queue, executed via Docker, and persisted to the PostgreSQL database without blocking the FastAPI event loop.

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

---

## 3. Component Dependency Topology

A clean dependency structure mapping how frontend components consume FastAPI endpoints and worker services depend on cache/db clusters.

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
