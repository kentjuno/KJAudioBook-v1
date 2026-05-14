import os
import json
import time
import sys
sys.stdout.reconfigure(encoding='utf-8')

from pydub import AudioSegment
from text_processor import clean_markdown, chunk_text, safe_call_gemini_director
from audio_generator import AudioGenerator

INPUT_DIR = r"f:\AntiGravity\AudioBook-KJ\The_Architects_of_the_Living_Loom"
OUTPUT_DIR = "output"
TEMP_DIR = "temp_audio"
PROGRESS_FILE = "progress.json"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_progress(progress):
    with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
        json.dump(progress, f, indent=4, ensure_ascii=False)

def assemble_audio(temp_files, output_path):
    print(f"Đang ghép {len(temp_files)} file audio lại với nhau...")
    combined = AudioSegment.empty()
    silence = AudioSegment.silent(duration=800) # 800ms khoảng lặng giữa các câu
    
    for f in temp_files:
        if os.path.exists(f):
            audio = AudioSegment.from_wav(f)
            combined += audio + silence
        else:
            print(f"Cảnh báo: Không tìm thấy file {f} để ghép nối.")
            
    combined.export(output_path, format="mp3", bitrate="192k")
    print(f"Đã xuất file hoàn chỉnh: {output_path}")

def main():
    print("=== KHỞI ĐỘNG HỆ THỐNG AUDIOBOOK FACTORY ===")
    progress = load_progress()
    
    # Tạm thời cấu hình CHỈ chạy 1 file để test an toàn
    files_to_process = ["chuong_01_phan_01.md"]
    
    # Kiểm tra xem có cần chạy không
    need_processing = False
    for f in files_to_process:
        if progress.get(f, {}).get("status") != "completed":
            need_processing = True
            break
            
    if not need_processing:
        print("Tất cả các file đã được xử lý xong!")
        return

    # Khởi tạo model TTS
    audio_gen = AudioGenerator()
    
    for filename in files_to_process:
        if filename not in progress:
            progress[filename] = {
                "status": "pending", 
                "chunks_done": 0, 
                "total_chunks": 0,
                "generated_wavs": []
            }
            
        file_prog = progress[filename]
        
        if file_prog["status"] == "completed":
            continue
            
        print(f"\n{'='*50}\n---> Đang xử lý file: {filename}")
        filepath = os.path.join(INPUT_DIR, filename)
        
        with open(filepath, 'r', encoding='utf-8') as file:
            raw_text = file.read()
            
        cleaned_text = clean_markdown(raw_text)
        chunks = chunk_text(cleaned_text)
        
        if file_prog["total_chunks"] == 0:
            file_prog["total_chunks"] = len(chunks)
            save_progress(progress)
            
        if "generated_wavs" not in file_prog:
            file_prog["generated_wavs"] = []

        start_chunk_idx = file_prog["chunks_done"]
        
        for i in range(start_chunk_idx, len(chunks)):
            print(f"  - Xử lý Chunk {i+1}/{len(chunks)}...")
            chunk = chunks[i]
            
            # 1. Gọi Đạo diễn Gemini (Chuẩn bị kịch bản)
            script = safe_call_gemini_director(chunk)
            
            # 2. Lồng tiếng cho từng câu trong kịch bản
            for line_idx, line in enumerate(script):
                speaker = line.get("speaker", "narration")
                text = line.get("text", "")
                if not text:
                    continue
                    
                wav_filename = f"{filename}_chunk{i}_line{line_idx}.wav"
                wav_path = os.path.join(TEMP_DIR, wav_filename)
                
                print(f"    + Thu âm ({speaker}): {text[:50]}...")
                success = audio_gen.generate(text, wav_path, speaker)
                
                if success:
                    file_prog["generated_wavs"].append(wav_path)
                else:
                    print("    Lỗi khi thu âm, hệ thống dừng lại để kiểm tra.")
                    sys.exit(1)
            
            # Cập nhật tiến độ sau khi xong 1 chunk (Micro-State Save)
            file_prog["chunks_done"] = i + 1
            save_progress(progress)
            
        # 3. Hoàn tất tất cả chunks của 1 file -> Ghép Audio
        output_filename = filename.replace(".md", ".mp3")
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        assemble_audio(file_prog["generated_wavs"], output_path)
        
        # Dọn dẹp file tạm wav để trống ổ cứng
        for wav_path in file_prog["generated_wavs"]:
            if os.path.exists(wav_path):
                os.remove(wav_path)
                
        # Cập nhật trạng thái hoàn thành toàn bộ file
        file_prog["status"] = "completed"
        file_prog["generated_wavs"] = [] # Xóa list để JSON nhẹ đi
        save_progress(progress)
        print(f"\n---> HOÀN THÀNH: {filename}\n{'='*50}")

if __name__ == "__main__":
    main()
