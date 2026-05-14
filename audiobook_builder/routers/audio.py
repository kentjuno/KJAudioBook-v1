import os
import soundfile as sf
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pydub import AudioSegment
from state import audio_gen, TEMP_DIR, OUTPUT_DIR

router = APIRouter()


class RenderLineRequest(BaseModel):
    id: int
    text: str
    speaker: str


class AssembleAudioRequest(BaseModel):
    filenames: list[str]


class TestVoiceRequest(BaseModel):
    text: str
    speaker: str


class SyntheticVoiceRequest(BaseModel):
    speaker: str
    instruct: str
    sample_text: str = (
        "Xin chào, hệ thống đã ghi nhận thành công chất giọng chuẩn của tôi. "
        "Với thiết lập này, tôi có thể truyền đạt mọi cung bậc cảm xúc một cách tự nhiên nhất, "
        "từ những lời thì thầm bí ẩn cho đến những đoạn cao trào dữ dội. "
        "Hãy lưu giữ bản ghi âm mẫu này thật kỹ để đảm bảo độ nhất quán tuyệt đối "
        "cho toàn bộ câu chuyện dài kỳ của chúng ta nhé."
    )


@router.get("/api/audio")
async def api_get_audio(path: str):
    if os.path.exists(path):
        return FileResponse(path, media_type="audio/wav")
    raise HTTPException(404, "Not found")


@router.post("/api/render-line")
async def api_render_line(req: RenderLineRequest):
    os.makedirs(TEMP_DIR, exist_ok=True)
    wav_path = os.path.join(TEMP_DIR, f"line_{req.id}.wav")
    success = audio_gen.generate(req.text, wav_path, req.speaker)
    if not success:
        raise HTTPException(500, "Render failed")
    try:
        info = sf.info(wav_path)
        duration = info.frames / info.samplerate
    except Exception:
        duration = 2.0
    return {"audio_path": wav_path, "file": wav_path, "duration": duration}


@router.post("/api/assemble-audio")
async def api_assemble_audio(req: AssembleAudioRequest):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, "assembled.mp3")
    combined = AudioSegment.empty()
    silence = AudioSegment.silent(duration=800)
    for f in req.filenames:
        if os.path.exists(f):
            combined += AudioSegment.from_wav(f) + silence
    combined.export(output_path, format="mp3", bitrate="192k")
    return FileResponse(output_path, media_type="audio/mpeg")


@router.post("/api/test-voice")
async def api_test_voice(req: TestVoiceRequest):
    os.makedirs(TEMP_DIR, exist_ok=True)
    wav_path = os.path.join(TEMP_DIR, f"test_{req.speaker}.wav")
    if audio_gen.generate(req.text, wav_path, req.speaker):
        return FileResponse(wav_path, media_type="audio/wav")
    raise HTTPException(500, "Generate failed")


@router.post("/api/create-synthetic-voice")
async def api_create_synthetic_voice(req: SyntheticVoiceRequest):
    os.makedirs(TEMP_DIR, exist_ok=True)
    wav_path = os.path.join(TEMP_DIR, f"voice_{req.speaker}.wav")
    audio_gen.generate(req.sample_text, wav_path, req.speaker)
    return {"status": "success"}
