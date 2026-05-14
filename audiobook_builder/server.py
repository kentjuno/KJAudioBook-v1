from typing import Optional

# --- Fix for Windows ConnectionResetError in asyncio ---
import sys
if sys.platform == 'win32':
    import asyncio
    from functools import wraps
    try:
        from asyncio.proactor_events import _ProactorBasePipeTransport
        _original_call_connection_lost = _ProactorBasePipeTransport._call_connection_lost
        
        @wraps(_original_call_connection_lost)
        def silence_event_loop_closed(self, *args, **kwargs):
            try:
                return _original_call_connection_lost(self, *args, **kwargs)
            except (ConnectionResetError, RuntimeError):
                pass
                
        _ProactorBasePipeTransport._call_connection_lost = silence_event_loop_closed
    except ImportError:
        pass
# -------------------------------------------------------

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Request, Form, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
from text_processor import clean_markdown, safe_call_gemini_director, chunk_text
from visual_pipeline import update_entities_metadata, get_valid_media_id, METADATA_FILE
from audio_generator import AudioGenerator
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import soundfile as sf
import json
import asyncio
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Khởi chạy hệ thống Background Job Polling cho FlowKit...")
    asyncio.create_task(poll_jobs_loop())
    yield

app = FastAPI(title="Audiobook Factory Studio API", lifespan=lifespan)
PROFILE_FILE = os.path.join(os.path.dirname(__file__), "project_profile.json")

# Cấu hình CORS để Frontend (React) có thể gọi được API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Trong production nên set cụ thể localhost:3000
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khởi tạo AudioGenerator một lần khi boot server để model luôn sẵn sàng trên RAM/VRAM
# Chú ý: Việc này tốn nhiều RAM, nếu máy yếu có thể khởi tạo Lazy
print("Đang boot server và load mô hình AI...")
audio_gen = AudioGenerator()
print("Boot hoàn tất!")

class ScriptRequest(BaseModel):
    text: str

class TestVoiceRequest(BaseModel):
    text: str
    speaker: str

class SyntheticVoiceRequest(BaseModel):
    speaker: str
    instruct: str
    sample_text: str = "Xin chào, hệ thống đã ghi nhận thành công chất giọng chuẩn của tôi. Với thiết lập này, tôi có thể truyền đạt mọi cung bậc cảm xúc một cách tự nhiên nhất, từ những lời thì thầm bí ẩn cho đến những đoạn cao trào dữ dội. Hãy lưu giữ bản ghi âm mẫu này thật kỹ để đảm bảo độ nhất quán tuyệt đối cho toàn bộ câu chuyện dài kỳ của chúng ta nhé."

class RenderLineRequest(BaseModel):
    id: int
    text: str
    speaker: str

class AssembleRequest(BaseModel):
    filenames: list[str]

from typing import List
class TimelineClipRequest(BaseModel):
    filename: str
    startTime: float
    track: int

class MixTimelineRequest(BaseModel):
    clips: List[TimelineClipRequest]

class TimelineVideoClipRequest(BaseModel):
    videoUrl: str
    startTime: float
    duration: float
    trimStart: float = 0.0
    keepSound: bool = False
    volume: float = 100.0

class MixVideoTimelineRequest(BaseModel):
    audio_clips: List[TimelineClipRequest]
    video_clips: List[TimelineVideoClipRequest]

from flow_service import flow_service, get_pending_jobs, update_job_status
import asyncio
import json

# --- FlowKit Extension Globals ---
flowkit_state = {
    "flowKey": None,
    "callbackSecret": "audiobook_secret_key_123",
    "active_ws": None
}

