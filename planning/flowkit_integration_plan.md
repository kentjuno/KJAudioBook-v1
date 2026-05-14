# Kế hoạch Tích hợp FlowKit (Google Flow AI) vào Audiobook Studio

Kế hoạch này chia nhỏ quá trình tích hợp FlowKit extension vào dự án `audiobook_builder` để tự động hóa việc tạo hình ảnh và video từ kịch bản audio.

## Phase 1: Chuẩn bị & Cấu hình Môi trường (Environment Setup)
*Mục tiêu: Đảm bảo Extension có thể giao tiếp được với Backend của hệ thống hiện tại.*

1. **Sao chép & Tùy biến Extension:**
   - Copy thư mục `extension` từ repo `flowkit` sang một thư mục an toàn trong workspace (vd: `audiobook_builder/flowkit_extension`).
   - Mở file `background.js`, sửa hằng số `AGENT_WS_URL` trỏ về đúng địa chỉ port của `server.py` (Ví dụ: `ws://127.0.0.1:8000/ws/flowkit`).
2. **Cài đặt Extension:**
   - Bật Developer Mode trong `chrome://extensions/`.
   - Load unpacked thư mục extension vừa tạo.
3. **Chuẩn bị Browser Session:**
   - Mở 1 tab `https://labs.google/fx/tools/flow` trên trình duyệt và đăng nhập tài khoản Google. (Nên ghim tab này lại).

## Phase 2: Xây dựng Cầu nối (Agent Bridge) trên Python Backend
*Mục tiêu: Backend (`server.py`) có thể nhận kết nối WebSocket từ Extension, thu thập Token và nhận kết quả trả về.*

1. **Cài đặt WebSocket Manager (`server.py`):**
   - Thêm route `@app.websocket("/ws/flowkit")` vào FastAPI.
   - Viết logic quản lý kết nối (chấp nhận kết nối, duy trì kết nối, xử lý disconnect).
   - Xử lý message `token_captured` từ Chrome gửi lên để lưu trữ `flowKey` (Bearer token) vào bộ nhớ.
2. **Cài đặt Callback Endpoint:**
   - Tạo route `POST /api/ext/callback`.
   - Đây là nơi Chrome Extension sẽ gửi HTTP POST báo cáo kết quả API (vì đôi khi tin nhắn qua WebSocket bị timeout/đứt gánh).
3. **Xây dựng Dispatcher:**
   - Viết hàm cho phép Backend "push" (gửi lệnh) xuống Chrome Extension qua WebSocket (vd: lệnh `api_request`, `solve_captcha`).

## Phase 3: Core AI Generation Service (Video/Image SDK)
*Mục tiêu: Đóng gói logic gọi API của Google Flow thành các hàm Python dễ sử dụng và đảm bảo không mất dữ liệu khi chờ đợi.*

1. **Module `flow_service.py` & Request Builder:**
   - Viết các hàm build payload JSON chuẩn của Google Flow (chỉ định cấu hình `model: "veo_3_1_i2v_lite_low_priority"` cho video).
   - Hàm `request_scene_video(prompt, reference_media_ids)`: Build payload tạo video cảnh vật, có chèn mảng `mediaId` của nhân vật/địa điểm.
2. **Persistent Queue & Job Tracking (Quan trọng):**
   - Vì video gen tốn 2-5 phút và có thể bị lỗi mạng, bắt buộc phải dùng Database (như SQLite hoặc tinydb) để track trạng thái Job (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`).
   - Hàm Polling: Background task định kỳ (10s) lấy các job `PROCESSING` đem hỏi Extension xem đã xong chưa.
3. **Download Module & Response Parser:**
   - Khi job `COMPLETED`, parse response từ Google Flow (tách base64 hoặc URL) và dùng Python tải file `.mp4` / `.jpg` về thư mục của audiobook.

## Phase 4: Tích hợp Flow xử lý Kịch bản (Script to Visual Pipeline)
*Mục tiêu: Kết nối luồng xử lý kịch bản hiện tại với Flow Service và Quản lý dữ liệu nhân vật xuyên suốt.*

1. **Trích xuất Nhân vật & Địa điểm (LLM Extraction):**
   - Prompt Gemini API đọc file kịch bản Markdown, phân tích và nhặt ra cả **Nhân vật** (Characters) và **Địa điểm/Bối cảnh** (Locations).
   - Xuất ra file `characters_metadata.json` (chứa tên, mô tả ngoại hình, và quan trọng nhất là `local_image_path`).
   - Với các chapter sau, LLM đọc lại file này để chỉ thêm mới các entity chưa có.
2. **Quản lý Vòng đời `media_id` (Xử lý lỗi Expiration - 1 hour TTL):**
   - **Lưu ý chí mạng:** Các ảnh custom bạn upload lên Google Flow để lấy `media_id` CHỈ SỐNG ĐƯỢC 1 TIẾNG. Nếu để sang ngày mai gen tiếp, `media_id` đó sẽ báo lỗi `Requested entity was not found`.
   - **Giải pháp:** Hệ thống sẽ kiểm tra timestamp của `media_id` trong file JSON. Nếu quá 1 tiếng, Backend sẽ tự động gọi lại hàm `uploadImage` (gửi file ảnh từ `local_image_path` lên lại Google) để cập nhật một `media_id` hoàn toàn mới trước khi bắt đầu gen video.
3. **Trích xuất Scene Prompts & Sinh Video:**
   - LLM tách kịch bản thành các Scene.
   - Gắn `media_id` (đã đảm bảo còn hạn) vào payload của từng Scene và đưa vào Queue cho Phase 3 xử lý.
4. **Đồng bộ với Audio:**
   - Lưu trữ đường dẫn video tương ứng với từng chunk audio/script để tiến hành merge.

## Phase 5: Cập nhật Giao diện (Frontend UI - React)
*Mục tiêu: Quản lý và theo dõi quá trình tạo hình ảnh từ giao diện.*

1. **Tiến trình (Progress UI):**
   - Thêm trạng thái trên UI (Dashboard/Timeline) hiển thị tiến trình: `Đang sinh ảnh tham chiếu`, `Đang render video (30%)`, `Hoàn thành`.
2. **Quản lý Reference Images:**
   - Thêm tab/modal cho phép người dùng xem, duyệt, hoặc bấm "Tạo lại" (Regenerate) đối với các hình ảnh nhân vật/địa điểm bị AI tạo sai.
3. **Review Timeline:**
   - Hiển thị video preview trực tiếp trên Timeline khi video đã được tải về thành công.

---
**Khuyến nghị tiếp theo:** Chúng ta nên bắt đầu ngay với **Phase 1 & Phase 2** bằng cách tạo thư mục extension mới và tích hợp đoạn code WebSocket vào `audiobook_builder/server.py`.
