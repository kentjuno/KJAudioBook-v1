# 🎙️ Audiobook Factory Studio - Project Walkthrough

Tài liệu này đóng vai trò như một bản "bàn giao ca", tóm tắt lại toàn bộ những gì chúng ta đã xây dựng và hướng dẫn cách khởi động, kiểm tra, cũng như phát triển tiếp dự án trong ngày mai.

---

## 1. Kiến trúc hiện tại (Monorepo)

Dự án đã chính thức được chuyển đổi từ một mớ script CLI hỗn độn sang một mô hình **Web App "Human-in-the-Loop"** cực kỳ chuyên nghiệp.

*   **Backend (Python/FastAPI):** Nằm trong thư mục `audiobook_builder/`. Xử lý các logic nặng đô như chẻ nhỏ văn bản, gọi Gemini API để lấy kịch bản, và gọi OmniVoice để render âm thanh.
*   **Frontend (React/Vite/Tailwind):** Nằm trong thư mục `frontend/`. Là một giao diện Dark Mode xịn xò để quản lý kịch bản, quản lý diễn viên ảo, nghe thử và tinh chỉnh mọi thứ trước khi xuất xưởng.

---

## 2. Cách khởi động dự án (Daily Routine)

Mỗi khi mở máy lên làm việc, bro cần mở **2 Terminal** riêng biệt.

### Terminal 1: Chạy Backend (AI & Logic)
1. Bật Terminal, cd vào thư mục gốc của dự án (`f:\AntiGravity\AudioBook-KJ`).
2. Kích hoạt môi trường ảo (Venv) chứa các thư viện AI:
   ```bash
   cd audiobook_builder
   # Windows (Powershell)
   venv\Scripts\Activate.ps1
   ```
3. Chạy server FastAPI:
   ```bash
   cd audiobook_builder
   python server.py
   ```
   *Lưu ý: Đợi màn hình báo "OmniVoice đã sẵn sàng" thì mới bắt đầu xài Web.*

   taskkill /F /IM python.exe
 Chạy lại lệnh: python server.py (Nếu nó báo lỗi port 8000 đã bị chiếm dụng như lúc nãy ông bảo, thì ông mở 1 terminal mới và gõ lệnh này để kill luôn thằng đang kẹt nhé: netstat -ano | findstr :8000, thấy số PID cuối cùng thì gõ taskkill /PID <số PID> /F, rồi hãy chạy lại python server.py)
### Terminal 2: Chạy Frontend (UI)
1. Bật Terminal thứ 2.
2. Đi vào thư mục frontend và chạy Vite:
   ```bash
   cd frontend
   npm run dev
   ```
3. Mở trình duyệt và truy cập: `http://localhost:5173`

---

## 3. Các tính năng đã hoàn thiện (Done)

✅ **1. Smart Chunking & Gemini Director:** 
*   Upload file `.md` dài lê thê, hệ thống sẽ tự động chặt nhỏ và kêu Gemini gán vai cho từng nhân vật.
*   *File liên quan:* `text_processor.py`, `server.py`

✅ **2. State Management & JSON Backup:**
*   Kịch bản đang làm dở sẽ tự động lưu vào LocalStorage (F5 không mất).
*   Có chức năng **Save JSON / Load JSON** để sao lưu kịch bản ra file cứng.
*   *File liên quan:* `frontend/src/App.tsx`

✅ **3. Dynamic Voice Manager (Tạo Diễn Viên Ảo):**
*   Hệ thống tự quét kịch bản, thấy bao nhiêu nhân vật lạ là tự động tạo bấy nhiêu Thẻ Diễn Viên.
*   Chức năng "Lock Voice": Cho phép phối (Mix) giới tính, độ tuổi, tone giọng.
*   Backend tự động lưu file mẫu `*_synthetic.wav` vào thư mục `Voice_ref` và nạp vào Voice Cache. Khởi động lại server vẫn nhớ giọng của nhân vật!
*   *File liên quan:* `frontend/src/App.tsx`, `audio_generator.py` (hàm `__init__` & `generate`)

---

## 4. Việc cần làm tiếp theo (Next Steps - Chunk 4)

Nhiệm vụ của ngày mai là hoàn thiện nút **Render All** - mảnh ghép cuối cùng của dự án.

### Trình tự xử lý "Render All":
1.  **Frontend:** Lặp qua toàn bộ mảng `script` hiện tại trên UI, gửi từng dòng một (kèm theo `text` và `speaker`) xuống Backend thông qua 1 API mới (vd: `POST /api/render-line`).
2.  **Backend:** Nhận text, tìm Voice Cache của speaker, gọi `audio_gen.generate` để sinh ra file `.wav` lẻ (vd: `line_01.wav`). Trả về đường dẫn file.
3.  **Frontend Tracking:** UI hiển thị thanh Progress Bar, dòng nào render xong hiện dấu Check (✅).
4.  **Assemble (Ghép nối):** Khi toàn bộ các dòng đã render xong, gọi API `POST /api/assemble-audio` để backend dùng thư viện `pydub` (hoặc FFmpeg) nối tất cả các file lẻ lại thành 1 file `final_chapter_01.wav` duy nhất.
5.  **Export:** Hiển thị nút Tải Xuống cho phép người dùng down cục Audio hoàn chỉnh về máy.

---

### Chúc bro ngủ ngon!
*Sáng mai mở file này lên đọc qua 1 lượt là "nhập thần" code tiếp cái Render All nhoay nhoáy liền!*
