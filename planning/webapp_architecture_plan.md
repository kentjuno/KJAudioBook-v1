# Kế Hoạch Xây Dựng Web App: Audiobook Factory Studio

Dựa trên yêu cầu thêm "Human-in-the-loop" (người dùng can thiệp và review kịch bản trước khi render), chúng ta sẽ chuyển đổi từ một công cụ chạy ngầm (CLI) sang một Web Application hoàn chỉnh với giao diện trực quan.

## 1. Quy Trình Hoạt Động (The New Workflow)

Quy trình mới sẽ chia tách rõ ràng giữa việc "Làm kịch bản" và "Thu âm", giúp tiết kiệm tối đa quota, thời gian render và đảm bảo không có bất kỳ lỗi nào lọt vào bản thu cuối cùng.

### Bước 1: Ingestion (Nạp dữ liệu)
- User kéo thả file `.md` hoặc `.txt` vào trình duyệt.
- Backend nhận file, dọn dẹp các ký tự thừa (Markdown) và chia thành các chunk.

### Bước 2: AI Directing (Lên kịch bản nháp)
- Bấm nút **"Auto-Script with Gemini"**.
- Hệ thống gọi Gemini CLI chạy ngầm để phân vai (Speaker Diarization) và ngắt nghỉ câu.
- Kết quả không được đưa đi thu âm ngay, mà trả thẳng về Frontend dưới dạng một bảng danh sách (List/Table).

### Bước 3: Script Review & Editing (Giai đoạn quan trọng nhất)
- Giao diện hiển thị kịch bản giống như một kịch bản phim. Mỗi dòng bao gồm:
  1. **Dropdown Nhân Vật**: Gồm các vai (Narration, Kael, Elara...). User có thể đổi vai nếu Gemini nhận diện sai.
  2. **Text Box**: Nội dung câu thoại. User có thể sửa chính tả, sửa cách phát âm, thêm dấu chấm phẩy thủ công.
  3. **Nút "Test Voice"**: Nhấn vào để thu âm thử nhanh đúng câu đó xem TTS đọc có hay không.

### Bước 4: Casting (Chọn diễn viên lồng tiếng)
- Một khu vực Quản lý Giọng nói (Voice Manager).
- User map (gắn) từng nhân vật với một file Voice Cloning (VD: Kael -> `Kent_voice.wav`, Elara -> `Jessie_voice.wav`).
- Có thể Upload file ghi âm mới trực tiếp từ UI.

### Bước 5: Render & Assemble (Xuất xưởng)
- Nhấn **"Start Rendering"**.
- Backend bắt đầu vòng lặp xử lý TTS dựa trên kịch bản *đã được duyệt*.
- Frontend hiển thị Thanh tiến trình (Progress bar) theo thời gian thực (VD: Rendered 45/120 lines).
- Xong xuôi, trình duyệt hiện nút Download file `.mp3` và cho phép nghe thử trực tiếp trên web.

---

## 2. Lựa Chọn Công Nghệ (Tech Stack)

Để đáp ứng được Workflow này một cách mượt mà và đẹp mắt, đây là Stack đề xuất:

### Lựa chọn 1: Cấu trúc Full-stack Hiện Đại (Khuyên dùng)
Dành cho trải nghiệm UI/UX tốt nhất, chuyên nghiệp như một sản phẩm SaaS.
- **Backend**: `FastAPI` (Python). Cực kỳ nhanh, hỗ trợ bất đồng bộ (Async), dễ dàng import các file `audio_generator.py` và `text_processor.py` đã viết. Hỗ trợ tốt WebSockets để gửi phần trăm tiến độ (Progress Bar) về frontend.
- **Frontend**: `React` (Next.js hoặc Vite) + `Tailwind CSS`. Giúp xây dựng Script Editor (giao diện chỉnh sửa kịch bản) mượt mà, không bị lag khi danh sách câu thoại quá dài.

### Lựa chọn 2: Python Thuần (Dành cho Prototyping nhanh)
Nếu bro không muốn đụng vào code Frontend (React/HTML/CSS), chúng ta có thể dùng UI Framework của Python.
- **Framework**: `Streamlit` hoặc `Gradio`.
- **Ưu điểm**: Code toàn bộ giao diện bằng Python chỉ trong 1 file. 
- **Nhược điểm**: UI hơi cứng nhắc, việc xây dựng một trình "Editor kịch bản" chi tiết từng dòng sẽ hơi cồng kềnh và khó tùy biến UX/UI so với React.

---

## 3. Kiến Trúc Dữ Liệu (Data Flow)

Thay vì lưu trực tiếp ra file wav ngay, tiến trình dữ liệu sẽ được lưu dưới cấu trúc JSON chuẩn hóa:

```json
{
  "project_id": "chuong_01_phan_01",
  "status": "reviewing", // Các trạng thái: draft -> reviewing -> rendering -> completed
  "script": [
    {
      "id": 0,
      "speaker": "narration",
      "text": "Tiếng gầm thét của Lõi Ý thức...",
      "audio_file": null
    },
    {
      "id": 1,
      "speaker": "kael",
      "text": "Vậy tôi phải làm gì?",
      "audio_file": null
    }
  ],
  "voice_casting": {
    "kael": "Voice_ref/Kent_voice.wav",
    "elara": "Voice_ref/Jessie_voice.wav",
    "narration": "male, low pitch, middle-aged"
  }
}
```

Với file JSON Project này, bro có thể lưu lại dự án đang làm dở, tắt trình duyệt đi ngủ, mai mở lại vẫn còn nguyên kịch bản đang review!
