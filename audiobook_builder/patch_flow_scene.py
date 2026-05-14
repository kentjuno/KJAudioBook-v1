import os

path = r'f:\AntiGravity\AudioBook-KJ\audiobook_builder\flow_service.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('\r\n', '\n')

new_func = """
    async def request_scene_frame(self, prompt: str, project_id: str, reference_media_ids: list = None):
        request_item = {
            "aspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE",
            "seed": int(time.time()) % 10000,
            "textInput": {"structuredPrompt": {"parts": [{"text": prompt}]}},
            "imageModelKey": "gem_pix_2",
            "numberOfImages": 1
        }
        
        if reference_media_ids:
            request_item["referenceImages"] = [
                {"mediaId": mid, "imageUsageType": "IMAGE_USAGE_TYPE_REFERENCE"}
                for mid in reference_media_ids
            ]
            
        body = {
            "mediaGenerationContext": {"batchId": str(uuid.uuid4())},
            "clientContext": self._client_context(project_id),
            "requests": [request_item],
            "useV2ModelConfig": True,
        }
        
        url = self._build_url("/v1/image:batchAsyncGenerateImage")
        
        res = await self._send("api_request", {
            "url": url,
            "method": "POST",
            "headers": {"content-type": "application/json"},
            "body": body,
            "captchaAction": "IMAGE_GENERATION"
        })
        
        if res.get("status") == 200:
            data = res.get("data", {})
            operations = data.get("operations", [])
            if operations:
                op_name = operations[0].get("name")
                job_id = str(uuid.uuid4())
                add_job(job_id, "image", prompt, op_name)
                return {"success": True, "job_id": job_id, "operation_name": op_name}
        return {"success": False, "error": res}
"""

if "request_scene_frame" not in content:
    content = content.replace("    async def request_scene_video", new_func + "\n    async def request_scene_video")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added request_scene_frame")
else:
    print("Already exists")
