import sys
sys.stdout.reconfigure(encoding='utf-8')
from omnivoice import OmniVoice
import soundfile as sf
import torch

def test_generation():
    print("Loading OmniVoice model...")
    # Determine the device
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if torch.cuda.is_available() else torch.float32
    print(f"Using device: {device}")
    
    try:
        model = OmniVoice.from_pretrained(
            "k2-fsa/OmniVoice",
            device_map=device,
            dtype=dtype
        )
        print("Model loaded successfully.")
        
        test_text = "Kael hít sâu, bắt đầu tái cấu trúc giao diện. Cậu thiết lập một mô hình Agent Assistant – cấp độ 3 trong thang tương tác. Thay vì tự tay sửa mã, cậu lập trình cho Agent các điểm kiểm soát. Bây giờ, Agent sẽ đề xuất các bản vá, và Kael sẽ đóng vai trò người phê duyệt Human-approved tool calling. "
        print(f"Generating audio for text: '{test_text}'")
        
        # We use Auto Voice mode initially for testing
        audio = model.generate(text=test_text)
        
        # Save output
        output_file = "test_output.wav"
        sf.write(output_file, audio[0], 24000)
        print(f"Audio generated and saved to {output_file}")
        
    except Exception as e:
        print("Error during model generation:")
        print(e)
        sys.exit(1)

if __name__ == "__main__":
    test_generation()
