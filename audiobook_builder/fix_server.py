import os
import json

content = open('server.py', encoding='utf-8').read()
lines = content.split('\n')
start = -1
end = -1
for i, line in enumerate(lines):
    if line.startswith('@app.post("/api/download-asset-image")'):
        start = i
    if line.startswith('TEMP_DIR = "temp_audio"'):
        end = i
        break

if start != -1 and end != -1:
    replacement = '''@app.post("/api/download-asset-image")
async def api_download_asset_image(req: DownloadAssetRequest):
    import requests
    img_dir = "images"
    os.makedirs(img_dir, exist_ok=True)
    file_path = os.path.join(img_dir, f"{req.asset_id}.jpg")
    try:
        r = requests.get(req.url, stream=True)
        with open(file_path, 'wb') as f:
            shutil.copyfileobj(r.raw, f)
            
        metadata = {}
        if os.path.exists(METADATA_FILE):
            with open(METADATA_FILE, "r", encoding="utf-8") as f:
                metadata = json.load(f)
            if req.asset_id in metadata:
                metadata[req.asset_id]["local_image_path"] = file_path
            with open(METADATA_FILE, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=4, ensure_ascii=False)
        return {"status": "success", "file_path": file_path, "metadata": metadata}
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

'''
    new_content = '\n'.join(lines[:start]) + '\n' + replacement + '\n'.join(lines[end:])
    open('server.py', 'w', encoding='utf-8').write(new_content)
    print('Fixed server.py download block')
else:
    print('Not found')
