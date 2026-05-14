import re

path = r'f:\AntiGravity\AudioBook-KJ\audiobook_builder\server.py'
content = open(path, encoding='utf-8').read()

new_func = '''@app.post("/api/generate-scene-frame")
async def generate_scene_frame(req: GenerateSceneFrameRequest):
    """Legacy single image generation route."""
    try:
        from flow_service import flow_service
        res = await flow_service.request_scene_frame(
            prompt=req.prompt,
            project_id=req.project_id,
            reference_media_ids=req.reference_media_ids
        )
        if not res.get("success"):
            raise HTTPException(status_code=500, detail=str(res.get("error")))
        return {"url": res["url"], "media_id": res["media_id"]}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))'''

content = re.sub(
    r'@app\.post\("/api/generate-scene-frame"\).*?(?=@app\.post|\Z)',
    new_func + '\n\n',
    content,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched server.py /api/generate-scene-frame")
