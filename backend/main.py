import os
from datetime import datetime
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

from models import Base, ScanResult
from policy_engine import evaluate_policy, get_highest_cvss_score, get_highest_severity_label
from ai_analysis import analyze_scan, analyze_code_scan_failure
from slack_notifier import send_slack_alert

load_dotenv()

# DATABASE_URL comes from .env — keeps connection strings out of source control
# and makes it easy to swap between local Postgres and Cloud SQL without code changes
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

# Auto-create tables on startup — no manual migrations needed for dev/staging,
# and on Cloud Run this runs once per container cold start
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SecureFlow - AI-Powered Security Gate for CI/CD", version="1.0.0")

# CORS is locked to specific origins — the deployed Cloud Run frontend,
# the Vercel preview URL, and localhost for local dev.
# Wildcard CORS would be simpler but unacceptable for a security tool
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

# Prometheus metrics exposed at /metrics — plugs directly into the Grafana
# dashboard without any custom instrumentation code
Instrumentator().instrument(app).expose(app)


# ------ WebSocket connection manager ---------------------------------------------------------------
# WebSockets let the dashboard update in real time as pipeline stages complete,
# without the frontend needing to poll every few seconds
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"WebSocket connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        # Guard against double-disconnect — FastAPI can fire disconnect events
        # more than once in some edge cases
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"WebSocket disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        # Collect dead connections during broadcast rather than removing mid-loop,
        # which would mutate the list we're iterating over
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.disconnect(d)


manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # We don't actually process incoming messages — this just keeps
            # the connection alive by waiting for client pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


def get_db():
    # FastAPI dependency injection — yields a DB session per request
    # and guarantees it's closed even if the handler throws an exception
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "SecureFlow - AI-Powered Security Gate for CI/CD"}


@app.get("/health")
def health():
    # Simple health check for Cloud Run — GCP uses this to decide
    # whether to route traffic to this container instance
    return {"status": "healthy"}


@app.post("/api/scan-results/start")
async def start_scan_run(data: dict, db: Session = Depends(get_db)):
    # Called at the very beginning of the pipeline — creates a "running" record
    # so the dashboard shows the scan in progress before any results arrive
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

    # Push update to dashboard immediately so the "running" state shows up
    await manager.broadcast("update")

    return {"status": "started", "run_id": scan.id}


@app.patch("/api/scan-results/{run_id}/progress")
async def update_scan_progress(run_id: int, data: dict, db: Session = Depends(get_db)):
    scan = db.query(ScanResult).filter(ScanResult.id == run_id).first()
    if not scan:
        return {"error": "run not found"}

    # Merge new pipeline steps into existing ones — each scanner (Gitleaks,
    # Semgrep, Trivy) calls this independently as it completes, so we can't
    # just overwrite the whole pipeline_steps field each time
    existing_steps = dict(scan.pipeline_steps or {})
    existing_steps.update(data.get("pipeline_steps", {}))
    scan.pipeline_steps = existing_steps
    db.commit()

    # Push to dashboard after each step so users see Gitleaks → Semgrep → Trivy
    # complete in real time rather than waiting for the full pipeline to finish
    await manager.broadcast("update")

    return {"status": "progress updated", "run_id": run_id}


@app.get("/api/migrate")
def migrate(db: Session = Depends(get_db)):
    # One-off migration endpoint — used when adding new columns to an existing
    # Cloud SQL table without dropping and recreating it
    db.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS commit_message TEXT"))
    db.commit()
    return {"status": "migrated"}


@app.get("/api/backfill-severity")
def backfill_severity(db: Session = Depends(get_db)):
    # Utility endpoint to fix historical records that got saved with severity="unknown"
    # before the severity extraction logic was added — ran once, kept for safety
    scans = db.query(ScanResult).filter(ScanResult.severity == "unknown").all()
    updated = 0
    for scan in scans:
        if scan.findings:
            real_severity = get_highest_severity_label(scan.findings)
            scan.severity = real_severity
            updated += 1
    db.commit()
    return {"status": "done", "rows_updated": updated}


@app.get("/api/metrics")
def get_metrics(db: Session = Depends(get_db)):
    # Aggregated stats for the dashboard summary cards —
    # computed here rather than in the frontend to avoid sending 200 full scan
    # records to the browser just to count them
    scans = db.query(ScanResult).all()
    total = len(scans)

    blocked = len([s for s in scans if s.action_taken == "BLOCK"])
    allowed = len([s for s in scans if s.action_taken == "ALLOW"])
    critical = len([s for s in scans if s.severity == "CRITICAL"])

    avg_risk = round(sum(s.risk_score or 0 for s in scans) / total, 1) if total else 0
    block_rate = round(blocked / total * 100, 1) if total else 0

    return {
        "total_scans": total,
        "blocked": blocked,
        "allowed": allowed,
        "critical_cves": critical,
        "avg_risk_score": avg_risk,
        "block_rate_percent": block_rate,
    }


