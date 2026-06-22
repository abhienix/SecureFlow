from sqlalchemy import create_engine, text

import os
from dotenv import load_dotenv
load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS ai_feedback VARCHAR"))
    conn.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS ai_feedback_note TEXT"))
    conn.commit()

print("columns added successfully")