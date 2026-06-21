"""
Run this against the Cloud SQL proxy (localhost:5433) to add the new
columns to production. Update DB_PASSWORD below with your real password,
then run:

    python migrate_via_proxy.py
"""
from sqlalchemy import create_engine, text

DB_PASSWORD = "SecureFlow123!"

engine = create_engine(f"postgresql://postgres:{DB_PASSWORD}@localhost:5433/secureflow")

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS ai_feedback VARCHAR"))
    conn.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS ai_feedback_note TEXT"))
    conn.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS pipeline_steps JSON"))
    conn.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'complete'"))
    conn.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS started_at TIMESTAMP"))
    conn.commit()

print("columns added successfully")
