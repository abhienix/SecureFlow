from celery import Celery
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/secureflow")

celery_app = Celery(
    "secureflow",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    broker_connection_retry_on_startup=True
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

@celery_app.task(name="process_scan_results")
def process_scan_results(scan_id: int, findings: dict):
    from models import ScanResult
    from security_gate import evaluate_severity
    
    db = SessionLocal()
    
    try:
        gate_result = evaluate_severity(findings)
        
        scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
        if scan:
            scan.action_taken = gate_result["action"]
            db.commit()
        
        print(f"scan {scan_id}: {gate_result['action']} - {gate_result['reason']}")
        return gate_result
    
    except Exception as e:
        print(f"error processing scan {scan_id}: {e}")
        return {"action": "ERROR", "reason": str(e)}
    
    finally:
        db.close()