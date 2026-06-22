import psycopg2, os
from dotenv import load_dotenv
load_dotenv('.env')
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'")
print(cur.fetchall())
conn.close()
