# Timeline Editor Tasks (Phase 4)

Danh sách này chia nhỏ công việc thành các bước cực kỳ cụ thể để tránh lỗi "Over Context" (quá tải bộ nhớ). Chúng ta sẽ tick (x) vào từng ô sau khi hoàn thành.

## Phase 1: Backend Foundation (API Xử lý Audio)
- [x] **Task 1.1: Lấy độ dài Audio** 
  - Sửa `server.py` (`/api/render-line` và `/api/test-voice`) để sử dụng `pydub` hoặc `wave` đọc file `.wav` vừa tạo và trả về thêm biến `duration` (số giây).
- [x] **Task 1.2: API Mix Audio mới** 
  - Tạo endpoint `POST /api/mix-timeline`.
  - Nhận mảng dữ liệu: `[{filename, startTime, track}, ...]`.
  - Tạo khung audio rỗng (`AudioSegment.silent()`).
  - Dùng vòng lặp gọi `overlay()` để đắp từng đoạn audio vào đúng vị trí `startTime`.
  - Trả về file `final_mix.mp3`.

## Phase 2: Frontend UI & Data Model
- [x] **Task 2.1: Chuẩn bị State**
  - Định nghĩa interface `TimelineClip`.
  - Khởi tạo state `clips` trong `App.tsx` (hoặc tách ra file `TimelineContext` nếu cần).
  - Cập nhật logic của "Render Selected": Khi có kết quả từ backend, push thêm/cập nhật clip vào mảng `clips`.
- [x] **Task 2.2: Dựng Khung Giao Diện Timeline**
  - Tạo một Panel mới ở bên dưới cùng (Bottom Panel).
  - Vẽ thanh thước đo (Ruler).
  - Vẽ các dòng ngang (Tracks).

## Phase 3: Engine Kéo Thả (Drag & Drop NLE)
- [x] **Task 3.1: Vẽ Clip lên Track**
  - Áp dụng công thức tính CSS: `left = startTime * pixelsPerSecond`, `width = duration * pixelsPerSecond`.
  - Gắn dữ liệu Clip thành các khối màu `div`.
- [x] **Task 3.2: Xử lý sự kiện Chuột**
  - Thêm `onMouseDown`, `onMouseMove`, `onMouseUp` để di chuyển khối (thay đổi `startTime`).
  - Logic Snap (Hít) để các clip không bị lệch lẻ tẻ hoặc dính mép.

## Phase 4: Playback & Export
- [x] **Task 4.1: Playhead & Đồng bộ phát nhạc**
  - Xử lý con trỏ chuột màu vàng chạy qua lại báo hiệu thời gian hiện tại (`currentTime`).
  - Logic phát toàn bộ các Audio Element đúng nhịp.
- [ ] **Task 4.2: Tích hợp Export**
  - Thêm nút "Mix & Export Timeline". Gọi gọi API `mix-timeline` và xả file MP3 cuối cùng.
