import os
import json

missing_code = """

# --- RECOVERED API ENDPOINTS ---
class UpdateMediaIdRequest(BaseModel):
    character_id: str
    media_id: str
    project_id: str

@app.get("/api/characters-metadata")
async def get_characters_metadata():
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

@app.get("/api/project-profile")
async def get_project_profile():
    if os.path.exists(PROFILE_FILE):
        with open(PROFILE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

@app.post("/api/project-profile")
async def update_project_profile(req: Request):
    data = await req.json()
    with open(PROFILE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    return {"status": "success"}
"""

with open(r'f:\AntiGravity\AudioBook-KJ\audiobook_builder\server.py', 'a', encoding='utf-8') as f:
    f.write(missing_code)
print("Added endpoints")