@app.websocket("/ws/flowkit")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    flowkit_state["active_ws"] = websocket
    flow_service.active_ws = websocket
    print("[FlowKit] Extension connected via WebSocket")
    
    # Gửi secret cho extension để gọi lại callback
    await websocket.send_json({"type": "callback_secret", "secret": flowkit_state["callbackSecret"]})
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg.get("type") == "token_captured":
                flowkit_state["flowKey"] = msg.get("flowKey")
                print("[FlowKit] Nhận được FlowKey mới từ trình duyệt!")
                
            elif msg.get("type") == "extension_ready":
                print(f"[FlowKit] Extension ready. FlowKey present: {msg.get('flowKeyPresent')}")
                
            elif msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                
            elif msg.get("type") == "media_urls_refresh":
                # Handle captured media URLs (for custom uploaded images)
                print(f"[FlowKit] Nhận được {len(msg.get('urls', []))} media URLs từ TRPC")
                
            else:
                # Có thể là response trả về cho API request gửi qua WS
                flow_service.resolve_request(msg)
                
    except WebSocketDisconnect:
        print("[FlowKit] Extension disconnected")
        flowkit_state["active_ws"] = None
        flow_service.active_ws = None
    except Exception as e:
        print(f"[FlowKit] Lỗi WebSocket: {e}")
        flowkit_state["active_ws"] = None
        flow_service.active_ws = None

@app.post("/api/ext/callback")
async def ext_callback(request: Request):
    # Extension gọi HTTP POST về đây khi hoàn thành API request
    data = await request.json()
    print(f"[FlowKit Callback] Nhận kết quả từ extension, id: {data.get('id')}")
    flow_service.resolve_request(data)
    return {"status": "received"}


async def poll_jobs_loop():
    from flow_service import get_pending_jobs, flow_service, update_job_status
    import uuid
    import asyncio
    
    while True:
        try:
            pending_jobs = get_pending_jobs()
            if pending_jobs and flow_service.active_ws:
                for job in pending_jobs:
                    if job.get("media_id"):
                        res = await flow_service.check_media_status(job["media_id"])
                        if res and res.get("status") == 200:
                            data = res.get("data", {})
                            video_data = data.get("video", {})
                            fife_url = video_data.get("generatedVideo", {}).get("fifeUrl") or video_data.get("fifeUrl") or data.get("fifeUrl")
                            if fife_url:
                                update_job_status(job["id"], "DONE", media_id=job["media_id"], url=fife_url)
                    elif job.get("operation_name"):
                        res = await flow_service.check_video_status([job["operation_name"]])
                        if res and res.get("status") == 200:
                            data = res.get("data", {})
                            for op in data.get("operations", []):
                                op_name = op.get("name")
                                done = op.get("done", False)
                                if done and op_name == job["operation_name"]:
                                    response_data = op.get("response", {})
                                    if "error" in op:
                                        update_job_status(job["id"], "FAILED", url=str(op["error"]))
                                    else:
                                        media = response_data.get("generatedMedia", {}).get("media", {})
                                        media_id = media.get("name")
                                        url = ""
                                        media_uri = media.get("uri", "")
                                        if media_uri:
                                            url = "https://labs.google/fx/api/media?path=" + media_uri
                                        update_job_status(job["id"], "DONE", media_id=media_id, url=url)
        except Exception as e:
            print("Lỗi trong poll_jobs_loop:", e)
        await asyncio.sleep(5)




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
        try:
            info = sf.info(wav_path)
            duration = info.frames / info.samplerate
        except Exception:
            duration = 2.0
        return {"audio_path": wav_path, "file": wav_path, "duration": duration}
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

from pydub import AudioSegment
import math

@app.post("/api/mix-timeline")
async def api_mix_timeline(req: MixTimelineRequest):
    try:
        max_duration = 0
        audio_objects = []
        for clip in req.clips:
            if os.path.exists(clip.filename):
                clip_path = clip.filename
            else:
                clip_path = os.path.join(TEMP_DIR, os.path.basename(clip.filename))
            
            if not os.path.exists(clip_path):
                # Fallback to checking output dir or current dir
                fallback = os.path.join(OUTPUT_DIR, os.path.basename(clip.filename))
                if os.path.exists(fallback):
                    clip_path = fallback
                else:
                    continue
            audio = AudioSegment.from_file(clip_path)
            end_time = (clip.startTime * 1000) + len(audio)
            if end_time > max_duration:
                max_duration = end_time
            audio_objects.append((audio, int(clip.startTime * 1000)))

        if not audio_objects:
            raise Exception("No valid audio clips found to mix.")

        final_audio = AudioSegment.silent(duration=math.ceil(max_duration))
        for audio, pos in audio_objects:
            final_audio = final_audio.overlay(audio, position=pos)
        
        output_path = os.path.join(OUTPUT_DIR, "assembled.mp3")
        final_audio.export(output_path, format="mp3")
        return FileResponse(output_path, media_type="audio/mpeg")
    except Exception as e:
        print(f"Mix Error: {e}")
        raise HTTPException(500, str(e))

