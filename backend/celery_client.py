"""
SecureFlow — Celery Producer & Redis Task Enqueueing Module

Handles asynchronous, non-blocking publishing of DAST scanning tasks
to the Redis queue consumed by the remote OWASP ZAP Celery Worker VM.
"""

import os
import time
import uuid
import logging
import traceback
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from celery import Celery

# ---------------------------------------------------------------------------
# Load Environment & Logging Configuration
# ---------------------------------------------------------------------------
load_dotenv()

logger = logging.getLogger("secureflow.celery_producer")
logging.basicConfig(level=logging.INFO)

# Shared Constants Exported for End-to-End Pipeline Consistency
DAST_QUEUE = "celery"
TASK_RUN_ZAP_SCAN = "tasks.run_zap_scan"
WORKER_QUEUE = DAST_QUEUE
CELERY_TASK_NAME = TASK_RUN_ZAP_SCAN

# ---------------------------------------------------------------------------
# Environment Variables & Lazy Broker Resolution
# ---------------------------------------------------------------------------
def get_broker_url() -> str:
    """
    Lazy broker URL resolution priority:
      1. CELERY_BROKER_URL  (explicit — set in Cloud Run env)
      2. UPSTASH_REDIS_URL  (legacy — Upstash SaaS Redis)
      3. REDIS_URL          (generic fallback)
      4. redis://10.128.0.2:6379/0 (Worker VM private IP default)
    """
    return (
        os.getenv("CELERY_BROKER_URL")
        or os.getenv("UPSTASH_REDIS_URL")
        or os.getenv("REDIS_URL")
        or "redis://10.128.0.2:6379/0"
    )

def get_redis_url() -> str:
    return get_broker_url()

# Dynamic properties for backwards compatibility
REDIS_URL = get_broker_url()
BROKER_URL = get_broker_url()
DEFAULT_TARGET_URL = os.getenv(
    "DEFAULT_TARGET_URL",
    "https://secureflow-backend-1083585992526.us-central1.run.app"
)
DAST_ENABLED = os.getenv("DAST_ENABLED", "true").lower() in ("true", "1", "yes")


def _mask_redis_url(url: str) -> str:
    """Mask password in redis:// URL for safe logging."""
    if not url:
        return url
    if "@" in url:
        prefix, rest = url.split("@", 1)
        if "://" in prefix:
            scheme_part = prefix.split("://")[0]
            return f"{scheme_part}://*****@{rest}"
        return f"*****@{rest}"
    return url


# ---------------------------------------------------------------------------
# Celery Producer Singleton Initialization
# ---------------------------------------------------------------------------
_initial_broker = get_broker_url()
logger.info(
    f"[celery_client] Initializing Celery producer singleton — "
    f"broker={_mask_redis_url(_initial_broker)}, "
    f"queue={DAST_QUEUE}, "
    f"task={TASK_RUN_ZAP_SCAN}"
)

celery_app = Celery(
    "secureflow_producer",
    broker=_initial_broker
)

celery_app.conf.update(
    task_default_queue=DAST_QUEUE,
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
    Publishes tasks.run_zap_scan to Redis Celery queue.
    Executes send_task() directly using DAST_QUEUE ('celery').
    Logs exact required output formats on start, success, and failure.
    On failure, logs full traceback and re-raises as RuntimeError.
    """
    if not DAST_ENABLED:
        logger.info(f"[trigger_dast_scan] DAST is disabled (DAST_ENABLED=false). Skipping queue for scan_id={scan_id}")
        return {
            "success": False,
            "task_id": None,
            "error": "DAST_DISABLED",
            "attempts": 0
        }

    broker_url = get_broker_url()
    celery_app.conf.broker_url = broker_url

    payload = {
        "scan_id": scan_id,
        "target_url": target_url,
    }
    if deployment_url:
        payload["deployment_url"] = deployment_url

    logger.info(
        f"[trigger_dast_scan] Publishing Celery task | "
        f"broker={_mask_redis_url(broker_url)} | "
        f"queue={DAST_QUEUE} | "
        f"task={TASK_RUN_ZAP_SCAN} | "
        f"scan_id={scan_id} | "
        f"payload={payload}"
    )

    try:
        async_result = celery_app.send_task(
            TASK_RUN_ZAP_SCAN,
            kwargs=payload,
            queue=DAST_QUEUE,
            ignore_result=True
        )

        task_id = async_result.id
        logger.info(
            f"[trigger_dast_scan] Task published successfully | "
            f"task_id={task_id} | "
            f"broker={_mask_redis_url(broker_url)} | "
            f"queue={DAST_QUEUE}"
        )

        return {
            "success": True,
            "task_id": task_id,
            "error": None,
        }

    except Exception as e:
        tb = traceback.format_exc()
        logger.error(
            f"[trigger_dast_scan] PUBLISH FAILED | "
            f"broker={_mask_redis_url(broker_url)} | "
            f"queue={DAST_QUEUE} | "
            f"scan_id={scan_id} |\n{tb}"
        )
        raise RuntimeError(f"Failed to publish DAST task for scan_id={scan_id}: {e}") from e

