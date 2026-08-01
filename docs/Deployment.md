# Deployment Guide

This document covers Google Cloud Run deployments and environment configuration.

## 1. Cloud Run Architecture
*   **FastAPI Backend**: Packaged via `backend/Dockerfile` and deployed as a serverless GCP Cloud Run service.
*   **PostgreSQL**: Hosted on Google Cloud SQL, using Cloud SQL Auth Proxy for secure connection pooling.
*   **Redis**: Deployed via Memorystore for Redis or Upstash.

## 2. Docker Compose Local Deploys
To spin up all developer systems locally:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```
Execute `docker-compose up --build` to start.
