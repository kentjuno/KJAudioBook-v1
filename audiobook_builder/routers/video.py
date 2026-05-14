import os
import base64
from typing import Optional
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from flow_service import flow_service
from visual_pipeline import generate_storyboard

router = APIRouter()


class GenerateSceneVideoRequest(BaseModel):
    prompt: str
    project_id: str
    scene_id: str
    start_image_media_id: Optional[str] = None
    reference_media_ids: Optional[list[str]] = None


class SceneFrameRequest(BaseModel):
    prompt: str
    project_id: str
    reference_media_ids: list[str] = None


class StoryboardRequest(BaseModel):
    script: list[dict]
    metadata: dict


@router.post("/api/generate-scene-video")
async def api_generate_scene_video(req: GenerateSceneVideoRequest):
    res = await flow_service.request_scene_video(
        prompt=req.prompt,
        project_id=req.project_id,
        scene_id=req.scene_id,
        start_image_media_id=req.start_image_media_id,
        reference_media_ids=req.reference_media_ids or [],
    )
    if res.get("success"):
        out = {"job_id": res["job_id"], "operation_name": res["operation_name"]}
        if "primary_media_id" in res:
            out["primary_media_id"] = res["primary_media_id"]
        return out
    error_obj = res.get("error", {})
    raise HTTPException(status_code=error_obj.get("status", 500), detail=str(error_obj))


@router.get("/api/check-video-status")
async def api_check_video_status(operation_name: str = None, media_id: str = None):
    if media_id:
        res = await flow_service.check_media_status(media_id)
    elif operation_name:
        res = await flow_service.check_video_status([operation_name])
    else:
        raise HTTPException(400, "Missing operation_name or media_id")

    error_obj = res.get("error", {})
    if res.get("status") and res["status"] >= 400:
        raise HTTPException(status_code=res["status"], detail=str(error_obj))

    if res.get("status") == 200 and "data" in res:
        video_data = res["data"].get("video", {})
        if "encodedVideo" in video_data:
            encoded = video_data.get("encodedVideo")
            try:
                video_bytes = base64.b64decode(encoded, validate=False)
                is_mp4 = len(video_bytes) >= 12 and video_bytes[4:8] == b"ftyp"
                if is_mp4:
                    video_data.pop("encodedVideo")
                    vid_id = str(media_id if media_id else operation_name)
                    vid_filename = "video_" + "".join(c for c in vid_id if c.isalnum() or c in "-_.") + ".mp4"
                    vid_path = os.path.abspath(os.path.join("temp_audio", vid_filename))
                    os.makedirs("temp_audio", exist_ok=True)
                    with open(vid_path, "wb") as f:
                        f.write(video_bytes)
                    video_data["fifeUrl"] = f"http://localhost:8000/api/video?path={vid_path}"
            except Exception as e:
                print(f"Failed to decode video: {e}")
    return res


@router.get("/api/video")
async def api_get_video(path: str):
    if os.path.exists(path):
        return FileResponse(path, media_type="video/mp4")
    raise HTTPException(404, "Not found")


@router.post("/api/debug-veo")
async def api_debug_veo(request: Request):
    body = await request.json()
    url = flow_service._build_url("/v1/video:batchCheckAsyncVideoGenerationStatus")
    res = await flow_service._send("api_request", {
        "url": url, "method": "POST",
        "headers": {"content-type": "application/json"}, "body": body,
    })
    return res


@router.post("/api/generate-scene-frame")
async def api_generate_scene_frame(req: SceneFrameRequest):
    try:
        res = await flow_service.request_scene_frame(
            prompt=req.prompt,
            project_id=req.project_id,
            reference_media_ids=req.reference_media_ids,
        )
        if not res.get("success"):
            raise HTTPException(500, str(res.get("error")))
        return {"url": res["url"], "media_id": res["media_id"]}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(500, str(e))


@router.post("/api/generate-storyboard")
def api_generate_storyboard(req: StoryboardRequest):
    try:
        shots = generate_storyboard(req.script, req.metadata)
        return {"shots": shots}
    except Exception as e:
        raise HTTPException(500, str(e))
