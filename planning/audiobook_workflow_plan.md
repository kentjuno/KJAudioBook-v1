# Kế Hoạch Triển Khai: Hệ Thống Tự Động Tạo Audiobook (The Audiobook Factory)

## 1. Tổng quan (Overview)
- **Mục tiêu**: Xây dựng một công cụ tự động hóa hoàn toàn quá trình chuyển đổi các file truyện định dạng Markdown (`.md`) thành các file âm thanh (`.mp3`) chất lượng cao.
- **Ngôn ngữ & Công nghệ chính**:
  - **Ngôn ngữ**: Python 3.10+ (Phù hợp nhất để làm việc với AI/AI models, âm thanh và file hệ thống).
  - **Trí tuệ điều phối (The Brain)**: `gemini-cli` (tích hợp thẳng qua `subprocess` của Python) để tối ưu văn bản và phân vai, không cần API Key.
  - **Trí tuệ lồng tiếng (TTS)**: OmniVoice (`k2-fsa/OmniVoice`) chạy local trên máy của bạn.
  - **Xử lý Audio**: Thư viện `pydub` và công cụ `ffmpeg`.

## 2. Giai đoạn 1: Môi trường & Thiết lập (Environment & Setup)
*Ưu tiên làm phần này đầu tiên vì setup môi trường AI local thường dễ gặp lỗi.*
- **Khởi tạo dự án**:
  - Tạo một thư mục code riêng cho công cụ này (ví dụ: `audiobook_builder`).
  - Thiết lập môi trường ảo Python (`venv`).
  - Cài đặt công cụ dòng lệnh `ffmpeg` vào hệ điều hành Windows và đưa vào biến môi trường (PATH).
- **Cài đặt OmniVoice**:
  - Tham khảo documentation của OmniVoice trên Hugging Face.
  - Cài đặt `torch` (PyTorch) có hỗ trợ CUDA/GPU (nếu máy có card rời NVIDIA) để sinh âm thanh nhanh hơn.
  - Tải model OmniVoice về máy.
  - Viết một file `test_tts.py` nhỏ chỉ để chạy thử 1 câu chào tiếng Việt xem model phát âm và hoạt động ổn định không.

## 3. Giai đoạn 2: Module Xử Lý Văn Bản (Data Ingestion & The Brain)
*Xây dựng bộ não để chuẩn bị dữ liệu trước khi lồng tiếng.*
- **Quản lý dữ liệu đầu vào (Cơ chế Chunking)**:
  - Viết script quét qua thư mục truyện (`The_Architects_of_the_Living_Loom`).
  - Hàm làm sạch Markdown: Tự động loại bỏ các ký tự định dạng, xóa các đoạn meta không cần thiết.
  - **Cắt khúc (Chunking)**: Cắt file truyện thành từng chunk nhỏ dựa trên dấu xuống dòng (`\n\n`) hoặc dấu chấm câu. Mỗi lần chỉ xử lý 1-2 đoạn văn (~500 ký tự) để chống việc Gemini bị lười, lỗi đứt gãy JSON, và chống quá tải bộ nhớ VRAM cho TTS.
- **Tích hợp Gemini CLI (Đạo diễn)**:
  - Sử dụng Python `subprocess.Popen` để gọi trực tiếp lệnh `gemini` (truyền prompt qua `stdin` và lấy output qua tham số `-o json`). Không cần cấu hình API Key.
  - Xây dựng hàm `director_agent(text)`:
    - Nhận vào khối lượng chữ vừa đủ (1-2 đoạn văn).
    - Prompt Gemini: Chỉnh sửa dấu câu để TTS ngắt nghỉ tự nhiên, phân loại (Narration vs Nhân vật).
  - Tự động parse lớp vỏ JSON Telemetry của CLI để lấy nội dung chuẩn bị nạp vào TTS.

## 4. Giai đoạn 3: Module Lồng Tiếng (TTS Engine & Rendering)
*Phần cốt lõi tạo ra âm thanh.*
- **Tạo Voice Generator**:
  - Đóng gói OmniVoice thành một class `AudioGenerator`.
  - Hàm `generate_audio(chunk_text, speaker_type)`: Nhận đoạn text và loại giọng, trả ra file `.wav` tạm thời.
- **Xử lý ngoại lệ**:
  - Xử lý tình trạng thiếu bộ nhớ (Out of Memory - OOM) nếu câu quá dài bằng cách tự cắt nhỏ hơn.
  - Tự động thử lại (retry) nếu sinh audio thất bại.

## 5. Giai đoạn 4: Hậu Kỳ & Lưu Trạng Thái (Post-production & State Manager)
*Đảm bảo tính liên tục và ra thành phẩm cuối cùng.*
- **Hậu kỳ Audio**:
  - Dùng `pydub` để load tất cả các file `.wav` tạm thời của một chương.
  - Tự động nối chúng lại với nhau. Giữa mỗi chunk, chèn khoảng 0.5 - 1 giây khoảng lặng (silence) để nghe êm tai hơn.
  - Export ra file `.mp3` lưu vào thư mục `output/`.
- **Lưu nháp tiến độ siêu vi (Micro-State Management)**:
  - Tạo file `progress.json` để ghi nhận tiến độ chi tiết đến từng chunk của từng file.
  - Cấu trúc "Băng chuyền": File MD -> Chunks -> [Đạo diễn Gemini] -> [Lồng tiếng OmniVoice].
  - Chức năng Resume: Nếu hệ thống sập giữa chừng (ví dụ đang render tới chunk 25/50), lần sau bật lại, tool sẽ đọc `progress.json` và chạy tiếp từ chunk 26. Toàn bộ các file `.wav` tạm thời của 25 chunk trước đó vẫn được bảo toàn an toàn trên ổ cứng, không cần làm lại từ đầu.

## 6. Giai đoạn 5: Tích Hợp (Integration)
- Lắp ráp các module từ Giai đoạn 2, 3, 4 vào một hàm vòng lặp chính (`main.py`).
- Bắt đầu chạy thử nghiệm (End-to-end test) với một file ngắn nhất (Ví dụ: `chuong_03_phan_10.md` hoặc `chuong_08_phan_10.md` - khoảng 4.6KB).
- Nghe thử thành phẩm, tinh chỉnh lại prompt của Gemini hoặc thông số của OmniVoice để âm thanh tự nhiên nhất.

---
*Ghi chú: Việc tách bạch thành các module độc lập (Đọc text, Gọi Gemini, Gọi TTS, Nối âm thanh) sẽ giúp dễ bảo trì. Nếu sau này bạn đổi ý, muốn thay OmniVoice bằng một tool lồng tiếng khác, bạn chỉ cần sửa ở Giai đoạn 3 mà không làm vỡ cả hệ thống.*
