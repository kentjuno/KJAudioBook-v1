import os
import json
from fastapi import APIRouter, Request
from visual_pipeline import METADATA_FILE
from state import PROFILE_FILE

router = APIRouter()


@router.get("/api/characters-metadata")
async def get_characters_metadata():
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


@router.get("/api/project-profile")
async def get_project_profile():
    if os.path.exists(PROFILE_FILE):
        with open(PROFILE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


@router.post("/api/project-profile")
async def update_project_profile(req: Request):
    data = await req.json()
    with open(PROFILE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    return {"status": "success"}
