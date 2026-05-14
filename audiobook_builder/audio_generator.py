import torch
import soundfile as sf
import os
import re
import transformers

# Tắt các dòng log warning phiền phức của thư viện transformers
transformers.logging.set_verbosity_error()

from omnivoice import OmniVoice

class AudioGenerator:
    def __init__(self):
        print("Đang khởi tạo OmniVoice Model...")
        self.device = "cuda:0" if torch.cuda.is_available() else "cpu"
        self.dtype = torch.float16 if torch.cuda.is_available() else torch.float32
        
        self.model = OmniVoice.from_pretrained(
            "k2-fsa/OmniVoice",
            device_map=self.device,
            dtype=self.dtype
        )
        print(f"OmniVoice đã sẵn sàng trên thiết bị: {self.device}")
        
        # Load Reference Audio Paths cho Voice Cloning
        self.voice_cache = {}
        base_dir = os.path.dirname(os.path.abspath(__file__))
        voice_dir = os.path.join(base_dir, "Voice_ref")
        
        # Quét thư mục Voice_ref để nạp toàn bộ các giọng
        if os.path.exists(voice_dir):
            for file in os.listdir(voice_dir):
                if file.endswith("_synthetic.wav"):
                    speaker_name = file.split("_synthetic")[0].lower()
                    self.voice_cache[speaker_name] = os.path.join(voice_dir, file)
                    print(f"[Voice Cache] Đã nạp giọng Ảo (Synthetic) cho: {speaker_name}")
                elif file.endswith("_voice.wav"):
                    speaker_name = file.split("_voice")[0].lower()
                    self.voice_cache[speaker_name] = os.path.join(voice_dir, file)
                    print(f"[Voice Cache] Đã nạp giọng Thật (Clone) cho: {speaker_name}")
            
        print(f"Đã map thành công {len(self.voice_cache)} đường dẫn giọng mẫu (Voice Cloning).")

    def generate(self, text, output_path, speaker="narration"):
        """
        Sinh audio và lưu ra output_path.
        Ưu tiên dùng Voice Cloning nếu có file mẫu trong Cache.
        """
        # --- TIỀN XỬ LÝ VĂN BẢN TRƯỚC KHI ĐƯA VÀO TTS ---
        # 1. Loại bỏ các ghi chú ngoài lề (không dùng ngoặc vuông)
        text = re.sub(r'\(.*?\)', '', text)       # Xóa (thở dài)
        text = re.sub(r'\*.*?\*', '', text)       # Xóa *cười*
        
        # 2. Thay thế dấu ba chấm bằng dấu chấm, CosyVoice rất hay vấp/lắp bắp khi gặp "..."
        text = text.replace("...", ". ").replace("..", ". ")

        # 3. Xử lý phần text ngoài và trong ngoặc vuông
        def process_text_parts(match):
            tag = match.group(1) or ""
            text_outside = match.group(2) or ""
            
            # Xử lý tag: Nếu tag ko chứa khoảng trắng và ko chứa số -> đó là paralinguistic tag của OmniVoice (vd [SIGH] -> [sigh])
            # Nếu có chứa khoảng trắng/số -> CMU tag, giữ nguyên (vd [B EY1 S])
            if tag:
                if not any(char.isdigit() or char.isspace() for char in tag):
                    tag = tag.lower()
                    
            return tag + text_outside.lower()
        
        parts = re.findall(r'(\[.*?\])?([^\[]*)', text)
        text = "".join(process_text_parts(re.match(r'(\[.*?\])?([^\[]*)', p[0] + p[1])) for p in parts if p[0] or p[1])
        
        # Dọn dẹp khoảng trắng thừa
        text = text.replace("  ", " ").strip()
        # ------------------------------------------------
        
        speaker_lower = speaker.lower()
        ref_audio_path = None
        instruct = None
        
        # Luôn ưu tiên lấy từ Voice Cache (nếu có file _synthetic hoặc _voice)
        if speaker_lower in self.voice_cache:
            ref_audio_path = self.voice_cache[speaker_lower]
        else:
            # Fallback dùng Instruct (sinh ngẫu nhiên mặc định nếu chưa cài đặt)
            if "narration" in speaker_lower or "người kể" in speaker_lower:
                instruct = "male, low pitch, middle-aged"
            else:
                # Giọng random an toàn cho bất kỳ nhân vật nào chưa khai báo
                instruct = "female, moderate pitch, young adult"
            
        try:
            # Tham số an toàn giúp ngắt câu dài thành các chunk (tránh bị mất chữ, ngắt hơi quá dài)
            kwargs = {
                "audio_chunk_duration": 10.0,
                "audio_chunk_threshold": 15.0
            }
            
            if ref_audio_path is not None:
                audio = self.model.generate(text=text, ref_audio=ref_audio_path, **kwargs)
            elif instruct:
                audio = self.model.generate(text=text, instruct=instruct, **kwargs)
            else:
                audio = self.model.generate(text=text, **kwargs)
                
            sf.write(output_path, audio[0], 24000)
            return True
        except Exception as e:
            print(f"Lỗi khi generate audio: {e}")
            return False
