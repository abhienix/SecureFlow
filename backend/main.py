from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models import Base, ScanResult
from dotenv import load_dotenv
from prometheus_fastapi_instrumentator import Instrumentator
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/secureflow")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SecureFlow — AI-Powered Security Gate for CI/CD", version="1.0.0")

aapp.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
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
        "block_rate_percent": block_rate
    }

@app.post("/api/scan-results")
def receive_scan_results(data: dict, db: Session = Depends(get_db)):
    from policy_engine import evaluate_policy
    from claude_client import analyze_scan
    from slack_notifier import send_slack_alert

    findings = data.get("findings", {})
    repo_name = data.get("repo_name", "unknown")

    policy_result = evaluate_policy(findings, repo_name)

    vulnerabilities = []
    for result in findings.get("Results", []):
        for vuln in result.get("Vulnerabilities", []):
            vulnerabilities.append({
                "id": vuln.get("VulnerabilityID"),
                "package": vuln.get("PkgName"),
                "severity": vuln.get("Severity"),
                "score": 0.0,
                "fix": vuln.get("FixedVersion", "no fix available"),
                "description": vuln.get("Description", "")[:300]
            })

    print(f"policy result: {policy_result['action']} — {policy_result['reason']}")
    print(f"vulnerabilities extracted: {len(vulnerabilities)}")

    # AI analysis — gracefully skip if unavailable
    ai_results = []
    if vulnerabilities:
        try:
            ai_results = analyze_scan(vulnerabilities)
        except Exception as e:
            print(f"AI analysis failed (skipping): {e}")

    ai_explanation = ai_results[0].get("explanation", "") if ai_results else ""
    ai_fix = ai_results[0].get("fix", "") if ai_results else ""
    risk_score = ai_results[0].get("risk_score", 0) if ai_results else 0

    scan = ScanResult(
        commit_sha=data.get("commit_sha", "unknown"),
        repo_name=repo_name,
        branch=data.get("branch", "main"),
        scan_type=data.get("scan_type", "trivy"),
        severity=data.get("severity", "unknown"),
        findings=findings,
        ai_explanation=ai_explanation,
        ai_fix=ai_fix,
        risk_score=risk_score,
        action_taken=policy_result["action"]
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
        "ai_analysis": ai_results
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
    return scans