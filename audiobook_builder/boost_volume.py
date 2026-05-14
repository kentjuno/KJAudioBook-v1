import os
from pydub import AudioSegment
import sys
sys.stdout.reconfigure(encoding='utf-8')

def boost_volume(file_path, db_increase=10):
    if not os.path.exists(file_path):
        print(f"Không tìm thấy file: {file_path}")
        return

    print(f"Đang xử lý: {file_path} (+{db_increase}dB)")
    audio = AudioSegment.from_file(file_path)
    
    # Tăng âm lượng
    louder_audio = audio + db_increase
    
    # Ghi đè file
    louder_audio.export(file_path, format="wav")
    print("Xong!")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    voice_dir = os.path.join(base_dir, "Voice_ref")
    
    jessie = os.path.join(voice_dir, "Jessie_voice.wav")
    kent = os.path.join(voice_dir, "Kent_voice.wav")
    
    # Tăng 10dB (Có thể đổi số nếu muốn to hơn)
    boost_volume(jessie, 10)
    boost_volume(kent, 10)
