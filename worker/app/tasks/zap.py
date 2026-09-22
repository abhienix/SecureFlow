from app.celery_app import celery
from app.scanners.zap_scanner import run_baseline_scan
from app.parsers.zap_parser import parse_zap_report
from app.clients.backend import send_results


@celery.task(name="tasks.run_zap_scan")
def run_zap_scan(scan_id: str, target_url: str, **kwargs):
    print(f"[+] Starting DAST Scan: {target_url}")

    reports = run_baseline_scan(target_url)

    findings = parse_zap_report(reports["json_report"])

    print(f"[+] Found {len(findings)} findings")

    try:
        send_results(scan_id, findings)
        print("[+] Results sent to backend")
    except Exception as e:
        # Don't swallow this: if the callback fails (e.g. auth rejected, backend
        # down past retry limit), the findings never reach the database and the
        # scan row stays stuck at "running". Re-raise so Celery marks the task
        # failed and it's visible in monitoring instead of silently vanishing.
        print(f"[!] Failed to send results: {e}")
        raise

    return {
        "status": "completed",
        "scan_id": scan_id,
        "findings": len(findings),
    }
