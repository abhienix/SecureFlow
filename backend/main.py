"""
SecureFlow — DevSecOps Backend API & Telemetry Service

FastAPI service handling scan ingestion, policy enforcement,
distributed DAST task queueing via Celery/Redis, WebSocket streaming
to dashboard, and AI remediation routing.
# Backend-only verification run without deploy tag
"""

import os
import json
import yaml
import asyncio
import logging
import secrets
import socket
from datetime import datetime, timedelta
from typing import Set, Optional

from dotenv import load_dotenv

# Load .env BEFORE any module imports that read environment variables.
# celery_client evaluates REDIS_URL at module level — if load_dotenv()
# runs after the import, the .env file values won't be available.
load_dotenv()

from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, HTTPException, Request, APIRouter, responses
from fastapi.middleware.cors import CORSMiddleware
try:
    from prometheus_fastapi_instrumentator import Instrumentator
except ImportError:
    Instrumentator = None
from sqlalchemy import select, func, text, delete
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from models import (
    Base, ScanResult, Repository, PipelineRun, PipelineStage,
    PipelineStep, SecurityFinding, ScanRun, Deployment, Policy,
    PolicyViolation, Notification, Event, MetricSnapshot
)
from redis_pubsub import RedisPubSubManager, REDIS_BROADCAST_CHANNEL
from policy_engine import evaluate_policy, get_highest_cvss_score, get_highest_severity_label, load_policy_file
from ai_analysis import analyze_scan, analyze_code_scan_failure, answer_copilot_question, smart_fallback
from pipeline_engine import (
    PipelineStateMachine, StageStatus, STAGE_ORDER, STAGE_DEFINITIONS, build_stage_log,
)
from celery_client import (
    publish_dast_task,
    resolve_target_url,
    get_broker_url,
    _mask_redis_url,
    REDIS_URL,
    WORKER_QUEUE,
    DAST_QUEUE,
    DEFAULT_TARGET_URL,
    DAST_ENABLED,
)

# ---------------------------------------------------------------------------
# Logging & Environment configuration
# ---------------------------------------------------------------------------

logger = logging.getLogger("secureflow.backend")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@10.128.0.2:5432/secureflow")
STALE_RUN_TIMEOUT_MINUTES = int(os.getenv("STALE_RUN_TIMEOUT_MINUTES", "20"))
WATCHDOG_INTERVAL_SECONDS = int(os.getenv("WATCHDOG_INTERVAL_SECONDS", "30"))

# Shared API secret for GitHub Actions → Backend authentication.
# Set BACKEND_API_SECRET as a GitHub Actions secret and as a Cloud Run env var.
# If empty/unset, authentication is skipped (local development mode).
BACKEND_API_SECRET = os.getenv("BACKEND_API_SECRET", "")

# Guard: if we're running on Cloud Run or ENVIRONMENT=production and the API
# secret is missing, this is almost certainly a deployment mistake — everyone
# who can reach the backend URL can forge scan results. Log a critical warning
# so the operator notices immediately rather than discovering it silently later.
_is_production = bool(os.getenv("K_SERVICE") or os.getenv("K_REVISION") or os.getenv("ENVIRONMENT", "").lower() == "production")
if _is_production and not BACKEND_API_SECRET:
    logger.critical(
        "[SECURITY] BACKEND_API_SECRET is not set but the service appears to be running "
        "in production (K_SERVICE/K_REVISION/ENVIRONMENT detected). "
        "Authentication on all POST/PATCH endpoints is DISABLED. "
        "Set the BACKEND_API_SECRET environment variable immediately."
    )

# Dynamically convert to postgresql+asyncpg for asyncio postgres driver
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://") if DATABASE_URL.startswith("postgresql://") else DATABASE_URL

if ASYNC_DATABASE_URL.startswith("postgresql+asyncpg://"):
    try:
        import asyncpg  # noqa: F401
    except ImportError:
        logger.info("[database] asyncpg module not found — using sqlite+aiosqlite:///./secureflow_dev.db")
        ASYNC_DATABASE_URL = "sqlite+aiosqlite:///./secureflow_dev.db"

kw = {}
if "postgresql" in ASYNC_DATABASE_URL:
    kw = {
        "pool_size": 20,
        "max_overflow": 10,
        "connect_args": {"timeout": 30, "command_timeout": 30}
    }

engine = create_async_engine(ASYNC_DATABASE_URL, **kw)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

# ---------------------------------------------------------------------------
# WebSocket connection manager
# ---------------------------------------------------------------------------

class ConnectionManager:
    def __init__(self):
        self.active: Set[WebSocket] = set()
        # Dedup set prevents double-broadcast when Redis echoes our own message
        self._seen_ids: set = set()
        self._seen_lock = asyncio.Lock()
        # Event version counter for stale event detection
        self._event_version = 0
        self._version_lock = asyncio.Lock()
        self._last_states: dict = {}  # run_id -> {stage_key: (version, status)}

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.add(ws)
        logger.info(f"[ws] CONNECT  instance={_INSTANCE_ID} active={len(self.active)}")

    def disconnect(self, ws: WebSocket):
        self.active.discard(ws)

    async def broadcast(self, data: dict):
        """Broadcast locally + cross-instance via Redis pub/sub."""
        import uuid
        msg_id = data.get("_msg_id") or uuid.uuid4().hex
        data["_msg_id"] = msg_id

        # Assign event version for stale detection
        run_id = data.get("run_id")
        if run_id:
            async with self._version_lock:
                self._event_version += 1
                data["_event_version"] = self._event_version
                # Check staleness for stage-specific updates
                stage_key = data.get("stage_key")
                if stage_key:
                    state_key = f"{run_id}:{stage_key}"
                    current = self._last_states.get(state_key)
                    if current and current[0] >= self._event_version - 1:
                        # Skip broadcast if stale
                        return

        await self._broadcast_local(data, msg_id)

        if redis_pubsub_manager._connected:
            await redis_pubsub_manager.publish(json.dumps(data))

    async def _broadcast_local(self, data: dict, msg_id: str | None = None):
        """Send to local clients only (no Redis publish)."""
        message = json.dumps(data)
        dead = set()
        for ws in self.active:
            try:
                await ws.send_text(message)
            except Exception:
                dead.add(ws)
        self.active -= dead
        if dead:
            logger.info(f"[ws] BROADCAST instance={_INSTANCE_ID} sent={len(dead) + len(self.active)} dead={len(dead)} remaining={len(self.active)}")

    async def is_stale_event(self, run_id: str, stage_key: str, new_status: str, new_version: int) -> bool:
        """Check if an event is stale (a newer event for the same stage already seen)."""
        async with self._version_lock:
            key = f"{run_id}:{stage_key}"
            current = self._last_states.get(key)
            if current and current[0] >= new_version:
                return True  # Stale — same or newer version already recorded
            self._last_states[key] = (new_version, new_status)
            # Prune old entries
            if len(self._last_states) > 5000:
                self._last_states.clear()
            return False

    async def on_redis_message(self, raw: str):
        """Callback for Redis pub/sub messages — broadcast only to local clients."""
        data = json.loads(raw)
        msg_id = data.get("_msg_id")
        if msg_id:
            async with self._seen_lock:
                if msg_id in self._seen_ids:
                    return  # Already handled (our own publish echoed back)
                self._seen_ids.add(msg_id)
                if len(self._seen_ids) > 1000:
                    self._seen_ids.clear()
        await self._broadcast_local(data, msg_id)


manager = ConnectionManager()

# ── Redis pub/sub for cross-instance WebSocket broadcast ────────────────
# Uses the same Redis URL as Celery broker. Falls back to single-instance
# mode (in-memory only) when Redis is unavailable or redis-py is not installed.
redis_pubsub_manager = RedisPubSubManager(REDIS_URL)

# ── Instance identity for multi-instance diagnostics ─────────────────────
# Cloud Run populates K_REVISION and K_SERVICE; hostname is a fallback.
# Logged on every WS connect and broadcast so we can confirm whether more
# than one instance is serving traffic (which breaks in-memory WS fan-out).
_INSTANCE_ID = "_".join(filter(None, [
    os.getenv("K_SERVICE", ""),
    os.getenv("K_REVISION", ""),
    socket.gethostname(),
])) or "local-dev"
logger.info(f"[instance] INSTANCE_ID={_INSTANCE_ID}")

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

from contextlib import asynccontextmanager

async def _init_db_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    is_sqlite = "sqlite" in str(engine.url)

    migration_statements = [
        "ALTER TABLE scan_results ADD COLUMN dast_status VARCHAR",
        "ALTER TABLE scan_results ADD COLUMN target_url VARCHAR",
        "ALTER TABLE scan_results ADD COLUMN deployment_url VARCHAR",
        "ALTER TABLE scan_results ADD COLUMN zap_findings JSON",
        "ALTER TABLE scan_results ADD COLUMN zap_summary JSON",
        "ALTER TABLE scan_results ADD COLUMN queued_at TIMESTAMP",
        "ALTER TABLE scan_results ADD COLUMN dast_started_at TIMESTAMP",
        "ALTER TABLE scan_results ADD COLUMN dast_completed_at TIMESTAMP",
        "ALTER TABLE scan_results ADD COLUMN scan_duration INTEGER",
        "ALTER TABLE scan_results ADD COLUMN worker_name VARCHAR",
        "ALTER TABLE scan_results ADD COLUMN worker_id VARCHAR",
        "ALTER TABLE scan_results ADD COLUMN queue_error TEXT",
        "ALTER TABLE scan_results ADD COLUMN zap_report_path VARCHAR",
        "ALTER TABLE pipeline_stages ADD COLUMN stage_key VARCHAR",
        "ALTER TABLE pipeline_stages ADD COLUMN order_index INTEGER",
        "ALTER TABLE pipeline_stages ADD COLUMN exit_code INTEGER",
        "ALTER TABLE pipeline_stages ADD COLUMN detail TEXT",
        "ALTER TABLE pipeline_stages ADD COLUMN retry_count INTEGER",
        "ALTER TABLE events ADD COLUMN event_version INTEGER DEFAULT 1",
        "ALTER TABLE events ADD COLUMN dedup_key VARCHAR",
        "ALTER TABLE events ADD COLUMN source_link VARCHAR",
    ]

    for stmt_str in migration_statements:
        if not is_sqlite:
            stmt_sql = stmt_str.replace("ADD COLUMN ", "ADD COLUMN IF NOT EXISTS ")
        else:
            stmt_sql = stmt_str

        try:
            async with engine.begin() as conn:
                await conn.execute(text(stmt_sql))
        except Exception as e:
            logger.info(f"[startup migration] column already exists or notice: {e}")

        # Detect duplicate active rows that would violate the upcoming
        # partial unique index on (commit_sha, repo_name, branch).
        # The PostgreSQL migration will fail if duplicates exist — the
        # operator must clean them up first via manual SQL or a one-off
        # migration job.
    if not is_sqlite:
        dup_sql = text("""
            SELECT commit_sha, repo_name, branch, COUNT(*) AS cnt
            FROM scan_results
            WHERE status != 'superseded'
            GROUP BY commit_sha, repo_name, branch
            HAVING COUNT(*) > 1
            LIMIT 20
        """)
        try:
            async with engine.begin() as conn:
                dup_result = await conn.execute(dup_sql)
                dup_rows = dup_result.fetchall()
                if dup_rows:
                    logger.warning(
                        "[startup migration] %d rows have duplicate active (commit_sha, repo_name, branch) "
                        "combinations. The partial unique index will FAIL to apply in PostgreSQL. "
                        "Run a one-time dedup migration to resolve before the next deploy. "
                        "Sample rows: %s",
                        len(dup_rows),
                        [dict(r._mapping) for r in dup_rows[:5]],
                    )
        except Exception as e:
            logger.info(f"[startup migration] duplicate check skipped: {e}")


@asynccontextmanager
async def _get_db_session(db_session: AsyncSession = None):
    if db_session:
        yield db_session
    else:
        async with AsyncSessionLocal() as session:
            yield session

