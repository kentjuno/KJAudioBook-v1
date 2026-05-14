import os
import json

def patch_server():
    code = '''
class EnhancePromptRequest(BaseModel):
    prompt: str
    asset_type: str
    asset_name: str
    global_style: str = ""

@app.post("/api/enhance-prompt")
async def api_enhance_prompt(req: EnhancePromptRequest):
    import subprocess
    sys_prompt = f"You are a professional Concept Art Prompt Engineer. Enhance the following short description for a '{req.asset_type}' named '{req.asset_name}' into a highly detailed, professional image generation prompt in English. Include details about lighting, camera angle, textures, and atmosphere."
    if req.global_style:
        sys_prompt += f" MANDATORY ART STYLE: {req.global_style}"
        
    sys_prompt += "\\nReturn ONLY the prompt string, no markdown, no quotes."
    full_prompt = f"{sys_prompt}\\n\\nOriginal Description: {req.prompt}"
    
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
'''
    with open('f:\\AntiGravity\\AudioBook-KJ\\audiobook_builder\\server.py', 'a', encoding='utf-8') as f:
        f.write("\n" + code)

if __name__ == "__main__":
    patch_server()
    print("Patched server with enhance-prompt API")
