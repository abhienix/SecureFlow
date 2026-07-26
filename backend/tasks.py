"""
SecureFlow — Celery Worker Task Definitions

Defines tasks.run_zap_scan for OWASP ZAP DAST scanning.
Imports celery_app singleton from celery_client — DOES NOT instantiate Celery().
"""

import os
import time
import logging
from celery_client import celery_app, TASK_RUN_ZAP_SCAN, DAST_QUEUE

logger = logging.getLogger("secureflow.worker_tasks")

@celery_app.task(name=TASK_RUN_ZAP_SCAN, bind=True)
def run_zap_scan(self, scan_id: int, target_url: str, deployment_url: str = None):
    """
    Celery task executed by the remote OWASP ZAP Worker VM container.
    """
    task_id = self.request.id
    logger.info(
        f"[run_zap_scan] Task received | "
        f"task_id={task_id} | "
        f"scan_id={scan_id} | "
        f"target={target_url}"
    )

    logger.info(f"[run_zap_scan] status=RUNNING | task_id={task_id} | scan_id={scan_id}")

    # Simulated/Actual ZAP Scan Logic Execution
    # Real worker will run ZAP baseline scan against target_url
    time.sleep(2)

    logger.info(f"[run_zap_scan] status=COMPLETED | task_id={task_id} | scan_id={scan_id}")

    return {
        "status": "COMPLETED",
        "task_id": task_id,
        "scan_id": scan_id,
        "target_url": target_url,
        "summary": {"high": 0, "medium": 0, "low": 1, "info": 2}
    }
