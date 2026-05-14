import os

path = r'f:\AntiGravity\AudioBook-KJ\audiobook_builder\server.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_code = """
class SceneVideoRequest(BaseModel):
    prompt: str
    project_id: str
    scene_id: str
    start_image_media_id: str
    reference_media_ids: Optional[List[str]] = None

@app.post("/api/generate-scene-video")
async def api_generate_scene_video(req: SceneVideoRequest):
    try:
        from flow_service import flow_service
        res = await flow_service.request_scene_video(
            prompt=req.prompt,
            project_id=req.project_id,
            scene_id=req.scene_id,
            start_image_media_id=req.start_image_media_id,
            reference_media_ids=req.reference_media_ids
        )
        if res.get("success"):
            return {"job_id": res["job_id"], "operation_name": res["operation_name"]}
        else:
            raise HTTPException(status_code=500, detail=str(res.get("error")))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
"""

if "class SceneVideoRequest" not in content or "def api_generate_scene_video" not in content:
    if "class SceneVideoRequest" in content:
        print("Already exists")
    else:
        # We append before StoryboardRequest
        content = content.replace("class StoryboardRequest", new_code + "\nclass StoryboardRequest")
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Added generate-scene-video API")
else:
    print("Already exists")
