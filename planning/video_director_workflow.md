# Video Director Pipeline Workflow

Tài liệu này ghi chú lại luồng làm việc (Workflow) chính thức của tính năng **Video Studio** dựa trên các bước đã thống nhất. Bro có thể dựa vào đây để chỉ ra lỗi ở từng step nhé.

## Step 1: Script Preparation (Chuyển đổi kịch bản)
- **Hành động**: Lấy kịch bản đã xử lý từ Audio Studio sang tab Video Studio.
- **Mục đích**: Chia nhỏ câu chuyện thành từng dòng/cảnh (Scene) để chuẩn bị cho việc xây dựng hình ảnh và video tương ứng cho từng lời thoại hoặc mô tả.

## Step 2: Entity Extraction & Asset Generation (Trích xuất & Tạo Asset)
- **Hành động**: 
  - Hệ thống tự động/thủ công trích xuất các đối tượng trực quan (Visual Objects) như nhân vật (Characters), đồ vật (Props), hoặc bối cảnh chính.
  - Người dùng tiến hành generate hình ảnh đại diện (References) cho các đối tượng này.
- **Mục đích**: Lưu trữ các hình ảnh gốc làm Asset tham chiếu để sử dụng cho Flow tạo hình sau này.

## Step 3: Scene Context & Reference Board (Thiết lập Bối cảnh)
- **Hành động**: Trộn lẫn các Assets (nhân vật, đồ vật) vào trong một Scene cụ thể. Thêm các mô tả chuyển động (Motion/Camera) và Prompt.
- **Mục đích**: Thiết lập một "Multi-Reference Board" hoàn chỉnh cho Cảnh đó, giúp AI tạo video hiểu được không gian, ngoại hình nhân vật và hành động cần diễn ra.

## Step 4: Video Generation (Render Video)
- **Hành động**: Người dùng bấm nút "Generate Video" (hoặc Gen Frame/Video) tại Scene đó.
- **Mục đích**: Gửi yêu cầu kèm Prompt và các Reference Assets (đã thiết lập ở Step 3) tới AI engine (thông qua FlowKit/Veo) để render video ngắn.

## Step 5: Link Video to Scene (Liên kết dữ liệu)
- **Hành động**: Backend trả về trạng thái Render xong kèm đường dẫn file (`video_url` hoặc `videoUri`).
- **Mục đích**: Video tự động được đính kèm và hiển thị ngay trên UI của dòng Scene tương ứng trong kịch bản. Người dùng có thể click để xem trước trực tiếp.

## Step 6: Sync to Timeline & Final Export (Đồng bộ & Xuất bản)
- **Hành động**:
  - Nhấn nút **"Sync To Timeline"**: Hệ thống lấy các Video đã Link ở Step 5, quét và so khớp với Timeline của Audio (DAW), rồi thả chúng vào **Video Track** với thời điểm bắt đầu (`startTime`) và độ dài (`duration`) khớp chính xác mỏ nhân vật.
  - Nhấn nút **"Mix & Export"**.
- **Mục đích**: Backend dùng thuật toán (FFmpeg) nối toàn bộ Video và Audio lại với nhau thành một file `.mp4` Master hoàn chỉnh để đăng Youtube/Tiktok.

---

> **Lưu ý cho Bro**: Cứ review file này, lỗi (hoặc flow chưa thuận tay) ở Step nào, bro cứ note tên Step đó ra và bảo tui sửa nhé!
