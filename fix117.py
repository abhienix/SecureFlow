import psycopg2, os
from dotenv import load_dotenv
load_dotenv('.env')
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute("UPDATE scan_results SET status = 'failed', action_taken = 'BLOCK' WHERE id = 117")
conn.commit()
print('Done! Rows updated:', cur.rowcount)
conn.close()
