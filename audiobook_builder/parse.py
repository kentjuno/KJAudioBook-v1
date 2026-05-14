import json

with open('recovered_logs.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open('server_missing.py', 'w', encoding='utf-8') as out:
    for line in lines:
        try:
            data = json.loads(line.strip())
            if "tool_calls" in data:
                for call in data["tool_calls"]:
                    if call["name"] in ("multi_replace_file_content", "replace_file_content"):
                        args = call["args"]
                        if "ReplacementChunks" in args:
                            chunks = json.loads(args["ReplacementChunks"])
                            for chunk in chunks:
                                out.write('\n\n# --- EXTRACTED CHUNK ---\n')
                                out.write(chunk.get("ReplacementContent", ""))
        except Exception as e:
            pass
print("Done")
