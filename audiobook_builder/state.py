"""Shared server singletons — import from here, never re-instantiate."""
import os
from audio_generator import AudioGenerator

TEMP_DIR = "temp_audio"
OUTPUT_DIR = "output"
PROFILE_FILE = os.path.join(os.path.dirname(__file__), "project_profile.json")

print("Đang boot server và load mô hình AI...")
audio_gen = AudioGenerator()
print("Boot hoàn tất!")

flowkit_state = {
    "flowKey": None,
    "callbackSecret": "audiobook_secret_key_123",
    "active_ws": None,
}
