"""
SecureFlow — Celery Producer & Redis Task Enqueueing Module

Handles asynchronous, non-blocking publishing of DAST scanning tasks
to the Redis queue consumed by the remote OWASP ZAP Celery Worker VM.
"""

import os
import time
import logging
from typing import Optional, Dict, Any
from celery import Celery

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------
logger = logging.getLogger("secureflow.celery_producer")
logging.basicConfig(level=logging.INFO)

# ---------------------------------------------------------------------------
# Environment Variables & Sensible Defaults
# ---------------------------------------------------------------------------
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
WORKER_QUEUE = os.getenv("WORKER_QUEUE", "celery")
DEFAULT_TARGET_URL = os.getenv(
    "DEFAULT_TARGET_URL",
    "https://secureflow-backend-1083585992526.us-central1.run.app"
)
DAST_ENABLED = os.getenv("DAST_ENABLED", "true").lower() in ("true", "1", "yes")
CELERY_TASK_NAME = os.getenv("CELERY_TASK_NAME", "tasks.run_zap_scan")

# ---------------------------------------------------------------------------
# Celery Producer Initialization (No Worker / Consumer / Backend Result Logic)
# ---------------------------------------------------------------------------
celery_app = Celery(
    "secureflow_producer",
    broker=REDIS_URL
)

celery_app.conf.update(
    task_default_queue=WORKER_QUEUE,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    broker_connection_retry_on_startup=False,
    broker_connection_max_retries=1,
)


def resolve_target_url(
    request_target_url: Optional[str] = None,
    deployment_url: Optional[str] = None
) -> Optional[str]:
    """
    Resolves the DAST target URL in order of precedence:
    1. Request body target_url
    2. Deployment URL already stored / passed
    3. DEFAULT_TARGET_URL
    """
    if request_target_url and request_target_url.strip():
        return request_target_url.strip()
    if deployment_url and deployment_url.strip():
        return deployment_url.strip()
    if DEFAULT_TARGET_URL and DEFAULT_TARGET_URL.strip():
        return DEFAULT_TARGET_URL.strip()
    return None


def publish_dast_task(
    scan_id: int,
    target_url: str,
    deployment_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Asynchronously publishes tasks.run_zap_scan to Redis with exponential backoff.
    
    Retries up to 3 times (0.5s, 1.0s, 2.0s delay).
    Returns a result dict:
      {
        "success": bool,
        "task_id": str | None,
        "error": str | None,
        "attempts": int
      }
    NEVER raises exceptions to prevent breaking FastAPI HTTP responses.
    """
    if not DAST_ENABLED:
        logger.info(f"[celery_client] DAST is disabled (DAST_ENABLED=false). Skipping queue for scan_id={scan_id}")
        return {
            "success": False,
            "task_id": None,
            "error": "DAST_DISABLED",
            "attempts": 0
        }

    task_name = CELERY_TASK_NAME
    kwargs = {
        "scan_id": scan_id,
        "target_url": target_url,
    }
    if deployment_url:
        kwargs["deployment_url"] = deployment_url

    max_attempts = 3
    attempt = 0
    backoff = 0.5

    while attempt < max_attempts:
        attempt += 1
        try:
            logger.info(
                f"[celery_client] Publishing DAST task '{task_name}' for scan_id={scan_id}, "
                f"target='{target_url}' (queue='{WORKER_QUEUE}', attempt={attempt}/{max_attempts})..."
            )

            # Send task to Redis broker asynchronously without waiting for result backend
            async_result = celery_app.send_task(
                task_name,
                kwargs=kwargs,
                queue=WORKER_QUEUE,
                ignore_result=True
            )

            task_id = async_result.id
            logger.info(
                f"[celery_client] SUCCESS: Task published with task_id={task_id} for scan_id={scan_id}"
            )
            return {
                "success": True,
                "task_id": task_id,
                "error": None,
                "attempts": attempt,
            }

        except Exception as e:
            err_detail = f"Attempt {attempt}/{max_attempts} failed publishing to Redis ({REDIS_URL}): {e}"
            logger.warning(f"[celery_client] {err_detail}")
            if attempt < max_attempts:
                time.sleep(backoff)
                backoff *= 2.0
            else:
                final_error = f"Redis queue publish failed after {max_attempts} attempts: {str(e)}"
                logger.error(f"[celery_client] {final_error}")
                return {
                    "success": False,
                    "task_id": None,
                    "error": final_error,
                    "attempts": attempt,
                }

    return {
        "success": False,
        "task_id": None,
        "error": "Unknown publish error",
        "attempts": attempt
    }
