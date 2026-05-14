import re

path = r'f:\AntiGravity\AudioBook-KJ\audiobook_builder\flow_service.py'
content = open(path, encoding='utf-8').read()

new_func = '''    async def request_scene_frame(self, prompt: str, project_id: str, reference_media_ids: list = None):
        """Generate an image (synchronous) returning url directly."""
        import uuid, time
        request_item = {
            "clientContext": {**self._client_context(project_id), "sessionId": f";{int(time.time()*1000)}"},
            "seed": int(time.time()) % 10000,
            "structuredPrompt": {"parts": [{"text": prompt}]},
            "imageAspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE",
            "imageModelName": "GEM_PIX_2"
        }
        
        if reference_media_ids:
            request_item["imageInputs"] = [
                {"name": mid, "imageInputType": "IMAGE_INPUT_TYPE_REFERENCE"}
                for mid in reference_media_ids
            ]
            
        body = {
            "clientContext": self._client_context(project_id),
            "mediaGenerationContext": {"batchId": str(uuid.uuid4())},
            "useNewMedia": True,
            "requests": [request_item],
        }
        
        url = self._build_url(f"/v1/projects/{project_id}/flowMedia:batchGenerateImages")
        
        res = await self._send("api_request", {
            "url": url,
            "method": "POST",
            "headers": {"content-type": "application/json"},
            "body": body,
            "captchaAction": "IMAGE_GENERATION"
        })
        
        if res.get("status") == 200:
            data = res.get("data", {})
            media = data.get("media", [])
            if media:
                media_id = media[0].get("name")
                image_obj = media[0].get("image", {})
                gen_image = image_obj.get("generatedImage", {})
                if not gen_image and media[0].get("video"):
                    gen_image = media[0]["video"].get("generatedImage", {})
                fife_url = gen_image.get("fifeUrl")
                if fife_url:
                    return {"success": True, "media_id": media_id, "url": fife_url}
        return {"success": False, "error": res}'''

# Replace the old request_scene_frame
content = re.sub(
    r'    async def request_scene_frame\(self, prompt: str, project_id: str, reference_media_ids: list = None\):.*?(?=    async def request_scene_video)',
    new_func + '\n\n',
    content,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched flow_service.py")
