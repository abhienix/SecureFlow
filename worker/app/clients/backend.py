import os
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BACKEND_URL = os.getenv("BACKEND_URL", "https://your-backend.run.app/api/scan-results")


def _build_session() -> requests.Session:
    """
    Build a requests session with retry logic.

    ZAP scans can take several minutes. By the time results come back,
    the backend might be mid-restart (Cloud Run scale-to-zero, rolling deploy).
    Without retries, the callback silently drops results and the scan row
    stays stuck at 'running' forever.
    """
    session = requests.Session()
    retry = Retry(
        total=4,
        backoff_factor=1.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["POST"],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def send_results(scan_id: str, findings: list):
    """
    Send parsed ZAP findings back to the SecureFlow backend.
    """
    payload = {
        "scan_id": scan_id,
        "findings": findings,
    }

    session = _build_session()
    response = session.post(
        BACKEND_URL,
        json=payload,
        timeout=60,
    )

    response.raise_for_status()

    return response.json()
