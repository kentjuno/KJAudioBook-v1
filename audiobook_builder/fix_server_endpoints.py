import os
import json

content = open('server.py', encoding='utf-8').read()
lines = content.split('\n')
start = -1
for i, line in enumerate(lines):
    if line.startswith('@app.post("/api/test-voice")'):
        start = i
        break

if start != -1:
    replacement = '''
class UpdateAssetRequest(BaseModel):
    id: str
    field: str
    value: str

@app.post("/api/update-asset")
async def api_update_asset(req: UpdateAssetRequest):
    if not os.path.exists(METADATA_FILE):
        return {"status": "error", "message": "Metadata file not found"}
    with open(METADATA_FILE, "r", encoding="utf-8") as f:
        metadata = json.load(f)
    if req.id in metadata:
        metadata[req.id][req.field] = req.value
        with open(METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=4, ensure_ascii=False)
        return {"status": "success", "metadata": metadata}
    return {"status": "error"}

class SetOfficialVariationRequest(BaseModel):
    asset_id: str
    variation_id: str

@app.post("/api/set-official-variation")
async def api_set_official_variation(req: SetOfficialVariationRequest):
    if not os.path.exists(METADATA_FILE):
        return {"status": "error"}
    with open(METADATA_FILE, "r", encoding="utf-8") as f:
        metadata = json.load(f)
        
    if req.asset_id in metadata:
        asset = metadata[req.asset_id]
        if "variations" in asset:
            for v in asset["variations"]:
                if v["id"] == req.variation_id:
                    asset["local_image_path"] = v["local_image_path"]
                    asset["media_id"] = v["media_id"]
                    asset["prompt_used"] = v["prompt"]
                    with open(METADATA_FILE, "w", encoding="utf-8") as f:
                        json.dump(metadata, f, indent=4, ensure_ascii=False)
                    return {"status": "success", "metadata": metadata}
    return {"status": "error"}
'''
    new_content = '\n'.join(lines[:start]) + replacement + '\n'.join(lines[start:])
    open('server.py', 'w', encoding='utf-8').write(new_content)
    print('Added update-asset and set-official-variation endpoints')
else:
    print('Not found')
