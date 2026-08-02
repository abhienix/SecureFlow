# SecureFlow AI Server — Machine B (GPU Workload)

This directory contains the standalone AI Server for SecureFlow designed to run exclusively on Machine B (Local GPU Workstation).

## Architecture Context

```text
React Dashboard → Cloud Run Backend (Machine A) → HTTPS → AI Server (Machine B) → Ollama → Qwen2.5
```

- **Runtime**: FastAPI, Ollama (GPU accelerated), ChromaDB (Vector Search RAG)
- **Model**: `qwen2.5:3b`
- **Embedding**: `nomic-embed-text`
- **Auth**: JWT Bearer Token validation (`HS256`)
- **Port**: 8100 (FastAPI Gateway), 11434 (Ollama)

## Quick Start on Machine B

```bash
# 1. Environment configuration
cp .env.example .env

# 2. Build and start GPU services
docker compose up -d --build

# 3. Verify health
curl http://localhost:8100/health
```

## Directory Structure

```text
ai-server/
├── app/
│   ├── main.py        # FastAPI Gateway, Endpoints & Prometheus Metrics
│   ├── auth.py        # JWT Bearer Token Authentication
│   ├── config.py      # App Configuration Settings
│   └── services/      # Ollama & ChromaDB service connectors
├── docker-compose.yml # Compose config for Ollama (GPU), Ollama-Init, AI Server
├── Dockerfile         # Standalone FastAPI Container Image
├── requirements.txt   # Python Dependencies
├── .env.example       # Example Environment configuration
└── README.md          # Machine B Setup Guide
```
