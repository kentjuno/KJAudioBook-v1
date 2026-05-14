import os

path = r'f:\AntiGravity\AudioBook-KJ\audiobook_builder\server.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

poll_logic = """
async def poll_jobs_loop():
    from flow_service import get_pending_jobs, flow_service, update_job_status
    import uuid
    import asyncio
    
    while True:
        try:
            pending_jobs = get_pending_jobs()
            if pending_jobs and flow_service.active_ws:
                ops = [j["operation_name"] for j in pending_jobs if j["operation_name"]]
                if ops:
                    # Gọi check_video_status
                    res = await flow_service.check_video_status(ops)
                    if res and res.get("status") == 200:
                        data = res.get("data", {})
                        for op in data.get("operations", []):
                            op_name = op.get("name")
                            done = op.get("done", False)
                            if done:
                                # Tìm job_id tương ứng
                                job = next((j for j in pending_jobs if j["operation_name"] == op_name), None)
                                if job:
                                    response_data = op.get("response", {})
                                    if "error" in op:
                                        update_job_status(job["id"], "FAILED", url=str(op["error"]))
                                    else:
                                        media = response_data.get("generatedMedia", {}).get("media", {})
                                        media_id = media.get("name")
                                        # Parse URL từ URI
                                        url = ""
                                        media_uri = media.get("uri", "")
                                        if media_uri:
                                            url = "https://labs.google/fx/api/media?path=" + media_uri
                                        
                                        update_job_status(job["id"], "DONE", media_id=media_id, url=url)
        except Exception as e:
            print("Lỗi trong poll_jobs_loop:", e)
        await asyncio.sleep(5)
"""

# Tìm dòng "async def poll_jobs_loop():" và thay thế
start_idx = content.find("async def poll_jobs_loop():")
if start_idx != -1:
    end_idx = content.find("app = FastAPI", start_idx)
    content = content[:start_idx] + poll_logic + "\n" + content[end_idx:]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated poll_jobs_loop with real polling logic")
else:
    print("Could not find poll_jobs_loop")
