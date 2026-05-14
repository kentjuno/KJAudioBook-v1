import os

content = open('server.py', encoding='utf-8').read()
if 'class EnhanceMotionRequest' not in content:
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('if __name__ == "__main__":'):
            start = i
            break
            
    replacement = '''
class EnhanceMotionRequest(BaseModel):
    dialogue: str
    motion_prompt: str

@app.post("/api/enhance-motion")
async def api_enhance_motion(req: EnhanceMotionRequest):
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
'''
    new_content = '\n'.join(lines[:start]) + replacement + '\n'.join(lines[start:])
    open('server.py', 'w', encoding='utf-8').write(new_content)
    print('Added enhance-motion endpoint')
else:
    print('Already present')
