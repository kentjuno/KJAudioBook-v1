import os
import json

content = open('server.py', encoding='utf-8').read()
lines = content.split('\n')
start = -1
end = -1
for i, line in enumerate(lines):
    if line.startswith('class DownloadAssetRequest(BaseModel):'):
        start = i
    if line.startswith('@app.post("/api/test-voice")'):
        end = i
        break

if start != -1 and end != -1:
    replacement = '''class DownloadAssetRequest(BaseModel):
    asset_id: str
    url: str
    media_id: Optional[str] = None
    prompt: Optional[str] = None

@app.post("/api/download-asset-image")
async def api_download_asset_image(req: DownloadAssetRequest):
    import requests
    import time
    img_dir = "images"
    os.makedirs(img_dir, exist_ok=True)
    timestamp = int(time.time())
    file_path = os.path.join(img_dir, f"{req.asset_id}_{timestamp}.jpg")
    try:
        r = requests.get(req.url, stream=True)
        with open(file_path, 'wb') as f:
            shutil.copyfileobj(r.raw, f)
            
        metadata = {}
        if os.path.exists(METADATA_FILE):
            with open(METADATA_FILE, "r", encoding="utf-8") as f:
                metadata = json.load(f)
            if req.asset_id in metadata:
                asset = metadata[req.asset_id]
                asset["local_image_path"] = file_path
                if req.media_id:
                    asset["media_id"] = req.media_id
                
                if "variations" not in asset:
                    asset["variations"] = []
                    
                asset["variations"].append({
                    "id": str(timestamp),
                    "local_image_path": file_path,
                    "media_id": req.media_id,
                    "prompt": req.prompt,
                    "created_at": timestamp
                })
                
            with open(METADATA_FILE, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=4, ensure_ascii=False)
        return {"status": "success", "file_path": file_path, "metadata": metadata}
    except Exception as e:
        raise HTTPException(500, str(e))

'''
    new_content = '\n'.join(lines[:start]) + '\n' + replacement + '\n'.join(lines[end:])
    open('server.py', 'w', encoding='utf-8').write(new_content)
    print('Updated server.py download logic with variations')
else:
    print('Not found')