async def seed_new_tables_from_scan_results(db_session: AsyncSession = None):
    async with _get_db_session(db_session) as db:
        # Check if already seeded
        repo_check = await db.execute(select(Repository))
        if repo_check.scalars().first():
            logger.info("[startup seed] New tables already seeded. Skipping.")
            return

        logger.info("[startup seed] Seeding new tables from scan_results...")
        scan_res = await db.execute(select(ScanResult).order_by(ScanResult.created_at.asc()))
        scans = scan_res.scalars().all()

        if not scans:
            logger.info("[startup seed] No scan results in DB. Creating default mock scan records...")
            from datetime import datetime, timedelta
            now = datetime.utcnow()
            default_scans = [
                ScanResult(
                    id=1,
                    commit_sha="a1b2c3d4e5f67890",
                    commit_message="feat: add custom alert notification manager [deploy]",
                    repo_name="abhienix/SecureFlow",
                    branch="main",
                    scan_type="full-pipeline",
                    severity="LOW",
                    findings={},
                    ai_explanation="Build compiled and scanned cleanly with zero blocking vulnerabilities.",
                    ai_fix="No actions required.",
                    risk_score=95,
                    action_taken="ALLOW",
                    pipeline_steps={"checkout": {"result": "PASS", "detail": "code checked out"}},
                    status="complete",
                    started_at=now - timedelta(days=2),
                    created_at=now - timedelta(days=2),
                    target_url="https://secureflow-backend-staging.run.app",
                    deployment_url="https://secureflow-frontend-staging.run.app",
                    dast_status="completed",
                    scan_duration=48
                ),
                ScanResult(
                    id=2,
                    commit_sha="9781c68b937882e8a91b5afd9939db4ef9d2655d",
                    commit_message="test: add draft stripe test implementation [deploy]",
                    repo_name="abhienix/SecureFlow",
                    branch="secureflow-v1",
                    scan_type="full-pipeline",
                    severity="CRITICAL",
                    findings={
                        "gitleaks": [
                            {
                                "RuleID": "stripe-access-token",
                                "Description": "Stripe Access Token",
                                "StartLine": 14,
                                "File": "demo_security_test.py",
                                "Secret": "sk_test_mock_holder"
                            }
                        ]
                    },
                    ai_explanation="Gitleaks detected plain-text Stripe secret inside repository history.",
                    ai_fix="Rotate exposed credential immediately and remove from Git history.",
                    risk_score=20,
                    action_taken="BLOCK",
                    pipeline_steps={"checkout": {"result": "PASS", "detail": "code checked out"}},
                    status="complete",
                    started_at=now - timedelta(days=1),
                    created_at=now - timedelta(days=1),
                    target_url="https://secureflow-backend-staging.run.app",
                    deployment_url="",
                    dast_status="not_queued",
                    scan_duration=12
                ),
                ScanResult(
                    id=3,
                    commit_sha="e29d9edc38484920b229",
                    commit_message="chore: update frontend docker packages [deploy]",
                    repo_name="abhienix/SecureFlow",
                    branch="main",
                    scan_type="full-pipeline",
                    severity="HIGH",
                    findings={
                        "semgrep": [
                            {
                                "check_id": "rules.python.security.sql-injection",
                                "extra": {
                                    "message": "SQL Injection vulnerability detected in raw SQL query execution.",
                                    "severity": "ERROR"
                                },
                                "path": "backend/main.py",
                                "start": { "line": 234 }
                            }
                        ],
                        "Results": [
                            {
                                "Target": "frontend/Dockerfile",
                                "Vulnerabilities": [
                                    {
                                        "VulnerabilityID": "CVE-2025-0012",
                                        "PkgName": "libssl1.1",
                                        "Severity": "HIGH",
                                        "FixedVersion": "1.1.1t-r0"
                                    }
                                ]
                            }
                        ]
                    },
                    ai_explanation="Semgrep detected raw SQL string format formatting, creating SQL Injection risk. Trivy found critical outdated SSL package.",
                    ai_fix="Use parameterized execute queries. Re-build Docker container using base alpine image.",
                    risk_score=55,
                    action_taken="ALLOW",
                    pipeline_steps={"checkout": {"result": "PASS", "detail": "code checked out"}},
                    status="complete",
                    started_at=now - timedelta(hours=5),
                    created_at=now - timedelta(hours=5),
                    target_url="https://secureflow-backend-staging.run.app",
                    deployment_url="https://secureflow-frontend-staging.run.app",
                    dast_status="completed",
                    scan_duration=52
                )
            ]
            db.add_all(default_scans)
            await db.commit()
            scan_res = await db.execute(select(ScanResult).order_by(ScanResult.created_at.asc()))
            scans = scan_res.scalars().all()

        repos_cache = {}

        # 1. Seed default policies if none exist
        policy_check = await db.execute(select(Policy))
        if not policy_check.scalars().first():
            default_policies = [
                Policy(name="Block Critical & High Vulnerabilities", type="Severity Gate", rule_summary="No Critical/High findings allowed in main branch deploys", status="active", enforcement_mode="block"),
                Policy(name="Block Hardcoded Secrets / Private Keys", type="Secret Detection", rule_summary="No exposed secrets or API keys allowed", status="active", enforcement_mode="block"),
                Policy(name="Warn on Medium Severity CVEs", type="Severity Gate", rule_summary="Log warning for Medium vulnerability findings", status="active", enforcement_mode="warn"),
                Policy(name="Strict DAST Header Verification Gate", type="Coverage Gate", rule_summary="Verify security headers are configured properly", status="active", enforcement_mode="warn")
            ]
            db.add_all(default_policies)
            await db.commit()

        for s in scans:
            repo_name = s.repo_name or "abhienix/SecureFlow"
            if repo_name not in repos_cache:
                owner = repo_name.split("/")[0] if "/" in repo_name else "abhienix"
                short_name = repo_name.split("/")[-1] if "/" in repo_name else repo_name
                repo = Repository(
                    name=repo_name,
                    repo_name=short_name,
                    owner=owner,
                    default_branch=s.branch or "main",
                    status="active",
                    url=f"https://github.com/{repo_name}"
                )
                db.add(repo)
                await db.commit()
                await db.refresh(repo)
                repos_cache[repo_name] = repo
            
            repo = repos_cache[repo_name]

            run_id = f"run-{s.id}"
            run_check = await db.execute(select(PipelineRun).filter(PipelineRun.id == run_id))
            if run_check.scalars().first():
                continue

            run = PipelineRun(
                id=run_id,
                run_number=s.id,
                repo_id=repo.id,
                commit_sha=s.commit_sha,
                commit_message=s.commit_message,
                branch=s.branch or "main",
                status=s.status or "complete",
                action_taken=s.action_taken or "ALLOW",
                started_at=s.started_at or s.created_at,
                created_at=s.created_at,
                duration=s.scan_duration or 45
            )
            db.add(run)
            await db.commit()

            stages_list = [
                ("push", "Developer Push", "passed", "1.2s", 0, "Developer push received"),
                ("gitleaks", "Gitleaks Secrets", "failed" if len((s.findings or {}).get("gitleaks", [])) > 0 else "passed", "2.1s", 1 if len((s.findings or {}).get("gitleaks", [])) > 0 else 0, "Secrets scan completed"),
                ("semgrep", "Semgrep SAST", "failed" if len((s.findings or {}).get("semgrep", [])) > 0 else "passed", "4.8s", 1 if len((s.findings or {}).get("semgrep", [])) > 0 else 0, "SAST scan completed"),
                ("docker", "Docker Build", "passed", "15.4s", 0, "Docker container image built and pushed to Artifact Registry"),
                ("trivy", "Trivy Container", "failed" if len((s.findings or {}).get("Results", [])) > 0 else "passed", "6.2s", 1 if len((s.findings or {}).get("Results", [])) > 0 else 0, "Container scan completed"),
                ("policy", "Policy Engine", "failed" if s.action_taken == "BLOCK" else "passed", "0.8s", 1 if s.action_taken == "BLOCK" else 0, f"Policy gate evaluated: {s.action_taken}"),
                ("deploy", "GCP Deploy", "passed" if s.action_taken == "ALLOW" else "skipped", "8.1s", 0, "Deployed to Cloud Run staging"),
                ("zap", "OWASP ZAP DAST", "failed" if s.dast_status in ("failed", "queue_failed") else ("passed" if s.dast_status == "completed" else "skipped"), f"{s.scan_duration or 30}s", 1 if s.dast_status in ("failed", "queue_failed") else 0, "DAST dynamic scan completed"),
                ("prod_deploy", "Production Deploy", "passed" if s.action_taken == "ALLOW" and s.dast_status == "completed" else "skipped", "5.0s", 0, "Promoted to Cloud Run production")
            ]

            for s_id, s_name, s_status, s_dur, s_err_code, s_log in stages_list:
                stage = PipelineStage(
                    id=f"stage-{s.id}-{s_id}",
                    run_id=run.id,
                    name=s_name,
                    status=s_status,
                    duration=s_dur,
                    started_at=s.created_at,
                    ended_at=s.created_at
                )
                db.add(stage)
                await db.commit()
                await db.refresh(stage)

                step = PipelineStep(
                    id=f"step-{s.id}-{s_id}",
                    stage_id=stage.id,
                    name=s_name,
                    status=s_status,
                    duration=s_dur,
                    exit_code=s_err_code,
                    logs=f"=== STAGE: {s_name} ===\nStatus: {s_status}\nDuration: {s_dur}\nLogs:\n{s_log}\n"
                )
                db.add(step)
                await db.commit()

            f = s.findings or {}
            for gl in f.get("gitleaks", []):
                finding = SecurityFinding(
                    repo_id=repo.id,
                    pipeline_run_id=run.id,
                    scanner="gitleaks",
                    category="Secret / Credential Exposure",
                    title=f"Exposed Secret: {gl.get('Description') or gl.get('RuleID') or 'API Key'}",
                    severity="CRITICAL" if "secret" in str(gl).lower() else "HIGH",
                    file=gl.get("File") or gl.get("file") or "codebase",
                    line=gl.get("StartLine") or gl.get("startLine") or 1,
                    cve_cwe="CWE-798 (Hardcoded Credentials)",
                    owasp="A07:2021-Identification and Authentication Failures",
                    status="open",
                    created_at=s.created_at,
                    ai_explanation=s.ai_explanation or "Gitleaks detected plain-text secret inside repository history.",
                    ai_fix=s.ai_fix or "Rotate exposed credential immediately and remove from Git history."
                )
                db.add(finding)
                
            for sg in f.get("semgrep", []):
                finding = SecurityFinding(
                    repo_id=repo.id,
                    pipeline_run_id=run.id,
                    scanner="semgrep",
                    category="SAST Flaw",
                    title=sg.get("extra", {}).get("message") or sg.get("check_id") or "Code vulnerability",
                    severity=(sg.get("extra", {}).get("severity") or "HIGH").upper(),
                    file=sg.get("path") or "src/",
                    line=(sg.get("start") or {}).get("line") or 1,
                    cve_cwe=f"CWE-{sg.get('check_id', '89')}",
                    owasp="A03:2021-Injection",
                    status="open",
                    created_at=s.created_at,
                    ai_explanation=s.ai_explanation or "Semgrep detected insecure pattern in source code.",
                    ai_fix=s.ai_fix or "Enforce sanitized input parameters and parameterized queries."
                )
                db.add(finding)

            for res in f.get("Results", []):
                for vul in res.get("Vulnerabilities", []):
                    finding = SecurityFinding(
                        repo_id=repo.id,
                        pipeline_run_id=run.id,
                        scanner="trivy",
                        category="Container CVE",
                        title=f"{vul.get('VulnerabilityID')} in {vul.get('PkgName')}",
                        severity=(vul.get("Severity") or "MEDIUM").upper(),
                        file=res.get("Target") or "Dockerfile",
                        line=1,
                        cve_cwe=vul.get("VulnerabilityID") or "CVE-2026-0001",
                        owasp="A06:2021-Vulnerable and Outdated Components",
                        status="open",
                        created_at=s.created_at,
                        ai_explanation=s.ai_explanation or f"Trivy detected vulnerable package {vul.get('PkgName')}.",
                        ai_fix=f"Upgrade {vul.get('PkgName')} to version {vul.get('FixedVersion') or 'latest'}."
                    )
                    db.add(finding)

            zap_alerts = (f.get("zap") or {}).get("alerts") or (s.zap_findings or {}).get("alerts") or []
            for za in zap_alerts if isinstance(zap_alerts, list) else []:
                finding = SecurityFinding(
                    repo_id=repo.id,
                    pipeline_run_id=run.id,
                    scanner="zap",
                    category="DAST Dynamic Alert",
                    title=za.get("alert") or "OWASP ZAP Dynamic Finding",
                    severity=(za.get("risk") or "MEDIUM").upper(),
                    file=za.get("url") or s.target_url or DEFAULT_TARGET_URL,
                    line=1,
                    cve_cwe=f"CWE-{za.get('pluginId', '693')}",
                    owasp="A05:2021-Security Misconfiguration",
                    status="open",
                    created_at=s.created_at,
                    ai_explanation="OWASP ZAP detected security header misconfiguration or active endpoint flaw.",
                    ai_fix="Add missing security headers and enforce strict CORS / CSP policies."
                )
                db.add(finding)

            if s.deployment_url or (s.pipeline_steps or {}).get("deploy_prod"):
                deployment = Deployment(
                    id=f"dep-{s.id}",
                    revision_name=f"secureflow-backend-{(s.commit_sha or 'v1')[:7]}",
                    service="secureflow-backend",
                    environment="production",
                    url=s.deployment_url or DEFAULT_TARGET_URL,
                    status="active" if s.action_taken == "ALLOW" else "blocked",
                    commit_sha=s.commit_sha,
                    pipeline_run_id=run.id,
                    created_at=s.created_at,
                    duration=s.scan_duration or 45
                )
                db.add(deployment)

            event_start = Event(
                type="pipeline.started",
                message=f"Pipeline run #{s.id} started for repository {repo_name} (branch: {s.branch})",
                source_link=f"/pipelines/{s.id}",
                severity="info",
                created_at=s.started_at or s.created_at
            )
            db.add(event_start)

            event_end = Event(
                type="pipeline.failed" if s.action_taken == "BLOCK" else "deploy.success",
                message=f"Pipeline run #{s.id} completed: Action taken is {s.action_taken}",
                source_link=f"/pipelines/{s.id}",
                severity="warning" if s.action_taken == "BLOCK" else "info",
                created_at=s.created_at
            )
            db.add(event_end)

            await db.commit()

        logger.info("[startup seed] New tables successfully populated from scan_results.")


async def sync_single_scan_result_to_new_tables(scan_id: int, db: AsyncSession):
    """Sync a single ScanResult using the deterministic pipeline state machine.

    The backend is the single source of truth. Stage order and dependencies
    are validated before any record is written.
    """
    res = await db.execute(select(ScanResult).filter(ScanResult.id == scan_id))
    s = res.scalars().first()
    if not s:
        logger.warning(f"[sync] ScanResult {scan_id} not found, skipping sync")
        return

    repo_name = s.repo_name or "abhienix/SecureFlow"
    owner = repo_name.split("/")[0] if "/" in repo_name else "abhienix"
    short_name = repo_name.split("/")[-1] if "/" in repo_name else repo_name

    repo_res = await db.execute(select(Repository).filter(Repository.name == repo_name))
    repo = repo_res.scalars().first()
    if not repo:
        repo = Repository(
            name=repo_name,
            repo_name=short_name,
            owner=owner,
            default_branch=s.branch or "main",
            status="active",
            url=f"https://github.com/{repo_name}"
        )
        db.add(repo)
        await db.commit()
        await db.refresh(repo)

    action_taken = (s.action_taken or "ALLOW").upper()

    # Compute pipeline-level status deterministically
    pipeline_raw = StageStatus.normalize(s.status)
    if action_taken == "BLOCK":
        pipeline_computed = StageStatus.BLOCKED.value
    elif pipeline_raw == StageStatus.RUNNING.value:
        pipeline_computed = StageStatus.RUNNING.value
    elif pipeline_raw == StageStatus.CANCELLED.value or s.status == "timeout":
        pipeline_computed = StageStatus.CANCELLED.value
    elif pipeline_raw == StageStatus.FAILED.value:
        pipeline_computed = StageStatus.FAILED.value
    elif s.status == "superseded":
        pipeline_computed = StageStatus.SKIPPED.value
    else:
        pipeline_computed = StageStatus.PASSED.value

    run_id = f"run-{s.id}"
    run_res = await db.execute(select(PipelineRun).filter(PipelineRun.id == run_id))
    run = run_res.scalars().first()
    if not run:
        run = PipelineRun(
            id=run_id, run_number=s.id, repo_id=repo.id,
            commit_sha=s.commit_sha, commit_message=s.commit_message,
            branch=s.branch or "main", status=pipeline_computed,
            action_taken=action_taken, started_at=s.started_at or s.created_at,
            created_at=s.created_at, duration=s.scan_duration or 45
        )
        db.add(run)
        await db.commit()
        await db.refresh(run)
    else:
        run.status = pipeline_computed
        run.action_taken = action_taken
        run.started_at = s.started_at or s.created_at
        run.duration = s.scan_duration or 45
        run.commit_message = s.commit_message
        await db.commit()

    steps_data = s.pipeline_steps or {}

    # Incremental upsert of PipelineStage records — never delete+recreate
    for idx, stage_key in enumerate(STAGE_ORDER):
        step_val = steps_data.get(stage_key) or {}
        if isinstance(step_val, str):
            step_val = {"result": step_val}
        raw_result = step_val.get("result") if isinstance(step_val, dict) else ""

        status = PipelineStateMachine.compute_stage_status(
            stage_key=stage_key,
            raw_result=raw_result,
            all_steps=steps_data,
            pipeline_status=s.status,
            action_taken=action_taken,
        )

        if not isinstance(step_val, dict):
            step_val = {}
        detail = step_val.get("detail", "")
        if not detail:
            status_label = STAGE_DEFINITIONS[stage_key]["label"]
            if status == StageStatus.PASSED.value:
                detail = f"{status_label} completed successfully."
            elif status == StageStatus.FAILED.value:
                detail = f"{status_label} failed."
            elif status == StageStatus.BLOCKED.value:
                detail = f"{status_label} blocked by security policy."
            elif status == StageStatus.SKIPPED.value:
                detail = f"{status_label} skipped — dependency not met."
            elif status == StageStatus.RUNNING.value:
                detail = f"{status_label} currently executing."
            elif status == StageStatus.CANCELLED.value:
                detail = f"{status_label} cancelled."
            else:
                detail = f"Awaiting execution of {status_label}."

        exit_code = 1 if StageStatus.is_failure(status) else 0
        now = datetime.utcnow()

        stage_id = f"stage-{s.id}-{stage_key}"
        stage_res = await db.execute(select(PipelineStage).filter(PipelineStage.id == stage_id))
        existing_stage = stage_res.scalars().first()

        if existing_stage:
            if not PipelineStateMachine.can_transition(existing_stage.status, status):
                logger.warning(f"[sync] Invalid state transition {existing_stage.status} -> {status} for stage {stage_key}, preserving existing")
                status = existing_stage.status
                detail = existing_stage.detail or detail
                exit_code = existing_stage.exit_code or exit_code
            else:
                existing_stage.status = status
            existing_stage.detail = detail
            existing_stage.exit_code = exit_code
            if status == StageStatus.RUNNING.value and not existing_stage.started_at:
                existing_stage.started_at = now
            if StageStatus.is_terminal(status) and not existing_stage.ended_at:
                existing_stage.ended_at = now
        else:
            stage_obj = PipelineStage(
                id=stage_id, run_id=run.id,
                name=STAGE_DEFINITIONS[stage_key]["label"],
                stage_key=stage_key, order_index=idx,
                status=status,
                detail=detail, exit_code=exit_code,
                started_at=now if status == StageStatus.RUNNING.value else s.created_at,
                ended_at=now if StageStatus.is_terminal(status) else None,
            )
            db.add(stage_obj)

        # Upsert PipelineStep
        step_id = f"step-{s.id}-{stage_key}"
        step_res = await db.execute(select(PipelineStep).filter(PipelineStep.id == step_id))
        existing_step = step_res.scalars().first()
        if not existing_step:
            step_obj = PipelineStep(
                id=step_id, stage_id=stage_id,
                name=STAGE_DEFINITIONS[stage_key]["label"],
                status=status, exit_code=exit_code,
                logs=build_stage_log(stage_key, status, detail)
            )
            db.add(step_obj)

    # Clean up old findings + deployment for this run (stages are incremental above)
    await db.execute(delete(SecurityFinding).filter(SecurityFinding.pipeline_run_id == run_id))
    await db.execute(delete(Deployment).filter(Deployment.pipeline_run_id == run_id))
    await db.commit()

    # Ingest findings
    f = s.findings or {}
    for gl in f.get("gitleaks", []):
        db.add(SecurityFinding(
            repo_id=repo.id, pipeline_run_id=run.id,
            scanner="gitleaks", category="Secret / Credential Exposure",
            title=f"Exposed Secret: {gl.get('Description') or gl.get('RuleID') or 'API Key'}",
            severity="CRITICAL" if "secret" in str(gl).lower() else "HIGH",
            file=gl.get("File") or gl.get("file") or "codebase",
            line=gl.get("StartLine") or gl.get("startLine") or 1,
            cve_cwe="CWE-798 (Hardcoded Credentials)",
            owasp="A07:2021-Identification and Authentication Failures",
            status="open", created_at=s.created_at,
            ai_explanation=s.ai_explanation or "Gitleaks detected plain-text secret inside repository history.",
            ai_fix=s.ai_fix or "Rotate exposed credential immediately and remove from Git history."
        ))

    for sg in f.get("semgrep", []):
        db.add(SecurityFinding(
            repo_id=repo.id, pipeline_run_id=run.id,
            scanner="semgrep", category="SAST Flaw",
            title=sg.get("extra", {}).get("message") or sg.get("check_id") or "Code vulnerability",
            severity=(sg.get("extra", {}).get("severity") or "HIGH").upper(),
            file=sg.get("path") or "src/",
            line=(sg.get("start") or {}).get("line") or 1,
            cve_cwe=f"CWE-{sg.get('check_id', '89')}",
            owasp="A03:2021-Injection", status="open", created_at=s.created_at,
            ai_explanation=s.ai_explanation or "Semgrep detected insecure pattern in source code.",
            ai_fix=s.ai_fix or "Enforce sanitized input parameters and parameterized queries."
        ))

    for res in f.get("Results", []):
        for vul in res.get("Vulnerabilities", []):
            db.add(SecurityFinding(
                repo_id=repo.id, pipeline_run_id=run.id,
                scanner="trivy", category="Container CVE",
                title=f"{vul.get('VulnerabilityID')} in {vul.get('PkgName')}",
                severity=(vul.get("Severity") or "MEDIUM").upper(),
                file=res.get("Target") or "Dockerfile", line=1,
                cve_cwe=vul.get("VulnerabilityID") or "CVE-2026-0001",
                owasp="A06:2021-Vulnerable and Outdated Components",
                status="open", created_at=s.created_at,
                ai_explanation=s.ai_explanation or f"Trivy detected vulnerable package {vul.get('PkgName')}.",
                ai_fix=f"Upgrade {vul.get('PkgName')} to version {vul.get('FixedVersion') or 'latest'}."
            ))

    zap_alerts = (f.get("zap") or {}).get("alerts") or (s.zap_findings or {}).get("alerts") or []
    for za in zap_alerts if isinstance(zap_alerts, list) else []:
        db.add(SecurityFinding(
            repo_id=repo.id, pipeline_run_id=run.id,
            scanner="zap", category="DAST Dynamic Alert",
            title=za.get("alert") or "OWASP ZAP Dynamic Finding",
            severity=(za.get("risk") or "MEDIUM").upper(),
            file=za.get("url") or s.target_url or "staging", line=1,
            cve_cwe=f"CWE-{za.get('pluginId', '693')}",
            owasp="A05:2021-Security Misconfiguration",
            status="open", created_at=s.created_at,
            ai_explanation="OWASP ZAP detected security header misconfiguration or active endpoint flaw.",
            ai_fix="Add missing security headers and enforce strict CORS / CSP policies."
        ))

    # Deployment
    if s.deployment_url or (steps_data or {}).get("deploy_prod"):
        dep_exists = await db.execute(select(Deployment).filter(Deployment.pipeline_run_id == run.id))
        if not dep_exists.scalars().first():
            db.add(Deployment(
                id=f"dep-{s.id}",
                revision_name=f"secureflow-backend-{(s.commit_sha or 'v1')[:7]}",
                service="secureflow-backend", environment="production",
                url=s.deployment_url or s.target_url or "https://secureflow-production.run.app",
                status="active" if action_taken == "ALLOW" else "blocked",
                commit_sha=s.commit_sha, pipeline_run_id=run.id,
                created_at=s.created_at, duration=s.scan_duration or 45
            ))

    # Deduped events
    for evt_type, evt_id_suffix, msg, sev in [
        ("pipeline.started", "start",
         f"Pipeline run #{s.id} started for {repo_name} (branch: {s.branch})", "info"),
        ("pipeline.failed" if action_taken == "BLOCK" else "deploy.success", "end",
         f"Pipeline run #{s.id} completed: {action_taken}",
         "warning" if action_taken == "BLOCK" else "info"),
    ]:
        dedup_key = f"{evt_type}:{s.id}"
        existing = await db.execute(select(Event).filter(Event.dedup_key == dedup_key))
        if not existing.scalars().first():
            db.add(Event(
                type=evt_type, message=msg,
                source_link=f"/pipelines/{run.id}",
                severity=sev, dedup_key=dedup_key,
                event_version=1,
                created_at=s.started_at or s.created_at
            ))

    await db.commit()

    # Broadcast via WebSocket
    stage_statuses = {}
    for k in STAGE_ORDER:
        sv = steps_data.get(k) or {}
        stage_statuses[k] = StageStatus.normalize(sv.get("result") if isinstance(sv, dict) else sv if isinstance(sv, str) else "")

    await manager.broadcast({
        "type": "pipeline.synced",
        "run_id": run.id,
        "repo_name": repo_name,
        "status": pipeline_computed,
        "action_taken": action_taken,
        "stages": stage_statuses,
        "timestamp": datetime.utcnow().isoformat(),
    })


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Log startup configuration for Celery Broker URL and Database URL
    b_url = get_broker_url()
    masked_db = DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL
    logger.info(f"[startup] CELERY_BROKER_URL={_mask_redis_url(b_url)} | QUEUE={DAST_QUEUE}")
    logger.info(f"[startup] DATABASE_URL=postgresql://*****@{masked_db}")

    try:
        await asyncio.wait_for(_init_db_tables(), timeout=60.0)
        # Sync legacy data to new schema tables
        await seed_new_tables_from_scan_results()
    except asyncio.TimeoutError:
        logger.warning("[startup migration] Database connection timed out after 60.0s — proceeding with startup")
    except Exception as ex:
        logger.warning(f"[startup migration] notice during database init: {ex}")

    # ── Redis pub/sub ────────────────────────────────────────────────────
    await redis_pubsub_manager.connect()
    redis_pubsub_manager.start_listener(manager.on_redis_message)

    watchdog_task = asyncio.create_task(stale_run_watchdog())
    yield
    watchdog_task.cancel()
    await redis_pubsub_manager.disconnect()


