import psycopg2, os
from dotenv import load_dotenv
load_dotenv('.env')
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='scan_results'")
print(cur.fetchall())
conn.close()
