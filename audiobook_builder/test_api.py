import asyncio
import json
import uuid
from flow_service import flow_service

async def test():
    req = {
        "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
        "seed": 1234,
        "textInput": {"structuredPrompt": {"parts": [{"text": "A test prompt"}]}},
        "videoModelKey": "veo_3_1_i2v_lite_low_priority",
        "referenceImages": [{"mediaId": "20b91634-a0ad-4a10-97ee-aa299926a541", "imageUsageType": "IMAGE_USAGE_TYPE_ASSET"}]
    }
    body = {
        "mediaGenerationContext": {"batchId": str(uuid.uuid4())},
        "clientContext": flow_service._client_context("a59651a1-70ff-44b6-ac42-c26d90ad28ef"),
        "requests": [req]
    }
    url = flow_service._build_url("/v1/video:batchAsyncGenerateVideo")
    res = await flow_service._send("api_request", {
        "url": url,
        "method": "POST",
        "headers": {"content-type": "application/json"},
        "body": body,
        "captchaAction": "VIDEO_GENERATION"
    })
    print(json.dumps(res, indent=2))

asyncio.run(test())