@app.post("/api/mix-video-timeline")
async def api_mix_video_timeline(req: MixVideoTimelineRequest):
    import requests
    import subprocess
    import math
    from urllib.parse import urlparse, parse_qs
    try:
        max_duration = 0
        audio_objects = []
        for clip in req.audio_clips:
            if os.path.exists(clip.filename):
                clip_path = clip.filename
            else:
                clip_path = os.path.join(TEMP_DIR, os.path.basename(clip.filename))
            
            if not os.path.exists(clip_path):
                # Fallback to checking output dir
                fallback = os.path.join(OUTPUT_DIR, os.path.basename(clip.filename))
                if os.path.exists(fallback):
                    clip_path = fallback
                else:
                    print(f"Missing audio clip: {clip_path} (from {clip.filename})")
                    continue
            audio = AudioSegment.from_file(clip_path)
            end_time = (clip.startTime * 1000) + len(audio)
            if end_time > max_duration:
                max_duration = end_time
            audio_objects.append((audio, int(clip.startTime * 1000)))

        # Resolve Videos
        temp_dir = os.path.join(OUTPUT_DIR, "temp_videos")
        os.makedirs(temp_dir, exist_ok=True)
        downloaded_videos = []
        for i, vc in enumerate(req.video_clips):
            local_path = ""
            parsed = urlparse(vc.videoUrl)
            qs = parse_qs(parsed.query)
            if "path" in qs and os.path.exists(qs["path"][0]):
                local_path = qs["path"][0]
                print(f"Found local video path: {local_path}")
            else:
                local_path = os.path.join(temp_dir, f"video_{i}.mp4")
                print(f"Downloading remote video: {vc.videoUrl}")
                try:
                    r = requests.get(vc.videoUrl, stream=True, timeout=15)
                    if r.status_code == 200:
                        with open(local_path, 'wb') as f:
                            for chunk in r.iter_content(chunk_size=8192):
                                f.write(chunk)
                        print(f"Downloaded video to {local_path}")
                    else:
                        print(f"Failed to download video {vc.videoUrl}, status: {r.status_code}")
                        continue
                except Exception as e:
                    print(f"Error downloading {vc.videoUrl}: {e}")
                    continue
            
            downloaded_videos.append({
                "path": local_path, 
                "start": vc.startTime, 
                "dur": vc.duration, 
                "trimStart": vc.trimStart,
                "keepSound": vc.keepSound,
                "volume": getattr(vc, 'volume', 100.0)
            })
            video_end_time = (vc.startTime + vc.duration) * 1000
            if video_end_time > max_duration:
                max_duration = video_end_time

        if not audio_objects and not downloaded_videos:
            raise Exception("No valid audio or video clips found to mix.")

        final_audio = AudioSegment.silent(duration=math.ceil(max_duration))
        for audio, pos in audio_objects:
            final_audio = final_audio.overlay(audio, position=pos)

        # Trộn thêm âm thanh gốc của Video vào Master Audio
        for dv in downloaded_videos:
            if not dv["keepSound"]:
                continue
            try:
                vid_audio = AudioSegment.from_file(dv["path"])
                trim_start_ms = dv.get("trimStart", 0.0) * 1000
                trim_dur_ms = dv["dur"] * 1000
                vid_audio = vid_audio[trim_start_ms : trim_start_ms + trim_dur_ms]
                
                volume_percent = dv.get("volume", 100.0)
                if volume_percent != 100.0:
                    if volume_percent <= 0:
                        vid_audio = vid_audio - 100 # mute
                    else:
                        db_change = 20 * math.log10(volume_percent / 100.0)
                        vid_audio = vid_audio + db_change
                
                # Nếu video có âm thanh, mix nó vào
                final_audio = final_audio.overlay(vid_audio, position=int(dv["start"] * 1000))
            except Exception:
                # Bỏ qua nếu video không có file stream audio (ví dụ video câm từ AI)
                pass

        audio_out = os.path.join(OUTPUT_DIR, "assembled.mp3")
        final_audio.export(audio_out, format="mp3")

        if not downloaded_videos:
            raise Exception("No valid video clips were downloaded.")
            
        # Build FFmpeg command
        out_video = os.path.join(OUTPUT_DIR, "assembled.mp4")
        
        inputs = []
        filter_complex = f"color=c=black:s=1280x720:d={max_duration/1000}[base];"
        
        for i, dv in enumerate(downloaded_videos):
            inputs.extend(["-i", dv["path"]])
            filter_complex += f"[{i}:v]trim=start={dv.get('trimStart', 0.0)}:duration={dv['dur']},setpts=PTS-STARTPTS+{dv['start']}/TB,scale=1280:720[v{i}];"
            
        prev_link = "[base]"
        for i, dv in enumerate(downloaded_videos):
            next_link = f"[ov{i}]" if i < len(downloaded_videos) - 1 else "[v_out]"
            filter_complex += f"{prev_link}[v{i}]overlay=enable='between(t,{dv['start']},{dv['start']+dv['dur']})'{next_link};"
            prev_link = next_link
            
        inputs.extend(["-i", audio_out]) # Audio is the last input
        
        cmd = ["ffmpeg", "-y"] + inputs + [
            "-filter_complex", filter_complex,
            "-map", "[v_out]",
            "-map", f"{len(downloaded_videos)}:a",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
            out_video
        ]
        
        print("Running FFmpeg:", " ".join(cmd))
        subprocess.run(cmd, check=True)
        
        return FileResponse(out_video, media_type="video/mp4")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Mix Video Error: {e}")
        raise HTTPException(500, str(e))

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
async def api_check_video_status(operation_name: str = None, media_id: str = None):
    from flow_service import flow_service
    if media_id:
        res = await flow_service.check_media_status(media_id)
    elif operation_name:
        res = await flow_service.check_video_status([operation_name])
    else:
        raise HTTPException(status_code=400, detail="Missing operation_name or media_id")
        
    error_obj = res.get("error", {})
    if res.get("status") and res.get("status") >= 400:
        status_code = res.get("status")
        raise HTTPException(status_code=status_code, detail=str(error_obj))
        
    if res.get("status") == 200 and "data" in res:
        video_data = res["data"].get("video", {})
        if "encodedVideo" in video_data:
            import base64
            encoded = video_data.get("encodedVideo")
            try:
                video_bytes = base64.b64decode(encoded, validate=False)
                # MP4 box layout: bytes 4..8 == "ftyp" on a complete file.
                is_mp4 = len(video_bytes) >= 12 and video_bytes[4:8] == b"ftyp"
                if is_mp4:
                    video_data.pop("encodedVideo") # save json payload size
                    vid_id = media_id if media_id else operation_name
                    vid_id = str(vid_id)
                    vid_filename = "video_" + "".join([c for c in vid_id if c.isalpha() or c.isdigit() or c in "-_."]) + ".mp4"
                    vid_path = os.path.abspath(os.path.join("temp_audio", vid_filename))
                    os.makedirs("temp_audio", exist_ok=True)
                    with open(vid_path, "wb") as f:
                        f.write(video_bytes)
                    video_data["fifeUrl"] = f"http://localhost:8000/api/video?path={vid_path}"
                    print(f"Decoded video saved to {vid_path}")
            except Exception as e:
                print(f"Failed to decode video: {e}")

    return res

