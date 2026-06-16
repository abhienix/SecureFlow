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
    allow_origins=["*"],
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
    
    findings = data.get("findings", {})
    gate_result = evaluate_severity(findings)
    
    scan = ScanResult(
        commit_sha=data.get("commit_sha", "unknown"),
        repo_name=data.get("repo_name", "unknown"),
        branch=data.get("branch", "main"),
        scan_type=data.get("scan_type", "trivy"),
        severity=data.get("severity", "unknown"),
        findings=findings,
        action_taken=gate_result["action"]
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    
    return {
        "status": "processed",
        "id": scan.id,
        "action": gate_result["action"],
        "reason": gate_result["reason"],
        "vulnerabilities": gate_result["vulnerabilities"]
    }

@app.get("/api/scan-results")
def get_scan_results(db: Session = Depends(get_db)):
    scans = db.query(ScanResult).order_by(ScanResult.created_at.desc()).all()
    return scans