import psycopg2, os
from dotenv import load_dotenv
load_dotenv('.env')
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'complete'")
cur.execute("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS started_at TIMESTAMP")
cur.execute("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS pipeline_steps JSONB")
cur.execute("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS commit_message TEXT")
conn.commit()
print('Columns added!')
conn.close()
