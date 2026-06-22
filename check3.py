import psycopg2, os
from dotenv import load_dotenv
load_dotenv('.env')
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute("SELECT id, commit_sha, commit_message, status, pipeline_steps FROM scan_results ORDER BY id DESC LIMIT 3")
for row in cur.fetchall():
    print(row)
conn.close()
