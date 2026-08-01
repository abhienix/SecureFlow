# Backend Developer Guide

This document covers the FastAPI backend API gateways and services structure of SecureFlow.

## 1. Directory Structure & Organization
The backend is located in the `backend/` folder:
*   `main.py`: The monolithic gateway, containing system initialization, routers, middlewares, and startup tasks.
*   `models.py`: Defines the SQLAlchemy models (e.g. `ScanResult`, `PipelineRun`, `SecurityFinding`).
*   `celery_client.py`: Handles Celery producer task publishing for DAST scanning.
*   `policy_engine.py`: Loads and parses `policy.yaml` rules to evaluate finding vulnerabilities.

## 2. API Versioning
Endpoints are structured:
*   **Versioned APIs (`/api/v1/...`)**: Registered on `v1_router`. This is the modern, normalized-table router.
*   **Legacy APIs (`/api/...`)**: Direct routing on `app` (e.g., `/api/scan-results`). These query legacy models.

## 3. Dependency Injection
All db connections utilize FastAPI's dependency injection pattern:
```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
```
