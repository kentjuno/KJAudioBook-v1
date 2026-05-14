# Kế hoạch Nâng cấp Post-Production DAW (Phase 4 - 6)

Tuyệt vời! Sếp đang muốn biến cái DAW này từ một công cụ "ghép nối tự động" thành một **Phần mềm Dựng phim Chuyên nghiệp (NLE - Non-Linear Editor)** thực thụ luôn rồi đấy. 

Dưới đây là phân tích chi tiết và lộ trình để xử lý 3 yêu cầu "khó nhằn" nhưng cực kỳ đáng giá này:

## Phân Tích Yêu Cầu

### 1. Kéo dài / Rút ngắn Video (Resize / Trim)
- **Vấn đề hiện tại:** Video bị ép cứng `duration` bằng với thời lượng của câu thoại. Video AI dài 8s nhưng thoại 1s thì video bị ngắt cái rụp.
- **Giải pháp:** 
  - Biến các cục Video Clip trên Timeline thành **Resizable** (có 2 tay nắm ở 2 đầu để kéo giãn).
  - Tách bạch giữa `audio_duration` và `video_duration`. 
  - Thêm thuộc tính `trimStart` và `trimEnd` để backend (FFmpeg) biết sếp muốn cắt video từ giây thứ mấy đến giây thứ mấy.

### 2. Di chuyển Video Clip (Drag & Drop)
- **Vấn đề hiện tại:** Video dính chặt vào `startTime` của Audio.
- **Giải pháp:**
  - Tách sự phụ thuộc của Video ra khỏi Audio trong Tab Post-Production.
  - Cho phép dùng chuột Kéo-Thả (Drag & Drop) cục Video sang trái/phải tự do dọc theo thanh Timeline.
  - Cập nhật số liệu `startTime` liên tục trên UI Inspector.

### 3. Nhiều Video cho 1 Cảnh dài (Multi-Video per Scene)
- **Vấn đề hiện tại:** 1 câu thoại dài 15 giây, nhưng AI Video max chỉ tạo được 8 giây. Sếp sẽ bị màn hình đen 7 giây cuối.
- **Giải pháp (Có 2 phương án, đề xuất Phương án B):**
  - *Phương án A (Tách kịch bản):* Cắt câu thoại dài ra làm 2 câu ngắn trong Audio Studio. (Hơi phiền)
  - **Phương án B (Video Studio Multi-Asset):** Trong Video Studio, mỗi Scene thay vì chỉ được giữ 1 Video, nay sẽ có một **danh sách Video**. Sếp có thể bấm Generate ra Video thứ 1 (dài 8s), rồi bấm Generate Video thứ 2 (dài 8s) cho cùng 1 cảnh đó. Lúc bấm "Sync", cả 2 video sẽ chạy sang Timeline xếp nối đuôi nhau.

---

## Lộ Trình Triển Khai (Roadmap)

### Phase 4: Kéo, Thả và Co giãn trên Timeline (Draggable & Resizable)
1. **Frontend:** 
   - Code logic cho phép click chuột và giữ (Drag) để di chuyển cục Video & Audio trên Timeline.
   - Thêm "Tay nắm" (Handles) ở cạnh trái/phải để kéo giãn `duration` của Video.
2. **Properties Inspector:** 
   - Thêm ô nhập số cho `Start Time` và `Duration` để chỉnh tay cho chính xác đến từng mili-giây.
3. **Backend Preview:** 
   - Đảm bảo Playhead chiếu đúng khoảng thời gian đã kéo giãn. (Nếu kéo video dài ra 8s, trình chiếu phải play đủ 8s).

### Phase 5: Nâng cấp Video Studio (Multi-Asset)
1. **Giao diện Video Studio:**
   - Thay đổi cấu trúc của mỗi Node: Hiển thị 1 dạng "Gallery" nhỏ chứa các video đã tạo cho Node đó.
   - Nút "Tạo Video" sẽ không ghi đè video cũ nữa, mà sẽ đẻ thêm video mới vào Gallery của Node.
2. **Logic Sync:**
   - Khi bấm `Sync To Timeline`, đếm xem Scene có bao nhiêu Video, lấy tất cả ném sang Post-Production xếp nối đuôi nhau.

### Phase 6: Nâng cấp Động cơ Mix & Export (Backend)
1. Cập nhật `api_mix_video_timeline` để FFmpeg cắt đúng đoạn video sếp đã Trim (sử dụng `-ss` và `-t` trong FFmpeg command).
2. Xử lý việc mix âm thanh chéo (cross-fade) nếu sếp yêu cầu.

---
**Tổng Kết:** Khá là "dài hơi" đúng như sếp nói, nhưng nếu làm xong thì phần mềm này không khác gì Premiere Pro phiên bản thu nhỏ đâu!
