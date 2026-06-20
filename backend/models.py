from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, JSON, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class ScanResult(Base):
    """One row per security scan. This is the table the dashboard reads from."""

    __tablename__ = "scan_results"

    id = Column(Integer, primary_key=True, index=True)
    commit_sha = Column(String, index=True)
    commit_message = Column(Text, nullable=True)
    repo_name = Column(String)
    branch = Column(String)
    scan_type = Column(String)
    severity = Column(String)

    findings = Column(JSON)  # raw Trivy output, kept as-is for later reference

    ai_explanation = Column(Text, nullable=True)
    ai_fix = Column(Text, nullable=True)
    risk_score = Column(Integer, nullable=True)
    action_taken = Column(String, nullable=True)  # "ALLOW" or "BLOCK"

    ai_feedback = Column(String, nullable=True)       # accurate / incorrect / partial
    ai_feedback_note = Column(Text, nullable=True)    # optional free-text note

    created_at = Column(DateTime, default=datetime.utcnow)