import requests

BACKEND_URL = "http://YOUR_BACKEND_URL/api/scan-results"


def send_results(scan_id: str, findings: list):
    """
    Send parsed findings back to the SecureFlow backend.
    """

    payload = {
        "scan_id": scan_id,
        "findings": findings,
    }

    response = requests.post(
        BACKEND_URL,
        json=payload,
        timeout=60,
    )

    response.raise_for_status()

    return response.json()
