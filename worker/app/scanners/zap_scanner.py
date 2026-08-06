import docker
import uuid
from pathlib import Path

ZAP_IMAGE = "ghcr.io/zaproxy/zaproxy:stable"
REPORT_DIR = "/opt/secureflow-worker/zap/work"


def run_baseline_scan(target_url: str):
    """
    Runs an OWASP ZAP baseline scan inside a temporary Docker container.

    ZAP exit codes:
      0 = no alerts found
      2 = alerts found (not a failure — we still parse the report)
      1, 3+ = actual scan failure (abort)
    """

    client = docker.from_env()

    scan_id = str(uuid.uuid4())

    html_report = f"{scan_id}.html"
    json_report = f"{scan_id}.json"

    Path(REPORT_DIR).mkdir(parents=True, exist_ok=True)

    print(f"[ZAP] Starting scan against {target_url}")

    # Do NOT pass remove=True here. Docker auto-removes the container the moment
    # it exits, which makes container.logs() fail with a 404. We remove it
    # manually in the finally block after we've safely extracted the logs.
    container = client.containers.run(
        image=ZAP_IMAGE,
        command=[
            "zap-baseline.py",
            "-t", target_url,
            "-r", html_report,
            "-J", json_report,
        ],
        volumes={
            REPORT_DIR: {
                "bind": "/zap/wrk",
                "mode": "rw",
            }
        },
        remove=False,
        detach=True,
    )

    try:
        result = container.wait()
        logs = container.logs().decode(errors="replace")
        print(logs)

        exit_code = result.get("StatusCode", 1)

        # Exit code 2 means ZAP found alerts — the report is still valid.
        # Only treat codes other than 0 and 2 as hard failures.
        if exit_code not in (0, 2):
            raise Exception(f"ZAP scan failed with exit code {exit_code}")

    finally:
        try:
            container.remove(force=True)
        except Exception:
            pass

    return {
        "scan_id": scan_id,
        "html_report": f"{REPORT_DIR}/{html_report}",
        "json_report": f"{REPORT_DIR}/{json_report}",
    }

