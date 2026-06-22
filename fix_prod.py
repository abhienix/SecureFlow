import psycopg2

conn = psycopg2.connect('postgresql://postgres:SecureFlow123!@8.231.119.203:5432/secureflow')
cur = conn.cursor()
cur.execute("UPDATE scan_results SET status = 'failed', action_taken = 'BLOCK' WHERE status = 'running'")
conn.commit()
print('Done! Rows updated:', cur.rowcount)
conn.close()
