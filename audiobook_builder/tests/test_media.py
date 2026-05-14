import asyncio
from flow_service import flow_service

async def main():
    # Attempt to get media using primaryMediaId
    print("Testing media ID...")
    # The user provided: "3afdfb4c-5db8-431b-acad-612ae251" but it's truncated.
    # Let's get the full media_id from jobs.db if we can, or just print all jobs.
    import sqlite3
    conn = sqlite3.connect("jobs.db")
    c = conn.cursor()
    c.execute("SELECT * FROM flow_jobs")
    jobs = c.fetchall()
    conn.close()
    
    for job in jobs:
        print(job)
        media_id = job[4]
        if media_id:
            print(f"Polling media {media_id}")
            res = await flow_service.check_media_status(media_id)
            print(res)

if __name__ == "__main__":
    asyncio.run(main())
