"""
SecureFlow — DAST Service Layer

Handles task dispatch orchestration for Dynamic Application Security Testing (DAST).
Ensures publishing to Redis occurs FIRST, and DB status updates occur SECOND upon success.
"""

import logging
import traceback
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from celery_client import publish_dast_task, DAST_QUEUE, TASK_RUN_ZAP_SCAN
from models import ScanResult

logger = logging.getLogger("secureflow.dast_service")

async def trigger_dast_scan(
    scan_id: int,
    target_url: str,
    deployment_url: Optional[str] = None,
    db: Optional[AsyncSession] = None
) -> Dict[str, Any]:
    """
    Triggers DAST scan execution:
    1. Calls publish_dast_task() FIRST to push to Celery queue (DAST_QUEUE = 'celery').
    2. Updates scan record status in DB to 'queued' SECOND upon confirmed publish success.
    3. Re-raises any exceptions so callers/routers can return HTTP 500 on publish failure.
    """
    logger.info(f"[dast_service] Triggering DAST scan_id={scan_id} against target={target_url}")

    # 1. Publish FIRST
    try:
        pub_res = publish_dast_task(scan_id=scan_id, target_url=target_url, deployment_url=deployment_url)
    except Exception as e:
        tb = traceback.format_exc()
        logger.error(
            f"[trigger_dast_scan] PUBLISH FAILED | queue={DAST_QUEUE} | scan_id={scan_id} |\n{tb}"
        )
        raise RuntimeError(f"Failed to publish DAST task to Celery queue: {e}") from e

    task_id = pub_res.get("task_id")

    # 2. Update DB SECOND upon confirmed success
    if db is not None:
        res = await db.execute(select(ScanResult).filter(ScanResult.id == scan_id))
        scan = res.scalars().first()
        if scan:
            scan.dast_status = "queued"
            steps = dict(scan.pipeline_steps or {})
            steps["zap"] = {
                "result": "QUEUED",
                "detail": f"DAST Task {task_id} queued for target {target_url}"
            }
            scan.pipeline_steps = steps
            await db.commit()
            await db.refresh(scan)
            logger.info(f"[dast_service] DB updated to queued for scan_id={scan_id}, task_id={task_id}")

    return {
        "status": "queued",
        "scan_id": scan_id,
        "task_id": task_id,
        "target_url": target_url,
        "queue": DAST_QUEUE
    }
