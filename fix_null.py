import psycopg2, os
from dotenv import load_dotenv
load_dotenv('.env')
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute("UPDATE scan_results SET status = 'complete' WHERE status IS NULL OR status = 'running'")
conn.commit()
print('Rows updated:', cur.rowcount)
conn.close()
