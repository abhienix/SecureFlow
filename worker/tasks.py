"""
SecureFlow — Worker VM Celery Task Module

Imports celery_app singleton from celery_client (no shadow Celery() instantiation).
"""

import sys
import os

# Ensure backend directory is in path if imported within worker folder
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

try:
    from celery_client import celery_app, TASK_RUN_ZAP_SCAN
except ImportError:
    from backend.celery_client import celery_app, TASK_RUN_ZAP_SCAN

from tasks import run_zap_scan  # re-export task definition

__all__ = ["celery_app", "run_zap_scan"]