def extract_vulnerabilities(findings: dict) -> list[dict]:
    # Trivy returns a nested structure: Results[] → Vulnerabilities[]
    # This flattens it into a simple list the AI analysis function can consume
    vulnerabilities = []
    for result in findings.get("Results", []):
        for vuln in result.get("Vulnerabilities", []):
            vulnerabilities.append({
                "id": vuln.get("VulnerabilityID"),
                "package": vuln.get("PkgName"),
                "severity": vuln.get("Severity"),
                "score": get_highest_cvss_score(vuln),
                "fix": vuln.get("FixedVersion", "no fix available"),
                # Cap description at 300 chars — full CVE descriptions can be
                # thousands of chars and blow up the AI prompt token budget
                "description": vuln.get("Description", "")[:300],
            })
    return vulnerabilities


def build_allow_reason(policy_result: dict, vuln_count: int) -> str:
    # Builds a human-readable explanation for why a scan was ALLOWED despite
    # having vulnerabilities — important for audit trails and developer clarity
    allowlisted = policy_result.get("allowlisted", [])
    warned = policy_result.get("warned", [])
    blocked = policy_result.get("blocked", [])

    if vuln_count == 0:
        return ""

    parts = []

    if blocked:
        parts.append(f"{len(blocked)} blocking CVEs found")

    if allowlisted:
        # Show first 3 CVE IDs inline so the reason is immediately readable,
        # with a count for the rest rather than an overwhelming full list
        cve_list = ", ".join(a["cve"] for a in allowlisted[:3])
        suffix = f" (+{len(allowlisted)-3} more)" if len(allowlisted) > 3 else ""
        parts.append(f"{len(allowlisted)} CVE(s) are allowlisted in policy.yaml ({cve_list}{suffix}) - manually approved as known/acceptable")

    if warned:
        parts.append(f"{len(warned)} Medium/Low severity CVEs found - below the blocking threshold")

    if not parts and vuln_count > 0:
        parts.append(f"{vuln_count} CVEs found but none cross the block threshold")

    return " | ".join(parts) if parts else ""


