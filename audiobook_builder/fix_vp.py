import base64

text = b'''
def regenerate_line_prompt(line_text, context_text, visual_references):
    import os, json
    import google.generativeai as genai
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
            
    refs_str = "\\n".join(ref_descriptions)
    
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

    model = genai.GenerativeModel("gemini-1.5-flash", system_instruction=system_prompt)
    try:
        response = model.generate_content(user_prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error calling Gemini for prompt regen: {e}")
        return ""
'''

with open('visual_pipeline.py', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

with open('visual_pipeline.py', 'wb') as f:
    for line in lines[:175]:
        f.write(line.encode('utf-8'))
    f.write(text)
