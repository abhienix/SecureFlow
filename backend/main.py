import os
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, Depends
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

# Create all tables on startup if they don't already exist
Base.metadata.create_all(bind=engine)

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

# Expose /metrics endpoint for Prometheus scraping
Instrumentator().instrument(app).expose(app)


def get_db():
    """Dependency that yields a DB session and closes it after the request."""
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
    """Health check — also accepts HEAD so UptimeRobot doesn't get 405s."""
    return {"status": "healthy"}


# ---------------------------------------------------------------------------
# Pipeline lifecycle endpoints
# ---------------------------------------------------------------------------

@app.post("/api/scan-results/start")
def start_scan_run(data: dict, db: Session = Depends(get_db)):
    """
    Called once, right after checkout, before any scanning happens.
    Creates a placeholder row with status="running" so the dashboard can
    show this commit moving through the pipeline in real time, instead of
    only ever seeing finished results once everything is already done.

    Returns the row id — the workflow passes this back as run_id on later
    calls to /api/scan-results so we update this same row instead of
    creating a duplicate.
    """
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

    return {"status": "started", "run_id": scan.id}


@app.patch("/api/scan-results/{run_id}/progress")
def update_scan_progress(run_id: int, data: dict, db: Session = Depends(get_db)):
    """
    Called after each stage finishes (code scan, image build, Trivy scan)
    so the running row's pipeline_steps fills in live instead of arriving
    all at once at the end. Merges into whatever pipeline_steps already
    exist rather than overwriting them.
    """
    scan = db.query(ScanResult).filter(ScanResult.id == run_id).first()
    if not scan:
        return {"error": "run not found"}

    existing_steps = dict(scan.pipeline_steps or {})
    existing_steps.update(data.get("pipeline_steps", {}))
    scan.pipeline_steps = existing_steps
    db.commit()

    return {"status": "progress updated", "run_id": run_id}


# ---------------------------------------------------------------------------
# Admin / maintenance routes
# ---------------------------------------------------------------------------

@app.get("/api/migrate")
def migrate(db: Session = Depends(get_db)):
    """One-shot migration to add commit_message column if it's missing."""
    db.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS commit_message TEXT"))
    db.commit()
    return {"status": "migrated"}


@app.get("/api/backfill-severity")
def backfill_severity(db: Session = Depends(get_db)):
    """
    Retroactively set severity on rows that were saved with 'unknown'.
    Useful after a bug fix or policy change that affects severity labeling.
    """
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
    """Aggregate metrics for the dashboard summary cards."""
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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def extract_vulnerabilities(findings: dict) -> list[dict]:
    """
    Flatten Trivy's nested Results -> Vulnerabilities structure into a
    simple list of dicts that the AI analysis functions expect.
    """
    vulnerabilities = []
    for result in findings.get("Results", []):
        for vuln in result.get("Vulnerabilities", []):
            vulnerabilities.append({
                "id": vuln.get("VulnerabilityID"),
                "package": vuln.get("PkgName"),
                "severity": vuln.get("Severity"),
                "score": get_highest_cvss_score(vuln),
                "fix": vuln.get("FixedVersion", "no fix available"),
                # Cap description at 300 chars — enough context for the AI
                # without blowing up the prompt size
                "description": vuln.get("Description", "")[:300],
            })
    return vulnerabilities


# ---------------------------------------------------------------------------
# Main scan ingestion endpoint
# ---------------------------------------------------------------------------

