import os

path = r'f:\AntiGravity\AudioBook-KJ\audiobook_builder\server.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_code = """
class DownloadAssetRequest(BaseModel):
    asset_id: str
    url: str

@app.post("/api/download-asset-image")
async def api_download_asset_image(req: DownloadAssetRequest):
    import httpx
    import time
    from flow_service import flow_service
    from visual_pipeline import METADATA_FILE
    
    if not flow_service.flow_key:
        raise HTTPException(status_code=400, detail="FlowKit token not found")
        
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(req.url, headers={"Authorization": f"Bearer {flow_service.flow_key}"})
            if resp.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Failed to download image: {resp.status_code}")
                
            images_dir = os.path.join(os.path.dirname(__file__), "images")
            os.makedirs(images_dir, exist_ok=True)
            local_path = os.path.join(images_dir, f"{req.asset_id}_{int(time.time())}.jpg")
            
            with open(local_path, "wb") as f:
                f.write(resp.content)
                
            # Update metadata
            metadata = {}
            if os.path.exists(METADATA_FILE):
                with open(METADATA_FILE, "r", encoding="utf-8") as f:
                    metadata = json.load(f)
            
            if req.asset_id in metadata:
                metadata[req.asset_id]["local_image_path"] = local_path
                metadata[req.asset_id]["media_id"] = None
            else:
                metadata[req.asset_id] = {"local_image_path": local_path, "media_id": None}
                
            with open(METADATA_FILE, "w", encoding="utf-8") as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
                
            return {"status": "success", "local_image_path": local_path, "metadata": metadata}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
"""

if "class DownloadAssetRequest" not in content:
    content = content.replace("class SceneVideoRequest", new_code + "\nclass SceneVideoRequest")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added download-asset-image API")
else:
    print("Already exists")
