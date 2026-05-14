# Kế hoạch Xây dựng DAW Editor (Post-Production View)

## 1. Luồng làm việc (Workflow) & Phân bổ Nút bấm

Dự án sẽ được mở rộng từ 2 Tab hiện tại thành **3 Tab độc lập**:
1. **Audio Studio:** Nơi xử lý kịch bản, gán giọng AI, và quản lý các file Audio riêng lẻ.
2. **Video Studio:** Nơi thiết lập bối cảnh, quản lý asset và render AI Video.
3. **Post-Production (Mới):** Nơi ghép nối, đồng bộ, chỉnh sửa chi tiết và xuất file cuối cùng.

**Phân bổ Nút bấm (Dựa theo ảnh UI):**
- **Tại Audio Studio:**
  - `Upload .md`, `Load JSON`, `Save JSON`: Quản lý file kịch bản, chỉ nên nằm ở Tab Audio.
  - `Render All`: Nút này dùng để gọi API sinh giọng nói AI cho toàn bộ Script, giữ nguyên ở Tab Audio.
  - *Mini DAW của Audio*: Giữ nguyên để bro sắp xếp âm thanh tạm thời. Tích hợp thêm nút **"Sync to Post-Production"** để ném toàn bộ Audio đã sắp xếp sang Tab thứ 3.
- **Tại Video Studio:**
  - Giữ lại nút **"Sync To Timeline"** nhưng bản chất là nó sẽ ném các Video Segment sang Tab thứ 3 (Post-Production).
- **Tại Post-Production (DAW Editor):**
  - Chứa Timeline khổng lồ tổng hợp cả Audio (từ bước 1) và Video (từ bước 2).
  - Nút `Tải Audio Về` và `Mix & Export` sẽ được đặt chễm chệ ở đây vì đây là bước cuối cùng xuất xưởng!

---

## 2. Kiến trúc Giao diện của Post-Production View

Giao diện sẽ được chia làm 3 khu vực chính:

### 2.1. Khu vực Preview Player (Nửa trên bên trái)
- Một màn hình Player lớn để xem video.
- **Real-time Sync:** Đồng bộ hoá thời gian thực giữa con trỏ Playhead (vạch đỏ) và hình ảnh Video đang hiển thị.
- Khi Playhead đi qua video nào, hình ảnh video đó sẽ chiếu lên màn hình, kèm theo âm thanh của video (nếu Video đó được bật Sound).

### 2.2. Khu vực Properties Inspector (Nửa trên bên phải)
- Thay vì nhét hết nút bấm lên cục Clip bé tí xíu, giờ đây khi Click vào một Audio Clip hoặc Video Clip trên Timeline, một bảng điều khiển sẽ hiện ra ở góc phải.
- Tại đây, bro có thể tùy chỉnh:
  - **Giữ âm thanh gốc (Keep Sound):** ON/OFF.
  - **Volume:** Thanh trượt từ `0%` đến `200%` cho âm thanh của video đó.
  - **Offset/Delay:** Kéo thủ công hoặc nhập số để chỉnh lệch nhịp chính xác đến từng mili-giây.

### 2.3. Khu vực Timeline Workspace (Nửa dưới màn hình)
- Full-width Timeline với thanh Zoom cực rộng để có thể phóng to các clip cực ngắn.
- **Tổ chức Track rõ ràng:**
  - `Track 1`: Video Track.
  - `Track 2`: Master Dialogue Track (Giọng AI).
  - `Track 3`: BGM / SFX Track (Nhạc nền/Hiệu ứng - Để dự phòng tương lai).

---

## 3. Nâng cấp Logic (Frontend & Backend)

**Frontend (React):**
- **Global State:** Đưa `timelineClips` (Audio) và `timelineVideoClips` (Video) vào Zustand/Context API để lưu trữ xuyên suốt 3 Tab. Khi bấm "Sync" ở Tab 1 hoặc Tab 2, dữ liệu sẽ được đẩy vào Global Store.
- Viết lại hệ thống **Playback đồng bộ**: Dùng một hàm `requestAnimationFrame` để quét con trỏ (Playhead), tự động lấy Video đúng thời điểm đó và chiếu lên màn hình Preview, đồng thời phát âm thanh tương ứng.

**Backend (Python/FFmpeg):**
- Sửa payload API `/api/mix-video-timeline` để tiếp nhận tham số `volume`.
- Trong hàm trộn bằng `pydub`, sẽ áp dụng thuật toán tăng/giảm Decibel (dB) tương ứng với giá trị Volume của từng Video clip trước khi mix vào Master Audio.

---

## 4. Lộ trình Triển khai (Roadmap)

1. **Phase 1: Phân tách 3 Tabs & Global Store**
   - Di chuyển các nút bấm `Load JSON`, `Save JSON`, v.v. về đúng Tab.
   - Setup Zustand (hoặc Context) để chứa Timeline Data.
   - Code khung sườn Tab "Post-Production" mới.

2. **Phase 2: Xây dựng Properties Inspector**
   - Tạo UI cho bảng Inspector.
   - Thêm tính năng chọn Clip và chỉnh Volume, Keep Sound.
   - Đưa thanh trượt Volume xuống API `pydub` ở backend.

3. **Phase 3: Advanced Video Preview (Trình chiếu Video)**
   - Cài đặt màn hình hiển thị Video khớp với Playhead trong Post-Production.
   - Xử lý logic Play/Pause đồng bộ giữa âm thanh AI và hình ảnh/âm thanh Video gốc.
