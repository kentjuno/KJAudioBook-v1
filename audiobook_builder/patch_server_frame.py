import os

path = r'f:\AntiGravity\AudioBook-KJ\audiobook_builder\server.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('\r\n', '\n')

new_code = """
class SceneFrameRequest(BaseModel):
    prompt: str
    project_id: str
    reference_media_ids: Optional[List[str]] = None

@app.post("/api/generate-scene-frame")
async def api_generate_scene_frame(req: SceneFrameRequest):
    try:
        res = await flow_service.request_scene_frame(
            prompt=req.prompt,
            project_id=req.project_id,
            reference_media_ids=req.reference_media_ids
        )
        if res.get("success"):
            return {"job_id": res["job_id"], "operation_name": res["operation_name"]}
        else:
            raise HTTPException(status_code=500, detail=str(res.get("error")))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
"""

if "class SceneFrameRequest" not in content:
    content = content.replace("class SceneVideoRequest", new_code + "\nclass SceneVideoRequest")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added generate-scene-frame API")
else:
    print("Already exists")
