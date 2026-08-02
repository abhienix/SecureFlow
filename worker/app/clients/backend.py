import os
import requests

BACKEND_URL = os.getenv("BACKEND_URL", "https://your-backend.run.app/api/scan-results")


def send_results(scan_id: str, findings: list):
    """
    Send parsed findings back to the SecureFlow backend.
    """

    payload = {
        "scan_id": scan_id,
        "findings": findings,
    }

    # nosemgrep: python.lang.security.audit.insecure-transport.requests.request-with-http.request-with-http
    response = requests.post(
        BACKEND_URL,
        json=payload,
        timeout=60,
    )

    response.raise_for_status()

    return response.json()
