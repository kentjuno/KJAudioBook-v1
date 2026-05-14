import os
import json
import shutil
import time
from typing import Optional, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from flow_service import flow_service
from visual_pipeline import METADATA_FILE

router = APIRouter()


class AssetImageRequest(BaseModel):
    asset_id: str
    prompt: str
    project_id: str
    reference_media_ids: Optional[List[str]] = []


class DownloadAssetRequest(BaseModel):
    asset_id: str
    url: str
    media_id: Optional[str] = None
    prompt: Optional[str] = None
    name: Optional[str] = None


class DeleteVariationRequest(BaseModel):
    asset_id: str
    variation_id: str


class UpdateAssetRequest(BaseModel):
    id: str
    field: str
    value: str


class SetOfficialVariationRequest(BaseModel):
    asset_id: str
    variation_id: str


class ToggleReferenceVariationRequest(BaseModel):
    asset_id: str
    variation_id: str


def _load_metadata() -> dict:
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_metadata(metadata: dict) -> None:
    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=4, ensure_ascii=False)


@router.get("/api/image")
async def api_get_image(path: str):
    if os.path.exists(path):
        return FileResponse(path)
    raise HTTPException(404, "Not found")


@router.post("/api/upload-character-image")
async def api_upload_character_image(character_id: str = Form(...), file: UploadFile = File(...)):
    img_dir = "images"
    os.makedirs(img_dir, exist_ok=True)
    timestamp = int(time.time())
    file_ext = os.path.splitext(file.filename)[1] or ".jpg"
    file_path = os.path.join(img_dir, f"{character_id}_{timestamp}{file_ext}")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    metadata = _load_metadata()
    if character_id in metadata:
        asset = metadata[character_id]
        asset["local_image_path"] = file_path
        asset.setdefault("variations", []).append({
            "id": str(timestamp), "local_image_path": file_path,
            "media_id": None, "prompt": "Uploaded by User", "created_at": timestamp,
        })
        _save_metadata(metadata)

    return {"status": "success", "file_path": file_path, "metadata": metadata}


@router.post("/api/generate-asset-image")
async def api_generate_asset_image(req: AssetImageRequest):
    try:
        res = await flow_service.request_scene_frame(
            prompt=req.prompt, project_id=req.project_id,
            reference_media_ids=req.reference_media_ids,
        )
        if not res.get("success"):
            raise HTTPException(500, str(res.get("error")))
        return {"url": res["url"], "media_id": res["media_id"]}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(500, str(e))


@router.post("/api/download-asset-image")
async def api_download_asset_image(req: DownloadAssetRequest):
    import requests as _requests
    img_dir = "images"
    os.makedirs(img_dir, exist_ok=True)
    timestamp = int(time.time())
    file_path = os.path.join(img_dir, f"{req.asset_id}_{timestamp}.jpg")
    try:
        r = _requests.get(req.url, stream=True)
        with open(file_path, "wb") as f:
            shutil.copyfileobj(r.raw, f)

        metadata = _load_metadata()
        if req.asset_id in metadata:
            asset = metadata[req.asset_id]
            asset["local_image_path"] = file_path
            if req.media_id:
                asset["media_id"] = req.media_id
            asset.setdefault("variations", []).append({
                "id": str(timestamp), "local_image_path": file_path,
                "media_id": req.media_id, "prompt": req.prompt,
                "name": req.name, "created_at": timestamp,
            })
            _save_metadata(metadata)
        return {"status": "success", "file_path": file_path, "metadata": metadata}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/api/delete-variation")
async def api_delete_variation(req: DeleteVariationRequest):
    metadata = _load_metadata()
    if req.asset_id not in metadata:
        return {"status": "error", "message": "Asset not found"}
    asset = metadata[req.asset_id]
    for v in asset.get("variations", []):
        if v.get("id") == req.variation_id:
            path = v.get("local_image_path")
            if path and os.path.exists(path):
                try: os.remove(path)
                except: pass
            break
    asset["variations"] = [v for v in asset.get("variations", []) if v.get("id") != req.variation_id]
    _save_metadata(metadata)
    return {"status": "success", "metadata": metadata}


@router.post("/api/update-asset")
async def api_update_asset(req: UpdateAssetRequest):
    metadata = _load_metadata()
    if req.id not in metadata:
        return {"status": "error"}
    metadata[req.id][req.field] = req.value
    _save_metadata(metadata)
    return {"status": "success", "metadata": metadata}


@router.post("/api/set-official-variation")
async def api_set_official_variation(req: SetOfficialVariationRequest):
    metadata = _load_metadata()
    if req.asset_id not in metadata:
        return {"status": "error"}
    asset = metadata[req.asset_id]
    for v in asset.get("variations", []):
        if v["id"] == req.variation_id:
            asset["local_image_path"] = v["local_image_path"]
            asset["media_id"] = v["media_id"]
            asset["prompt_used"] = v["prompt"]
            _save_metadata(metadata)
            return {"status": "success", "metadata": metadata}
    return {"status": "error"}


@router.post("/api/toggle-reference-variation")
async def api_toggle_reference_variation(req: ToggleReferenceVariationRequest):
    metadata = _load_metadata()
    if req.asset_id not in metadata:
        return {"status": "error"}
    asset = metadata[req.asset_id]
    if "references" not in asset:
        asset["references"] = []
        if asset.get("media_id"):
            asset["references"].append({
                "media_id": asset["media_id"],
                "local_image_path": asset.get("local_image_path"),
            })

    for v in asset.get("variations", []):
        if v["id"] == req.variation_id:
            exists_idx = next((i for i, r in enumerate(asset["references"]) if r.get("media_id") == v["media_id"]), None)
            if exists_idx is not None:
                asset["references"].pop(exists_idx)
            else:
                asset["references"].append({"media_id": v["media_id"], "local_image_path": v["local_image_path"]})

            if asset["references"]:
                asset["media_id"] = asset["references"][0]["media_id"]
                asset["local_image_path"] = asset["references"][0]["local_image_path"]
            else:
                asset["media_id"] = None
                asset["local_image_path"] = None

            _save_metadata(metadata)
            return {"status": "success", "metadata": metadata}
    return {"status": "error"}