@app.get("/api/video")
async def api_get_video(path: str):
    if os.path.exists(path):
        return FileResponse(path, media_type="video/mp4")
    raise HTTPException(404, "Not found")


class GenerateSceneVideoRequest(BaseModel):
    prompt: str
    project_id: str
    scene_id: str
    start_image_media_id: Optional[str] = None
    reference_media_ids: Optional[list[str]] = None
    speaker_id: Optional[str] = None

@app.post("/api/generate-scene-video")
async def api_generate_scene_video(req: GenerateSceneVideoRequest):
    from flow_service import flow_service
    res = await flow_service.request_scene_video(
        prompt=req.prompt,
        project_id=req.project_id,
        scene_id=req.scene_id,
        start_image_media_id=req.start_image_media_id,
        reference_media_ids=req.reference_media_ids or []
    )
    if res.get("success"):
        out = {"job_id": res["job_id"], "operation_name": res["operation_name"]}
        if "primary_media_id" in res:
            out["primary_media_id"] = res["primary_media_id"]
        return out
    error_obj = res.get("error", {})
    status_code = error_obj.get("status", 500)
    raise HTTPException(status_code=status_code, detail=str(error_obj))

@app.post("/api/debug-veo")
async def api_debug_veo(request: Request):
    from flow_service import flow_service
    body = await request.json()
    url = flow_service._build_url("/v1/video:batchCheckAsyncVideoGenerationStatus")
    res = await flow_service._send("api_request", {
        "url": url,
        "method": "POST",
        "headers": {"content-type": "application/json"},
        "body": body
    })
    return res

