import os
import json
import subprocess
import time
import base64
import asyncio
import sys

sys.stdout.reconfigure(encoding='utf-8')

METADATA_FILE = os.path.join(os.path.dirname(__file__), "characters_metadata.json")

def call_gemini_for_entities(markdown_text, existing_metadata):
    system_prompt = f"""Bạn là một Đạo diễn Hình ảnh và Chuyên gia Concept Art.
Nhiệm vụ của bạn là đọc kịch bản Markdown và trích xuất ra các ĐỊA ĐIỂM/BỐI CẢNH (Locations) và NHÂN VẬT (Characters) quan trọng.
Đây là danh sách các nhân vật/địa điểm ĐÃ CÓ trong hệ thống:
{json.dumps(existing_metadata, ensure_ascii=False)}

QUY TẮC QUAN TRỌNG:
1. HÃY PHÂN TÍCH và trả về TOÀN BỘ danh sách các thực thể (cả CŨ lẫn MỚI) xuất hiện trong kịch bản.
2. BẮT BUỘC SẮP XẾP MẢNG JSON ĐẦU RA: Các thực thể loại "location" PHẢI NẰM Ở TRÊN CÙNG (trước tiên), sau đó mới tới các thực thể loại "character" ở bên dưới.
3. Đối với "image_prompt", bạn phải viết MÔ TẢ CỰC KỲ CHI TIẾT (về quần áo, góc mặt, vóc dáng, màu sắc, phong cách nghệ thuật, ánh sáng) để người dùng dùng nó nạp vào AI tạo ảnh và thu được sự ĐỒNG NHẤT (Consistency) cao nhất. Hãy dùng các từ khoá tạo ảnh chuyên nghiệp (ví dụ: cinematic lighting, 8k, hyper-detailed, character design sheet). Mọi image_prompt phải viết bằng TIẾNG ANH.

TUYỆT ĐỐI trả về đúng định dạng mảng JSON như sau, không có text dư thừa, không dùng markdown block:
[
  {{
    "id": "spaceship_bridge",
    "type": "location",
    "name": "Spaceship Bridge",
    "description": "Buồng lái phi thuyền hoang tàn, đèn neon chập chờn, bảng điều khiển vỡ nát, màn hình nhiễu sóng.",
    "image_prompt": "Interior of a ruined spaceship bridge, flickering neon blue and orange lights, shattered metallic control panels, glowing static screens, dark sci-fi atmosphere, claustrophobic lighting, volumetric fog, highly detailed, Unreal Engine 5 render, cinematic"
  }},
  {{
    "id": "kael",
    "type": "character",
    "name": "Kael",
    "description": "Chàng trai trẻ 20 tuổi, tóc đen ngắn hơi rối, mặc đồ phi hành gia rách rưới, ánh mắt kiên định, phong cách dark sci-fi.",
    "image_prompt": "Portrait of a 20-year-old young man, short messy black hair, sharp jawline, determined piercing brown eyes, wearing a heavily worn and torn futuristic white and grey astronaut suit with neon accents, dark sci-fi style, cinematic rim lighting, dramatic shadows, photorealistic, 8k resolution, highly detailed character concept art"
  }}
]
CHỈ trả về những thực thể CÓ XUẤT HIỆN trong đoạn kịch bản dưới đây. Mọi image_prompt phải viết bằng Tiếng Anh.
"""
    full_prompt = f"SYSTEM INSTRUCTION:\n{system_prompt}\n\nUSER SCRIPT:\n{markdown_text}\n"
    
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
        
        # Cleanup JSON
        if ai_text.startswith('```json'): ai_text = ai_text.replace('```json\n', '', 1)
        if ai_text.endswith('```'): ai_text = ai_text[:-3].strip()
        if ai_text.startswith('```'): ai_text = ai_text.replace('```\n', '', 1)
            
        return json.loads(ai_text)
    except Exception as e:
        print(f"Lỗi Parse JSON Entity từ Gemini: {e}")
        return []

