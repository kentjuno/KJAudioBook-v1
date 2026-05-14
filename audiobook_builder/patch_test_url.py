import os

def patch_server():
    code = '''
class TestUrlRequest(BaseModel):
    url_path: str
    project_id: str

@app.post("/api/test-url")
async def api_test_url(req: TestUrlRequest):
    from flow_service import flow_service
    import uuid
    body = {
        "clientContext": flow_service._client_context(req.project_id),
        "requests": [{"aspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE", "textInput": {"structuredPrompt": {"parts": [{"text": "A test"}]}}}]
    }
    url = flow_service._build_url(req.url_path)
    res = await flow_service._send("api_request", {
        "url": url,
        "method": "POST",
        "headers": {"content-type": "application/json"},
        "body": body,
        "captchaAction": "IMAGE_GENERATION"
    })
    return res
'''
    with open('f:\\AntiGravity\\AudioBook-KJ\\audiobook_builder\\server.py', 'a', encoding='utf-8') as f:
        f.write("\n" + code)

if __name__ == "__main__":
    patch_server()
