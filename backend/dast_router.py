"""
SecureFlow — DAST FastAPI Router Layer

Exposes DAST trigger and status management endpoints.
Propagates publish failures directly to FastAPI so HTTP 500 is returned on error,
preventing CI/CD pipelines from getting stuck on HTTP 200 with ghost tasks.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import ScanResult
from dast_service import trigger_dast_scan

logger = logging.getLogger("secureflow.dast_router")

router = APIRouter(prefix="/api/dast", tags=["DAST Orchestration"])


@router.post("/trigger", response_model=None)
async def trigger_dast_endpoint(data: dict, db: AsyncSession = Depends(get_db):
    """
    Triggers a DAST scan.
    Does NOT catch publish exceptions — allows them to bubble up to FastAPI to return HTTP 500.
    Logs task_id on success.
    """
    scan_id = data.get("scan_id")
    target_url = data.get("target_url")
    deployment_url = data.get("deployment_url")

    if not scan_id or not target_url:
        raise HTTPException(status_code=400, detail="Both 'scan_id' and 'target_url' are required.")

    # Call trigger_dast_scan — do not catch exceptions here so publish failures return HTTP 500
    res = await trigger_dast_scan(
        scan_id=int(scan_id),
        target_url=str(target_url),
        deployment_url=deployment_url,
        db=db
    )

    task_id = res.get("task_id")
    logger.info(f"[dast_router] DAST scan triggered successfully | scan_id={scan_id} | task_id={task_id}")
    return res


@router.get("/status/{scan_id}")
async def get_dast_status(scan_id: int, db: AsyncSession = Depends(get_db):
    """
    Returns current DAST status for a scan record.
    """
    res = await db.execute(select(ScanResult).filter(ScanResult.id == scan_id))
    scan = res.scalars().first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan result not found.")
    return {
        "scan_id": scan.id,
        "dast_status": scan.dast_status or "not_queued",
        "target_url": scan.target_url,
        "pipeline_steps": scan.pipeline_steps or {}
    }

