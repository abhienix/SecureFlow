# CI/CD Pipeline Guide

This document covers the GitHub Actions workflow orchestration of SecureFlow.

## 1. Pipeline Definition
The CI/CD workflow is located in `.github/workflows/security-pipeline.yml`. It is triggered on code push/PR events to main.

## 2. Core Scanners
*   **Gitleaks**: Scans commit history for secrets.
*   **Semgrep**: Audits backend source files for insecure code structures.
*   **Trivy**: Checks docker base images and dependency modules for CVEs.
*   **OWASP ZAP**: Asynchronously attacks the staging target app.

## 3. Telemetry Integration
At each stage, the runner pushes execution results to the backend API:
```bash
curl -X PATCH -H "Authorization: Bearer $API_SECRET" \
  -d '{"stage": "sast", "status": "PASSED"}' \
  https://backend-url/api/scan-results/$RUN_ID/progress
```
