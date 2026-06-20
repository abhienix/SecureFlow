from sqlalchemy import Column, Integer, String, DateTime, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
Base = declarative_base()
class ScanResult(Base):
    __tablename__ = "scan_results"
    id = Column(Integer, primary_key=True, index=True)
    commit_sha = Column(String, index=True)
    commit_message = Column(Text, nullable=True)
    repo_name = Column(String)
    branch = Column(String)
    scan_type = Column(String)
    severity = Column(String)
    findings = Column(JSON)
    ai_explanation = Column(Text, nullable=True)
    ai_fix = Column(Text, nullable=True)
    risk_score = Column(Integer, nullable=True)
    action_taken = Column(String, nullable=True)
    ai_feedback = Column(String, nullable=True)
    ai_feedback_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)