def update_entities_metadata(markdown_text):
    metadata = {}
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
    else:
        print("Khởi tạo file metadata trống.")
        metadata = {}
        
    updated = False
        
    new_entities = call_gemini_for_entities(markdown_text, metadata)
    
    for ent in new_entities:
        eid = ent.get("id")
        if eid not in metadata:
            metadata[eid] = {
                "type": ent.get("type"),
                "name": ent.get("name"),
                "description": ent.get("description"),
                "image_prompt": ent.get("image_prompt", ""),
                "local_image_path": "", # User can generate image and save path here
                "media_id": None,
                "last_uploaded_at": 0
            }
            updated = True
            print(f"[Visual Pipeline] Phát hiện thực thể mới: {eid} ({ent.get('type')})")
            
        elif "image_prompt" not in metadata[eid] or metadata[eid]["image_prompt"] == "":
            metadata[eid]["image_prompt"] = ent.get("image_prompt", "")
            updated = True
            
    if updated:
        with open(METADATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=4)
            
    return metadata

async def get_valid_media_id(entity_id, project_id="audiobook"):
    """
    Kiểm tra media_id của entity. Nếu đã hết hạn (> 1 tiếng), tự động upload lại từ local_image_path.
    """
    if not os.path.exists(METADATA_FILE):
        return None
        
    with open(METADATA_FILE, 'r', encoding='utf-8') as f:
        metadata = json.load(f)
        
    if entity_id not in metadata:
        return None
        
    entity = metadata[entity_id]
    
    now = time.time()
    last_uploaded = entity.get("last_uploaded_at", 0)
    current_media_id = entity.get("media_id")
    current_media_project = entity.get("media_project_id", "")
    
    # 3500s buffer for 1-hour expiration
    if current_media_id and (now - last_uploaded < 3500) and current_media_project == project_id:
        return current_media_id
        
    local_path = entity.get("local_image_path")
    if not local_path or not os.path.exists(local_path):
        print(f"[Visual Pipeline] CẢNH BÁO: Thực thể '{entity_id}' thiếu hình ảnh neo (local_image_path)!")
        return None
        
    print(f"[Visual Pipeline] media_id của {entity_id} đã hết hạn. Đang upload lại ảnh neo lên FlowKit...")
    from flow_service import flow_service
    
    try:
        with open(local_path, "rb") as img_f:
            base64_data = base64.b64encode(img_f.read()).decode("utf-8")
            
        res = await flow_service.upload_image(base64_data, project_id=project_id)
        if res.get("success"):
            new_media_id = res.get("media_id")
            entity["media_id"] = new_media_id
            entity["last_uploaded_at"] = now
            entity["media_project_id"] = project_id
            
            metadata[entity_id] = entity
            with open(METADATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=4)
                
            print(f"[Visual Pipeline] Upload thành công! {entity_id} -> {new_media_id}")
            return new_media_id
        else:
            print(f"[Visual Pipeline] Upload lỗi cho {entity_id}: {res.get('error')}")
            return None
    except Exception as e:
        print(f"[Visual Pipeline] Lỗi upload ảnh {entity_id}: {e}")
        return None

if __name__ == "__main__":
    # Test
    sample_script = '''"Vô ích, Kael," giọng Elara vang lên, điềm tĩnh nhưng nghiêm khắc. 
Bà đứng cạnh cậu trong buồng điều khiển Spaceship Bridge đổ nát, đôi mắt xanh sáng rực.'''
    print("Đang quét kịch bản tìm thực thể...")
    metadata = update_entities_metadata(sample_script)
    print("Kết quả JSON:", json.dumps(metadata, ensure_ascii=False, indent=2))


