import re

path = r'f:\AntiGravity\AudioBook-KJ\audiobook_builder\server.py'
content = open(path, encoding='utf-8').read()

new_func = '''@app.post("/api/generate-asset-image")
async def generate_asset_image(req: GenerateAssetImageRequest):
    """Fallback flow for generating asset images using Flow Service"""
    try:
        from flow_service import flow_service
        # Call the synchronous-like flow image generation endpoint
        res = await flow_service.request_scene_frame(
            prompt=req.prompt,
            project_id=req.project_id
        )
        if not res.get("success"):
            raise HTTPException(status_code=500, detail=str(res.get("error")))
            
        return {"url": res["url"], "media_id": res["media_id"]}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))'''

content = re.sub(
    r'@app\.post\("/api/generate-asset-image"\).*?(?=@app\.post|\Z)',
    new_func + '\n\n',
    content,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched server.py")