@app.post("/api/upload-character-image")
async def api_upload_character_image(character_id: str = Form(...), file: UploadFile = File(...)):
    import time
    img_dir = "images"
    os.makedirs(img_dir, exist_ok=True)
    timestamp = int(time.time())
    file_ext = os.path.splitext(file.filename)[1] or ".jpg"
    file_path = os.path.join(img_dir, f"{character_id}_{timestamp}{file_ext}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    metadata = {}
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, "r", encoding="utf-8") as f:
            metadata = json.load(f)
            
        if character_id in metadata:
            asset = metadata[character_id]
            asset["local_image_path"] = file_path
            
            if "variations" not in asset:
                asset["variations"] = []
                
            asset["variations"].append({
                "id": str(timestamp),
                "local_image_path": file_path,
                "media_id": None,
                "prompt": "Uploaded by User",
                "created_at": timestamp
            })
            
        with open(METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=4, ensure_ascii=False)
            
    return {"status": "success", "file_path": file_path, "metadata": metadata}

class AssetImageRequest(BaseModel):
    asset_id: str
    prompt: str
    project_id: str
    reference_media_ids: Optional[List[str]] = []

@app.post("/api/generate-asset-image")
async def generate_asset_image(req: AssetImageRequest):
    """Fallback flow for generating asset images using Flow Service"""
    try:
        from flow_service import flow_service
        # Call the synchronous-like flow image generation endpoint
        res = await flow_service.request_scene_frame(
            prompt=req.prompt,
            project_id=req.project_id,
            reference_media_ids=req.reference_media_ids
        )
        if not res.get("success"):
            raise HTTPException(status_code=500, detail=str(res.get("error")))
            
        return {"url": res["url"], "media_id": res["media_id"]}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class DownloadAssetRequest(BaseModel):
    asset_id: str
    url: str
    media_id: Optional[str] = None
    prompt: Optional[str] = None
    name: Optional[str] = None

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
                    "name": req.name,
                    "created_at": timestamp
                })
                
            with open(METADATA_FILE, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=4, ensure_ascii=False)
        return {"status": "success", "file_path": file_path, "metadata": metadata}
    except Exception as e:
        raise HTTPException(500, str(e))

class DeleteVariationRequest(BaseModel):
    asset_id: str
    variation_id: str

@app.post("/api/delete-variation")
async def api_delete_variation(req: DeleteVariationRequest):
    if not os.path.exists(METADATA_FILE):
        return {"status": "error", "message": "Metadata file not found"}
    with open(METADATA_FILE, "r", encoding="utf-8") as f:
        metadata = json.load(f)
    if req.asset_id in metadata:
        asset = metadata[req.asset_id]
        if "variations" in asset:
            variations = asset["variations"]
            for v in variations:
                if v.get("id") == req.variation_id:
                    path = v.get("local_image_path")
                    if path and os.path.exists(path):
                        try:
                            os.remove(path)
                        except:
                            pass
                    break
            asset["variations"] = [v for v in variations if v.get("id") != req.variation_id]
        with open(METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=4, ensure_ascii=False)
        return {"status": "success", "metadata": metadata}
    return {"status": "error", "message": "Asset not found"}

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


