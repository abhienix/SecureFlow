from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, JSON, Text, Index
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