def regenerate_line_prompt(line_text, context_text, visual_references):
    import os, json, subprocess
    from visual_pipeline import METADATA_FILE
    
    metadata = {}
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
            
    ref_descriptions = []
    for ref_id in visual_references:
        if ref_id in metadata:
            ref = metadata[ref_id]
            ref_descriptions.append(f"- {ref.get('name', ref_id)} ({ref.get('type', 'unknown')}): {ref.get('image_prompt', '')}")
            
    refs_str = "\n".join(ref_descriptions)
    
    system_prompt = f"""You are a Cinematographer and Concept Art Expert.
Your task is to write a short, concise Cinematic Video Prompt (under 50 words) in English to render a video for a dialogue/action line in a script.
Context and characters involved in this scene:
{refs_str}

Rules:
1. DO NOT repeat generic character names if they are already in visual_references. Describe the actions, expressions, or the environment.
2. Use standard Cinematic vocabulary: "Cinematic lighting", "8k resolution", "shot on 35mm lens", "hyper-detailed".
3. ONLY return the text string of the prompt, do not explain anything else."""

    user_prompt = f"""Previous context: {context_text}
Current line: {line_text}
Please write the English prompt for this scene:"""

    full_prompt = f"SYSTEM INSTRUCTION:\n{system_prompt}\n\nUSER PROMPT:\n{user_prompt}\n"

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
        return ""
        
    try:
        telemetry = json.loads(stdout_data.strip())
        ai_text = telemetry.get('response', '').strip()
        
        # Cleanup markdown and extra characters
        if ai_text.startswith('```markdown'): ai_text = ai_text.replace('```markdown\n', '', 1)
        if ai_text.startswith('```text'): ai_text = ai_text.replace('```text\n', '', 1)
        if ai_text.startswith('```'): ai_text = ai_text.replace('```\n', '', 1)
        if ai_text.endswith('```'): ai_text = ai_text[:-3].strip()
        if ai_text.startswith('"') and ai_text.endswith('"'): ai_text = ai_text[1:-1].strip()
        
        return ai_text.strip()
    except Exception as e:
        print(f"Error parsing Gemini CLI output: {e}")
        return ""

def call_gemini_director_storyboard(script_list, metadata_dict):
    system_prompt = f"""You are a professional Video Director and Storyboard Artist.
Your task is to take an Audio Script and the available Visual Assets, and break the script down into a sequence of camera "Shots" (Storyboard Nodes).

AVAILABLE ASSETS:
{json.dumps(metadata_dict, ensure_ascii=False)}

RULES:
1. Group short continuous dialogue lines into a single shot if they happen in the same camera angle. Split very long lines into multiple shots (roughly 5-8 seconds per shot).
2. For each shot, specify an array of 'asset_ids' (from the AVAILABLE ASSETS) that appear in the shot.
3. For each shot, write a detailed English 'visual_prompt' describing the camera angle, lighting, environment, and what the characters are doing. Use keywords like cinematic, 8k, highly detailed.
4. Return ONLY a JSON array of objects representing the shots.

Format:
[
  {{
    "id": "shot_1",
    "script_line_ids": [0, 1],
    "asset_ids": ["spaceship_bridge", "kael"],
    "visual_prompt": "Wide angle shot, Kael standing in the ruined spaceship bridge..."
  }}
]
"""
    user_prompt = f"AUDIO SCRIPT:\n{json.dumps(script_list, ensure_ascii=False)}"
    full_prompt = f"SYSTEM INSTRUCTION:\n{system_prompt}\n\nUSER SCRIPT:\n{user_prompt}\n"
    
    import subprocess
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
        
        # Cleanup JSON
        if ai_text.startswith('```json'): ai_text = ai_text.replace('```json\n', '', 1)
        if ai_text.endswith('```'): ai_text = ai_text[:-3].strip()
        if ai_text.startswith('```'): ai_text = ai_text.replace('```\n', '', 1)
            
        return json.loads(ai_text)
    except Exception as e:
        print(f"Lỗi Parse JSON Storyboard từ Gemini: {e}")
        return []


def generate_storyboard(script_lines, metadata):
    import json, subprocess
    
    # Chuẩn bị dữ liệu
    script_text = ""
    for line in script_lines:
        script_text += f"[{line.get('id')} - {line.get('speaker')}]: {line.get('text')}\n"
        
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
    full_prompt = f"SYSTEM INSTRUCTION:\n{system_prompt}\n\nUSER SCRIPT:\n{script_text}\n"
    
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
        
        if ai_text.startswith('```json'): ai_text = ai_text.replace('```json\n', '', 1)
        if ai_text.endswith('```'): ai_text = ai_text[:-3].strip()
        if ai_text.startswith('```'): ai_text = ai_text.replace('```\n', '', 1)
            
        return json.loads(ai_text)
    except Exception as e:
        print(f"Lỗi Parse Storyboard JSON từ Gemini: {e}")
        return []
