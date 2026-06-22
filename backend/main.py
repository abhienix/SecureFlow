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
from claude_client import analyze_scan, analyze_code_scan_failure
from slack_notifier import send_slack_alert

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/secureflow")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SecureFlow — AI-Powered Security Gate for CI/CD", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://secureflow-frontend-1083585992526.us-central1.run.app",
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


@app.get("/")
def root():
    return {"message": "SecureFlow — AI-Powered Security Gate for CI/CD"}


@app.get("/health")
def health():
    return {"status": "healthy"}


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


@app.get("/api/migrate")
def migrate(db: Session = Depends(get_db)):
    db.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS commit_message TEXT"))
    db.commit()
    return {"status": "migrated"}


@app.get("/api/backfill-severity")
def backfill_severity(db: Session = Depends(get_db)):
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
    vulnerabilities = []
    for result in findings.get("Results", []):
        for vuln in result.get("Vulnerabilities", []):
            vulnerabilities.append({
                "id": vuln.get("VulnerabilityID"),
                "package": vuln.get("PkgName"),
                "severity": vuln.get("Severity"),
                "score": get_highest_cvss_score(vuln),
                "fix": vuln.get("FixedVersion", "no fix available"),
                "description": vuln.get("Description", "")[:300],
            })
    return vulnerabilities


@app.post("/api/scan-results")
def receive_scan_results(data: dict, db: Session = Depends(get_db)):
    scan_type = data.get("scan_type", "trivy")
    repo_name = data.get("repo_name", "unknown")
    run_id = data.get("run_id")  # set if /api/scan-results/start was called first
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

        scan = ScanResult(**fields, pipeline_steps=pipeline_steps, status="complete")
        db.add(scan)
        db.commit()
        db.refresh(scan)
        return scan

    # Code scans (Gitleaks + Semgrep) send severity and action directly
    # — no image findings to parse, no policy engine needed
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

    # Image scans (Trivy) — run through policy engine as before
    findings = data.get("findings", {})
    explicit_action = data.get("action")  # set directly by callers like the
    # code-scan-failure step, which already knows the verdict (BLOCK) and
    # isn't sending real findings for the policy engine to evaluate.
    # NOTE: every workflow step currently sends scan_type="full-pipeline",
    # so the scan_type=="code-scan" branch above never actually runs — this
    # explicit_action check is what makes BLOCK calls from Gitleaks/Semgrep
    # failures actually take effect instead of being silently overwritten
    # by the policy engine's "no findings = ALLOW" default.

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

    first_ai_result = ai_results[0] if ai_results else {}
    ai_explanation = first_ai_result.get("explanation", "")
    ai_fix = first_ai_result.get("fix", "")
    risk_score = first_ai_result.get("risk_score", None)

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


@app.post("/api/scan-results/{scan_id}/feedback")
def submit_feedback(scan_id: int, feedback: dict, db: Session = Depends(get_db)):
    scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
    if not scan:
        return {"error": "scan not found"}

    scan.ai_feedback = feedback.get("feedback")
    db.commit()
    return {"status": "feedback saved", "scan_id": scan_id}


@app.get("/api/scan-results")
def get_scan_results(db: Session = Depends(get_db)):
    return db.query(ScanResult).order_by(ScanResult.created_at.desc()).all()