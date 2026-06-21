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
from claude_client import analyze_scan, analyze_code_scan
from slack_notifier import send_slack_alert

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/secureflow")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SecureFlow - AI-Powered Security Gate for CI/CD", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://secureflow-frontend-1083585992526.us-central1.run.app",
        "https://secure-flow-rho.vercel.app",
    ],
    allow_credentials=True,
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
    return {"message": "SecureFlow - AI-Powered Security Gate for CI/CD"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/api/scan-results/start")
def start_scan_run(data: dict, db: Session = Depends(get_db)):
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
    scan = db.query(ScanResult).filter(ScanResult.id == run_id).first()
    if not scan:
        return {"error": "run not found"}

    existing_steps = dict(scan.pipeline_steps or {})
    existing_steps.update(data.get("pipeline_steps", {}))
    scan.pipeline_steps = existing_steps
    db.commit()
    return {"status": "progress updated", "run_id": run_id}


# Problem 5 — fix stuck running scans
@app.post("/api/scan-results/{run_id}/cancel")
def cancel_stuck_scan(run_id: int, db: Session = Depends(get_db)):
    scan = db.query(ScanResult).filter(ScanResult.id == run_id).first()
    if not scan:
        return {"error": "run not found"}
    scan.status = "complete"
    scan.action_taken = scan.action_taken or "CANCELLED"
    scan.severity = scan.severity or "UNKNOWN"
    db.commit()
    return {"status": "cancelled", "run_id": run_id}


@app.get("/api/migrate")
def migrate(db: Session = Depends(get_db)):
    db.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS commit_message TEXT"))  # nosemgrep
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


def build_vuln_breakdown(vulnerabilities: list[dict]) -> dict:
    """
    Problem 7 — split vulns into base-image noise vs real fixable issues.
    Returns a breakdown dict saved alongside the scan and sent to the frontend.
    """
    base_image_packages = {
        "libc-bin", "libc6", "libgcc-s1", "libssl3", "libssl1.1",
        "openssl", "libcurl4", "curl", "libsystemd0", "libudev1",
        "perl", "perl-base", "tar", "coreutils", "bash", "login",
        "libpam-modules", "libpam-runtime", "passwd", "util-linux",
        "mount", "fdisk", "e2fsprogs", "libext2fs2", "libcom-err2",
        "libss2", "logsave", "libblkid1", "libmount1", "libsmartcols1",
        "libuuid1", "zlib1g", "libzstd1", "liblzma5", "libbz2-1.0",
        "libpcre2-8-0", "libpcre3", "libgmp10", "libgnutls30",
        "libhogweed6", "libnettle8", "libp11-kit0", "libtasn1-6",
        "libffi8", "libgdbm6", "libgdbm-compat4", "libdb5.3",
        "libexpat1", "libsqlite3-0", "libreadline8", "readline-common",
        "tzdata", "debconf", "dpkg", "apt", "gpgv", "gnupg-l10n",
    }

    base_cves = []
    fixable = []
    app_cves = []

    for v in vulnerabilities:
        pkg = (v.get("package") or "").lower()
        fix = v.get("fix") or "no fix available"
        has_fix = fix and fix != "no fix available"

        if pkg in base_image_packages:
            base_cves.append(v)
        elif has_fix:
            fixable.append(v)
        else:
            app_cves.append(v)

    return {
        "base_image_count": len(base_cves),
        "fixable_count": len(fixable),
        "app_count": len(app_cves),
        "total": len(vulnerabilities),
        "fixable_details": [
            {
                "id": v["id"],
                "package": v["package"],
                "severity": v["severity"],
                "fix": v["fix"],
            }
            for v in sorted(fixable, key=lambda x: x.get("score") or 0, reverse=True)[:5]
        ],
        "base_image_note": (
            f"{len(base_cves)} CVEs are from the Debian base layer of the Docker image "
            f"(python:3.11). These are not in your code. "
            f"Remedy: switch to python:3.11-slim to reduce this by ~80%."
            if base_cves else ""
        ),
    }


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

    # ── CODE SCAN (Gitleaks / Semgrep) ──────────────────────────────────────
    if scan_type == "code-scan":
        action = data.get("action", "ALLOW")
        reason = data.get("reason", "")

        ai_explanation = ""
        ai_fix = ""
        ai_risk_score = None

        # Problem 2 — AI always runs on code-scan, not just on BLOCK
        try:
            code_ai = analyze_code_scan(reason)
            ai_explanation = code_ai.get("explanation", "")
            ai_fix = code_ai.get("fix", "")
            ai_risk_score = code_ai.get("risk_score", None)
        except Exception as e:
            print(f"Code scan AI failed: {e}")
            if action == "BLOCK":
                ai_explanation = (
                    f"Code scan was blocked. Reason: {reason}. "
                    "Check the Gitleaks/Semgrep output above for the exact secret or pattern that triggered this."
                )

        # Problem 1 — if ALLOW, severity is CLEAN regardless of anything
        display_severity = "CLEAN" if action == "ALLOW" else data.get("severity", "HIGH")

        scan = save_scan({
            "commit_sha": data.get("commit_sha", "unknown"),
            "commit_message": data.get("commit_message", ""),
            "repo_name": repo_name,
            "branch": data.get("branch", "main"),
            "scan_type": scan_type,
            "severity": display_severity,
            "findings": {},
            "ai_explanation": ai_explanation,
            "ai_fix": ai_fix,
            "risk_score": ai_risk_score,
            "action_taken": action,
        })

        print(f"code-scan recorded: {scan.action_taken} - {reason}")

        return {
            "status": "processed",
            "id": scan.id,
            "action": scan.action_taken,
            "reason": reason,
        }

    # ── TRIVY SCAN ───────────────────────────────────────────────────────────
    findings = data.get("findings", {})
    policy_result = evaluate_policy(findings, repo_name)
    vulnerabilities = extract_vulnerabilities(findings)

    print(f"policy result: {policy_result['action']} - {policy_result['reason']}")
    print(f"vulnerabilities extracted: {len(vulnerabilities)}")

    # Problem 7 — build breakdown before AI so AI can reference it
    vuln_breakdown = build_vuln_breakdown(vulnerabilities)

    ai_results = []
    if vulnerabilities:
        try:
            ai_results = analyze_scan(vulnerabilities, vuln_breakdown)
        except Exception as e:
            print(f"AI analysis failed (skipping): {e}")

    first_ai_result = ai_results[0] if ai_results else {}
    ai_explanation = first_ai_result.get("explanation", "")
    ai_fix = first_ai_result.get("fix", "")
    risk_score = first_ai_result.get("risk_score", None)

    # Problem 1 — AI decides the display severity, not raw Trivy
    # If policy ALLOWs, never show CRITICAL — cap at AI-decided level
    ai_severity = first_ai_result.get("severity", None)
    if policy_result["action"] == "ALLOW":
        # Trust AI severity; fall back to MEDIUM max if AI didn't decide
        display_severity = ai_severity if ai_severity else "MEDIUM"
        # Never show CRITICAL when action is ALLOW
        if display_severity == "CRITICAL":
            display_severity = "HIGH"
    else:
        display_severity = policy_result["severity"]

    scan = save_scan({
        "commit_sha": data.get("commit_sha", "unknown"),
        "commit_message": data.get("commit_message", ""),
        "repo_name": repo_name,
        "branch": data.get("branch", "main"),
        "scan_type": scan_type,
        "severity": display_severity,
        "findings": findings,
        "ai_explanation": ai_explanation,
        "ai_fix": ai_fix,
        "risk_score": risk_score,
        "action_taken": policy_result["action"],
        # Problem 7 — store breakdown so frontend can show it
        "vuln_breakdown": vuln_breakdown,
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
        "vuln_breakdown": vuln_breakdown,
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
    scans = db.query(ScanResult).order_by(ScanResult.created_at.desc()).all()
    return [
        {k: v for k, v in scan.__dict__.items() if k != "findings" and not k.startswith("_")}
        for scan in scans
    ]