@app.post("/api/scan-results")
async def receive_scan_results(data: dict, db: Session = Depends(get_db)):
    scan_type = data.get("scan_type", "trivy")
    repo_name = data.get("repo_name", "unknown")
    run_id = data.get("run_id")
    pipeline_steps = data.get("pipeline_steps", {})

    def save_scan(fields: dict):
        # If a run_id exists, update the existing "running" record created by
        # /start — this keeps the same DB row through the whole pipeline lifecycle
        # instead of creating duplicate records per scan stage
        if run_id:
            scan = db.query(ScanResult).filter(ScanResult.id == run_id).first()
            if scan:
                for key, value in fields.items():
                    setattr(scan, key, value)
                scan.status = "complete"
                # Merge steps rather than overwrite — same reason as /progress endpoint
                merged_steps = dict(scan.pipeline_steps or {})
                merged_steps.update(pipeline_steps)
                scan.pipeline_steps = merged_steps
                db.commit()
                db.refresh(scan)
                return scan

        # Fallback: create a new record if no run_id (e.g. direct API calls in tests)
        scan = ScanResult(**fields, pipeline_steps=pipeline_steps, status="complete")
        db.add(scan)
        db.commit()
        db.refresh(scan)
        return scan

    # --- Code scan path (Gitleaks / Semgrep result with no Trivy findings) ---
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

        await manager.broadcast("update")

        return {
            "status": "processed",
            "id": scan.id,
            "action": scan.action_taken,
            "reason": data.get("reason", ""),
        }

    findings = data.get("findings", {})
    explicit_action = data.get("action")

    # --- Explicit action path (pipeline sent BLOCK/ALLOW without Trivy findings) ---
    # This handles Gitleaks/Semgrep blocks that short-circuit before Trivy runs
    if explicit_action and not findings:
        ai_explanation = ""
        ai_fix = ""
        ai_urgency = ""
        risk_score = None

        if explicit_action == "BLOCK":
            # Determine which scanner blocked — used to tailor the AI explanation
            code_scan_detail = pipeline_steps.get("code_scan", {}).get("detail", "")
            scanner = "gitleaks" if "gitleaks" in data.get("reason", "").lower() else "semgrep"

            failure_info = {
                "scanner": scanner,
                "reason": data.get("reason", ""),
                "detail": code_scan_detail,
            }

            try:
                ai_result = analyze_code_scan_failure(failure_info)
                ai_explanation = ai_result.get("explanation", "")
                ai_fix = ai_result.get("fix", "")
                ai_urgency = ai_result.get("urgency", "")
                risk_score = ai_result.get("risk_score")
            except Exception as e:
                # AI failure should never prevent the block from being recorded —
                # security enforcement takes priority over AI insights
                print(f"AI analysis of code-scan failure errored: {e}")

        scan = save_scan({
            "commit_sha": data.get("commit_sha", "unknown"),
            "commit_message": data.get("commit_message", ""),
            "repo_name": repo_name,
            "branch": data.get("branch", "main"),
            "scan_type": scan_type,
            "severity": data.get("severity", "HIGH"),
            "findings": {},
            "ai_explanation": ai_explanation,
            "ai_fix": ai_fix,
            "risk_score": risk_score,
            "action_taken": explicit_action,
        })

        # Pass ai_explanation/ai_fix into slack_scan_data so the Slack notifier
        # can use them — this path has no per-CVE ai_results list since Trivy
        # never ran, so we inject the AI output manually
        try:
            slack_scan_data = {**data, "ai_explanation": ai_explanation, "ai_fix": ai_fix}
            send_slack_alert(slack_scan_data, [], explicit_action, data.get("reason", ""))
        except Exception as e:
            # Slack failure should never block the API response —
            # alerting is best-effort, not a hard dependency
            print(f"Slack alert failed (skipping): {e}")

        await manager.broadcast("update")

        return {
            "status": "processed",
            "id": scan.id,
            "action": explicit_action,
            "reason": data.get("reason", ""),
            "policy_used": "explicit-override",
            "blocked": [],
            "warned": [],
            "allowlisted": [],
            "ai_analysis": [{
                "explanation": ai_explanation,
                "fix": ai_fix,
                "urgency": ai_urgency,
                "risk_score": risk_score,
            }] if ai_explanation else [],
            "vuln_breakdown": {
                "base_image_count": 0, "fixable_count": 0, "app_count": 0,
                "total": 0, "fixable_details": [], "base_image_note": "",
            },
        }

    # --- Full Trivy scan path — evaluate policy then run AI analysis ---
    policy_result = evaluate_policy(findings, repo_name)
    vulnerabilities = extract_vulnerabilities(findings)
    vuln_count = len(vulnerabilities)

    ai_results = []
    if vulnerabilities:
        try:
            ai_results = analyze_scan(vulnerabilities)
        except Exception as e:
            # AI failure is non-fatal — policy decision has already been made,
            # we just won't have AI insights for this scan
            print(f"AI analysis failed (skipping): {e}")

    first_ai = ai_results[0] if ai_results else {}
    ai_explanation = first_ai.get("explanation", "")
    ai_fix = first_ai.get("fix", "")
    ai_urgency = first_ai.get("urgency", "")
    risk_score = first_ai.get("risk_score", None)

    # Only build allow_reason when the scan passed despite having vulns —
    # clean scans and blocked scans don't need this explanation
    allow_reason = ""
    if policy_result["action"] == "ALLOW" and vuln_count > 0:
        allow_reason = build_allow_reason(policy_result, vuln_count)

    scan = save_scan({
        "commit_sha": data.get("commit_sha", "unknown"),
        "commit_message": data.get("commit_message", ""),
        "repo_name": repo_name,
        "branch": data.get("branch", "main"),
        "scan_type": scan_type,
        "severity": policy_result["severity"],
        "findings": findings,
        "ai_explanation": ai_explanation,
        "ai_fix": ai_fix,
        "risk_score": risk_score,
        "action_taken": policy_result["action"],
    })

    try:
        send_slack_alert(data, ai_results, policy_result["action"], policy_result["reason"])
    except Exception as e:
        print(f"Slack alert failed (skipping): {e}")

    # Final broadcast — dashboard now shows the completed scan with full results
    await manager.broadcast("update")

    return {
        "status": "processed",
        "id": scan.id,
        "action": policy_result["action"],
        "reason": policy_result["reason"],
        "allow_reason": allow_reason,
        "policy_used": policy_result["policy_used"],
        "blocked": policy_result["blocked"],
        "warned": policy_result["warned"],
        "allowlisted": policy_result["allowlisted"],
        "ai_analysis": ai_results,
        "ai_urgency": ai_urgency,
    }


@app.post("/api/scan-results/{scan_id}/feedback")
def submit_feedback(scan_id: int, feedback: dict, db: Session = Depends(get_db)):
    # Lets developers flag whether the AI analysis was accurate —
    # useful for measuring AI quality over time and catching bad outputs
    scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
    if not scan:
        return {"error": "scan not found"}

    scan.ai_feedback = feedback.get("feedback")
    db.commit()
    return {"status": "feedback saved", "scan_id": scan_id}


@app.get("/api/scan-results")
def get_scan_results(db: Session = Depends(get_db)):
    # Limit to 200 most recent — the full table can grow large over time,
    # and the dashboard doesn't need more than that for the history view
    rows = (
        db.query(ScanResult)
        .order_by(ScanResult.created_at.desc())
        .limit(200)
        .all()
    )
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
            "ai_feedback": r.ai_feedback,
            "ai_feedback_note": r.ai_feedback_note,
            "pipeline_steps": r.pipeline_steps,
            "status": r.status,
            "started_at": r.started_at,
            "created_at": r.created_at,
        }
        for r in rows
    ]