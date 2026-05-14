import soundfile as sf
import torch
import sys
from omnivoice import OmniVoice

print("Loading model...")
device = "cuda:0" if torch.cuda.is_available() else "cpu"
model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map=device)

ref_audio_path = r"f:\AntiGravity\AudioBook-KJ\audiobook_builder\Voice_ref\Jessie_voice.wav"
print(f"Using ref audio: {ref_audio_path}")

test_text = "Thử nghiệm hệ thống nhân bản giọng nói với tham số chuẩn. Giọng tôi nghe có giống bản gốc không?"
print("Generating...")
try:
    audio = model.generate(text=test_text, ref_audio=ref_audio_path)
    sf.write("test_cloning.wav", audio[0], 24000)
    print("Success! test_cloning.wav created.")
except Exception as e:
    print(f"Error: {e}")
