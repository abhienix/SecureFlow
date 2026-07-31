from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, JSON, Text, Index, Float, Boolean
from sqlalchemy.orm import declarative_base
from sqlalchemy import text

Base = declarative_base()


class ScanResult(Base):
    """One row per security scan. This is the table the dashboard reads from."""

    __tablename__ = "scan_results"

    __table_args__ = (
        # Partial unique index: prevents duplicate active rows for the same
        # commit+repo+branch while allowing superseded rows to coexist.
        Index(
            "ix_scan_unique_active",
            "commit_sha", "repo_name", "branch",
            unique=True,
            postgresql_where=text("status != 'superseded'"),
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    commit_sha = Column(String, index=True)
    commit_message = Column(Text, nullable=True)
    repo_name = Column(String)
    branch = Column(String)
    scan_type = Column(String)
    severity = Column(String)

    findings = Column(JSON)  # raw Trivy, Gitleaks, Semgrep, and ZAP output merged

    ai_explanation = Column(Text, nullable=True)
    ai_fix = Column(Text, nullable=True)
    risk_score = Column(Integer, nullable=True)
    action_taken = Column(String, nullable=True)  # "ALLOW" or "BLOCK"

    ai_feedback = Column(String, nullable=True)       # accurate / incorrect / partial
    ai_feedback_note = Column(Text, nullable=True)    # optional free-text note

    # Per-stage results sent by the GitHub Actions workflow, e.g.
    # { "code_scan": {"result": "PASS", "detail": "..."}, "image_scan": {...}, "zap": {...} }
    pipeline_steps = Column(JSON, nullable=True)

    # Status tracking for full pipeline lifecycle:
    # "running" while the pipeline is mid-flight, "complete" once finished, "timeout", "superseded"
    status = Column(String, default="complete")
    started_at = Column(DateTime, nullable=True)

    # GitHub Actions run ID — used to poll the GitHub API for real-time status
    github_run_id = Column(String, nullable=True, index=True)
    github_repo   = Column(String, nullable=True)   # e.g. "abhienix/SecureFlow"

    # ---------------------------------------------------------------------------
    # Distributed DAST Lifecycle Tracking Fields
    # ---------------------------------------------------------------------------
    # Status: "not_queued", "queued", "running", "completed", "failed", "queue_failed"
    dast_status = Column(String, nullable=True, default="not_queued")
    target_url = Column(String, nullable=True)
    deployment_url = Column(String, nullable=True)
    zap_findings = Column(JSON, nullable=True)
    zap_summary = Column(JSON, nullable=True)
    queued_at = Column(DateTime, nullable=True)
    dast_started_at = Column(DateTime, nullable=True)
    dast_completed_at = Column(DateTime, nullable=True)
    scan_duration = Column(Integer, nullable=True)
    worker_name = Column(String, nullable=True)
    worker_id = Column(String, nullable=True)
    queue_error = Column(Text, nullable=True)
    zap_report_path = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


import uuid

def generate_uuid():
    return str(uuid.uuid4())

class Repository(Base):
    __tablename__ = "repositories"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, index=True, unique=True)
    repo_name = Column(String)
    owner = Column(String)
    default_branch = Column(String, default="main")
    status = Column(String, default="active")
    url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PipelineRun(Base):
    __tablename__ = "pipeline_runs"
    id = Column(String, primary_key=True, default=generate_uuid)
    run_number = Column(Integer, index=True)
    repo_id = Column(String, index=True)
    commit_sha = Column(String, index=True)
    commit_message = Column(Text, nullable=True)
    branch = Column(String)
    status = Column(String, default="WAITING")  # WAITING, RUNNING, PASSED, FAILED, BLOCKED, SKIPPED, CANCELLED
    action_taken = Column(String, default="ALLOW") # ALLOW or BLOCK
    started_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    duration = Column(Integer, nullable=True)  # in seconds

class PipelineStage(Base):
    __tablename__ = "pipeline_stages"
    id = Column(String, primary_key=True, default=generate_uuid)
    run_id = Column(String, index=True)
    name = Column(String)
    stage_key = Column(String, index=True)
    order_index = Column(Integer, default=0)
    status = Column(String, default="WAITING")  # WAITING, RUNNING, PASSED, FAILED, BLOCKED, SKIPPED, CANCELLED
    duration = Column(String, nullable=True)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    exit_code = Column(Integer, nullable=True)
    detail = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)

class PipelineStep(Base):
    __tablename__ = "pipeline_steps"
    id = Column(String, primary_key=True, default=generate_uuid)
    stage_id = Column(String, index=True)
    name = Column(String)
    status = Column(String, default="pending")  # passed, running, failed, skipped, pending
    duration = Column(String, nullable=True)
    exit_code = Column(Integer, nullable=True)
    logs = Column(Text, nullable=True)

class SecurityFinding(Base):
    __tablename__ = "security_findings"
    id = Column(String, primary_key=True, default=generate_uuid)
    repo_id = Column(String, index=True)
    pipeline_run_id = Column(String, index=True)
    scanner = Column(String, index=True)  # trivy, semgrep, bandit, zap
    category = Column(String)
    title = Column(String)
    severity = Column(String, index=True)  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    file = Column(String)
    line = Column(Integer, default=1)
    cve_cwe = Column(String, nullable=True)
    owasp = Column(String, nullable=True)
    status = Column(String, default="open")  # open, acknowledged, resolved
    created_at = Column(DateTime, default=datetime.utcnow)
    ai_explanation = Column(Text, nullable=True)
    ai_fix = Column(Text, nullable=True)

class ScanRun(Base):
    __tablename__ = "scan_runs"
    id = Column(String, primary_key=True, default=generate_uuid)
    pipeline_run_id = Column(String, index=True)
    scanner = Column(String)
    status = Column(String)
    duration = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Deployment(Base):
    __tablename__ = "deployments"
    id = Column(String, primary_key=True, default=generate_uuid)
    revision_name = Column(String, index=True)
    service = Column(String)
    environment = Column(String, default="production")
    url = Column(String, nullable=True)
    status = Column(String, default="active")  # active, rolled_back, degraded
    commit_sha = Column(String, index=True)
    pipeline_run_id = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    duration = Column(Integer, nullable=True)

class Policy(Base):
    __tablename__ = "policies"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String)
    type = Column(String)
    rule_summary = Column(String)
    status = Column(String, default="active")  # active, paused
    enforcement_mode = Column(String, default="block")  # warn, block, report-only
    created_at = Column(DateTime, default=datetime.utcnow)

class PolicyViolation(Base):
    __tablename__ = "policy_violations"
    id = Column(String, primary_key=True, default=generate_uuid)
    policy_id = Column(String, index=True)
    pipeline_run_id = Column(String, index=True)
    violation_details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, index=True, default="default_user")
    type = Column(String)  # pipeline.failed, scan.critical, etc.
    severity = Column(String)  # warning, critical, info
    message = Column(Text)
    link = Column(String, nullable=True)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Event(Base):
    __tablename__ = "events"
    id = Column(String, primary_key=True, default=generate_uuid)
    type = Column(String)  # pipeline.started, scan.completed, etc.
    message = Column(Text)
    source_link = Column(String, nullable=True)
    severity = Column(String, default="info")
    event_version = Column(Integer, default=1)
    dedup_key = Column(String, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class MetricSnapshot(Base):
    __tablename__ = "metric_snapshots"
    id = Column(String, primary_key=True, default=generate_uuid)
    service = Column(String, index=True)
    metric = Column(String, index=True)
    value = Column(Float)
    ts = Column(DateTime, default=datetime.utcnow, index=True)