import psycopg2, os
from dotenv import load_dotenv
load_dotenv('.env')
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute("SELECT id, commit_sha, status, started_at FROM scan_results ORDER BY id DESC LIMIT 5")
for row in cur.fetchall():
    print(row)
conn.close()