class StoryboardRequest(BaseModel):
    script: list[dict]
    metadata: dict

@app.post("/api/generate-storyboard")
def api_generate_storyboard(req: StoryboardRequest):
    from visual_pipeline import generate_storyboard
    try:
        shots = generate_storyboard(req.script, req.metadata)
        return {"shots": shots}
    except Exception as e:
        raise HTTPException(500, str(e))

class SceneFrameRequest(BaseModel):
    prompt: str
    project_id: str
    reference_media_ids: list[str] = None

@app.post("/api/generate-scene-frame")
async def generate_scene_frame(req: SceneFrameRequest):
    """Legacy single image generation route."""
    try:
        from flow_service import flow_service
        res = await flow_service.request_scene_frame(
            prompt=req.prompt,
            project_id=req.project_id,
            reference_media_ids=req.reference_media_ids
        )
        if not res.get("success"):
            raise HTTPException(status_code=500, detail=str(res.get("error")))
        return {"url": res["url"], "media_id": res["media_id"]}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class EnhancePromptRequest(BaseModel):
    prompt: str
    asset_type: str
    asset_name: str
    global_style: str = ""

@app.post("/api/enhance-prompt")
def api_enhance_prompt(req: EnhancePromptRequest):
    import subprocess
    sys_prompt = f"You are a professional Concept Art Prompt Engineer. Enhance the following short description for a '{req.asset_type}' named '{req.asset_name}' into a highly detailed, professional image generation prompt in English. Include details about lighting, camera angle, textures, and atmosphere."
    if req.global_style:
        sys_prompt += f" MANDATORY ART STYLE: {req.global_style}"
        
    sys_prompt += "\nReturn ONLY the prompt string, no markdown, no quotes."
    full_prompt = f"{sys_prompt}\n\nOriginal Description: {req.prompt}"
    
    process = subprocess.Popen(
        ['cmd.exe', '/c', 'gemini', '--skip-trust'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding='utf-8'
    )
    stdout_data, stderr_data = process.communicate(input=full_prompt)
    if process.returncode != 0:
        raise HTTPException(500, f"Gemini Error: {stderr_data}")
        
    return {"prompt": stdout_data.strip()}

class EnhanceMotionRequest(BaseModel):
    dialogue: str
    motion_prompt: str

@app.post("/api/enhance-motion")
def api_enhance_motion(req: EnhanceMotionRequest):
    import subprocess
    import os
    
    facs_guide_path = "../Docsref/FACS_Prompt_Guide.md"
    facs_content = ""
    if os.path.exists(facs_guide_path):
        with open(facs_guide_path, "r", encoding="utf-8") as f:
            facs_content = f.read()
            
    sys_prompt = f"""You are an expert Video AI Prompt Engineer specializing in Veo 3.1 and FACS (Facial Action Coding System).
Your task is to enhance the user's raw motion/emotion description into a cinematic motion prompt, incorporating precise FACS Action Units (AUs) if facial expressions are mentioned.

<FACS_REFERENCE>
{facs_content}
</FACS_REFERENCE>

Based on the dialogue and raw motion request below, output ONLY the enhanced motion prompt in English.
Make it cinematic (e.g. 'Camera pushes in slowly. Character performs AU 1+4 (sadness) while sighing.')
DO NOT output any markdown, explanations, or quotes.
"""
    full_prompt = f"{sys_prompt}\n\nDialogue: {req.dialogue}\nRaw Motion Request: {req.motion_prompt}"
    
    process = subprocess.Popen(
        ['cmd.exe', '/c', 'gemini', '--skip-trust'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding='utf-8'
    )
    stdout_data, stderr_data = process.communicate(input=full_prompt)
    if process.returncode != 0:
        raise HTTPException(500, f"Gemini Error: {stderr_data}")
        
    return {"prompt": stdout_data.strip()}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)