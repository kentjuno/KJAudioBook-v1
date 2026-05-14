import requests

res = requests.post("http://localhost:8000/api/generate-scene-video", json={
    "prompt": "Test video with multiple references",
    "project_id": "a59651a1-70ff-44b6-ac42-c26d90ad28ef",
    "scene_id": "999",
    "visual_reference_ids": ["sector_7_g", "kael"]
})
print(res.status_code)
print(res.text)
