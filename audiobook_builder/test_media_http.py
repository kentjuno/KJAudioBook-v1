import requests
import sqlite3
import json

conn = sqlite3.connect("jobs.db")
c = conn.cursor()
c.execute("SELECT * FROM flow_jobs")
jobs = c.fetchall()
conn.close()

for job in jobs:
    print(f"Job: {job}")
    media_id = job[4]
    if media_id:
        print(f"Polling media_id: {media_id}")
        r = requests.get(f'http://localhost:8000/api/check-video-status?media_id={media_id}')
        print(f"STATUS: {r.status_code}")
        print(json.dumps(r.json(), indent=2))
