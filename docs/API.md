# API Schema References

This document references the core REST API endpoints.

## 1. REST Endpoints

### Trigger DAST / Scan Start
*   `POST /api/scan-results/start`
*   **Payload**:
    ```json
    {
      "repo_name": "SecureFlow",
      "branch": "main",
      "commit_sha": "a1b2c3d4",
      "target_url": "https://staging-url"
    }
    ```

### Telemetry / Progress Update
*   `PATCH /api/scan-results/{id}/progress`
*   **Payload**:
    ```json
    {
      "stage": "dast",
      "status": "complete",
      "worker_name": "worker-vm-1"
    }
    ```

### Versioned API (v1)
*   `GET /api/v1/pipelines` — List pipeline runs
*   `GET /api/v1/repositories` — List repositories
*   `GET /api/v1/security/findings` — List security findings
*   `GET /api/v1/deployments` — List deployments
*   `POST /api/v1/copilot/chat` — Chat with AI Copilot

## 2. OpenAPI Interactive Docs
Start the server and visit `http://localhost:8000/docs` to view Swagger specifications.
