# DAST Worker Guide

This document covers the out-of-process Celery worker specifications for running ZAP scans.

## 1. Out-of-Process Execution
The DAST scanner VM must run a Celery consumer process configured to consume from the Redis queue broker. It handles ZAP container execution asynchronously.

## 2. Docker Execution Socket
The worker utilizes the Docker SDK to spawn an OWASP ZAP container against the resolved staging target URL:
```bash
docker run --network=host -v $(pwd):/zap/wrk/:rw \
  ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t https://staging-target-url -J report.json
```

## 3. Results Callback
Once ZAP completes, the worker reads `report.json`, parses findings, and pushes them back to the FastAPI backend over the HTTP PATCH `/api/scan-results/{id}/progress` endpoint.
