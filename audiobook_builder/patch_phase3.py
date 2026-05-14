import os
import json
import subprocess

def patch_visual_pipeline():
    code = '''
def generate_storyboard(script_lines, metadata):
    import json, subprocess
    
    # Chuẩn bị dữ liệu
    script_text = ""
    for line in script_lines:
        script_text += f"[{line.get('id')} - {line.get('speaker')}]: {line.get('text')}\\n"
        
    metadata_text = json.dumps(metadata, ensure_ascii=False)
    
    system_prompt = f"""Bạn là một AI Video Director.
Nhiệm vụ của bạn là phân tích đoạn kịch bản âm thanh và chia nó thành các Cảnh quay (Shots).
Mỗi Shot nên kéo dài khoảng 5-10 giây (bao gồm vài câu thoại).
Dưới đây là danh sách Visual Assets (Characters & Locations) mà hệ thống đang có:
{metadata_text}

QUY TẮC:
1. Bạn phải gộp nhiều câu thoại liên tiếp vào cùng 1 shot nếu chúng xảy ra cùng một bối cảnh/hành động.
2. Trả về đúng ĐỊNH DẠNG JSON MẢNG sau, không có text dư thừa:
[
  {{
    "shot_id": 1,
    "script_line_ids": [0, 1],
    "asset_ids": ["spaceship_bridge", "kael"],
    "visual_prompt": "Cinematic shot of Kael standing inside the ruined spaceship bridge, looking determined, neon lights flickering."
  }},
  ...
]
- "asset_ids": Mảng chứa các "id" của Visual Assets tham gia vào Shot này. CHỈ DÙNG các id có trong danh sách trên.
- "visual_prompt": Mô tả thật chi tiết để đưa cho AI tạo ảnh. BẮT BUỘC BẰNG TIẾNG ANH.
"""
    full_prompt = f"SYSTEM INSTRUCTION:\\n{system_prompt}\\n\\nUSER SCRIPT:\\n{script_text}\\n"
    
    process = subprocess.Popen(
        ['cmd.exe', '/c', 'gemini', '--skip-trust', '-o', 'json'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding='utf-8'
    )
    
    stdout_data, stderr_data = process.communicate(input=full_prompt)
    
    if process.returncode != 0:
        print(f"Gemini CLI Error: {stderr_data}")
        return []
        
    try:
        telemetry = json.loads(stdout_data.strip())
        ai_text = telemetry.get('response', '').strip()
        
        if ai_text.startswith('```json'): ai_text = ai_text.replace('```json\\n', '', 1)
        if ai_text.endswith('```'): ai_text = ai_text[:-3].strip()
        if ai_text.startswith('```'): ai_text = ai_text.replace('```\\n', '', 1)
            
        return json.loads(ai_text)
    except Exception as e:
        print(f"Lỗi Parse Storyboard JSON từ Gemini: {e}")
        return []
'''
    with open('f:\\AntiGravity\\AudioBook-KJ\\audiobook_builder\\visual_pipeline.py', 'a', encoding='utf-8') as f:
        f.write("\n" + code)

def patch_server():
    code = '''
class StoryboardRequest(BaseModel):
    script: list[dict]
    metadata: dict

@app.post("/api/generate-storyboard")
async def api_generate_storyboard(req: StoryboardRequest):
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
async def api_generate_scene_frame(req: SceneFrameRequest):
    from flow_service import flow_service
    res = await flow_service.request_scene_frame(
        prompt=req.prompt,
        project_id=req.project_id,
        reference_media_ids=req.reference_media_ids or []
    )
    if res.get("success"):
        return {"job_id": res["job_id"], "operation_name": res["operation_name"]}
    raise HTTPException(500, res.get("error"))
'''
    with open('f:\\AntiGravity\\AudioBook-KJ\\audiobook_builder\\server.py', 'a', encoding='utf-8') as f:
        f.write("\n" + code)

if __name__ == "__main__":
    patch_visual_pipeline()
    patch_server()
    print("Patched Phase 3 API!")
