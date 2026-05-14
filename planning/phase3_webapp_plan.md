# Phase 3: Web App Studio - Audiobook Factory

## Mục tiêu
Xây dựng một Web Application hoàn chỉnh với kiến trúc **FastAPI (Backend)** và **React/Vite (Frontend)**. Giao diện này sẽ thay thế hoàn toàn việc chạy script bằng Command Line, giúp quá trình làm Audiobook trực quan, an toàn và chuyên nghiệp hơn với cơ chế "Human-in-the-Loop" (Kiểm duyệt kịch bản trước khi render).

## 1. Cấu Trúc Thư Mục Mới (Monorepo)
Dự án sẽ được chia làm 2 nhánh chính:
```text
f:\AntiGravity\AudioBook-KJ\
├── backend/                  (Chứa code Python xử lý AI và API)
│   ├── main.py               (FastAPI Server)
│   ├── text_processor.py     (Gemini AI - Cũ nhưng sẽ gom vào dạng class/module)
│   ├── audio_generator.py    (OmniVoice TTS - Cũ nhưng sẽ gom vào dạng class/module)
│   ├── Voice_ref/            (Chứa các file .wav Voice Cloning)
│   └── data/                 (Thư mục chứa file JSON dự án & file âm thanh nháp)
│
├── frontend/                 (Chứa code giao diện React/Vite)
│   ├── src/
│   │   ├── components/       (ScriptEditor, AudioPlayer, ProgressBar...)
│   │   ├── pages/            (Home, Studio)
│   │   └── api/              (Gọi API kết nối Backend)
│   └── package.json
```

## 2. Lộ Trình Triển Khai (Roadmap)

### Step 1: Khởi tạo Backend (FastAPI) & Refactor Code Cũ
- Cài đặt `fastapi` và `uvicorn`.
- Chuyển `text_processor.py` và `audio_generator.py` thành các API Endpoints:
  - `POST /api/upload`: Nhận file `.md` và trả về text gốc.
  - `POST /api/generate-script`: Gửi text lên, gọi Gemini và trả về mảng JSON kịch bản.
  - `POST /api/test-voice`: Nhận vào 1 đoạn text + tên nhân vật (Voice clone), chạy OmniVoice sinh ra file `mp3/wav` tạm và trả về URL để UI phát âm thanh.
  - `POST /api/render-all`: Nhận mảng JSON kịch bản đã chốt, tiến hành render tuần tự và ghép file bằng `pydub`. Hỗ trợ luồng SSE (Server-Sent Events) hoặc WebSocket để báo tiến độ % về frontend.

### Step 2: Khởi tạo Frontend (React + Vite + Tailwind)
- Chạy lệnh `npx create-vite frontend --template react-ts` hoặc dùng JS thuần tuỳ ý.
- Thiết lập Tailwind CSS để làm giao diện Dark Mode (studio theme) chuyên nghiệp.
- Cấu hình Axios/Fetch để giao tiếp với FastAPI (Proxy `localhost:3000` sang `localhost:8000`).

### Step 3: Xây Dựng Script Editor UI (Tâm điểm dự án)
- **Bảng Kịch Bản (Table/List):** Hiển thị từng câu thoại.
  - Cột 1: Dropdown chọn nhân vật (Kael, Elara, Narration...).
  - Cột 2: Textarea cho phép chỉnh sửa nội dung.
  - Cột 3: Các nút hành động (Nghe Thử 🎧, Xoá, Thêm dòng).
- **Tính năng State Management:** Lưu kịch bản đang sửa dở vào `localStorage` hoặc qua API để đảm bảo F5 không mất dữ liệu.

### Step 4: Xây dựng Voice Casting Manager
- Panel bên trái màn hình: Hiển thị danh sách nhân vật.
- Cho phép map nhân vật với file âm thanh trong `Voice_ref` thông qua Dropdown.
- Tích hợp API Upload để thêm file Voice mẫu mới thẳng từ giao diện.
- **Tính năng Audio Editor cơ bản:** Cho phép người dùng chỉnh sửa file Voice Ref (ví dụ: Tăng/giảm âm lượng, chuẩn hoá âm thanh bằng `pydub`) ngay trên UI trước khi lưu làm khuôn giọng, giải quyết vấn đề file ghi âm gốc quá nhỏ.
- **Tính năng Tạo Diễn Viên Ảo (Synthetic Voice Profiling):** Tận dụng tính năng `instruct` của OmniVoice (ví dụ: *male, low pitch, young adult*) để ép AI đọc 1 câu thoại ngắn. Sau đó, **Lưu chính file audio vừa tạo thành file Voice Cloning**. Việc này giúp "khoá" (lock) chất giọng lại, đảm bảo hàng ngàn câu thoại sau này đều nhất quán 100% theo đúng một tông giọng ảo duy nhất mà không bị méo giọng hay biến đổi giữa các chunk.

### Step 5: Render & Export (Ghép nối)
- Xây dựng Component "Tiến Trình Render" (Progress Bar).
- Bấm nút `Start Render`, UI sẽ lock lại và hiển thị thanh chạy % (Dựa vào API SSE).
- Khi render xong 100%, tự động ghép file bằng `pydub` (chạy nền) và trả về nút "Tải MP3" cho người dùng.

## 3. Quy Tắc & Nguyên Tắc Quan Trọng
- **Bảo toàn dữ liệu:** Mọi bước gọi AI đều là "Nháp". File audio chỉ thực sự được xuất chuỗi (render_all) khi người dùng chủ động nhấn nút.
- **Micro-testing (Nghe thử):** Đảm bảo tính năng nghe thử từng câu (Test Voice) chạy cực mượt, file tạo ra sẽ nằm trong thư mục `/temp` và tự xóa theo định kỳ để tiết kiệm dung lượng ổ F.
- **Single Source of Truth:** FastAPI Backend sẽ giữ trách nhiệm chạy OmniVoice (vốn rất nặng) dưới dạng Background Task để không làm treo Request của HTTP.
