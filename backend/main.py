import os

from dotenv import load_dotenv
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

from models import Base, ScanResult
from policy_engine import evaluate_policy, get_highest_cvss_score
from claude_client import analyze_scan
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


@app.get("/api/migrate")
def migrate(db: Session = Depends(get_db)):
    db.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS commit_message TEXT"))
    db.commit()
    return {"status": "migrated"}


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
    findings = data.get("findings", {})
    repo_name = data.get("repo_name", "unknown")

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
    risk_score = first_ai_result.get("risk_score", 0)

    scan = ScanResult(
        commit_sha=data.get("commit_sha", "unknown"),
        commit_message=data.get("commit_message", ""),
        repo_name=repo_name,
        branch=data.get("branch", "main"),
        scan_type=data.get("scan_type", "trivy"),
        severity=policy_result["severity"],
        findings=findings,
        ai_explanation=ai_explanation,
        ai_fix=ai_fix,
        risk_score=risk_score,
        action_taken=policy_result["action"],
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

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