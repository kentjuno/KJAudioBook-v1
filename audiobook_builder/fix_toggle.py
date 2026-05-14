import os
import json

content = open('server.py', encoding='utf-8').read()
if 'class ToggleReferenceVariationRequest' not in content:
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('@app.post("/api/test-voice")'):
            start = i
            break
            
    replacement = '''
class ToggleReferenceVariationRequest(BaseModel):
    asset_id: str
    variation_id: str

@app.post("/api/toggle-reference-variation")
async def api_toggle_reference_variation(req: ToggleReferenceVariationRequest):
    if not os.path.exists(METADATA_FILE):
        return {"status": "error"}
    with open(METADATA_FILE, "r", encoding="utf-8") as f:
        metadata = json.load(f)
        
    if req.asset_id in metadata:
        asset = metadata[req.asset_id]
        if "references" not in asset:
            # Initialize with the primary media_id if it exists
            asset["references"] = []
            if asset.get("media_id"):
                asset["references"].append({
                    "media_id": asset["media_id"],
                    "local_image_path": asset.get("local_image_path")
                })
                
        if "variations" in asset:
            for v in asset["variations"]:
                if v["id"] == req.variation_id:
                    # Check if already in references
                    exists = False
                    for idx, ref in enumerate(asset["references"]):
                        if ref.get("media_id") == v["media_id"]:
                            exists = True
                            # Remove it
                            asset["references"].pop(idx)
                            break
                    if not exists:
                        # Add it
                        asset["references"].append({
                            "media_id": v["media_id"],
                            "local_image_path": v["local_image_path"]
                        })
                    
                    # Ensure primary media_id is always the first reference or null
                    if len(asset["references"]) > 0:
                        asset["media_id"] = asset["references"][0]["media_id"]
                        asset["local_image_path"] = asset["references"][0]["local_image_path"]
                    else:
                        asset["media_id"] = None
                        asset["local_image_path"] = None
                        
                    with open(METADATA_FILE, "w", encoding="utf-8") as f:
                        json.dump(metadata, f, indent=4, ensure_ascii=False)
                    return {"status": "success", "metadata": metadata}
    return {"status": "error"}
'''
    new_content = '\n'.join(lines[:start]) + replacement + '\n'.join(lines[start:])
    open('server.py', 'w', encoding='utf-8').write(new_content)
    print('Added toggle-reference-variation endpoint')
else:
    print('Already present')