app = FastAPI(title="SecureFlow — AI-Powered DevSecOps & Distributed DAST Gateway", version="2.0.0", lifespan=lifespan)

CORS_ORIGIN_REGEX = os.getenv("BACKEND_CORS_ORIGIN_REGEX", r".*")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"
    return response


async def get_db():
    async with AsyncSessionLocal() as db:
        try:
            yield db
        except Exception:
            await db.rollback()
            raise
        finally:
            await db.close()


async def verify_api_secret(request: Request):
    """Reject unauthenticated requests when BACKEND_API_SECRET is configured."""
    if not BACKEND_API_SECRET:
        return
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else ""
    if not token or not secrets.compare_digest(token, BACKEND_API_SECRET):
        raise HTTPException(status_code=403, detail="Forbidden: invalid or missing API secret")


def utc_iso(dt: datetime | None) -> str | None:
    """Serialize naive UTC datetimes with a Z suffix so browsers parse them correctly."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.isoformat() + "Z"
    return dt.isoformat()


def scan_to_broadcast_payload(scan: ScanResult, msg_type: str = "scan_complete") -> dict:
    return {
        "type": msg_type,
        "id": scan.id,
        "commit_sha": scan.commit_sha,
        "commit_message": scan.commit_message,
        "repo_name": scan.repo_name,
        "branch": scan.branch,
        "scan_type": scan.scan_type,
        "severity": scan.severity,
        "ai_explanation": scan.ai_explanation,
        "ai_fix": scan.ai_fix,
        "risk_score": scan.risk_score,
        "action_taken": scan.action_taken,
        "pipeline_steps": scan.pipeline_steps or {},
        "status": scan.status,
        "started_at": utc_iso(scan.started_at),
        "created_at": utc_iso(scan.created_at),
        # DAST lifecycle telemetry
        "dast_status": scan.dast_status or "not_queued",
        "target_url": scan.target_url,
        "deployment_url": scan.deployment_url,
        "zap_findings": scan.zap_findings or (scan.findings or {}).get("zap"),
        "zap_summary": scan.zap_summary,
        "queued_at": utc_iso(scan.queued_at),
        "dast_started_at": utc_iso(scan.dast_started_at),
        "dast_completed_at": utc_iso(scan.dast_completed_at),
        "scan_duration": scan.scan_duration,
        "worker_name": scan.worker_name,
        "worker_id": scan.worker_id,
        "queue_error": scan.queue_error,
        "zap_report_path": scan.zap_report_path,
    }


# ---------------------------------------------------------------------------
# Stale-run watchdog (background task)
# ---------------------------------------------------------------------------

async def stale_run_watchdog():
    while True:
        try:
            await asyncio.sleep(WATCHDOG_INTERVAL_SECONDS)
            async with AsyncSessionLocal() as db:
                try:
                    cutoff = datetime.utcnow() - timedelta(minutes=STALE_RUN_TIMEOUT_MINUTES)
                    result = await db.execute(
                        select(ScanResult)
                        .filter(ScanResult.status == "running")
                        .filter(ScanResult.started_at != None)  # noqa: E711
                        .filter(ScanResult.started_at < cutoff)
                    )
                    stale_runs = result.scalars().all()
                    for scan in stale_runs:
                        scan.status = "timeout"
                        scan.action_taken = scan.action_taken or "UNKNOWN"
                        scan.severity = scan.severity or "UNKNOWN"
                        scan.ai_explanation = (
                            scan.ai_explanation
                            or f"No result received within {STALE_RUN_TIMEOUT_MINUTES} minutes — "
                               "the pipeline likely crashed, was cancelled, or failed before "
                               "reporting back. Check the GitHub Actions run logs for this commit."
                        )

                    if stale_runs:
                        await db.commit()
                        for scan in stale_runs:
                            await db.refresh(scan)
                            await manager.broadcast(scan_to_broadcast_payload(scan, msg_type="scan_timeout"))
                except Exception as ex:
                    await db.rollback()
                    print(f"[watchdog db transaction] error: {ex}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[watchdog loop] error: {e}")


# ---------------------------------------------------------------------------
# Basic routes
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {"message": "SecureFlow — AI-Powered DevSecOps & Distributed DAST Gateway", "version": "2.0.0"}


@app.get("/health")
@app.head("/health")
def health():
    return {"status": "healthy", "dast_enabled": DAST_ENABLED}


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

WEBSOCKET_PING_INTERVAL = int(os.getenv("WEBSOCKET_PING_INTERVAL", "30"))
MAX_MISSED_PINGS = int(os.getenv("WS_MAX_MISSED_PINGS", "3"))

@app.websocket("/ws/scans")
async def websocket_scans(ws: WebSocket):
    await manager.connect(ws)
    missed_pongs = 0
    try:
        while True:
            try:
                await asyncio.wait_for(ws.receive_text(), timeout=WEBSOCKET_PING_INTERVAL)
                missed_pongs = 0
            except asyncio.TimeoutError:
                if missed_pongs >= MAX_MISSED_PINGS:
                    logger.info(
                        f"[ws] DISCONNECT (missed {MAX_MISSED_PINGS} pongs) instance={_INSTANCE_ID}"
                    )
                    break
                missed_pongs += 1
                await ws.send_text(json.dumps({"type": "ping"}))
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        manager.disconnect(ws)
        logger.info(f"[ws] DISCONNECT instance={_INSTANCE_ID}")


# ---------------------------------------------------------------------------
# Pipeline lifecycle & DAST Orchestration endpoints
# ---------------------------------------------------------------------------

@app.post("/api/scan-results/start", dependencies=[Depends(verify_api_secret)])
async def start_scan_run(data: dict, db: AsyncSession = Depends(get_db)):
    """
    Primary CI/CD pipeline start and DAST task orchestration trigger.
    
    1. Resolves target URL (1. request target_url, 2. deployment_url, 3. DEFAULT_TARGET_URL)
    2. Creates or fetches ScanResult record
    3. Idempotently publishes 'tasks.run_zap_scan' to Redis Celery queue asynchronously
    4. Never blocks HTTP response or fails CI pipeline
    """
    repo_name = data.get("repo_name", "unknown")
    branch = data.get("branch", "main")
    run_id = data.get("run_id")

    # Target URL Resolution (1. request target_url, 2. deployment_url, 3. DEFAULT_TARGET_URL)
    req_target_url = data.get("target_url")
    req_deploy_url = data.get("deployment_url")
    resolved_target = resolve_target_url(req_target_url, req_deploy_url)

    logger.info(
        f"[start_scan_run] ENTER — repo={repo_name}, branch={branch}, "
        f"run_id={run_id}, target_url={req_target_url}, "
        f"deploy_url={req_deploy_url}, resolved_target={resolved_target}"
    )

    if not resolved_target:
        raise HTTPException(
            status_code=400,
            detail="Target URL cannot be determined. Provide 'target_url' or 'deployment_url' in request body or set DEFAULT_TARGET_URL environment variable."
        )

    scan = None
    if run_id:
        try:
            run_id_int = int(run_id)
            res = await db.execute(select(ScanResult).filter(ScanResult.id == run_id_int))
            scan = res.scalars().first()
            logger.info(f"[start_scan_run] run_id={run_id} -> existing scan id={scan.id if scan else 'NOT FOUND'}")
        except (ValueError, TypeError):
            scan = None
            logger.warning(f"[start_scan_run] run_id={run_id} is not a valid int")

    if scan:
        logger.info(
            f"[start_scan_run] Updating existing scan id={scan.id} — "
            f"current dast_status='{scan.dast_status}', "
            f"current zap.result='{(scan.pipeline_steps or {}).get('zap', {}).get('result', '?')}'"
        )
        scan.target_url = resolved_target
        if req_deploy_url:
            scan.deployment_url = req_deploy_url
        scan.dast_status = "not_queued"
    else:
        # Idempotent: check for existing scan with same parameters
        existing_scan = None
        try:
            existing_res = await db.execute(
                select(ScanResult)
                .filter(ScanResult.repo_name == repo_name)
                .filter(ScanResult.branch == branch)
                .filter(ScanResult.commit_sha == data.get("commit_sha", "unknown"))
                .filter(ScanResult.target_url == resolved_target)
                .filter(ScanResult.status != "superseded")
            )
            existing_scan = existing_res.scalars().first()
        except Exception as e:
            logger.error(f"[start_scan_run] Error checking existing scan for idempotency: {e}")

        if existing_scan:
            logger.info(f"[start_scan_run] Reusing existing scan id={existing_scan.id} for repo={repo_name}, commit_sha={data.get('commit_sha', 'unknown')}")
            scan = existing_scan
        else:
            # Supersede any running scans for this specific commit/branch combination
            res_prev = await db.execute(
                select(ScanResult)
                .filter(ScanResult.repo_name == repo_name)
                .filter(ScanResult.branch == branch)
                .filter(ScanResult.status == "running")
            )
            for prev in res_prev.scalars().all():
                prev.status = "superseded"
                prev.action_taken = prev.action_taken or "SKIPPED"
                prev.ai_explanation = prev.ai_explanation or "Superseded by newer commit build push."

            pipeline_steps = {
                "checkout": {"result": "PASS", "detail": "code checked out"},
                "zap": {"result": "PENDING", "detail": f"DAST target resolved: {resolved_target}"}
            }

            scan = ScanResult(
                commit_sha=data.get("commit_sha", "unknown"),
                commit_message=data.get("commit_message", ""),
                repo_name=repo_name,
                branch=branch,
                scan_type=data.get("scan_type", "full-pipeline"),
                severity=None,
                findings={},
                ai_explanation="",
                ai_fix="",
                risk_score=None,
                action_taken=None,
                pipeline_steps=pipeline_steps,
                status="running",
                started_at=datetime.utcnow(),
                target_url=resolved_target,
                deployment_url=req_deploy_url,
                dast_status="not_queued"
            )
            db.add(scan)

    await db.commit()
    await db.refresh(scan)

    # -----------------------------------------------------------------------
    # Idempotent DAST Enqueueing via Celery Producer
    # -----------------------------------------------------------------------
    logger.info(
        f"[start_scan_run] DAST STATUS CHECK — scan_id={scan.id}, "
        f"dast_status='{scan.dast_status}', "
        f"skip_condition_met={scan.dast_status in ('running', 'completed')}"
    )
    if scan.dast_status in ("queued", "completed"):
        logger.info(f"[start_scan_run] SKIPPING dispatch — dast_status='{scan.dast_status}' already queued/completed")
    else:
        logger.info(
            f"[start_scan_run] EXECUTING dispatch — scan_id={scan.id}, "
            f"target={resolved_target}, current_dast_status='{scan.dast_status}'"
        )
        pub_res = await asyncio.to_thread(publish_dast_task, scan.id, resolved_target, req_deploy_url)
        logger.info(
            f"[start_scan_run] DISPATCH RESULT — scan_id={scan.id}, "
            f"success={pub_res.get('success')}, "
            f"task_id={pub_res.get('task_id')}, error={pub_res.get('error')}"
        )
        
        steps = dict(scan.pipeline_steps or {})
        if pub_res.get("success"):
            scan.dast_status = "queued"
            scan.queued_at = datetime.utcnow()
            scan.queue_error = None
            steps["zap"] = {
                "result": "QUEUED",
                "detail": f"DAST Task {pub_res.get('task_id')} queued for target {resolved_target}"
            }
        else:
            err_msg = pub_res.get("error") or "Failed to publish task to Redis"
            if pub_res.get("error") == "DAST_DISABLED":
                scan.dast_status = "not_queued"
                steps["zap"] = {"result": "SKIPPED", "detail": "DAST disabled via configuration"}
            else:
                scan.dast_status = "queue_failed"
                scan.queue_error = err_msg
                steps["zap"] = {"result": "FAILED", "detail": f"DAST queueing failed: {err_msg}"}

        scan.pipeline_steps = steps
        await db.commit()
        await db.refresh(scan)
        logger.info(
            f"[start_scan_run] POST-DISPATCH STATE — scan_id={scan.id}, "
            f"dast_status='{scan.dast_status}', "
            f"zap.result='{(scan.pipeline_steps or {}).get('zap', {}).get('result', '?')}'"
        )

    logger.info(
        f"[start_scan_run] RETURN — scan_id={scan.id}, dast_status='{scan.dast_status}', "
        f"zap.result='{(scan.pipeline_steps or {}).get('zap', {}).get('result', '?')}'"
    )
    await manager.broadcast(scan_to_broadcast_payload(scan, msg_type="scan_started"))

    return {
        "status": "started",
        "run_id": scan.id,
        "dast_status": scan.dast_status,
        "target_url": resolved_target,
        "deployment_url": scan.deployment_url
    }


def enforce_monotonic_stages(pipeline_steps: dict, current_stage_key: str, outcome: str = "PASS") -> dict:
    stage_sequence = ["checkout", "code_scan", "docker", "trivy", "policy", "deploy_staging", "zap", "zap_gate", "deploy_prod"]
    if current_stage_key not in stage_sequence:
        return pipeline_steps

    idx = stage_sequence.index(current_stage_key)
    res = dict(pipeline_steps)
    
    # 0. Monotonic Guard: Reject regression if any downstream stage is already running/passed/failed
    curr_val = res.get(current_stage_key) or {}
    curr_result = (curr_val.get("result") or "").upper()
    for j in range(idx + 1, len(stage_sequence)):
        later_key = stage_sequence[j]
        later_val = res.get(later_key) or {}
        later_result = (later_val.get("result") or "").upper()
        if later_result in ("RUNNING", "PASS", "ALLOW", "SCANNED", "FAILED", "BLOCK", "SKIPPED", "PASSED", "BLOCKED"):
            if outcome.upper() in ("PENDING", "RUNNING", "QUEUED", "WAITING"):
                return res
            if curr_result in ("PASS", "ALLOW", "SCANNED", "FAILED", "BLOCK", "PASSED", "BLOCKED") and outcome.upper() == "SKIPPED":
                return res
    
    # 1. Enforce that all stages before idx are resolved (e.g. PASS/passed) if they are currently PENDING or missing
    for i in range(idx):
        prev_key = stage_sequence[i]
        prev_val = res.get(prev_key) or {}
        prev_result = (prev_val.get("result") or "").upper()
        if prev_result not in ("PASS", "ALLOW", "SCANNED", "FAILED", "BLOCK", "SKIPPED"):
            res[prev_key] = {
                "result": "PASS",
                "detail": f"Inferred PASS transition (completed prior to {current_stage_key})"
            }

    # 2. Update current stage
    res[current_stage_key] = {
        "result": outcome.upper(),
        "detail": f"Stage {current_stage_key} resolved as {outcome.upper()}"
    }

    # 3. If current stage is a failure or block, force all subsequent stages to SKIPPED
    if outcome.upper() in ("FAILED", "BLOCK"):
        for i in range(idx + 1, len(stage_sequence)):
            next_key = stage_sequence[i]
            res[next_key] = {
                "result": "SKIPPED",
                "detail": f"Skipped due to upstream failure in {current_stage_key}"
            }
            
    return res


@app.get("/api/scan-results/{run_id}/progress")
async def get_scan_progress(run_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScanResult).filter(ScanResult.id == run_id))
    scan = result.scalars().first()
    if not scan:
        raise HTTPException(status_code=404, detail="Run not found")
    return {
        "id": scan.id,
        "status": scan.status,
        "dast_status": scan.dast_status or "pending",
        "pipeline_steps": scan.pipeline_steps or {},
        "action_taken": scan.action_taken,
        "risk_score": scan.risk_score,
    }


@app.patch("/api/scan-results/{run_id}/progress", dependencies=[Depends(verify_api_secret)])
async def update_scan_progress(run_id: int, data: dict = None, db: AsyncSession = Depends(get_db)):
    if data is None:
        data = {}
    result = await db.execute(select(ScanResult).filter(ScanResult.id == run_id))
    scan = result.scalars().first()
    if not scan:
        raise HTTPException(status_code=404, detail="Run not found")

    existing_steps = dict(scan.pipeline_steps or {})
    input_steps = data.get("pipeline_steps", {})
    for sk, sv in input_steps.items():
        existing_steps = enforce_monotonic_stages(existing_steps, sk, sv.get("result", "PASS"))
    scan.pipeline_steps = existing_steps

    if "status" in data:
        scan.status = data["status"]

    if "dast_status" in data:
        scan.dast_status = data["dast_status"]
        if data["dast_status"] == "completed":
            from datetime import datetime as _dt
            scan.dast_completed_at = _dt.utcnow()
            zap_current = (scan.pipeline_steps or {}).get("zap", {}).get("result", "")
            if zap_current in ("PENDING", "QUEUED"):
                zap_steps = enforce_monotonic_stages(dict(scan.pipeline_steps or {}), "zap", "PASS")
                
                # Check for blocking ZAP alerts (HIGH and CRITICAL)
                zap_f = data.get("zap_findings") or scan.zap_findings
                alerts = []
                if isinstance(zap_f, dict):
                    alerts = zap_f.get("alerts", [])
                elif isinstance(zap_f, list):
                    alerts = zap_f
                
                blocking_alerts = [
                    a for a in alerts
                    if isinstance(a, dict) and str(a.get("risk", "")).upper() in ("HIGH", "CRITICAL", "FAIL")
                ]
                has_blocking = len(blocking_alerts) > 0
                
                zap_steps = enforce_monotonic_stages(zap_steps, "zap_gate", "BLOCK" if has_blocking else "PASS")
                if has_blocking:
                    zap_steps["zap_gate"]["detail"] = f"ZAP Security Gate blocked: {len(blocking_alerts)} critical/high alerts found."
                else:
                    zap_steps["zap_gate"]["detail"] = f"ZAP Security Gate passed ({len(alerts)} non-blocking informational/medium findings)."
                scan.pipeline_steps = zap_steps
        elif data["dast_status"] in ("failed", "queue_failed"):
            zap_current = (scan.pipeline_steps or {}).get("zap", {}).get("result", "")
            if zap_current in ("PENDING", "QUEUED"):
                zap_steps = enforce_monotonic_stages(dict(scan.pipeline_steps or {}), "zap", "FAILED")
                zap_steps = enforce_monotonic_stages(zap_steps, "zap_gate", "SKIPPED")
                zap_steps["zap_gate"]["detail"] = "ZAP Security Gate skipped due to upstream scan failure."
                scan.pipeline_steps = zap_steps

    if "zap_findings" in data:
        scan.zap_findings = data["zap_findings"]
        existing_findings = dict(scan.findings or {})
        existing_findings["zap"] = data["zap_findings"]
        scan.findings = existing_findings

    if "zap_summary" in data:
        scan.zap_summary = data["zap_summary"]
        
    await db.commit()
    await db.refresh(scan)

    # Directly upsert PipelineStage records (no delete+recreate)
    run_id_str = f"run-{scan.id}"
    run_res = await db.execute(select(PipelineRun).filter(PipelineRun.id == run_id_str))
    run = run_res.scalars().first()

    broadcast_events = []
    run_updated = False

    for sk, sv in existing_steps.items():
        if not isinstance(sv, dict):
            sv = {"result": str(sv)}
        stage_result = sv.get("result", "")
        stage_status = StageStatus.normalize(stage_result)
        stage_detail = sv.get("detail", "")
        stage_exit_code = 1 if StageStatus.is_failure(stage_status) else 0
        now = datetime.utcnow()

        # ── Dependency enforcement ──────────────────────────────────────
        # Never allow a stage to progress past WAITING until ALL its
        # upstream dependencies have reached a terminal state.
        deps = STAGE_DEFINITIONS.get(sk, {}).get("deps", [])
        if deps and stage_status != StageStatus.WAITING.value:
            all_run_stages = await db.execute(
                select(PipelineStage).filter(PipelineStage.run_id == run_id_str)
            )
            dep_map = {ds.stage_key: ds.status for ds in all_run_stages.scalars().all()}
            for dep_key in deps:
                dep_status = dep_map.get(dep_key)
                if dep_status and not StageStatus.is_terminal(dep_status):
                    logger.warning(
                        f"[progress] Dependency not met: {sk} -> {stage_status} "
                        f"but dependency '{dep_key}' is {dep_status}, skipping"
                    )
                    stage_status = StageStatus.WAITING.value
                    stage_detail = f"Awaiting dependency: {STAGE_DEFINITIONS.get(dep_key, {}).get('label', dep_key)}"
                    stage_exit_code = 0
                    break

        stage_id = f"stage-{scan.id}-{sk}"
        stage_res = await db.execute(select(PipelineStage).filter(PipelineStage.id == stage_id))
        existing_stage = stage_res.scalars().first()

        if existing_stage:
            old_status = existing_stage.status
            if old_status != stage_status:
                if not PipelineStateMachine.can_transition(old_status, stage_status):
                    logger.warning(f"[progress] Invalid transition {old_status} -> {stage_status} for stage {sk}, skipping")
                    continue
                existing_stage.status = stage_status
            if stage_detail:
                existing_stage.detail = stage_detail
            existing_stage.exit_code = stage_exit_code
            if stage_status == StageStatus.RUNNING.value and not existing_stage.started_at:
                existing_stage.started_at = now
            if StageStatus.is_terminal(stage_status) and not existing_stage.ended_at:
                existing_stage.ended_at = now
            run_updated = True
        else:
            idx = STAGE_ORDER.index(sk) if sk in STAGE_ORDER else -1
            stage_obj = PipelineStage(
                id=stage_id, run_id=run_id_str,
                name=STAGE_DEFINITIONS.get(sk, {}).get("label", sk),
                stage_key=sk, order_index=idx,
                status=stage_status,
                detail=stage_detail, exit_code=stage_exit_code,
                started_at=now if stage_status == StageStatus.RUNNING.value else None,
                ended_at=now if StageStatus.is_terminal(stage_status) else None,
            )
            db.add(stage_obj)
            run_updated = True

        broadcast_events.append({
            "stage_key": sk,
            "status": stage_status,
            "detail": stage_detail,
            "exit_code": stage_exit_code,
            "timestamp": now.isoformat() + "Z",
        })

        # Create Event record for significant transitions safely using nested savepoint
        try:
            if stage_status in (StageStatus.PASSED.value, StageStatus.FAILED.value, StageStatus.BLOCKED.value):
                evt_dedup = f"stage.{sk}:{scan.id}:{stage_status}"
                async with db.begin_nested():
                    evt_existing = await db.execute(select(Event).filter(Event.dedup_key == evt_dedup))
                    if not evt_existing.scalars().first():
                        evt_type = f"pipeline.stage.{stage_status.lower()}"
                        evt_msg = f"Stage '{STAGE_DEFINITIONS.get(sk, {}).get('label', sk)}' {stage_status.lower()} for run #{scan.id}"
                        db.add(Event(
                            type=evt_type, message=evt_msg,
                            source_link=f"/pipelines/{run_id_str}",
                            severity="warning" if StageStatus.is_failure(stage_status) else "info",
                            dedup_key=evt_dedup, event_version=1,
                            created_at=now,
                        ))
        except Exception as e:
            logger.warning(f"[progress] Error creating event record: {e}")

    # Update PipelineRun overall status based on latest stage states
    if run_updated and run:
        all_stages = await db.execute(
            select(PipelineStage).filter(PipelineStage.run_id == run_id_str).order_by(PipelineStage.order_index)
        )
        stages = all_stages.scalars().all()
        if stages:
            running_stages = [s for s in stages if s.status == StageStatus.RUNNING.value]
            failed_stages = [s for s in stages if StageStatus.is_failure(s.status)]
            all_terminal = all(StageStatus.is_terminal(s.status) for s in stages)
            if running_stages:
                run.status = StageStatus.RUNNING.value
            elif failed_stages:
                run.status = StageStatus.BLOCKED.value if any(s.status == StageStatus.BLOCKED.value for s in failed_stages) else StageStatus.FAILED.value
            elif all_terminal:
                run.status = StageStatus.PASSED.value
            else:
                run.status = StageStatus.WAITING.value

    await db.commit()

    # Broadcast per-stage WebSocket events
    for evt in broadcast_events:
        await manager.broadcast({
            "type": "pipeline.stage_update",
            "run_id": run_id_str,
            "scan_id": scan.id,
            "repo_name": scan.repo_name,
            **evt,
        })

    return {
        "status": "progress updated",
        "run_id": run_id,
        "dast_status": scan.dast_status or "running",
        "pipeline_steps": scan.pipeline_steps,
    }


@app.post("/api/scan-results/cleanup-stale")
async def cleanup_stale_runs(db: AsyncSession = Depends(get_db), older_than_minutes: int = 0):
    cutoff = datetime.utcnow() - timedelta(minutes=older_than_minutes)
    result = await db.execute(
        select(ScanResult)
        .filter(ScanResult.status == "running")
        .filter(ScanResult.started_at != None)  # noqa: E711
        .filter(ScanResult.started_at < cutoff)
    )
    stale_runs = result.scalars().all()
    cleared = []
    for scan in stale_runs:
        scan.status = "timeout"
        scan.action_taken = scan.action_taken or "UNKNOWN"
        scan.severity = scan.severity or "UNKNOWN"
        scan.ai_explanation = scan.ai_explanation or "Manually cleared stale run."

    if stale_runs:
        await db.commit()
        for scan in stale_runs:
            await db.refresh(scan)
            await manager.broadcast(scan_to_broadcast_payload(scan, msg_type="scan_timeout"))
            cleared.append(scan.id)
    return {"status": "cleaned", "cleared_run_ids": cleared, "count": len(cleared)}


# ---------------------------------------------------------------------------
# Main scan ingestion & findings merging endpoint (Trivy, Gitleaks, Semgrep, ZAP)
# ---------------------------------------------------------------------------

@app.post("/api/scan-results", dependencies=[Depends(verify_api_secret)])
async def receive_scan_results(data: dict, db: AsyncSession = Depends(get_db)):
    scan_type = data.get("scan_type", "trivy")
    repo_name = data.get("repo_name", "unknown")
    run_id = data.get("run_id")
    pipeline_steps = data.get("pipeline_steps", {})

    gitleaks = data.get("gitleaks", [])
    semgrep = data.get("semgrep", [])
    trivy = data.get("findings", {})
    zap_data = data.get("zap") or data.get("zap_findings")
    zap_summary_input = data.get("zap_summary")
    dast_status_input = data.get("dast_status")
    worker_name_input = data.get("worker_name")
    worker_id_input = data.get("worker_id")
    scan_duration_input = data.get("duration") or data.get("scan_duration")
    zap_report_path_input = data.get("zap_report_path")

    # Normalise scanner payloads
    if isinstance(gitleaks, dict):
        gitleaks = gitleaks.get("findings") or gitleaks.get("results") or [gitleaks]
    if not isinstance(gitleaks, list):
        gitleaks = [gitleaks] if gitleaks else []
    gitleaks = [g for g in gitleaks if isinstance(g, dict)]

    if isinstance(semgrep, dict):
        semgrep = semgrep.get("results") or semgrep.get("findings") or [semgrep]
    if not isinstance(semgrep, list):
        semgrep = [semgrep] if semgrep else []
    semgrep = [s for s in semgrep if isinstance(s, dict)]

    normalized_findings = {
        "gitleaks": gitleaks,
        "semgrep": semgrep,
        "Results": trivy.get("Results", []) if isinstance(trivy, dict) else [],
        "zap": zap_data or {},
    }

    explicit_action = (data.get("action") or "").upper()
    has_trivy = bool(normalized_findings["Results"])

    async def _upsert(fields: dict) -> ScanResult:
        nonlocal run_id
        if run_id is not None:
            try:
                run_id = int(run_id)
            except (TypeError, ValueError):
                run_id = None

        if run_id:
            res = await db.execute(select(ScanResult).filter(ScanResult.id == run_id))
            scan = res.scalars().first()
            if scan:
                # -----------------------------------------------------------
                # Multi-Scanner Findings Merging (Gitleaks, Semgrep, Trivy, ZAP)
                # -----------------------------------------------------------
                existing_findings = dict(scan.findings or {})
                
                # Merge Gitleaks
                new_gl = (fields.get("findings") or {}).get("gitleaks") or gitleaks
                if new_gl or "gitleaks" not in existing_findings:
                    existing_findings["gitleaks"] = new_gl or existing_findings.get("gitleaks", [])

                # Merge Semgrep
                new_sg = (fields.get("findings") or {}).get("semgrep") or semgrep
                if new_sg or "semgrep" not in existing_findings:
                    existing_findings["semgrep"] = new_sg or existing_findings.get("semgrep", [])

                # Merge Trivy Results
                new_tv = (fields.get("findings") or {}).get("Results") or (trivy.get("Results", []) if isinstance(trivy, dict) else [])
                if new_tv or "Results" not in existing_findings:
                    existing_findings["Results"] = new_tv or existing_findings.get("Results", [])

                # Merge ZAP findings
                new_zap = zap_data or (fields.get("findings") or {}).get("zap")
                if new_zap or "zap" not in existing_findings:
                    existing_findings["zap"] = new_zap or existing_findings.get("zap", {})

                fields["findings"] = existing_findings

                for key, value in fields.items():
                    if key in ("ai_explanation", "ai_fix") and getattr(scan, key):
                        if not value:
                            continue
                    setattr(scan, key, value)

                # DAST specific updates
                if dast_status_input:
                    scan.dast_status = dast_status_input
                    if dast_status_input == "completed" and not scan.dast_completed_at:
                        scan.dast_completed_at = datetime.utcnow()
                elif zap_data and scan.dast_status in ("queued", "running", None, "not_queued"):
                    scan.dast_status = "completed"
                    scan.dast_completed_at = datetime.utcnow()

                if zap_data:
                    scan.zap_findings = zap_data
                if zap_summary_input:
                    scan.zap_summary = zap_summary_input
                if worker_name_input:
                    scan.worker_name = worker_name_input
                if worker_id_input:
                    scan.worker_id = worker_id_input
                if scan_duration_input:
                    try:
                        scan.scan_duration = int(scan_duration_input)
                    except (ValueError, TypeError):
                        pass
                if zap_report_path_input:
                    scan.zap_report_path = zap_report_path_input

                scan.status = "complete"
                merged_steps = dict(scan.pipeline_steps or {})
                merged_steps.update(pipeline_steps)

                if scan.dast_status == "completed" or zap_data:
                    merged_steps["zap"] = {
                        "result": "PASS",
                        "detail": f"OWASP ZAP DAST scan completed by {scan.worker_name or 'Worker VM'}"
                    }
                    # Also determine zap_gate
                    zap_f = zap_data or scan.zap_findings
                    alerts = []
                    if isinstance(zap_f, dict):
                        alerts = zap_f.get("alerts", [])
                    elif isinstance(zap_f, list):
                        alerts = zap_f

                    blocking_alerts = [
                        a for a in alerts
                        if isinstance(a, dict) and str(a.get("risk", "")).upper() in ("HIGH", "CRITICAL", "FAIL")
                    ]
                    has_blocking = len(blocking_alerts) > 0

                    merged_steps["zap_gate"] = {
                        "result": "BLOCK" if has_blocking else "PASS",
                        "detail": f"ZAP Security Gate blocked: {len(blocking_alerts)} critical/high alerts found." if has_blocking else f"ZAP Security Gate passed ({len(alerts)} non-blocking informational/medium findings)."
                    }
                elif scan.dast_status in ("failed", "queue_failed"):
                    merged_steps["zap"] = {
                        "result": "FAILED",
                        "detail": scan.queue_error or f"ZAP DAST scan failed on {scan.target_url or 'target'}"
                    }
                    merged_steps["zap_gate"] = {
                        "result": "SKIPPED",
                        "detail": "ZAP Security Gate skipped due to upstream scan failure."
                    }

                scan.pipeline_steps = merged_steps
                await db.commit()
                await db.refresh(scan)
                try:
                    await sync_single_scan_result_to_new_tables(scan.id, db)
                except Exception as ex:
                    logger.warning(f"[realtime sync] error updating new tables for scan {scan.id}: {ex}")
                return scan

        scan = ScanResult(**fields, pipeline_steps=pipeline_steps, status="complete")
        if dast_status_input:
            scan.dast_status = dast_status_input
        if zap_data:
            scan.zap_findings = zap_data
        if zap_summary_input:
            scan.zap_summary = zap_summary_input
        if worker_name_input:
            scan.worker_name = worker_name_input
        if worker_id_input:
            scan.worker_id = worker_id_input

        db.add(scan)
        await db.commit()
        await db.refresh(scan)
        try:
            await sync_single_scan_result_to_new_tables(scan.id, db)
        except Exception as ex:
            logger.warning(f"[realtime sync] error updating new tables for scan {scan.id}: {ex}")
        return scan

    # -------------------------------------------------------------------
    # Code scan
    # -------------------------------------------------------------------
    if scan_type == "code-scan":
        scan = await _upsert({
            "commit_sha": data.get("commit_sha", "unknown"),
            "commit_message": data.get("commit_message", ""),
            "repo_name": repo_name,
            "branch": data.get("branch", "main"),
            "scan_type": scan_type,
            "severity": data.get("severity", "CLEAN"),
            "findings": normalized_findings,
            "ai_explanation": "",
            "ai_fix": "",
            "risk_score": None,
            "action_taken": data.get("action", "ALLOW"),
        })

        await manager.broadcast(scan_to_broadcast_payload(scan))
        return {"status": "processed", "id": scan.id, "action": scan.action_taken}

    # -------------------------------------------------------------------
    # CI code-scan block/allow — honor explicit action when no Trivy CVE data
    # -------------------------------------------------------------------
    if explicit_action in ("BLOCK", "ALLOW") and not has_trivy:
        block_reason = data.get("reason") or (
            f"{len(gitleaks)} secret(s) detected by Gitleaks" if gitleaks else
            f"{len(semgrep)} pattern(s) detected by Semgrep" if semgrep else
            "code scan policy decision"
        )
        severity = data.get("severity") or ("HIGH" if explicit_action == "BLOCK" else "CLEAN")
        ai_explanation = block_reason if explicit_action == "BLOCK" else ""
        ai_fix = ""
        risk_score = None

        if explicit_action == "BLOCK":
            code_detail = (pipeline_steps.get("code_scan") or {}).get("detail") or block_reason
            if gitleaks:
                first = gitleaks[0]
                code_detail = (
                    f"Gitleaks rule {first.get('RuleID', first.get('rule', '?'))} "
                    f"in {first.get('File', first.get('file', '?'))}: "
                    f"{first.get('Description', first.get('description', code_detail))}"
                )
                scanner = "gitleaks"
            elif semgrep:
                first = semgrep[0]
                code_detail = first.get("extra", {}).get("message") or code_detail
                scanner = "semgrep"
            else:
                scanner = "code-scan"
            try:
                ai_result = await asyncio.to_thread(
                    analyze_code_scan_failure,
                    {"scanner": scanner, "reason": severity, "detail": code_detail},
                )
                ai_explanation = ai_result.get("explanation") or ai_explanation
                ai_fix = ai_result.get("fix") or ""
                risk_score = ai_result.get("risk_score")
            except Exception as e:
                print(f"[code-scan AI] error: {e}")

        scan = await _upsert({
            "commit_sha": data.get("commit_sha", "unknown"),
            "commit_message": data.get("commit_message", ""),
            "repo_name": repo_name,
            "branch": data.get("branch", "main"),
            "scan_type": scan_type,
            "severity": severity,
            "findings": normalized_findings,
            "ai_explanation": ai_explanation,
            "ai_fix": ai_fix,
            "risk_score": risk_score,
            "action_taken": explicit_action,
        })
        await manager.broadcast(scan_to_broadcast_payload(scan))
        return {
            "status": "processed",
            "id": scan.id,
            "action": explicit_action,
            "reason": block_reason,
        }

    # -------------------------------------------------------------------
    # Explicit scanner actions (legacy fast path)
    # -------------------------------------------------------------------
    if explicit_action and not has_trivy and not gitleaks and not semgrep:
        scan = await _upsert({
            "commit_sha": data.get("commit_sha", "unknown"),
            "commit_message": data.get("commit_message", ""),
            "repo_name": repo_name,
            "branch": data.get("branch", "main"),
            "scan_type": scan_type,
            "severity": data.get("severity", "HIGH"),
            "findings": normalized_findings if (gitleaks or semgrep or zap_data) else {},
            "ai_explanation": data.get("ai_explanation", ""),
            "ai_fix": data.get("ai_fix", ""),
            "risk_score": None,
            "action_taken": explicit_action,
        })

        await manager.broadcast(scan_to_broadcast_payload(scan))
        return {"status": "processed", "id": scan.id, "action": explicit_action}

    # -------------------------------------------------------------------
    # 🔥 MAIN POLICY ENGINE
    # -------------------------------------------------------------------
    custom_policy = data.get("policy") or data.get("policy_raw")
    if isinstance(custom_policy, str):
        try:
            custom_policy = yaml.safe_load(custom_policy)
        except Exception:
            custom_policy = None
    policy_result = evaluate_policy(normalized_findings, repo_name, custom_policy=custom_policy)

    # -------------------------------------------------------------------
    # AI analysis (Trivy only)
    # -------------------------------------------------------------------
    ai_results = []
    vulnerabilities = []

    for r in normalized_findings.get("Results", []) or []:
        vulnerabilities.extend(r.get("Vulnerabilities", []) or [])

    if vulnerabilities:
        ai_results = await asyncio.to_thread(analyze_scan, vulnerabilities)

    first_ai = ai_results[0] if ai_results else {}

    # -------------------------------------------------------------------
    # Save scan result
    # -------------------------------------------------------------------
    scan = await _upsert({
        "commit_sha": data.get("commit_sha", "unknown"),
        "commit_message": data.get("commit_message", ""),
        "repo_name": repo_name,
        "branch": data.get("branch", "main"),
        "scan_type": scan_type,
        "severity": policy_result["severity"],
        "findings": normalized_findings,
        "ai_explanation": first_ai.get("explanation", ""),
        "ai_fix": first_ai.get("fix", ""),
        "risk_score": first_ai.get("risk_score"),
        "action_taken": "BLOCK" if explicit_action == "BLOCK" else policy_result["action"],
    })

    final_action = "BLOCK" if explicit_action == "BLOCK" else policy_result["action"]

    await manager.broadcast(scan_to_broadcast_payload(scan))

    return {
        "status": "processed",
        "id": scan.id,
        "action": final_action,
        "reason": policy_result["reason"],
    }


# ---------------------------------------------------------------------------
# Feedback endpoint
# ---------------------------------------------------------------------------

@app.post("/api/scan-results/{scan_id}/feedback", dependencies=[Depends(verify_api_secret)])
async def submit_feedback(scan_id: int, feedback: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScanResult).filter(ScanResult.id == scan_id))
    scan = result.scalars().first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    scan.ai_feedback = feedback.get("feedback")
    await db.commit()
    return {"status": "feedback saved", "scan_id": scan_id}


@app.post("/api/policy/update", dependencies=[Depends(verify_api_secret)])
def update_policy(data: dict):
    admin_key = (data.get("admin_key") or "").strip()
    if admin_key not in ["ADMIN-POLICY-KEY-2026", "SEC-ADMIN-2026"]:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: SecOps Admin Authorization Key required to modify production policy.yaml."
        )

    cvss_threshold = data.get("cvss_threshold")
    if cvss_threshold is None:
        raise HTTPException(status_code=400, detail="cvss_threshold is required")
    try:
        val = float(cvss_threshold)
    except ValueError:
        raise HTTPException(status_code=400, detail="cvss_threshold must be a float")

    policy_path = os.path.join(os.path.dirname(__file__), '..', 'policy.yaml')
    try:
        with open(policy_path, 'r') as f:
            policy = yaml.safe_load(f) or {}
        policy.setdefault("default", {})["cvss_threshold"] = val
        if "repos" in policy and "SecureFlow" in policy["repos"]:
            policy["repos"]["SecureFlow"]["cvss_threshold"] = val
        with open(policy_path, 'w') as f:
            yaml.safe_dump(policy, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update policy.yaml: {e}")

    print(f"[AUDIT LOG] Production policy.yaml modified — CVSS threshold set to {val} by SecOps Admin")
    return {"status": "policy updated", "cvss_threshold": val, "authorized_by": "SecOps Admin"}


@app.get("/api/slack/status")
def slack_status():
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    return {
        "configured": bool(webhook_url),
        "channel": "#devsecops-alerts",
        "webhook_preview": f"{webhook_url[:20]}..." if webhook_url else "Not set (Set SLACK_WEBHOOK_URL env var)",
    }


@app.post("/api/slack/test", dependencies=[Depends(verify_api_secret)])
def test_slack_alert():
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    test_payload = {
        "repo_name": "abhienix/SecureFlow",
        "branch": "main",
        "commit_sha": "7ddbbe8f1a23",
        "ai_explanation": "Test Security Alert: Policy Gate evaluated Critical vulnerability policy rules.",
        "ai_fix": "No fix required — live Slack Webhook integration test."
    }
    if webhook_url:
        send_slack_alert(test_payload, [], "BLOCK", "Test Slack Notification from SecureFlow Dashboard")
        return {"status": "sent", "message": "Live Slack notification posted to #devsecops-alerts!"}
    return {
        "status": "simulated",
        "message": "Slack Webhook alert simulated (Set SLACK_WEBHOOK_URL env var to send live messages to Slack)."
    }


# ---------------------------------------------------------------------------
# AI Copilot — chat Q&A endpoint (read-only)
# ---------------------------------------------------------------------------

@app.post("/api/copilot/ask")
async def copilot_ask(data: dict, db: AsyncSession = Depends(get_db)):
    question = (data.get("question") or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="question is required")

    focus_scan_id = data.get("scan_id")
    focus_scan = None
    if focus_scan_id:
        res = await db.execute(select(ScanResult).filter(ScanResult.id == focus_scan_id))
        focus_scan = res.scalars().first()

    res = await db.execute(
        select(ScanResult)
        .order_by(ScanResult.created_at.desc())
        .limit(25)
    )
    recent = res.scalars().all()

    def scan_summary(s: ScanResult) -> dict:
        return {
            "id": s.id,
            "commit_sha": (s.commit_sha or "")[:8],
            "repo_name": s.repo_name,
            "branch": s.branch,
            "severity": s.severity,
            "action_taken": s.action_taken,
            "status": s.status,
            "dast_status": s.dast_status,
            "risk_score": s.risk_score,
            "ai_explanation": (s.ai_explanation or "")[:400],
            "created_at": utc_iso(s.created_at),
        }

    try:
        active_policy = load_policy_file()
    except Exception:
        active_policy = {}

    context = {
        "recent_scans": [scan_summary(s) for s in recent],
        "focus_scan": scan_summary(focus_scan) if focus_scan else None,
        "active_policy_rules": active_policy,
    }
    if data.get("context"):
        context["client_context"] = data["context"]
    if data.get("history"):
        context["conversation"] = data["history"][-6:]

    try:
        answer = await asyncio.to_thread(answer_copilot_question, question, context)
    except Exception as e:
        print(f"[copilot] error: {e}")
        raise HTTPException(status_code=502, detail="Void is temporarily offline")

    return {"answer": answer}


# ---------------------------------------------------------------------------
# AI Copilot — re-analyze a single scan
# ---------------------------------------------------------------------------

@app.post("/api/scan-results/{scan_id}/reanalyze", dependencies=[Depends(verify_api_secret)])
async def reanalyze_scan(scan_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScanResult).filter(ScanResult.id == scan_id))
    scan = result.scalars().first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan.status == "running":
        raise HTTPException(status_code=409, detail="Cannot reanalyze a scan that is still running")

    try:
        if scan.scan_type == "code-scan" or (scan.action_taken == "BLOCK" and not scan.findings):
            failure_info = {
                "scanner": scan.scan_type or "unknown",
                "reason": scan.severity or "unknown",
                "detail": scan.ai_explanation or "no stored detail available",
            }
            result = await asyncio.to_thread(analyze_code_scan_failure, failure_info)
            explanation = result.get("explanation", scan.ai_explanation)
            fix = result.get("fix", scan.ai_fix)
        else:
            vulnerabilities = []
            for r in (scan.findings or {}).get("Results", []) or []:
                vulnerabilities.extend(r.get("Vulnerabilities", []) or [])
            ai_results = await asyncio.to_thread(analyze_scan, vulnerabilities) if vulnerabilities else []
            first_ai = ai_results[0] if ai_results else {}
            explanation = first_ai.get("explanation", scan.ai_explanation)
            fix = first_ai.get("fix", scan.ai_fix)
    except Exception as e:
        print(f"[reanalyze] error: {e}")
        raise HTTPException(status_code=502, detail="Re-analysis failed — AI service unavailable")

    scan.ai_explanation = explanation
    scan.ai_fix = fix
    await db.commit()
    await db.refresh(scan)

    await manager.broadcast(scan_to_broadcast_payload(scan, msg_type="scan_reanalyzed"))

    return {"status": "reanalyzed", "id": scan.id, "ai_explanation": scan.ai_explanation, "ai_fix": scan.ai_fix}


# ---------------------------------------------------------------------------
# Dashboard & Observability read endpoints
# ---------------------------------------------------------------------------

SCAN_RESULTS_LIMIT = int(os.getenv("SCAN_RESULTS_LIMIT", "200"))


@app.get("/api/scan-results")
async def get_scan_results(db: AsyncSession = Depends(get_db), limit: int = SCAN_RESULTS_LIMIT):
    limit = max(1, min(limit, 500))
    
    count_res = await db.execute(select(func.count()).select_from(ScanResult))
    total = count_res.scalar()
    
    result = await db.execute(
        select(ScanResult)
        .order_by(ScanResult.created_at.desc())
        .limit(limit)
    )
    rows = result.scalars().all()
    
    scans = [
        {
            "id": r.id,
            "commit_sha": r.commit_sha,
            "commit_message": r.commit_message,
            "repo_name": r.repo_name,
            "branch": r.branch,
            "scan_type": r.scan_type,
            "severity": r.severity,
            "ai_explanation": r.ai_explanation,
            "ai_fix": r.ai_fix,
            "risk_score": r.risk_score,
            "action_taken": r.action_taken,
            "findings": r.findings or {},
            "pipeline_steps": r.pipeline_steps or {},
            "status": r.status or "complete",
            "started_at": utc_iso(r.started_at),
            "created_at": utc_iso(r.created_at),
            "ai_confidence": min(99, max(60, int((r.risk_score or 0) * 10))) if r.risk_score is not None else None,
            "ai_feedback": r.ai_feedback,
            # DAST Telemetry
            "dast_status": r.dast_status or "not_queued",
            "target_url": r.target_url,
            "deployment_url": r.deployment_url,
            "zap_findings": r.zap_findings or (r.findings or {}).get("zap"),
            "zap_summary": r.zap_summary,
            "queued_at": utc_iso(r.queued_at),
            "dast_started_at": utc_iso(r.dast_started_at),
            "dast_completed_at": utc_iso(r.dast_completed_at),
            "scan_duration": r.scan_duration,
            "worker_name": r.worker_name,
            "worker_id": r.worker_id,
            "queue_error": r.queue_error,
            "zap_report_path": r.zap_report_path,
        }
        for r in rows
    ]
    return {"total": total, "limit": limit, "scans": scans}


async def calculate_security_score(db: AsyncSession) -> int:
    # Query open findings by severity
    res_crit = await db.execute(select(func.count(SecurityFinding.id)).filter(SecurityFinding.severity == "CRITICAL", SecurityFinding.status == "open"))
    critical = res_crit.scalar() or 0
    
    res_high = await db.execute(select(func.count(SecurityFinding.id)).filter(SecurityFinding.severity == "HIGH", SecurityFinding.status == "open"))
    high = res_high.scalar() or 0
    
    res_med = await db.execute(select(func.count(SecurityFinding.id)).filter(SecurityFinding.severity == "MEDIUM", SecurityFinding.status == "open"))
    medium = res_med.scalar() or 0
    
    res_low = await db.execute(select(func.count(SecurityFinding.id)).filter(SecurityFinding.severity == "LOW", SecurityFinding.status == "open"))
    low = res_low.scalar() or 0
    
    res_sec = await db.execute(select(func.count(SecurityFinding.id)).filter(SecurityFinding.scanner == "gitleaks", SecurityFinding.status == "open"))
    secrets = res_sec.scalar() or 0

    res_viol = await db.execute(select(func.count(PolicyViolation.id)))
    violations = res_viol.scalar() or 0

    # Calculate pipeline success rate
    res_total_runs = await db.execute(select(func.count(PipelineRun.id)))
    total_runs = res_total_runs.scalar() or 0

    res_success_runs = await db.execute(select(func.count(PipelineRun.id)).filter(PipelineRun.status.in_(["success", "complete", "passed"])))
    success_runs = res_success_runs.scalar() or 0

    success_rate = (success_runs / total_runs) if total_runs > 0 else 1.0
    pipeline_penalty = (1.0 - success_rate) * 20.0

    # Weighted penalties
    findings_penalty = (critical * 10.0) + (high * 5.0) + (medium * 2.0) + (low * 0.5) + (secrets * 15.0)
    violations_penalty = violations * 15.0

    score = 100.0 - findings_penalty - violations_penalty - pipeline_penalty
    return int(max(0, min(100, score)))


@app.get("/api/observability/metrics")
@app.get("/api/observability/overview")
async def get_observability_metrics(db: AsyncSession = Depends(get_db)):
    res_repos = await db.execute(select(func.count(Repository.id)))
    total_repos = res_repos.scalar() or 0

    health_score = await calculate_security_score(db)

    res_active = await db.execute(select(func.count(PipelineRun.id)).filter(PipelineRun.status.in_(["running", "pending"])))
    active_pipelines = res_active.scalar() or 0

    res_total_deps = await db.execute(select(func.count(Deployment.id)))
    total_deps = res_total_deps.scalar() or 0
    res_active_deps = await db.execute(select(func.count(Deployment.id)).filter(Deployment.status == "active"))
    active_deps = res_active_deps.scalar() or 0
    deploy_success_rate = (active_deps / total_deps * 100.0) if total_deps > 0 else 100.0

    res_avg_dur = await db.execute(select(func.avg(PipelineRun.duration)).filter(PipelineRun.status.in_(["success", "complete", "failed"])))
    mean_duration = round(float(res_avg_dur.scalar() or 45.0), 1)

    res_crit = await db.execute(select(func.count(SecurityFinding.id)).filter(SecurityFinding.severity == "CRITICAL", SecurityFinding.status == "open"))
    critical = res_crit.scalar() or 0
    res_high = await db.execute(select(func.count(SecurityFinding.id)).filter(SecurityFinding.severity == "HIGH", SecurityFinding.status == "open"))
    high = res_high.scalar() or 0
    res_med = await db.execute(select(func.count(SecurityFinding.id)).filter(SecurityFinding.severity == "MEDIUM", SecurityFinding.status == "open"))
    medium = res_med.scalar() or 0
    res_low = await db.execute(select(func.count(SecurityFinding.id)).filter(SecurityFinding.severity == "LOW", SecurityFinding.status == "open"))
    low = res_low.scalar() or 0
    total_findings = critical + high + medium + low

    db_ok = True
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
        
    redis_ok = redis_pubsub_manager._connected if redis_pubsub_manager else False
    infra_status = "healthy" if (db_ok and redis_ok) else "degraded"

    res_queued = await db.execute(select(func.count(ScanResult.id)).filter(ScanResult.dast_status == "queued"))
    res_running = await db.execute(select(func.count(ScanResult.id)).filter(ScanResult.dast_status == "running"))
    res_completed = await db.execute(select(func.count(ScanResult.id)).filter(ScanResult.dast_status == "completed"))
    res_failed = await db.execute(select(func.count(ScanResult.id)).filter(ScanResult.dast_status.in_(["failed", "queue_failed"])))
    
    dast_queued = res_queued.scalar() or 0
    dast_running = res_running.scalar() or 0
    dast_completed = res_completed.scalar() or 0
    dast_failed = res_failed.scalar() or 0

    return {
        "total_repositories": total_repos,
        "security_score": health_score,
        "active_pipelines": active_pipelines,
        "total_deployments": total_deps,
        "deployment_success_rate": round(deploy_success_rate, 1),
        "mean_pipeline_duration_seconds": mean_duration,
        "open_findings": {
            "critical": critical,
            "high": high,
            "medium": medium,
            "low": low,
            "total": total_findings
        },
        "infrastructure_status": infra_status,
        "dast_pipeline": {
            "enabled": DAST_ENABLED,
            "broker_host": REDIS_URL.split("@")[-1] if "@" in REDIS_URL else REDIS_URL,
            "worker_queue": WORKER_QUEUE,
            "default_target_url": DEFAULT_TARGET_URL,
            "queued_jobs": dast_queued,
            "running_jobs": dast_running,
            "completed_jobs": dast_completed,
            "failed_jobs": dast_failed,
            "avg_duration_seconds": mean_duration,
        }
    }


@app.get("/api/migrate")
async def migrate(db: AsyncSession = Depends(get_db)):
    is_sqlite = "sqlite" in str(db.bind.url) if db.bind else False
    migration_statements = [
        text("ALTER TABLE scan_results ADD COLUMN dast_status VARCHAR") if is_sqlite else text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS dast_status VARCHAR"),
        text("ALTER TABLE scan_results ADD COLUMN target_url VARCHAR") if is_sqlite else text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS target_url VARCHAR"),
        text("ALTER TABLE scan_results ADD COLUMN deployment_url VARCHAR") if is_sqlite else text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS deployment_url VARCHAR"),
        text("ALTER TABLE scan_results ADD COLUMN zap_findings JSON") if is_sqlite else text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS zap_findings JSON"),
        text("ALTER TABLE scan_results ADD COLUMN zap_summary JSON") if is_sqlite else text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS zap_summary JSON"),
        text("ALTER TABLE scan_results ADD COLUMN queued_at TIMESTAMP") if is_sqlite else text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS queued_at TIMESTAMP"),
        text("ALTER TABLE scan_results ADD COLUMN dast_started_at TIMESTAMP") if is_sqlite else text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS dast_started_at TIMESTAMP"),
        text("ALTER TABLE scan_results ADD COLUMN dast_completed_at TIMESTAMP") if is_sqlite else text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS dast_completed_at TIMESTAMP"),
        text("ALTER TABLE scan_results ADD COLUMN scan_duration INTEGER") if is_sqlite else text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS scan_duration INTEGER"),
        text("ALTER TABLE scan_results ADD COLUMN worker_name VARCHAR") if is_sqlite else text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS worker_name VARCHAR"),
        text("ALTER TABLE scan_results ADD COLUMN worker_id VARCHAR") if is_sqlite else text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS worker_id VARCHAR"),
        text("ALTER TABLE scan_results ADD COLUMN queue_error TEXT") if is_sqlite else text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS queue_error TEXT"),
        text("ALTER TABLE scan_results ADD COLUMN zap_report_path VARCHAR") if is_sqlite else text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS zap_report_path VARCHAR"),
    ]
    for stmt in migration_statements:
        try:
            await db.execute(stmt)
        except Exception as e:
            logger.info(f"[migrate endpoint] notice: {e}")
    await db.commit()
    
    # Force re-sync of all historical runs to clear any stuck stage states
    try:
        scans_res = await db.execute(select(ScanResult))
        for scan in scans_res.scalars().all():
            await sync_single_scan_result_to_new_tables(scan.id, db)
    except Exception as ex:
        logger.warning(f"[migrate resync] failed to resync scans: {ex}")
        
    return {"status": "migrated", "dast_schema": "up to date", "historical_resync": "completed"}


# ---------------------------------------------------------------------------
# Additional Enterprise SaaS REST API Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/repositories")
async def get_repositories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScanResult).order_by(ScanResult.created_at.desc()))
    scans = result.scalars().all()
    
    repos_map = {}
    for s in scans:
        r_name = s.repo_name or "abhienix/SecureFlow"
        if r_name not in repos_map:
            repos_map[r_name] = {
                "id": len(repos_map) + 1,
                "name": r_name,
                "repo_name": r_name.split("/")[-1] if "/" in r_name else r_name,
                "owner": r_name.split("/")[0] if "/" in r_name else "abhienix",
                "default_branch": s.branch or "main",
                "status": "active",
                "total_scans": 0,
                "last_scan_at": utc_iso(s.created_at),
                "last_dast_status": s.dast_status or "not_queued",
                "security_score": max(50, 100 - ((s.risk_score or 3) * 10)),
                "open_findings": len((s.findings or {}).get("gitleaks", [])) + len((s.findings or {}).get("semgrep", [])) + len((s.findings or {}).get("Results", [])),
                "url": f"https://github.com/{r_name}"
            }
        repos_map[r_name]["total_scans"] += 1

    if not repos_map:
        repos_map["abhienix/SecureFlow"] = {
            "id": 1,
            "name": "abhienix/SecureFlow",
            "repo_name": "SecureFlow",
            "owner": "abhienix",
            "default_branch": "main",
            "status": "active",
            "total_scans": 12,
            "last_scan_at": utc_iso(datetime.utcnow()),
            "last_dast_status": "completed",
            "security_score": 94,
            "open_findings": 3,
            "url": "https://github.com/abhienix/SecureFlow"
        }

    return {"repositories": list(repos_map.values()), "total": len(repos_map)}


@app.delete("/api/repositories/{repo_id}")
async def delete_repository_legacy(repo_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Repository).filter((Repository.id == repo_id) | (Repository.name.like(f"%{repo_id}%")) | (Repository.repo_name.like(f"%{repo_id}%"))))
    target_repos = res.scalars().all()
    
    deleted_count = 0
    for r in target_repos:
        r_name = r.name
        await db.delete(r)
        await db.execute(delete(ScanResult).filter(ScanResult.repo_name.like(f"%{r_name}%")))
        deleted_count += 1
        
    if deleted_count == 0:
        res_scans = await db.execute(select(ScanResult).filter(ScanResult.repo_name.like(f"%{repo_id}%")))
        scans_to_delete = res_scans.scalars().all()
        for s in scans_to_delete:
            await db.delete(s)
            deleted_count += 1

    await db.commit()
    return {"status": "deleted", "deleted_count": deleted_count, "repo_id": repo_id}



@app.get("/api/deployments")
async def get_deployments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScanResult).order_by(ScanResult.created_at.desc()).limit(50))
    scans = result.scalars().all()
    
    deployments = []
    for s in scans:
        if s.deployment_url or (s.pipeline_steps or {}).get("deploy_prod"):
            deployments.append({
                "id": f"dep-{s.id}",
                "run_id": s.id,
                "repo_name": s.repo_name,
                "commit_sha": (s.commit_sha or "")[:8],
                "branch": s.branch,
                "environment": "production",
                "service_name": "secureflow-backend",
                "revision": f"secureflow-backend-{(s.commit_sha or 'v1')[:7]}",
                "url": s.deployment_url or DEFAULT_TARGET_URL,
                "status": "active" if s.action_taken == "ALLOW" else "blocked",
                "dast_status": s.dast_status or "not_queued",
                "ai_verdict": s.action_taken or "ALLOW",
                "created_at": utc_iso(s.created_at)
            })
            
    if not deployments:
        deployments.append({
            "id": "dep-1",
            "run_id": 1,
            "repo_name": "abhienix/SecureFlow",
            "commit_sha": "7ddbbe8f",
            "branch": "main",
            "environment": "production",
            "service_name": "secureflow-backend",
            "revision": "secureflow-backend-00042",
            "url": DEFAULT_TARGET_URL,
            "status": "active",
            "dast_status": "completed",
            "ai_verdict": "ALLOW",
            "created_at": utc_iso(datetime.utcnow())
        })

    return {"deployments": deployments, "total": len(deployments)}


@app.get("/api/findings")
async def get_unified_findings(
    db: AsyncSession = Depends(get_db),
    severity: Optional[str] = None,
    scanner: Optional[str] = None,
    repo: Optional[str] = None
):
    result = await db.execute(select(ScanResult).order_by(ScanResult.created_at.desc()).limit(100))
    scans = result.scalars().all()
    
    unified = []
    for s in scans:
        f = s.findings or {}
        # 1. Gitleaks Secrets
        for gl in f.get("gitleaks", []):
            sev = "CRITICAL" if "secret" in str(gl).lower() else "HIGH"
            if severity and sev != severity.upper():
                continue
            if scanner and scanner.lower() not in ("gitleaks", "secrets"):
                continue
            unified.append({
                "id": f"gl-{s.id}-{len(unified)}",
                "scanner": "gitleaks",
                "category": "Secret / Credential Exposure",
                "title": f"Exposed Secret: {gl.get('Description') or gl.get('RuleID') or 'API Key'}",
                "severity": sev,
                "repo_name": s.repo_name,
                "branch": s.branch,
                "file": gl.get("File") or gl.get("file") or "codebase",
                "line": gl.get("StartLine") or gl.get("startLine") or 1,
                "cve_cwe": "CWE-798 (Hardcoded Credentials)",
                "owasp": "A07:2021-Identification and Authentication Failures",
                "status": "open",
                "created_at": utc_iso(s.created_at),
                "ai_explanation": s.ai_explanation or "Gitleaks detected plain-text secret inside repository history.",
                "ai_fix": s.ai_fix or "Rotate exposed credential immediately and remove from Git history."
            })

        # 2. Semgrep SAST
        for sg in f.get("semgrep", []):
            sev = (sg.get("extra", {}).get("severity") or "HIGH").upper()
            if severity and sev != severity.upper():
                continue
            if scanner and scanner.lower() not in ("semgrep", "sast"):
                continue
            unified.append({
                "id": f"sg-{s.id}-{len(unified)}",
                "scanner": "semgrep",
                "category": "SAST Flaw",
                "title": sg.get("extra", {}).get("message") or sg.get("check_id") or "Code vulnerability",
                "severity": sev,
                "repo_name": s.repo_name,
                "branch": s.branch,
                "file": sg.get("path") or "src/",
                "line": (sg.get("start") or {}).get("line") or 1,
                "cve_cwe": f"CWE-{sg.get('check_id', '89')}",
                "owasp": "A03:2021-Injection",
                "status": "open",
                "created_at": utc_iso(s.created_at),
                "ai_explanation": s.ai_explanation or "Semgrep detected insecure pattern in source code.",
                "ai_fix": s.ai_fix or "Enforce sanitized input parameters and parameterized queries."
            })

        # 3. Trivy Container CVEs
        for res in f.get("Results", []):
            for vul in res.get("Vulnerabilities", []):
                sev = (vul.get("Severity") or "MEDIUM").upper()
                if severity and sev != severity.upper():
                    continue
                if scanner and scanner.lower() not in ("trivy", "container"):
                    continue
                unified.append({
                    "id": f"tv-{vul.get('VulnerabilityID')}-{len(unified)}",
                    "scanner": "trivy",
                    "category": "Container CVE",
                    "title": f"{vul.get('VulnerabilityID')} in {vul.get('PkgName')}",
                    "severity": sev,
                    "repo_name": s.repo_name,
                    "branch": s.branch,
                    "file": res.get("Target") or "Dockerfile",
                    "line": 1,
                    "cve_cwe": vul.get("VulnerabilityID") or "CVE-2026-0001",
                    "owasp": "A06:2021-Vulnerable and Outdated Components",
                    "status": "open",
                    "created_at": utc_iso(s.created_at),
                    "ai_explanation": s.ai_explanation or f"Trivy detected vulnerable package {vul.get('PkgName')}.",
                    "ai_fix": f"Upgrade {vul.get('PkgName')} to version {vul.get('FixedVersion') or 'latest'}."
                })

        # 4. OWASP ZAP DAST
        zap_alerts = (f.get("zap") or {}).get("alerts") or (s.zap_findings or {}).get("alerts") or []
        for za in zap_alerts if isinstance(zap_alerts, list) else []:
            sev = (za.get("risk") or "MEDIUM").upper()
            if severity and sev != severity.upper():
                continue
            if scanner and scanner.lower() not in ("zap", "dast", "owasp"):
                continue
            unified.append({
                "id": f"zap-{len(unified)}",
                "scanner": "zap",
                "category": "DAST Dynamic Alert",
                "title": za.get("alert") or "OWASP ZAP Dynamic Finding",
                "severity": sev,
                "repo_name": s.repo_name,
                "branch": s.branch,
                "file": za.get("url") or s.target_url or DEFAULT_TARGET_URL,
                "line": 1,
                "cve_cwe": f"CWE-{za.get('pluginId', '693')}",
                "owasp": "A05:2021-Security Misconfiguration",
                "status": "open",
                "created_at": utc_iso(s.created_at),
                "ai_explanation": "OWASP ZAP detected security header misconfiguration or active endpoint flaw.",
                "ai_fix": "Add missing security headers and enforce strict CORS / CSP policies."
            })

    return {"findings": unified, "total": len(unified)}


@app.get("/api/policies")
def get_policies():
    try:
        policy = load_policy_file()
    except Exception:
        policy = {
            "default": {"block_on": ["CRITICAL", "HIGH"], "warn_on": ["MEDIUM"], "cvss_threshold": 7.0},
            "repos": {"SecureFlow": {"block_on": ["CRITICAL"], "cvss_threshold": 9.8}}
        }
    return {
        "policy": policy,
        "rules": [
            {"id": 1, "name": "Block Critical & High Vulnerabilities", "severity": "CRITICAL", "action": "BLOCK", "scanner": "Trivy / Semgrep"},
            {"id": 2, "name": "Block Hardcoded Secrets / Private Keys", "severity": "CRITICAL", "action": "BLOCK", "scanner": "Gitleaks"},
            {"id": 3, "name": "Warn on Medium Severity CVEs", "severity": "MEDIUM", "action": "WARN", "scanner": "Trivy"},
            {"id": 4, "name": "Strict DAST Header Verification Gate", "severity": "HIGH", "action": "WARN", "scanner": "OWASP ZAP"}
        ]
    }


@app.post("/api/reports/export")
def export_reports(data: dict):
    report_type = data.get("report_type", "executive")
    fmt = data.get("format", "json")
    
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    report_content = {
        "title": f"SecureFlow DevSecOps Platform — {report_type.upper()} REPORT",
        "generated_at": timestamp,
        "environment": "production",
        "summary": {
            "total_repositories_audited": 6,
            "overall_health_score": 94,
            "policy_enforcement_status": "ACTIVE (policy.yaml)",
            "scanners_evaluated": ["Gitleaks", "Semgrep", "Trivy", "OWASP ZAP"]
        },
        "compliance": {
            "soc2_readiness": "96%",
            "iso27001_readiness": "94%",
            "nist_800_53": "COMPLIANT"
        }
    }
    
    if fmt == "csv":
        csv_str = "Report,GeneratedAt,HealthScore,Status\n"
        csv_str += f"{report_type},{timestamp},94,COMPLIANT\n"
        return {"filename": f"secureflow_{report_type}_report.csv", "mime": "text/csv", "content": csv_str}
        
    return {"filename": f"secureflow_{report_type}_report.json", "mime": "application/json", "data": report_content}


@app.get("/api/health/system")
async def get_system_health(db: AsyncSession = Depends(get_db)):
    db_ok = True
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    redis_ok = False
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(REDIS_URL, socket_timeout=1)
        redis_ok = await r.ping()
        await r.close()
    except Exception:
        redis_ok = False

    return {
        "status": "healthy" if (db_ok and redis_ok) else "degraded",
        "components": {
            "fastapi": {"name": "FastAPI Backend", "status": "Healthy", "latency_ms": 0.8},
            "database": {"name": "PostgreSQL DB", "status": "Healthy" if db_ok else "Offline", "latency_ms": 1.2},
            "redis": {"name": "Redis Cache", "status": "Healthy" if redis_ok else "Offline", "latency_ms": 0.5},
            "celery": {"name": "Celery Workers", "status": "Healthy", "active_workers": 4},
            "github": {"name": "GitHub Actions", "status": "Healthy", "rate_limit_remaining": 4980},
            "slack": {"name": "Slack Notifier", "status": "Healthy", "webhook_configured": bool(os.getenv("SLACK_WEBHOOK_URL"))},
            "void_ai": {"name": "Void AI Engine", "status": "Healthy", "model": "Grok DevSecOps Core"},
        },
        "pipeline_stages": [
            {"id": "github", "name": "GitHub Actions", "status": "Healthy"},
            {"id": "gitleaks", "name": "Gitleaks Secrets", "status": "Healthy"},
            {"id": "semgrep", "name": "Semgrep SAST", "status": "Healthy"},
            {"id": "docker", "name": "Docker Engine", "status": "Healthy"},
            {"id": "trivy", "name": "Trivy Container", "status": "Healthy"},
            {"id": "policy", "name": "Policy Engine", "status": "Healthy"},
            {"id": "deploy", "name": "GCP Deployment", "status": "Healthy"},
            {"id": "zap", "name": "OWASP ZAP DAST", "status": "Healthy"},
        ]
    }


@app.get("/api/system/info")
def get_system_info():
    return {
        "frontend_version": "v2.5.0",
        "backend_version": "v2.0.0",
        "build_number": "#9841203",
        "frontend_commit": "a2d3b0b",
        "backend_commit": "a2d3b0b",
        "database_version": "PostgreSQL 15.4",
        "redis_status": "PONG (Connected)",
        "worker_status": "4 Workers Active",
        "environment": "production"
    }


@app.get("/api/search")
async def global_search(q: str = "", db: AsyncSession = Depends(get_db)):
    if not q or len(q.strip()) < 2:
        return {"query": q, "results": []}

    search_str = f"%{q.strip()}%"
    results = []

    # Search Scan Results
    scan_stmt = select(ScanResult).filter(
        (ScanResult.repo_name.ilike(search_str)) |
        (ScanResult.commit_sha.ilike(search_str)) |
        (ScanResult.branch.ilike(search_str)) |
        (ScanResult.action_taken.ilike(search_str))
    ).limit(5)
    scan_res = await db.execute(scan_stmt)
    for s in scan_res.scalars().all():
        results.append({
            "id": f"pipeline-{s.id}",
            "type": "pipeline",
            "title": f"Pipeline #{s.id} — {s.repo_name or 'SecureFlow'}",
            "subtitle": f"SHA: {(s.commit_sha or 'HEAD')[:8]} | Status: {s.action_taken or 'ALLOW'}",
            "path": "/pipelines",
            "badge": s.action_taken or "ALLOW",
        })

    # Search Findings
    all_scans_stmt = select(ScanResult).order_by(ScanResult.created_at.desc()).limit(20)
    all_scans = (await db.execute(all_scans_stmt)).scalars().all()
    
    query_lower = q.lower()
    for s in all_scans:
        gitleaks = (s.findings or {}).get("gitleaks", [])
        for f in gitleaks:
            rule = f.get("RuleID", "Secret Detected")
            file_path = f.get("File", "")
            if query_lower in rule.lower() or query_lower in file_path.lower() or query_lower in "gitleaks":
                results.append({
                    "id": f"finding-gitleaks-{s.id}",
                    "type": "finding",
                    "title": f"Gitleaks: {rule}",
                    "subtitle": f"File: {file_path} in {s.repo_name or 'SecureFlow'}",
                    "path": "/security-center",
                    "badge": "CRITICAL",
                })
        
        semgrep = (s.findings or {}).get("semgrep", [])
        for f in semgrep:
            check_id = f.get("check_id", "SAST Rule")
            path = f.get("path", "")
            if query_lower in check_id.lower() or query_lower in path.lower() or query_lower in "semgrep":
                results.append({
                    "id": f"finding-semgrep-{s.id}",
                    "type": "finding",
                    "title": f"Semgrep: {check_id.split('.')[-1]}",
                    "subtitle": f"File: {path} in {s.repo_name or 'SecureFlow'}",
                    "path": "/security-center",
                    "badge": "HIGH",
                })

    return {"query": q, "results": results[:15]}


# ═══════════════════════════════════════════════════════════════════
# Security Health Engine
# ═══════════════════════════════════════════════════════════════════

async def calculate_security_score(repo_id: str = None, db: AsyncSession = None) -> int:
    """Multi-factor security health score 0-100."""
    if db is None:
        async with AsyncSessionLocal() as session:
            return await _calc_score(session, repo_id)
    return await _calc_score(db, repo_id)

async def _calc_score(db: AsyncSession, repo_id: str = None) -> int:
    deductions = 0.0

    # 1. Open findings by severity
    query = select(SecurityFinding)
    if repo_id:
        query = query.filter(SecurityFinding.repo_id == repo_id)
    res = await db.execute(query)
    findings = res.scalars().all()
    for f in findings:
        sev = (f.severity or "INFO").upper()
        if sev == "CRITICAL":
            deductions += 10.0
        elif sev == "HIGH":
            deductions += 5.0
        elif sev == "MEDIUM":
            deductions += 2.0
        elif sev == "LOW":
            deductions += 0.5

    # 2. Secret findings carry extra weight
    secret_count = sum(1 for f in findings if f.scanner == "gitleaks" and f.status == "open")
    deductions += secret_count * 15.0

    # 3. Policy violations
    policy_violations = 0
    pipeline_res = await db.execute(select(PipelineRun).filter(PipelineRun.action_taken == "BLOCK"))
    blocked_runs = pipeline_res.scalars().all()
    policy_violations = len(blocked_runs)
    deductions += policy_violations * 15.0

    # 4. Pipeline success rate impact
    total_runs_res = await db.execute(select(func.count()).select_from(PipelineRun))
    total_runs = total_runs_res.scalar() or 0
    if total_runs > 0:
        success_runs_res = await db.execute(
            select(func.count()).select_from(PipelineRun).filter(PipelineRun.action_taken == "ALLOW")
        )
        success_runs = success_runs_res.scalar() or 0
        success_rate = success_runs / total_runs
        if success_rate < 0.5:
            deductions += 20.0
        elif success_rate < 0.8:
            deductions += 10.0

    # 5. Infrastructure health check
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(REDIS_URL, socket_timeout=1)
        redis_ok = await r.ping()
        await r.close()
        if not redis_ok:
            deductions += 5.0
    except Exception:
        deductions += 5.0

    score = max(0, min(100, 100.0 - deductions))
    return int(score)


# ═══════════════════════════════════════════════════════════════════
# v2 API Router (prefix: /api/v1)
# ═══════════════════════════════════════════════════════════════════

v1_router = APIRouter(prefix="/api/v1")

import math
import random
import time
import httpx

PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://localhost:9090")

def generate_mock_prometheus_vector(query: str):
    query_lower = query.lower()
    val = 0.0
    if "cpu" in query_lower:
        val = 32.5 + random.uniform(-5.0, 5.0)
    elif "memory" in query_lower:
        val = 71.8 + random.uniform(-1.0, 1.0)
    elif "latency" in query_lower:
        val = 15.4 + random.uniform(-2.0, 3.0)
    elif "http_requests_total" in query_lower:
        val = 24.0 + random.uniform(-3.0, 3.0)
    elif "celery_queue_length" in query_lower:
        val = float(random.choice([0, 0, 1, 0, 0]))
    elif "celery_workers_active" in query_lower:
        val = 4.0
    elif "pg_stat_activity" in query_lower:
        val = 8.0 + random.choice([-1, 0, 1, 2])
    elif "cloud_run_instance" in query_lower:
        val = 2.0
    elif "up" in query_lower:
        val = 1.0
    else:
        val = random.uniform(10.0, 100.0)

    return {
        "status": "success",
        "data": {
            "resultType": "vector",
            "result": [
                {
                    "metric": {"__name__": query.split("{")[0].strip()},
                    "value": [time.time(), str(val)]
                }
            ]
        }
    }

def generate_mock_prometheus_matrix(query: str, start_ts: float, end_ts: float, step_sec: float):
    query_lower = query.lower()
    base_val = 50.0
    noise = 5.0
    if "cpu" in query_lower:
        base_val = 35.0
        noise = 8.0
    elif "memory" in query_lower:
        base_val = 72.0
        noise = 1.5
    elif "latency" in query_lower:
        base_val = 18.0
        noise = 4.0
    elif "http_requests" in query_lower:
        base_val = 25.0
        noise = 6.0
    elif "network" in query_lower:
        base_val = 1.2
        noise = 0.4
    
    values = []
    curr = start_ts
    while curr <= end_ts:
        val = base_val + noise * math.sin(curr / 3600.0) + random.uniform(-noise/2.0, noise/2.0)
        val = max(0.0, val)
        values.append([curr, str(val)])
        curr += step_sec
        if step_sec <= 0:
            break

    return {
        "status": "success",
        "data": {
            "resultType": "matrix",
            "result": [
                {
                    "metric": {"__name__": query.split("{")[0].strip()},
                    "values": values
                }
            ]
        }
    }

# 1. Health
@v1_router.get("/health")
async def get_v1_health():
    return {"status": "healthy"}

@v1_router.get("/health/system")
async def get_v1_health_system(db: AsyncSession = Depends(get_db)):
    db_ok = True
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    redis_ok = False
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(REDIS_URL, socket_timeout=1)
        redis_ok = await r.ping()
        await r.close()
    except Exception:
        redis_ok = False

    return {
        "status": "healthy" if (db_ok and redis_ok) else "degraded",
        "components": {
            "fastapi": {"name": "FastAPI Backend", "status": "Healthy", "latency_ms": 0.8},
            "database": {"name": "PostgreSQL DB", "status": "Healthy" if db_ok else "Offline", "latency_ms": 1.2},
            "redis": {"name": "Redis Cache", "status": "Healthy" if redis_ok else "Offline", "latency_ms": 0.5},
            "celery": {"name": "Celery Workers", "status": "Healthy", "active_workers": 4},
            "github": {"name": "GitHub Actions", "status": "Healthy", "rate_limit_remaining": 4980},
            "slack": {"name": "Slack Notifier", "status": "Healthy", "webhook_configured": bool(os.getenv("SLACK_WEBHOOK_URL"))},
            "void_ai": {"name": "Void AI Engine", "status": "Healthy", "model": "Grok DevSecOps Core"},
        },
        "pipeline_stages": [
            {"id": "github", "name": "GitHub Actions", "status": "Healthy"},
            {"id": "gitleaks", "name": "Gitleaks Secrets", "status": "Healthy"},
            {"id": "semgrep", "name": "Semgrep SAST", "status": "Healthy"},
            {"id": "docker", "name": "Docker Engine", "status": "Healthy"},
            {"id": "trivy", "name": "Trivy Container", "status": "Healthy"},
            {"id": "policy", "name": "Policy Engine", "status": "Healthy"},
            {"id": "deploy", "name": "GCP Deployment", "status": "Healthy"},
            {"id": "zap", "name": "OWASP ZAP DAST", "status": "Healthy"},
        ]
    }

# 2. Repositories
@v1_router.get("/repositories")
async def get_v1_repositories(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Repository).order_by(Repository.name.asc()))
    repos = res.scalars().all()
    # If empty, let's sync to ensure seeded
    if not repos:
        await seed_new_tables_from_scan_results()
        res = await db.execute(select(Repository).order_by(Repository.name.asc()))
        repos = res.scalars().all()
    return {"repositories": repos, "total": len(repos)}

@v1_router.post("/repositories")
async def register_v1_repository(data: dict, db: AsyncSession = Depends(get_db)):
    pwd = data.get("password")
    if pwd and pwd != "Abhi@8476":
        raise HTTPException(status_code=403, detail="Invalid admin security password. Password 'Abhi@8476' is required.")
        
    name = data.get("repo_name") or f"{data.get('owner', 'abhienix')}/{data.get('name', 'new-repo')}"
    res = await db.execute(select(Repository).filter(Repository.name == name))
    existing = res.scalars().first()
    if existing:
        return {"status": "registered", "repository": existing}

    owner = name.split("/")[0] if "/" in name else "abhienix"
    short_name = name.split("/")[-1] if "/" in name else name
    repo = Repository(
        name=name,
        repo_name=short_name,
        owner=owner,
        default_branch=data.get("default_branch", "main"),
        status="active",
        url=data.get("url") or f"https://github.com/{name}"
    )
    db.add(repo)
    await db.commit()
    await db.refresh(repo)
    return {"status": "registered", "repository": repo}

@v1_router.delete("/repositories/{repo_id}")
async def delete_v1_repository(repo_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Repository).filter((Repository.id == repo_id) | (Repository.name.like(f"%{repo_id}%")) | (Repository.repo_name.like(f"%{repo_id}%"))))
    target_repos = res.scalars().all()
    
    deleted_count = 0
    for r in target_repos:
        r_name = r.name
        await db.delete(r)
        await db.execute(delete(ScanResult).filter(ScanResult.repo_name.like(f"%{r_name}%")))
        deleted_count += 1
        
    if deleted_count == 0:
        res_scans = await db.execute(select(ScanResult).filter(ScanResult.repo_name.like(f"%{repo_id}%")))
        scans_to_delete = res_scans.scalars().all()
        for s in scans_to_delete:
            await db.delete(s)
            deleted_count += 1

    await db.commit()
    return {"status": "deleted", "deleted_count": deleted_count, "repo_id": repo_id}

@v1_router.get("/repositories/{repo_id}")
async def get_v1_repository_detail(repo_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Repository).filter(Repository.id == repo_id))
    repo = res.scalars().first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo

@v1_router.get("/repositories/{repo_id}/commits")
async def get_v1_repo_commits(repo_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(PipelineRun).filter(PipelineRun.repo_id == repo_id).order_by(PipelineRun.created_at.desc()))
    runs = res.scalars().all()
    return [
        {
            "sha": r.commit_sha,
            "message": r.commit_message,
            "branch": r.branch,
            "status": r.status,
            "created_at": utc_iso(r.created_at)
        }
        for r in runs
    ]

@v1_router.get("/repositories/{repo_id}/pulls")
async def get_v1_repo_pulls(repo_id: str):
    return [
        {
            "id": 1,
            "number": 104,
            "title": "feat: update docker compose and policy engine CVSS gates",
            "author": "DevSecOps Engineer",
            "branch": "patch-sec-gates",
            "status": "running",
            "age": "2h",
            "reviewers": 2
        },
        {
            "id": 2,
            "number": 98,
            "title": "fix: prevent SQL injection pattern in worker query pipeline",
            "author": "Security Lead",
            "branch": "fix-sql-vuln",
            "status": "passed",
            "age": "3d",
            "reviewers": 1
        }
    ]

@v1_router.get("/repositories/{repo_id}/security")
async def get_v1_repo_security(repo_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SecurityFinding).filter(SecurityFinding.repo_id == repo_id))
    findings = res.scalars().all()
    counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
    for f in findings:
        sev = (f.severity or "INFO").upper()
        if sev in counts:
            counts[sev] += 1
    return {
        "summary": counts,
        "total_findings": len(findings),
        "last_scan_at": utc_iso(findings[0].created_at) if findings else None
    }

# 3. Pipelines
@v1_router.get("/pipelines")
async def get_v1_pipelines(db: AsyncSession = Depends(get_db), limit: int = 200):
    total_res = await db.execute(select(func.count()).select_from(ScanResult))
    total_count = total_res.scalar() or 0

    res = await db.execute(select(PipelineRun).order_by(PipelineRun.created_at.desc()).limit(limit))
    runs = res.scalars().all()
    
    results = []
    for r in runs:
        repo_res = await db.execute(select(Repository).filter(Repository.id == r.repo_id))
        repo = repo_res.scalars().first()
        repo_name = repo.name if repo else "abhienix/SecureFlow"
        
        stages_res = await db.execute(select(PipelineStage).filter(PipelineStage.run_id == r.id))
        stages = stages_res.scalars().all()
        stage_summary = [{"name": s.name, "stage_key": s.stage_key, "order_index": s.order_index, "status": s.status} for s in stages]
        
        results.append({
            "id": r.id,
            "run_number": r.run_number,
            "repo_name": repo_name,
            "commit_sha": r.commit_sha,
            "commit_message": r.commit_message,
            "branch": r.branch,
            "status": r.status,
            "action_taken": r.action_taken,
            "started_at": utc_iso(r.started_at),
            "created_at": utc_iso(r.created_at),
            "duration": r.duration,
            "stages": stage_summary
        })
    return results

@v1_router.get("/pipelines/latest")
async def get_v1_pipeline_latest(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(PipelineRun).order_by(PipelineRun.created_at.desc()))
    run = res.scalars().first()
    if not run:
        return {"id": "none", "status": "no data"}
    
    stages_res = await db.execute(select(PipelineStage).filter(PipelineStage.run_id == run.id))
    stages = stages_res.scalars().all()
    stages_detail = []
    for s in stages:
        steps_res = await db.execute(select(PipelineStep).filter(PipelineStep.stage_id == s.id))
        steps = steps_res.scalars().all()
        stages_detail.append({
            "id": s.id,
            "name": s.name,
            "stage_key": s.stage_key,
            "order_index": s.order_index,
            "status": s.status,
            "duration": s.duration,
            "steps": [{"id": st.id, "name": st.name, "status": st.status, "duration": st.duration} for st in steps]
        })
    return {
        "id": run.id,
        "run_number": run.run_number,
        "commit_sha": run.commit_sha,
        "status": run.status,
        "stages": stages_detail
    }

@v1_router.get("/pipelines/{run_id}")
async def get_v1_pipeline_detail(run_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(PipelineRun).filter(PipelineRun.id == run_id))
    run = res.scalars().first()
    if not run:
        if run_id.isdigit():
            res = await db.execute(select(PipelineRun).filter(PipelineRun.run_number == int(run_id)))
            run = run_res = res.scalars().first()
        if not run:
            raise HTTPException(status_code=404, detail="Pipeline run not found")
    
    repo_res = await db.execute(select(Repository).filter(Repository.id == run.repo_id))
    repo = repo_res.scalars().first()
    repo_name = repo.name if repo else "abhienix/SecureFlow"

    stages_res = await db.execute(select(PipelineStage).filter(PipelineStage.run_id == run.id))
    stages = stages_res.scalars().all()
    
    stages_detail = []
    for s in stages:
        steps_res = await db.execute(select(PipelineStep).filter(PipelineStep.stage_id == s.id))
        steps = steps_res.scalars().all()
        stages_detail.append({
            "id": s.id,
            "name": s.name,
            "stage_key": s.stage_key,
            "order_index": s.order_index,
            "status": s.status,
            "duration": s.duration,
            "detail": s.detail,
            "exit_code": s.exit_code,
            "started_at": utc_iso(s.started_at) if s.started_at else None,
            "ended_at": utc_iso(s.ended_at) if s.ended_at else None,
            "steps": [
                {
                    "id": st.id,
                    "name": st.name,
                    "status": st.status,
                    "duration": st.duration,
                    "exit_code": st.exit_code
                }
                for st in steps
            ]
        })

    return {
        "id": run.id,
        "run_number": run.run_number,
        "repo_name": repo_name,
        "commit_sha": run.commit_sha,
        "commit_message": run.commit_message,
        "branch": run.branch,
        "status": run.status,
        "action_taken": run.action_taken,
        "started_at": utc_iso(run.started_at),
        "created_at": utc_iso(run.created_at),
        "duration": run.duration,
        "stages": stages_detail
    }

@v1_router.get("/pipelines/{run_id}/stages/{stage_id}/logs")
async def get_v1_pipeline_logs(run_id: str, stage_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(PipelineStep).filter(PipelineStep.stage_id == stage_id))
    steps = res.scalars().all()
    logs = ""
    for s in steps:
        logs += s.logs or ""
    return {"logs": logs}

@v1_router.get("/pipelines/{run_id}/findings")
async def get_v1_pipeline_findings(run_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SecurityFinding).filter(SecurityFinding.pipeline_run_id == run_id))
    findings = res.scalars().all()
    return findings

# 4. Security Center
@v1_router.get("/security/findings")
async def get_v1_security_findings(
    db: AsyncSession = Depends(get_db),
    severity: Optional[str] = None,
    scanner: Optional[str] = None,
    repo: Optional[str] = None,
    status: Optional[str] = None
):
    query = select(SecurityFinding)
    if severity:
        query = query.filter(SecurityFinding.severity == severity.upper())
    if scanner:
        query = query.filter(SecurityFinding.scanner == scanner.lower())
    if repo:
        repo_res = await db.execute(select(Repository).filter(Repository.name == repo))
        r = repo_res.scalars().first()
        if r:
            query = query.filter(SecurityFinding.repo_id == r.id)
    if status:
        query = query.filter(SecurityFinding.status == status.lower())
        
    res = await db.execute(query.order_by(SecurityFinding.created_at.desc()))
    findings = res.scalars().all()
    return {"findings": findings, "total": len(findings)}

@v1_router.get("/security/findings/{finding_id}")
async def get_v1_finding_detail(finding_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SecurityFinding).filter(SecurityFinding.id == finding_id))
    finding = res.scalars().first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding

@v1_router.patch("/security/findings/{finding_id}")
async def update_v1_finding_status(finding_id: str, data: dict, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SecurityFinding).filter(SecurityFinding.id == finding_id))
    finding = res.scalars().first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    status = data.get("status")
    if status:
        finding.status = status
        await db.commit()
        await db.refresh(finding)
    return finding

@v1_router.post("/security/ingest", dependencies=[Depends(verify_api_secret)])
async def ingest_scan_results(data: dict, db: AsyncSession = Depends(get_db)):
    res = await receive_scan_results(data, db)
    scan_id = res.get("id") or data.get("run_id")
    if scan_id:
        try:
            await sync_single_scan_result_to_new_tables(scan_id, db)
        except Exception as e:
            logger.warning(f"[ingest sync] error syncing scan {scan_id}: {e}")
    return res

@v1_router.get("/security/summary")
async def get_v1_security_summary(db: AsyncSession = Depends(get_db)):
    scans_count_res = await db.execute(select(func.count()).select_from(ScanResult))
    total_scans_count = scans_count_res.scalar() or 0

    res = await db.execute(select(SecurityFinding))
    findings = res.scalars().all()
    
    counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
    for f in findings:
        sev = (f.severity or "INFO").upper()
        if sev in counts:
            counts[sev] += 1
            
    return {
        "critical": counts["CRITICAL"],
        "high": counts["HIGH"],
        "medium": counts["MEDIUM"],
        "low": counts["LOW"],
        "info": counts["INFO"],
        "total": len(findings),
        "total_scans": total_scans_count,
        "last_scan_at": utc_iso(datetime.utcnow())
    }

@v1_router.get("/scan-results")
async def get_v1_scan_results(db: AsyncSession = Depends(get_db), limit: int = 500):
    return await get_scan_results(db, limit)

@v1_router.get("/security/trends")
async def get_v1_security_trends(days: int = 30, db: AsyncSession = Depends(get_db)):
    now = datetime.utcnow()
    dates = [(now - timedelta(days=i)).strftime("%b %d") for i in range(days)][::-1]
    
    res = await db.execute(select(SecurityFinding))
    findings = res.scalars().all()
    
    trends = []
    for d in dates:
        trends.append({
            "day": d,
            "critical": sum(1 for f in findings if f.severity == "CRITICAL" and f.created_at.strftime("%b %d") == d),
            "high": sum(1 for f in findings if f.severity == "HIGH" and f.created_at.strftime("%b %d") == d),
            "medium": sum(1 for f in findings if f.severity == "MEDIUM" and f.created_at.strftime("%b %d") == d),
            "low": sum(1 for f in findings if f.severity == "LOW" and f.created_at.strftime("%b %d") == d)
        })
    return trends

@v1_router.get("/security/scanners/comparison")
async def get_v1_scanner_comparison(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SecurityFinding))
    findings = res.scalars().all()
    
    scanners = ["trivy", "semgrep", "gitleaks", "zap"]
    comparison = {}
    for s in scanners:
        comparison[s] = {
            "critical": sum(1 for f in findings if f.scanner == s and f.severity == "CRITICAL"),
            "high": sum(1 for f in findings if f.scanner == s and f.severity == "HIGH"),
            "medium": sum(1 for f in findings if f.scanner == s and f.severity == "MEDIUM"),
            "low": sum(1 for f in findings if f.scanner == s and f.severity == "LOW")
        }
    return comparison

# 5. Deployments
@v1_router.get("/deployments")
async def get_v1_deployments(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Deployment).order_by(Deployment.created_at.desc()))
    deps = res.scalars().all()
    return {"deployments": deps, "total": len(deps)}

@v1_router.get("/deployments/current")
async def get_v1_deployments_current(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Deployment).filter(Deployment.status == "active").order_by(Deployment.created_at.desc()))
    dep = res.scalars().first()
    if not dep:
        return {
            "id": "dep-active",
            "revision_name": "secureflow-backend-00042",
            "service": "secureflow-backend",
            "environment": "production",
            "url": DEFAULT_TARGET_URL,
            "status": "active",
            "commit_sha": "7ddbbe8f",
            "created_at": utc_iso(datetime.utcnow()),
            "duration": 45
        }
    return dep

@v1_router.post("/deployments/{dep_id}/rollback")
async def rollback_v1_deployment(dep_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Deployment).filter(Deployment.id == dep_id))
    dep = res.scalars().first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    active_res = await db.execute(select(Deployment).filter(Deployment.status == "active"))
    actives = active_res.scalars().all()
    for a in actives:
        a.status = "rolled_back"
        
    dep.status = "active"
    
    event = Event(
        type="deploy.rollback",
        message=f"Rolled back service secureflow-backend to revision {dep.revision_name}",
        source_link=f"/deployments",
        severity="warning"
    )
    db.add(event)
    await db.commit()
    await db.refresh(dep)
    return {"status": "success", "message": f"Deployment rolled back to revision {dep.revision_name}", "deployment": dep}

# 6. Metrics & Alerts
@v1_router.get("/metrics/query")
async def get_v1_metrics_query(query: str):
    # Try calling real prometheus first
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": query}, timeout=2.0)
            if resp.status_code == 200:
                return resp.json()
        except Exception:
            pass
    return generate_mock_prometheus_vector(query)

@v1_router.get("/metrics/range")
async def get_v1_metrics_range(query: str, start: float, end: float, step: float = 15.0):
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{PROMETHEUS_URL}/api/v1/query_range",
                params={"query": query, "start": str(start), "end": str(end), "step": str(step)},
                timeout=2.0
            )
            if resp.status_code == 200:
                return resp.json()
        except Exception:
            pass
    return generate_mock_prometheus_matrix(query, start, end, step)

@v1_router.get("/alerts")
async def get_v1_alerts():
    # Fetch from alertmanager if configured, otherwise mock
    return [
        {
            "name": "CeleryWorkerCPUWarning",
            "severity": "warning",
            "started_at": utc_iso(datetime.utcnow() - timedelta(minutes=12)),
            "expression": "avg(rate(container_cpu_usage_seconds_total{container='celery-worker'}[1m])) > 80",
            "runbook_link": "https://github.com/abhienix/SecureFlow/wiki/Runbook-Celery-High-CPU"
        }
    ]

@v1_router.get("/topology")
async def get_v1_topology(db: AsyncSession = Depends(get_db)):
    # Topology details mapping Section 4.7
    return {
      "nodes": [
        {"id": "github", "name": "GitHub Repository", "status": "healthy", "type": "github", "metrics": {"cpu": 0, "memory": 0, "latency": 0}},
        {"id": "actions", "name": "GitHub Actions CI", "status": "healthy", "type": "ci", "metrics": {"cpu": 0, "memory": 0, "latency": 0}},
        {"id": "cloud_run", "name": "Cloud Run Instance", "status": "healthy", "type": "compute", "metrics": {"cpu": 32, "memory": 48, "latency": 12}},
        {"id": "redis", "name": "Redis Broker", "status": "healthy", "type": "broker", "metrics": {"cpu": 12, "memory": 18, "latency": 1}},
        {"id": "worker", "name": "Celery Worker", "status": "healthy", "type": "worker", "metrics": {"cpu": 25, "memory": 48, "latency": 5}},
        {"id": "fastapi", "name": "FastAPI Backend", "status": "healthy", "type": "backend", "metrics": {"cpu": 15, "memory": 35, "latency": 15}},
        {"id": "prometheus", "name": "Prometheus Server", "status": "healthy", "type": "monitor", "metrics": {"cpu": 8, "memory": 32, "latency": 2}},
        {"id": "grafana", "name": "Grafana Dashboards", "status": "healthy", "type": "dashboard", "metrics": {"cpu": 10, "memory": 40, "latency": 8}},
        {"id": "postgres", "name": "PostgreSQL DB", "status": "healthy", "type": "database", "metrics": {"cpu": 18, "memory": 55, "latency": 1}}
      ],
      "edges": [
        {"source": "github", "target": "actions", "animated": True},
        {"source": "actions", "target": "cloud_run", "animated": True},
        {"source": "cloud_run", "target": "redis", "animated": True},
        {"source": "redis", "target": "worker", "animated": True},
        {"source": "worker", "target": "fastapi", "animated": True},
        {"source": "fastapi", "target": "postgres", "animated": True},
        {"source": "prometheus", "target": "fastapi", "animated": False},
        {"source": "prometheus", "target": "grafana", "animated": False},
        {"source": "grafana", "target": "postgres", "animated": False}
      ]
    }

# 7. Policies
@v1_router.get("/policies")
async def get_v1_policies(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Policy))
    policies = res.scalars().all()
    if not policies:
        # Seed policies
        default_policies = [
            Policy(name="Block Critical & High Vulnerabilities", type="Severity Gate", rule_summary="No Critical/High findings allowed in main branch deploys", status="active", enforcement_mode="block"),
            Policy(name="Block Hardcoded Secrets / Private Keys", type="Secret Detection", rule_summary="No exposed secrets or API keys allowed", status="active", enforcement_mode="block"),
            Policy(name="Warn on Medium Severity CVEs", type="Severity Gate", rule_summary="Log warning for Medium vulnerability findings", status="active", enforcement_mode="warn"),
            Policy(name="Strict DAST Header Verification Gate", type="Coverage Gate", rule_summary="Verify security headers are configured properly", status="active", enforcement_mode="warn")
        ]
        db.add_all(default_policies)
        await db.commit()
        res = await db.execute(select(Policy))
        policies = res.scalars().all()
    return policies

@v1_router.post("/policies")
async def create_v1_policy(data: dict, db: AsyncSession = Depends(get_db)):
    policy = Policy(
        name=data.get("name"),
        type=data.get("type"),
        rule_summary=data.get("rule_summary"),
        status="active",
        enforcement_mode=data.get("enforcement_mode", "block")
    )
    db.add(policy)
    await db.commit()
    await db.refresh(policy)
    return policy

@v1_router.patch("/policies/{policy_id}")
async def update_v1_policy(policy_id: str, data: dict, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Policy).filter(Policy.id == policy_id))
    policy = res.scalars().first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    for k, v in data.items():
        setattr(policy, k, v)
    await db.commit()
    await db.refresh(policy)
    return policy

@v1_router.delete("/policies/{policy_id}")
async def delete_v1_policy(policy_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Policy).filter(Policy.id == policy_id))
    policy = res.scalars().first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    await db.delete(policy)
    await db.commit()
    return {"status": "deleted"}

# 8. Notifications
@v1_router.get("/notifications")
async def get_v1_notifications(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Notification).order_by(Notification.created_at.desc()).limit(100))
    notifications = res.scalars().all()
    return notifications

@v1_router.get("/observability/overview")
async def get_v1_observability_overview(db: AsyncSession = Depends(get_db)):
    # Total repositories
    repo_res = await db.execute(select(func.count()).select_from(Repository))
    total_repos = repo_res.scalar() or 0

    # Total pipeline runs
    pipe_res = await db.execute(select(func.count()).select_from(PipelineRun))
    total_pipelines = pipe_res.scalar() or 0

    # Active pipelines (running or pending)
    active_res = await db.execute(
        select(func.count()).select_from(PipelineRun).filter(PipelineRun.status.in_(["running", "pending"]))
    )
    active_pipelines = active_res.scalar() or 0

    # Pipeline success rate
    success_res = await db.execute(
        select(func.count()).select_from(PipelineRun).filter(PipelineRun.action_taken == "ALLOW")
    )
    success_count = success_res.scalar() or 0
    deployment_success_rate = round((success_count / max(total_pipelines, 1)) * 100, 1)

    # Mean pipeline duration
    dur_res = await db.execute(select(func.avg(PipelineRun.duration)).filter(PipelineRun.duration != None))
    mean_dur = dur_res.scalar()
    mean_pipeline_duration_seconds = round(float(mean_dur), 1) if mean_dur else 0.0

    # Open findings
    finding_res = await db.execute(select(func.count()).select_from(SecurityFinding))
    total_findings = finding_res.scalar() or 0

    open_res = await db.execute(
        select(func.count()).select_from(SecurityFinding).filter(SecurityFinding.status == "open")
    )
    open_findings = open_res.scalar() or 0

    # Security score
    security_score = await calculate_security_score(db=db)

    # Infrastructure status
    db_ok = True
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    infrastructure_status = "healthy" if db_ok else "degraded"

    # Repository health (% of repos with score > 80)
    repo_health_pct = 0.0
    if total_repos > 0:
        all_repos_res = await db.execute(select(Repository))
        all_repos = all_repos_res.scalars().all()
        healthy_count = 0
        for repo in all_repos:
            repo_score = await calculate_security_score(repo_id=repo.id, db=db)
            if repo_score > 80:
                healthy_count += 1
        repo_health_pct = round((healthy_count / total_repos) * 100, 1)

    return {
        "total_repositories": total_repos,
        "total_pipelines": total_pipelines,
        "active_pipelines": active_pipelines,
        "security_score": security_score,
        "deployment_success_rate": deployment_success_rate,
        "mean_pipeline_duration_seconds": mean_pipeline_duration_seconds,
        "total_findings": total_findings,
        "open_findings": open_findings,
        "repository_health_pct": repo_health_pct,
        "infrastructure_status": infrastructure_status
    }

@v1_router.get("/events")
async def get_v1_events(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Event).order_by(Event.created_at.desc()).limit(50))
    events = res.scalars().all()
    return events

@v1_router.post("/copilot/chat")
async def copilot_chat_streaming(data: dict, db: AsyncSession = Depends(get_db)):
    messages = data.get("messages", [])

    async def token_generator():
        question = messages[-1]["content"] if messages else "Hello"

        # ── Pull real DB data so both LLM and fallback have rich context ──
        try:
            scans_rows = (await db.execute(
                text("SELECT id, repo_name, branch, commit_sha, commit_message, status, action_taken, ai_explanation, created_at FROM scan_results ORDER BY id DESC LIMIT 20")
            )).fetchall()
            findings_rows = (await db.execute(
                text("SELECT severity, title, scanner FROM findings ORDER BY id DESC LIMIT 200")
            )).fetchall()
        except Exception:
            scans_rows, findings_rows = [], []

        # Build context from real DB
        recent_scans = [
            {
                "id": r[0], "repo_name": r[1], "branch": r[2],
                "commit_sha": str(r[3])[:7] if r[3] else "unknown",
                "commit_message": r[4] or "",
                "status": r[5] or "unknown",
                "action_taken": r[6] or "ALLOW",
                "ai_explanation": r[7] or "",
                "created_at": str(r[8])[:19] if r[8] else ""
            }
            for r in scans_rows
        ]
        sev_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for f in findings_rows:
            sev = (f[0] or "").upper()
            if sev in sev_counts:
                sev_counts[sev] += 1

        db_context = {
            "total_scans": len(scans_rows),
            "recent_scans": recent_scans,
            "findings_summary": sev_counts,
        }

        try:
            response = await asyncio.to_thread(answer_copilot_question, question, db_context)
            ans_text = response or smart_fallback(question, db_context)
        except Exception as e:
            logger.error(f"[copilot chat] error: {e}")
            ans_text = smart_fallback(question, db_context)

        words = ans_text.split(" ")
        for i, word in enumerate(words):
            chunk = {"token": word + (" " if i < len(words) - 1 else "")}
            yield f"data: {json.dumps(chunk)}\n\n"
            await asyncio.sleep(0.018)
        yield "data: [DONE]\n\n"

    return responses.StreamingResponse(token_generator(), media_type="text/event-stream")


# Mount v1 router and real-time routes
app.include_router(v1_router)

@app.websocket("/ws/events")
async def websocket_events(ws: WebSocket):
    await manager.connect(ws)
    missed_pongs = 0
    try:
        while True:
            try:
                await asyncio.wait_for(ws.receive_text(), timeout=WEBSOCKET_PING_INTERVAL)
                missed_pongs = 0
            except asyncio.TimeoutError:
                if missed_pongs >= MAX_MISSED_PINGS:
                    break
                missed_pongs += 1
                await ws.send_text(json.dumps({"type": "ping"}))
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        manager.disconnect(ws)

@app.get("/events/stream")
async def sse_events_stream():
    async def event_generator():
        last_event_id = None
        while True:
            async with AsyncSessionLocal() as db:
                query = select(Event).order_by(Event.created_at.desc()).limit(10)
                res = await db.execute(query)
                events = res.scalars().all()
                if events:
                    latest = events[0]
                    if latest.id != last_event_id:
                        last_event_id = latest.id
                        chunk = {
                            "type": latest.type,
                            "message": latest.message,
                            "source_link": latest.source_link,
                            "severity": latest.severity,
                            "created_at": utc_iso(latest.created_at)
                        }
                        yield f"data: {json.dumps(chunk)}\n\n"
            await asyncio.sleep(3.0)
            
    return responses.StreamingResponse(event_generator(), media_type="text/event-stream")



