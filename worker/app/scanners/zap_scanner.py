import docker
import uuid
from pathlib import Path

ZAP_IMAGE = "ghcr.io/zaproxy/zaproxy:stable"
REPORT_DIR = "/opt/secureflow-worker/zap/work"


def run_baseline_scan(target_url: str):
    """
    Runs an OWASP ZAP baseline scan inside a temporary Docker container.
    """

    client = docker.from_env()

    scan_id = str(uuid.uuid4())

    html_report = f"{scan_id}.html"
    json_report = f"{scan_id}.json"

    Path(REPORT_DIR).mkdir(parents=True, exist_ok=True)

    print(f"[ZAP] Starting scan against {target_url}")

    container = client.containers.run(
        image=ZAP_IMAGE,
        command=[
            "zap-baseline.py",
            "-t",
            target_url,
            "-r",
            html_report,
            "-J",
            json_report,
        ],
        volumes={
            REPORT_DIR: {
                "bind": "/zap/wrk",
                "mode": "rw",
            }
        },
        remove=True,
        detach=True,
    )

    result = container.wait()

    logs = container.logs().decode()

    print(logs)

    if result["StatusCode"] != 0:
        raise Exception("ZAP scan failed")

    return {
        "scan_id": scan_id,
        "html_report": f"{REPORT_DIR}/{html_report}",
        "json_report": f"{REPORT_DIR}/{json_report}",
    }
