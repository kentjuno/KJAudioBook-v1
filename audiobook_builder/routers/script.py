import subprocess
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from text_processor import clean_markdown, safe_call_gemini_director
from visual_pipeline import update_entities_metadata, regenerate_line_prompt

router = APIRouter()


class ScriptRequest(BaseModel):
    text: str


class RegenPromptRequest(BaseModel):
    line_text: str
    context_text: str
    visual_references: list[str]


class ExtractEntitiesRequest(BaseModel):
    text: str


class EnhancePromptRequest(BaseModel):
    prompt: str
    asset_type: str
    asset_name: str
    global_style: str = ""


class EnhanceMotionRequest(BaseModel):
    dialogue: str
    motion_prompt: str


def _call_gemini(full_prompt: str) -> str:
    process = subprocess.Popen(
        ["cmd.exe", "/c", "gemini", "--skip-trust"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
    )
    stdout_data, stderr_data = process.communicate(input=full_prompt)
    if process.returncode != 0:
        raise HTTPException(500, f"Gemini Error: {stderr_data}")
    return stdout_data.strip()


@router.post("/api/generate-script")
async def api_generate_script(req: ScriptRequest):
    cleaned = clean_markdown(req.text)
    script = safe_call_gemini_director(cleaned)
    return {"script": script}


@router.post("/api/regen-visual-prompt")
async def api_regen_visual_prompt(req: RegenPromptRequest):
    try:
        prompt = regenerate_line_prompt(req.line_text, req.context_text, req.visual_references)
        return {"prompt": prompt}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/api/extract-entities")
async def api_extract_entities(req: ExtractEntitiesRequest):
    if not req.text:
        raise HTTPException(400, "Empty script")
    metadata = update_entities_metadata(req.text)
    return {"status": "success", "metadata": metadata}


@router.post("/api/enhance-prompt")
def api_enhance_prompt(req: EnhancePromptRequest):
    sys_prompt = (
        f"You are a professional Concept Art Prompt Engineer. Enhance the following short description "
        f"for a '{req.asset_type}' named '{req.asset_name}' into a highly detailed, professional image "
        f"generation prompt in English. Include details about lighting, camera angle, textures, and atmosphere."
    )
    if req.global_style:
        sys_prompt += f" MANDATORY ART STYLE: {req.global_style}"
    sys_prompt += "\nReturn ONLY the prompt string, no markdown, no quotes."
    return {"prompt": _call_gemini(f"{sys_prompt}\n\nOriginal Description: {req.prompt}")}


@router.post("/api/enhance-motion")
def api_enhance_motion(req: EnhanceMotionRequest):
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
    return {"prompt": _call_gemini(full_prompt)}
