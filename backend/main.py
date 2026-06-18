from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models import Base, ScanResult
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/secureflow")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SecureFlow API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def root():
    return {"message": "SecureFlow API is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/api/scan-results")
def receive_scan_results(data: dict, db: Session = Depends(get_db)):
    from security_gate import evaluate_severity
    from claude_client import analyze_scan
    from slack_notifier import send_slack_alert

    findings = data.get("findings", {})
    gate_result = evaluate_severity(findings)

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

    print(f"vulnerabilities extracted: {vulnerabilities}")

    ai_results = []
    if vulnerabilities:
        ai_results = analyze_scan(vulnerabilities)

    ai_explanation = ai_results[0].get("explanation", "") if ai_results else ""
    ai_fix = ai_results[0].get("fix", "") if ai_results else ""
    risk_score = ai_results[0].get("risk_score", 0) if ai_results else 0

    scan = ScanResult(
        commit_sha=data.get("commit_sha", "unknown"),
        repo_name=data.get("repo_name", "unknown"),
        branch=data.get("branch", "main"),
        scan_type=data.get("scan_type", "trivy"),
        severity=data.get("severity", "unknown"),
        findings=findings,
        ai_explanation=ai_explanation,
        ai_fix=ai_fix,
        risk_score=risk_score,
        action_taken=gate_result["action"]
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    send_slack_alert(data, ai_results, gate_result["action"], gate_result["reason"])

    return {
        "status": "processed",
        "id": scan.id,
        "action": gate_result["action"],
        "reason": gate_result["reason"],
        "ai_analysis": ai_results,
        "vulnerabilities": gate_result["vulnerabilities"]
    }

@app.get("/api/scan-results")
def get_scan_results(db: Session = Depends(get_db)):
    scans = db.query(ScanResult).order_by(ScanResult.created_at.desc()).all()
    return scans