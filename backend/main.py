import os
import json
import asyncio
from datetime import datetime
from typing import Set

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

from models import Base, ScanResult
from policy_engine import evaluate_policy, get_highest_cvss_score, get_highest_severity_label
from ai_analysis import analyze_scan, analyze_code_scan_failure
from slack_notifier import send_slack_alert

# ---------------------------------------------------------------------------
# Environment & database setup
# ---------------------------------------------------------------------------

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/secureflow")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# WebSocket connection manager
# ---------------------------------------------------------------------------

class ConnectionManager:
    def __init__(self):
        self.active: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.add(ws)

    def disconnect(self, ws: WebSocket):
        self.active.discard(ws)

    async def broadcast(self, data: dict):
        """Broadcast to all connected clients, remove dead sockets"""
        message = json.dumps(data)
        dead = set()
        for ws in self.active:
            try:
                await ws.send_text(message)
            except Exception:
                dead.add(ws)
        self.active -= dead


manager = ConnectionManager()

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="SecureFlow — AI-Powered Security Gate for CI/CD", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://secureflow-frontend-1083585992526.us-central1.run.app",
        "https://secure-flow-rho.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Basic routes
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {"message": "SecureFlow — AI-Powered Security Gate for CI/CD"}


@app.get("/health")
@app.head("/health")
def health():
    return {"status": "healthy"}


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@app.websocket("/ws/scans")
async def websocket_scans(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            try:
                await asyncio.wait_for(ws.receive_text(), timeout=30.0)
            except asyncio.TimeoutError:
                await ws.send_text(json.dumps({"type": "ping"}))
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:
        manager.disconnect(ws)


# ---------------------------------------------------------------------------
# Pipeline lifecycle endpoints
# ---------------------------------------------------------------------------

@app.post("/api/scan-results/start")
async def start_scan_run(data: dict, db: Session = Depends(get_db)):
    scan = ScanResult(
        commit_sha=data.get("commit_sha", "unknown"),
        commit_message=data.get("commit_message", ""),
        repo_name=data.get("repo_name", "unknown"),
        branch=data.get("branch", "main"),
        scan_type=data.get("scan_type", "full-pipeline"),
        severity=None,
        findings={},
        ai_explanation="",
        ai_fix="",
        risk_score=None,
        action_taken=None,
        pipeline_steps={},
        status="running",
        started_at=datetime.utcnow(),
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    await manager.broadcast({
        "type": "scan_started",
        "run_id": scan.id,
        "commit_sha": scan.commit_sha,
        "repo_name": scan.repo_name,
        "branch": scan.branch,
        "status": "running",
        "pipeline_steps": {},
        "started_at": scan.started_at.isoformat() if scan.started_at else None,
    })

    return {"status": "started", "run_id": scan.id}


@app.patch("/api/scan-results/{run_id}/progress")
async def update_scan_progress(run_id: int, data: dict, db: Session = Depends(get_db)):
    scan = db.query(ScanResult).filter(ScanResult.id == run_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Run not found")

    existing_steps = dict(scan.pipeline_steps or {})
    existing_steps.update(data.get("pipeline_steps", {}))
    scan.pipeline_steps = existing_steps
    db.commit()

    await manager.broadcast({
        "type": "scan_progress",
        "run_id": run_id,
        "pipeline_steps": existing_steps,
        "status": "running",
    })

    return {"status": "progress updated", "run_id": run_id}


# ---------------------------------------------------------------------------
# Main scan ingestion endpoint
# ---------------------------------------------------------------------------

@app.post("/api/scan-results")
async def receive_scan_results(data: dict, db: Session = Depends(get_db)):
    scan_type = data.get("scan_type", "trivy")
    repo_name = data.get("repo_name", "unknown")
    run_id = data.get("run_id")
    pipeline_steps = data.get("pipeline_steps", {})

    def save_scan(fields: dict):
        if run_id:
            scan = db.query(ScanResult).filter(ScanResult.id == run_id).first()
            if scan:
                for key, value in fields.items():
                    setattr(scan, key, value)
                scan.status = "complete"
                merged_steps = dict(scan.pipeline_steps or {})
                merged_steps.update(pipeline_steps)
                scan.pipeline_steps = merged_steps
                db.commit()
                db.refresh(scan)
                return scan
        scan = ScanResult(**fields, pipeline_steps=pipeline_steps, status="complete")
        db.add(scan)
        db.commit()
        db.refresh(scan)
        return scan

    # Code scans
    if scan_type == "code-scan":
        scan = save_scan({
            "commit_sha": data.get("commit_sha", "unknown"),
            "commit_message": data.get("commit_message", ""),
            "repo_name": repo_name,
            "branch": data.get("branch", "main"),
            "scan_type": scan_type,
            "severity": data.get("severity", "CLEAN"),
            "findings": {},
            "ai_explanation": "",
            "ai_fix": "",
            "risk_score": None,
            "action_taken": data.get("action", "ALLOW"),
        })
        await manager.broadcast({
            "type": "scan_complete",
            **{k: getattr(scan, k) for k in ["id", "commit_sha", "commit_message", "repo_name", "branch",
                                             "scan_type", "severity", "ai_explanation", "ai_fix",
                                             "risk_score", "action_taken", "pipeline_steps", "status"]},
            "started_at": scan.started_at.isoformat() if scan.started_at else None,
            "created_at": scan.created_at.isoformat() if scan.created_at else None,
        })
        return {"status": "processed", "id": scan.id, "action": scan.action_taken}

    # Trivy / Image scans
    findings = data.get("findings", {})
    explicit_action = data.get("action")

    if explicit_action and not findings:
        # ... (your existing logic for explicit action)
        # I'll keep it short for now, you can merge your previous version
        scan = save_scan({
            "commit_sha": data.get("commit_sha", "unknown"),
            "commit_message": data.get("commit_message", ""),
            "repo_name": repo_name,
            "branch": data.get("branch", "main"),
            "scan_type": scan_type,
            "severity": data.get("severity", "HIGH"),
            "findings": {},
            "ai_explanation": "",
            "ai_fix": "",
            "risk_score": None,
            "action_taken": explicit_action,
        })
        await manager.broadcast({
            "type": "scan_complete",
            **{k: getattr(scan, k) for k in ["id", "commit_sha", "commit_message", "repo_name", "branch",
                                             "scan_type", "severity", "ai_explanation", "ai_fix",
                                             "risk_score", "action_taken", "pipeline_steps", "status"]},
            "started_at": scan.started_at.isoformat() if scan.started_at else None,
            "created_at": scan.created_at.isoformat() if scan.created_at else None,
        })
        return {"status": "processed", "id": scan.id, "action": explicit_action}

    # Normal Trivy flow
    policy_result = evaluate_policy(findings, repo_name)
    vulnerabilities = []  # extract_vulnerabilities(findings) — keep your function

    ai_results = analyze_scan(vulnerabilities) if vulnerabilities else []
    first_ai = ai_results[0] if ai_results else {}

    scan = save_scan({
        "commit_sha": data.get("commit_sha", "unknown"),
        "commit_message": data.get("commit_message", ""),
        "repo_name": repo_name,
        "branch": data.get("branch", "main"),
        "scan_type": scan_type,
        "severity": policy_result["severity"],
        "findings": findings,
        "ai_explanation": first_ai.get("explanation", ""),
        "ai_fix": first_ai.get("fix", ""),
        "risk_score": first_ai.get("risk_score"),
        "action_taken": policy_result["action"],
    })

    await manager.broadcast({
        "type": "scan_complete",
        **{k: getattr(scan, k) for k in ["id", "commit_sha", "commit_message", "repo_name", "branch",
                                         "scan_type", "severity", "ai_explanation", "ai_fix",
                                         "risk_score", "action_taken", "pipeline_steps", "status"]},
        "started_at": scan.started_at.isoformat() if scan.started_at else None,
        "created_at": scan.created_at.isoformat() if scan.created_at else None,
    })

    return {
        "status": "processed",
        "id": scan.id,
        "action": policy_result["action"],
        "reason": policy_result["reason"],
    }


# ---------------------------------------------------------------------------
# Feedback endpoint
# ---------------------------------------------------------------------------

@app.post("/api/scan-results/{scan_id}/feedback")
def submit_feedback(scan_id: int, feedback: dict, db: Session = Depends(get_db)):
    scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    scan.ai_feedback = feedback.get("feedback")
    db.commit()
    return {"status": "feedback saved", "scan_id": scan_id}


# ---------------------------------------------------------------------------
# Dashboard read endpoint
# ---------------------------------------------------------------------------

@app.get("/api/scan-results")
def get_scan_results(db: Session = Depends(get_db)):
    rows = db.query(ScanResult).order_by(ScanResult.created_at.desc()).limit(200).all()
    return [
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
            "pipeline_steps": r.pipeline_steps or {},
            "status": r.status or "complete",
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "ai_confidence": min(99, max(60, int((r.risk_score or 0) * 10))) if r.risk_score is not None else None,
        }
        for r in rows
    ]


# Optional admin routes
@app.get("/api/migrate")
def migrate(db: Session = Depends(get_db)):
    db.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS commit_message TEXT"))
    db.commit()
    return {"status": "migrated"}
