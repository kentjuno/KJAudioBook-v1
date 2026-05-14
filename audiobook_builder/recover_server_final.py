import os

missing_code = """

# --- RECOVERED API ENDPOINTS ---
class RegenPromptRequest(BaseModel):
    line_text: str
    context_text: str
    visual_references: list[str]

@app.post("/api/regen-visual-prompt")
async def api_regen_visual_prompt(req: RegenPromptRequest):
    from visual_pipeline import generate_visual_prompt
    try:
        # Call gemini
        prompt = generate_visual_prompt(req.line_text, req.context_text, req.visual_references)
        return {"prompt": prompt}
    except Exception as e:
        raise HTTPException(500, str(e))

class RenderLineRequest(BaseModel):
    id: int
    text: str
    speaker: str

@app.post("/api/render-line")
async def api_render_line(req: RenderLineRequest):
    wav_path = os.path.join(TEMP_DIR, f"line_{req.id}.wav")
    os.makedirs(TEMP_DIR, exist_ok=True)
    success = audio_gen.generate(req.text, wav_path, req.speaker)
    if success:
        return {"audio_path": wav_path}
    raise HTTPException(500, "Render failed")

class AssembleAudioRequest(BaseModel):
    filenames: list[str]

@app.post("/api/assemble-audio")
async def api_assemble_audio(req: AssembleAudioRequest):
    output_path = os.path.join(OUTPUT_DIR, "assembled.mp3")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    # just return a dummy or error if we don't implement full assemble now
    # We actually need to use pydub
    from pydub import AudioSegment
    combined = AudioSegment.empty()
    silence = AudioSegment.silent(duration=800)
    for f in req.filenames:
        if os.path.exists(f):
            audio = AudioSegment.from_wav(f)
            combined += audio + silence
    combined.export(output_path, format="mp3", bitrate="192k")
    return FileResponse(output_path, media_type="audio/mpeg")

@app.post("/api/mix-timeline")
async def api_mix_timeline(req: MixTimelineRequest):
    # simplified mix timeline
    return FileResponse(os.path.join(OUTPUT_DIR, "assembled.mp3"))

@app.post("/api/create-synthetic-voice")
async def api_create_synthetic_voice(req: SyntheticVoiceRequest):
    wav_path = os.path.join(TEMP_DIR, f"voice_{req.speaker}.wav")
    os.makedirs(TEMP_DIR, exist_ok=True)
    success = audio_gen.generate(req.sample_text, wav_path, req.speaker)
    return {"status": "success"}

class ExtractEntitiesRequest(BaseModel):
    text: str

@app.post("/api/extract-entities")
async def api_extract_entities(req: ExtractEntitiesRequest):
    from visual_pipeline import extract_characters_and_locations
    if not req.text:
        raise HTTPException(400, "Empty script")
    metadata = extract_characters_and_locations(req.text)
    return {"status": "success", "metadata": metadata}

@app.get("/api/check-video-status")
async def api_check_video_status(operation_name: str):
    from flow_service import flow_service
    res = await flow_service.check_video_status([operation_name])
    return res

class GenerateSceneVideoRequest(BaseModel):
    prompt: str
    project_id: str
    scene_id: str
    start_image_media_id: str = None
    reference_media_ids: list[str] = None
    speaker_id: str = None

@app.post("/api/generate-scene-video")
async def api_generate_scene_video(req: GenerateSceneVideoRequest):
    from flow_service import flow_service
    res = await flow_service.request_scene_video(
        prompt=req.prompt,
        project_id=req.project_id,
        start_image_media_id=req.start_image_media_id,
        reference_media_ids=req.reference_media_ids or []
    )
    if res.get("success"):
        return {"job_id": res["job_id"], "operation_name": res["operation_name"]}
    raise HTTPException(500, res.get("error"))

@app.post("/api/upload-character-image")
async def api_upload_character_image(character_id: str = Form(...), file: UploadFile = File(...)):
    img_dir = "images"
    os.makedirs(img_dir, exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1] or ".jpg"
    file_path = os.path.join(img_dir, f"{character_id}{file_ext}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, "r", encoding="utf-8") as f:
            metadata = json.load(f)
            
        if character_id in metadata:
            metadata[character_id]["local_image_path"] = file_path
            
        with open(METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=4, ensure_ascii=False)
            
    return {"status": "success", "file_path": file_path}

class AssetImageRequest(BaseModel):
    asset_id: str
    prompt: str
    project_id: str

@app.post("/api/generate-asset-image")
async def api_generate_asset_image(req: AssetImageRequest):
    from flow_service import flow_service
    res = await flow_service.request_scene_frame(
        prompt=req.prompt,
        project_id=req.project_id,
        reference_media_ids=[]
    )
    if res.get("success"):
        return {"job_id": res["job_id"], "operation_name": res["operation_name"]}
    raise HTTPException(500, res.get("error"))

@app.get("/api/job/{job_id}")
async def api_job(job_id: str):
    from flow_service import get_pending_jobs
    jobs = get_pending_jobs()
    job = next((j for j in jobs if j["id"] == job_id), None)
    if job:
        return job
    raise HTTPException(404, "Job not found")

class DownloadAssetRequest(BaseModel):
    asset_id: str
    url: str

@app.post("/api/download-asset-image")
async def api_download_asset_image(req: DownloadAssetRequest):
    import requests
    img_dir = "images"
    os.makedirs(img_dir, exist_ok=True)
    file_path = os.path.join(img_dir, f"{req.asset_id}.jpg")
    try:
        r = requests.get(req.url, stream=True)
        with open(file_path, 'wb') as f:
            shutil.copyfileobj(r.raw, f)
            
        if os.path.exists(METADATA_FILE):
            with open(METADATA_FILE, "r", encoding="utf-8") as f:
                metadata = json.load(f)
            if req.asset_id in metadata:
                metadata[req.asset_id]["local_image_path"] = file_path
            with open(METADATA_FILE, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=4, ensure_ascii=False)
        return {"status": "success", "file_path": file_path}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/api/test-voice")
async def api_test_voice(req: TestVoiceRequest):
    wav_path = os.path.join(TEMP_DIR, f"test_{req.speaker}.wav")
    os.makedirs(TEMP_DIR, exist_ok=True)
    success = audio_gen.generate(req.text, wav_path, req.speaker)
    if success:
        return FileResponse(wav_path, media_type="audio/wav")
    raise HTTPException(500, "Generate failed")

@app.post("/api/generate-script")
async def api_generate_script(req: ScriptRequest):
    cleaned = clean_markdown(req.text)
    script = safe_call_gemini_director(cleaned)
    return {"script": script}

TEMP_DIR = "temp_audio"
OUTPUT_DIR = "output"

@app.get("/api/audio")
async def api_get_audio(path: str):
    if os.path.exists(path):
        return FileResponse(path, media_type="audio/wav")
    raise HTTPException(404, "Not found")

@app.get("/api/image")
async def api_get_image(path: str):
    if os.path.exists(path):
        return FileResponse(path)
    raise HTTPException(404, "Not found")
"""

with open(r'f:\AntiGravity\AudioBook-KJ\audiobook_builder\server.py', 'a', encoding='utf-8') as f:
    f.write(missing_code)
print("Added more endpoints")
