import requests

res = requests.post("http://localhost:8000/api/generate-scene-video", json={
    "prompt": "Test video with ONE reference",
    "project_id": "a59651a1-70ff-44b6-ac42-c26d90ad28ef",
    "scene_id": "999",
    "visual_reference_ids": ["kael"]
})
print(res.status_code)
print(res.text)
