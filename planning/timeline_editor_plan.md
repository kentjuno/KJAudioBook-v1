# 🎬 Phase 4: Kế Hoạch Xây Dựng Timeline Editor (Stories Editor)

Tính năng **Timeline Editor** sẽ đưa Audiobook Factory Studio lên một tầm cao mới, chuyển đổi từ một công cụ ghép âm thanh đơn giản (nối tiếp nhau) thành một phần mềm chỉnh sửa phi tuyến tính (NLE - Non-Linear Editor) tương tự như Adobe Audition hay Premiere.

Dưới đây là bản thiết kế kiến trúc và lộ trình thực hiện tính năng này.

---

## 1. Phân Tích Yêu Cầu & Kiến Trúc Mới

Hiện tại, quá trình Assemble (Ghép nối) đang diễn ra **tuyến tính**: `File 1 + pause(500ms) + File 2`.
Để có Timeline, chúng ta cần:
- **Trục thời gian thực (Absolute Time):** Mỗi đoạn thoại (clip) sẽ có một mốc thời gian bắt đầu (`startTime`) cụ thể (ví dụ: giây thứ 10.5).
- **Đa rãnh (Multi-track):** Hỗ trợ nhiều rãnh âm thanh. Các nhân vật khác nhau có thể nằm ở các rãnh khác nhau. Thậm chí có thể chèn rãnh nhạc nền (BGM) hoặc hiệu ứng âm thanh (SFX).
- **Tuỳ biến khoảng lặng (Dynamic Pauses):** Người dùng kéo khoảng cách giữa 2 clip xa ra thì sẽ có khoảng lặng dài hơn, kéo đè lên nhau thì 2 nhân vật sẽ nói chen ngang (Overlapping dialogue).

### Mô Hình Dữ Liệu Mới (Timeline State)
Trên Frontend, chúng ta sẽ cần một mảng state mới quản lý các Clip trên Timeline:
```typescript
interface TimelineClip {
  id: string;          // ID duy nhất của clip trên timeline
  lineId: number;      // Liên kết với dòng kịch bản gốc
  speaker: string;     // Tên nhân vật (Morgan, Scarlett...)
  audioUrl: string;    // Blob URL để phát âm thanh
  filename: string;    // Tên file trên server để gửi xuống backend mix
  track: number;       // Số thứ tự của Track (0, 1, 2...)
  startTime: number;   // Vị trí bắt đầu (tính bằng Giây)
  duration: number;    // Độ dài của file âm thanh (tính bằng Giây)
}
```

---

## 2. Thiết Kế Giao Diện (UI/UX)

Timeline sẽ được đặt ở **nửa dưới màn hình** (Split View) hoặc một **Tab riêng biệt**.

*   **Ruler (Thước đo thời gian):** Thanh ngang trên cùng hiển thị mốc thời gian (0:00, 0:02, 0:04...).
*   **Playhead (Con trỏ thời gian):** Thanh dọc màu vàng di chuyển từ trái sang phải khi play audio.
*   **Tracks (Rãnh âm thanh):** Các dòng ngang. Mỗi Track có thể được gán màu riêng hoặc đại diện cho 1 nhân vật.
*   **Clips (Khối âm thanh):** 
    *   Các khối `div` hình chữ nhật nằm trên Track.
    *   Chiều rộng (width) tỷ lệ thuận với `duration`.
    *   Vị trí (left) tỷ lệ thuận với `startTime`.
    *   Bên trong có hiển thị hình ảnh Waveform (sóng âm) giả lập hoặc dùng thư viện để vẽ sóng thực tế.
    *   Hiển thị tên Speaker góc trên cùng.
*   **Controls:** Nút Play/Pause toàn bộ timeline, Zoom In/Out, Split Clip (Cắt đôi clip).

---

## 3. Công Nghệ Sử Dụng

### Frontend:
*   **Giao diện Kéo Thả (Drag & Drop):** Sử dụng kết hợp CSS `absolute positioning` và sự kiện chuột (`onMouseDown`, `onMouseMove`, `onMouseUp`) để tính toán toạ độ `left` và chuyển đổi ra giây (giây = `left / pixelsPerSecond`). Hoặc có thể dùng thư viện `react-rnd` (Resizable and Draggable) để làm nhanh.
*   **Vẽ Waveform:** Có thể dùng `wavesurfer.js` để tạo sóng âm thực tế, hoặc CSS/SVG vẽ sóng giả (dummy waveform) cho nhẹ.
*   **Phát Audio tổng:** Web Audio API. Tính toán `currentTime` và kích hoạt các hàm `.play()` của các clip khi Playhead đi qua.

### Backend (Python/FastAPI):
*   **Lấy độ dài file:** Cần thêm hàm dùng `pydub` hoặc `librosa` để trả về `duration` (số giây) của file `.wav` khi render xong.
*   **Mix Audio Nâng Cao:** API `assemble-audio` cũ sẽ được đập đi xây lại. Thay vì nối file, nó sẽ tạo một `AudioSegment.silent(duration=total_length)` (Khuôn nền trống), sau đó dùng hàm `overlay(segment, position=startTime * 1000)` của `pydub` để "đắp" từng đoạn âm thanh lên đúng toạ độ thời gian.

---

## 4. Lộ Trình Thực Hiện (Roadmap)

### Giai đoạn 1: Backend Foundation (Nền tảng xử lý Audio)
1. Cập nhật API `/api/render-line` để trả về thêm `duration` (độ dài tính bằng giây) của file `.wav` vừa tạo.
2. Viết API mới `/api/mix-timeline` nhận vào một mảng JSON các clips (gồm `filename`, `startTime`, `track`) và sử dụng `pydub.overlay` để mix tất cả thành 1 file MP3 xuất ra.

### Giai đoạn 2: UI Timeline Cơ Bản
1. Xây dựng Component `TimelineEditor`.
2. Tạo hệ thống Ruler (thước đo) và Tracks bằng CSS Grid/Flexbox.
3. Khi bấm "Render Selected" ở kịch bản trên, kết quả audio trả về sẽ tự động được thả (drop) vào Timeline dưới dạng các khối màu chữ nhật.

### Giai đoạn 3: Tính năng Kéo Thả & Zoom
1. Gắn sự kiện để nắm kéo khối chữ nhật chạy ngang qua lại trên Timeline để thay đổi `startTime`.
2. Cho phép kéo thả giữa các Tracks (thay đổi rãnh).
3. Thêm tính năng Zoom In/Out (thay đổi hệ số `pixelsPerSecond` để giãn/thu thanh thước đo).

### Giai đoạn 4: Playback & Đồng bộ hoá (Khó nhất)
1. Làm thanh Playhead (con trỏ chuột vàng).
2. Logic Play/Pause: Cần đồng bộ thời gian của toàn cục. Khi bấm Play, dùng Web Audio API để phát cùng lúc các đoạn âm thanh theo đúng `startTime` của chúng. 

---

## 5. Ưu Điểm của Giải Pháp Này
*   **Thực dụng:** Giải quyết dứt điểm vấn đề "sai một ly đi một dặm". Bro chỉ cần bôi đen 1 câu lỗi ở kịch bản trên, render lại, rồi kéo cục âm thanh mới đè lên vị trí cục cũ ở timeline dưới là xong.
*   **Kịch tính:** Có thể để 2 nhân vật nói chèn lên nhau (Overlapping) khi cãi lộn, bằng cách kéo 2 clip chéo nhau.
*   **Mở rộng:** Tương lai có thể làm thêm Track âm thanh (Mưa rơi, sấm sét, nhạc nền) thả vào dưới cùng để mix chung với giọng đọc AI!
