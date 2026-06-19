from sqlalchemy import create_engine, text

engine = create_engine("postgresql://postgres:password@localhost:5432/secureflow")

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS ai_feedback VARCHAR"))
    conn.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS ai_feedback_note TEXT"))
    conn.commit()

print("columns added successfully")