@app.post("/api/scan-results")
def receive_scan_results(data: dict, db: Session = Depends(get_db)):
    scan_type = data.get("scan_type", "trivy")
    repo_name = data.get("repo_name", "unknown")
    # run_id is set if /api/scan-results/start was called first — lets us
    # update the existing "running" row instead of creating a duplicate
    run_id = data.get("run_id")
    pipeline_steps = data.get("pipeline_steps", {})

    def save_scan(fields: dict):
        """
        If run_id points at an existing "running" row, update it in place
        (this is the normal path now — start() created the row, this call
        finishes it). Otherwise insert a new row, which keeps older workflow
        runs that never called /start working exactly as before.
        """
        if run_id:
            scan = db.query(ScanResult).filter(ScanResult.id == run_id).first()
            if scan:
                for key, value in fields.items():
                    setattr(scan, key, value)
                scan.status = "complete"
                # Build a brand new dict rather than mutating scan.pipeline_steps
                # in place. SQLAlchemy only detects column changes on
                # reassignment to a new object — mutating the existing dict
                # and reassigning the same object back does NOT mark it
                # dirty, so the update would silently fail to persist.
                merged_steps = dict(scan.pipeline_steps or {})
                merged_steps.update(pipeline_steps)
                scan.pipeline_steps = merged_steps
                db.commit()
                db.refresh(scan)
                return scan

        # No run_id or row not found — insert fresh
        scan = ScanResult(**fields, pipeline_steps=pipeline_steps, status="complete")
        db.add(scan)
        db.commit()
        db.refresh(scan)
        return scan

    # ------------------------------------------------------------------
    # Code scans (Gitleaks + Semgrep)
    # ------------------------------------------------------------------
    # These send severity and action directly — no image findings to parse,
    # no policy engine needed.
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

        print(f"code-scan recorded: {scan.action_taken} — {data.get('reason', '')}")

        return {
            "status": "processed",
            "id": scan.id,
            "action": scan.action_taken,
            "reason": data.get("reason", ""),
        }

    # ------------------------------------------------------------------
    # Explicit action override (e.g. BLOCK from code-scan-failure step)
    # ------------------------------------------------------------------
    # Some callers already know the verdict (BLOCK) and aren't sending real
    # findings for the policy engine to evaluate. Honor that directly.
    # NOTE: every workflow step currently sends scan_type="full-pipeline",
    # so the scan_type=="code-scan" branch above never actually runs — this
    # explicit_action check is what makes BLOCK calls from Gitleaks/Semgrep
    # failures actually take effect instead of being silently overwritten
    # by the policy engine's "no findings = ALLOW" default.
    findings = data.get("findings", {})
    explicit_action = data.get("action")

    if explicit_action and not findings:
        ai_explanation = ""
        ai_fix = ""
        risk_score = None

        # Only worth calling the AI when something actually failed — an
        # explicit ALLOW (e.g. "no image changes") has nothing to explain.
        if explicit_action == "BLOCK":
            code_scan_detail = pipeline_steps.get("code_scan", {}).get("detail", "")
            failure_info = {
                "scanner": "gitleaks/semgrep",
                "reason": data.get("reason", ""),
                "detail": code_scan_detail,
            }
            try:
                ai_result = analyze_code_scan_failure(failure_info)
                ai_explanation = ai_result.get("explanation", "")
                ai_fix = ai_result.get("fix", "")
                risk_score = ai_result.get("risk_score")
            except Exception as e:
                print(f"AI analysis of code-scan failure errored unexpectedly: {e}")

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

        print(f"explicit action honored: {explicit_action} — {data.get('reason', '')}")

        return {
            "status": "processed",
            "id": scan.id,
            "action": explicit_action,
            "reason": data.get("reason", ""),
            "policy_used": "explicit-override",
            "blocked": [],
            "warned": [],
            "allowlisted": [],
            "ai_analysis": [{"explanation": ai_explanation, "fix": ai_fix, "risk_score": risk_score}] if ai_explanation else [],
            "vuln_breakdown": {
                "base_image_count": 0, "fixable_count": 0, "app_count": 0,
                "total": 0, "fixable_details": [], "base_image_note": "",
            },
        }

    # ------------------------------------------------------------------
    # Image scans (Trivy) — run through policy engine
    # ------------------------------------------------------------------
    policy_result = evaluate_policy(findings, repo_name)
    vulnerabilities = extract_vulnerabilities(findings)

    print(f"policy result: {policy_result['action']} — {policy_result['reason']}")
    print(f"vulnerabilities extracted: {len(vulnerabilities)}")

    ai_results = []
    if vulnerabilities:
        try:
            ai_results = analyze_scan(vulnerabilities)
        except Exception as e:
            print(f"AI analysis failed (skipping): {e}")

    first_ai = ai_results[0] if ai_results else {}
    ai_explanation = first_ai.get("explanation", "")
    ai_fix = first_ai.get("fix", "")
    risk_score = first_ai.get("risk_score", None)

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

    # Slack alert is best-effort — don't let a Slack outage block the response
    try:
        send_slack_alert(data, ai_results, policy_result["action"], policy_result["reason"])
    except Exception as e:
        print(f"Slack alert failed (skipping): {e}")

    return {
        "status": "processed",
        "id": scan.id,
        "action": policy_result["action"],
        "reason": policy_result["reason"],
        "policy_used": policy_result["policy_used"],
        "blocked": policy_result["blocked"],
        "warned": policy_result["warned"],
        "allowlisted": policy_result["allowlisted"],
        "ai_analysis": ai_results,
    }


# ---------------------------------------------------------------------------
# Feedback endpoint
# ---------------------------------------------------------------------------

@app.post("/api/scan-results/{scan_id}/feedback")
def submit_feedback(scan_id: int, feedback: dict, db: Session = Depends(get_db)):
    """Let the dashboard record whether AI analysis was accurate or not."""
    scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
    if not scan:
        return {"error": "scan not found"}

    scan.ai_feedback = feedback.get("feedback")
    db.commit()
    return {"status": "feedback saved", "scan_id": scan_id}


# ---------------------------------------------------------------------------
# Dashboard read endpoint
# ---------------------------------------------------------------------------

@app.get("/api/scan-results")
def get_scan_results(db: Session = Depends(get_db)):
    """
    Returns the 200 most recent scans, intentionally excluding the raw
    findings blob. findings holds the full Trivy scan output which can be
    hundreds of KB per row — the frontend never reads it, so sending it
    on every poll (every 4 seconds) was causing Cloud Run response size
    rejections even at low row counts.
    """
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
            "pipeline": r.pipeline_steps,
            "author": None,
            "ai_confidence": min(99, max(60, int(r.risk_score * 10))) if r.risk_score else None,
            "duration_ms": int((r.created_at - (r.started_at or r.created_at)).total_seconds() * 1000) if r.started_at and r.created_at else None,
            "status": r.status,
            "started_at": r.started_at,
            "created_at": r.created_at,
        }
        for r in rows
    ]
# pipeline test trigger 2026-06-25 16:02
