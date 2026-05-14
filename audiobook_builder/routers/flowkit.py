import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request
from flow_service import flow_service, get_pending_jobs, update_job_status
from state import flowkit_state

router = APIRouter()


@router.websocket("/ws/flowkit")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    flowkit_state["active_ws"] = websocket
    flow_service.active_ws = websocket
    print("[FlowKit] Extension connected via WebSocket")

    await websocket.send_json({"type": "callback_secret", "secret": flowkit_state["callbackSecret"]})

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)

            if msg.get("type") == "token_captured":
                flowkit_state["flowKey"] = msg.get("flowKey")
                print("[FlowKit] Nhận được FlowKey mới từ trình duyệt!")
            elif msg.get("type") == "extension_ready":
                print(f"[FlowKit] Extension ready. FlowKey present: {msg.get('flowKeyPresent')}")
            elif msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif msg.get("type") == "media_urls_refresh":
                print(f"[FlowKit] Nhận được {len(msg.get('urls', []))} media URLs từ TRPC")
            else:
                flow_service.resolve_request(msg)

    except WebSocketDisconnect:
        print("[FlowKit] Extension disconnected")
        flowkit_state["active_ws"] = None
        flow_service.active_ws = None
    except Exception as e:
        print(f"[FlowKit] Lỗi WebSocket: {e}")
        flowkit_state["active_ws"] = None
        flow_service.active_ws = None


@router.post("/api/ext/callback")
async def ext_callback(request: Request):
    data = await request.json()
    print(f"[FlowKit Callback] Nhận kết quả từ extension, id: {data.get('id')}")
    flow_service.resolve_request(data)
    return {"status": "received"}


async def poll_jobs_loop():
    while True:
        try:
            pending_jobs = get_pending_jobs()
            if pending_jobs and flow_service.active_ws:
                for job in pending_jobs:
                    if job.get("media_id"):
                        res = await flow_service.check_media_status(job["media_id"])
                        if res and res.get("status") == 200:
                            data = res.get("data", {})
                            video_data = data.get("video", {})
                            fife_url = (
                                video_data.get("generatedVideo", {}).get("fifeUrl")
                                or video_data.get("fifeUrl")
                                or data.get("fifeUrl")
                            )
                            if fife_url:
                                update_job_status(job["id"], "DONE", media_id=job["media_id"], url=fife_url)
                    elif job.get("operation_name"):
                        res = await flow_service.check_video_status([job["operation_name"]])
                        if res and res.get("status") == 200:
                            for op in res.get("data", {}).get("operations", []):
                                if op.get("name") == job["operation_name"] and op.get("done"):
                                    if "error" in op:
                                        update_job_status(job["id"], "FAILED", url=str(op["error"]))
                                    else:
                                        resp = op.get("response", {})
                                        media = resp.get("generatedMedia", {}).get("media", {})
                                        media_id = media.get("name")
                                        media_uri = media.get("uri", "")
                                        url = ("https://labs.google/fx/api/media?path=" + media_uri) if media_uri else ""
                                        update_job_status(job["id"], "DONE", media_id=media_id, url=url)
        except Exception as e:
            print("Lỗi trong poll_jobs_loop:", e)
        await asyncio.sleep(5)
