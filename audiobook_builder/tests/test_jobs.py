import sqlite3
c = sqlite3.connect('jobs.db').cursor()
for row in c.execute("SELECT id, type, operation_name, status FROM flow_jobs LIMIT 50"):
    print(row)
