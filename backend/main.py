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

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

Base.metadata.create_all(bind=engine)

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
    show this commit moving through the pipeline in real time.
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
    Called after each stage finishes so the running row's pipeline_steps
    fills in live instead of arriving all at once at the end.
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


def build_allow_reason(policy_result: dict, vuln_count: int) -> str:
    """
    When a scan has HIGH/CRITICAL vulns but is still ALLOWED, the dashboard
    needs to explain WHY — otherwise it just looks wrong. This builds that
    explanation from the actual policy decision data.
    """
    allowlisted = policy_result.get("allowlisted", [])
    warned = policy_result.get("warned", [])
    blocked = policy_result.get("blocked", [])

    if vuln_count == 0:
        return ""

    parts = []

    if blocked:
        # This shouldn't happen (blocked vulns = BLOCK action) but just in case
        parts.append(f"{len(blocked)} blocking CVEs found")

    if allowlisted:
        cve_list = ", ".join(a["cve"] for a in allowlisted[:3])
        suffix = f" (+{len(allowlisted)-3} more)" if len(allowlisted) > 3 else ""
        parts.append(f"{len(allowlisted)} CVE(s) are allowlisted in policy.yaml ({cve_list}{suffix}) — manually approved as known/acceptable")

    if warned:
        parts.append(f"{len(warned)} Medium/Low severity CVEs found — below the blocking threshold")

    if not parts and vuln_count > 0:
        parts.append(f"{vuln_count} CVEs found but none cross the block threshold (CRITICAL/HIGH with CVSS ≥ 7.0)")

    return " · ".join(parts) if parts else ""


@app.post("/api/scan-results")
def receive_scan_results(data: dict, db: Session = Depends(get_db)):
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

    # Code scans (Gitleaks + Semgrep) — no image findings, no policy engine
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

    # Image scans (Trivy) — run through policy engine
    findings = data.get("findings", {})
    explicit_action = data.get("action")

    if explicit_action and not findings:
        ai_explanation = ""
        ai_fix = ""
        ai_urgency = ""
        risk_score = None

        if explicit_action == "BLOCK":
            # Pull the richest detail available — the workflow now sends
            # file:line:rule from the actual scanner finding, not just a
            # generic "semgrep=failure" string.
            code_scan_detail = pipeline_steps.get("code_scan", {}).get("detail", "")
            scanner = "gitleaks" if "gitleaks" in data.get("reason", "").lower() else "semgrep"

            failure_info = {
                "scanner": scanner,
                "reason": data.get("reason", ""),
                # This is now the real finding: "Rule: detected-username-and-password-in-uri | File: fix_prod.py:3 | Username and password in URI detected"
                "detail": code_scan_detail,
            }

            print(f"AI analyzing code-scan failure: {failure_info}")

            try:
                ai_result = analyze_code_scan_failure(failure_info)
                ai_explanation = ai_result.get("explanation", "")
                ai_fix = ai_result.get("fix", "")
                ai_urgency = ai_result.get("urgency", "")
                risk_score = ai_result.get("risk_score")
            except Exception as e:
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

    # Full Trivy scan path
    policy_result = evaluate_policy(findings, repo_name)
    vulnerabilities = extract_vulnerabilities(findings)
    vuln_count = len(vulnerabilities)

    print(f"policy result: {policy_result['action']} — {policy_result['reason']}")
    print(f"vulnerabilities extracted: {vuln_count}")

    ai_results = []
    if vulnerabilities:
        try:
            ai_results = analyze_scan(vulnerabilities)
        except Exception as e:
            print(f"AI analysis failed (skipping): {e}")

    first_ai = ai_results[0] if ai_results else {}
    ai_explanation = first_ai.get("explanation", "")
    ai_fix = first_ai.get("fix", "")
    ai_urgency = first_ai.get("urgency", "")
    risk_score = first_ai.get("risk_score", None)

    # Build the "why was this ALLOWED despite high risk" explanation
    # so the dashboard card doesn't look confusing
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

    return {
        "status": "processed",
        "id": scan.id,
        "action": policy_result["action"],
        "reason": policy_result["reason"],
        "allow_reason": allow_reason,  # NEW — explains WHY high-risk was allowed
        "policy_used": policy_result["policy_used"],
        "blocked": policy_result["blocked"],
        "warned": policy_result["warned"],
        "allowlisted": policy_result["allowlisted"],
        "ai_analysis": ai_results,
        "ai_urgency": ai_urgency,
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