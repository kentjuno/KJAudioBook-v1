# Kế Hoạch Xây Dựng: Video Director Dashboard (Phân Hệ Video)

## Mục Tiêu (Objective)
Do giao diện (UI) hiện tại của AudioBook Studio đang được thiết kế tối ưu cho việc sản xuất và chỉnh sửa Audio (Timeline, Mix audio), việc nhồi nhét thêm tính năng Storyboard và tạo Video sẽ làm giao diện bị rối và khó sử dụng. 
Mục tiêu của kế hoạch này là xây dựng một **Dashboard độc lập hoàn toàn dành riêng cho việc Đạo diễn Video (Video Director)**. Phân hệ này sẽ kế thừa dữ liệu hiện có (Kịch bản, Visual Casting) và ứng dụng mô hình 2 bước (Layered Generation) từ repo `flowboard` để tạo Storyboard nhất quán trước khi render Video.

---

## Phase 1: Thiết Kế UI/UX & Tách Biệt Workspace
**Mục đích:** Tạo một không gian làm việc chuyên biệt cho hình ảnh/video, nhưng vẫn giữ khả năng đồng bộ dữ liệu dễ dàng thông qua hệ thống Tab.

- **1.1. Navigation (Dạng Tab):** 
  - Tích hợp Tab điều hướng ngay trên cùng 1 trang: `Audio Studio` | `Video Studio` để tránh load lại trang và dễ đồng bộ (sync) dữ liệu giữa Audio và Video.
- **1.2. Bố cục Video Dashboard (Split View):**
  - **Khung Trái (Audio Script List):** Hiển thị danh sách kịch bản audio (chỉ đọc) cuộn dọc. Giúp đối chiếu nhanh văn bản.
  - **Khung Phải (ReactFlow Canvas):** Không gian làm việc đồ họa (Node-based) giống `flowboard`. Chứa các Node Asset (Nhân vật, Bối cảnh) và các Node Cảnh quay (Image/Video).
  - **Sync Highlights:** Click vào Node cảnh quay bên phải, kịch bản bên trái sẽ tự động cuộn và highlight những dòng thoại tương ứng.

---

## Phase 2: Nâng Cấp Backend & Tích Hợp Extension (Two-Step Pipeline)
**Mục đích:** Bổ sung các API để hỗ trợ quá trình tạo ảnh tĩnh từ nhiều nguồn (Multi-ref to Image) và tạo video từ ảnh tĩnh (Image to Video) thông qua **FlowKit Extension**.

- **2.0. Kiến Trúc FlowKit Extension:**
  - Extension "Flow Kit" (đang cài ở Chrome) đóng vai trò là cầu nối (Local Agent Bridge) giữa Local Backend và Google Labs API.
  - Tự động bắt Authorization Tokens, cookies, giải quyết reCAPTCHA, và proxy các request (Video Gen, Image Gen) lên Google Labs mà không gặp lỗi CORS hay xác thực.

- **[x] 2.1. Cập nhật API Tạo Ảnh (Multi-ref Image Gen):**
  - Viết API `/api/generate-scene-frame` nhận vào `prompt`, `character_id`, `location_id`.
  - Cập nhật `flow_service.py` để gửi request tới mô hình tạo ảnh (GEM_PIX_2) với nhiều `IMAGE_INPUT_TYPE_REFERENCE`. (Đã hoàn thiện qua endpoint đồng bộ)
- **2.2. Cập nhật API Tạo Video (Single-Image to Video):**
  - Chỉnh sửa lại logic gọi Veo 3.1: API `/api/generate-scene-video` giờ đây chỉ nhận vào đúng 1 `media_id` của ảnh tĩnh (Frame) đã được người dùng duyệt ở bước trước, kèm theo `motion_prompt`.
- **2.3. Cập nhật Metadata Model:**
  - Mở rộng JSON schema của Project để lưu thêm mảng `storyboard`: Lưu trữ media_id của các khung hình tĩnh (frames) và video tương ứng cho từng dòng kịch bản.

---

## Phase 3: AI Director & Storyboard Generation (Node Graph) [HOÀN THÀNH]
**Mục đích:** Khắc phục sự chênh lệch nhịp độ (Pacing) giữa Audio Script và Video, đồng thời tự động hóa việc xây dựng cây Node cho ReactFlow.

- **[x] 3.1. AI Director Analysis (Phân tích kịch bản bằng Gemini):**
  - Thêm nút "Generate Storyboard". Hệ thống gọi LLM đọc toàn bộ kịch bản Audio.
  - LLM đóng vai trò đạo diễn: Nhóm các câu thoại ngắn hoặc cắt nhỏ văn bản dài thành các "Shot" quay hợp lý (mỗi Shot 5-8s).
- **[x] 3.2. Auto-Wire Nodes trên ReactFlow:**
  - Dựa trên kết quả từ AI Director, hệ thống tự động sinh ra các **Image Node** (đại diện cho các Shot) trên khung ReactFlow.
  - Tự động nối dây (auto-wire) từ các Asset Node (Character, Location) vào đúng Image Node tương ứng.
  - AI tự viết sẵn "Visual Prompt" (góc máy, bối cảnh, hành động) cho từng Image Node.
- **[x] 3.3. Generate & Iterate Static Frames (Tạo Ảnh Tĩnh):**
  - User review các Node trên ReactFlow. Bấm "Gen Frame" để tạo ảnh tĩnh dựa trên các Node Asset được nối vào (Multi-ref).
  - Cho phép sửa Visual Prompt trực tiếp trên Node nếu chưa ưng ý. Chốt "Keyframe" khi hoàn hảo.

---

## Phase 3.5: Chuyên Sâu Hóa Nền Tảng Visual Assets (Neo Hình Ảnh)
**Mục đích:** Xây dựng bộ công cụ quản lý và tinh chỉnh Nhân vật/Bối cảnh (Visual Anchors) một cách chặt chẽ trước khi bước vào tạo Video. Độ nhất quán (Consistency) của Video phụ thuộc 100% vào bước này.

- **[x] 3.5.1. Asset CRUD & Prompt Engineering:**
  - Cho phép người dùng **Thêm thủ công (Add Asset)**, sửa tên, đổi loại (Character/Location/Prop).
  - Biến `image_prompt` từ Read-only thành **Editable Textarea**, cho phép người dùng tự do viết lại hoặc tinh chỉnh prompt.
  - Thêm nút **"Enhance Prompt"**: Gọi Gemini để tự động trau chuốt một mô tả ngắn gọn thành một prompt chuyên nghiệp (thêm ánh sáng, góc máy, chất liệu).
- **[x] 3.5.2. Variations & Asset Gallery (Quản lý nhiều phương án):**
  - Khi bấm "Gen Ảnh bằng AI", không ghi đè ảnh cũ. Lưu ảnh mới vào một danh sách (Gallery/Variations) cho từng nhân vật.
  - Cho phép người dùng bấm "Regen" nhiều lần, sau đó review và **Set as Official** (chọn tấm ưng ý nhất làm Neo chính thức).
- **[x] 3.5.3. Multi-Reference Board (Character Sheet):**
  - Mở rộng để một Asset có thể lưu nhiều `media_id` (ví dụ: góc chính diện, góc nghiêng, toàn thân).
  - Khi truyền vào Veo 3.1 ở Phase 4, truyền toàn bộ mảng reference này vào để AI video hiểu cấu trúc 3D của nhân vật tốt hơn.
- **[x] 3.5.4. Global Art Style (Phong cách đồng nhất):**
  - Lưu "Art Style" (ví dụ: Dark Sci-fi, Cinematic, Ghibli, Watercolor) vào Project Profile.
  - Tự động append (nối) Art Style này vào mọi Visual Prompt khi tạo ảnh Asset để đảm bảo Character và Location không bị lệch tông nhau.

---

## Phase 4: Tính Năng Video Rendering & Motion
**Mục đích:** Thêm chuyển động (motion) vào các khung hình đã được chốt.

- **[x] 4.1. Motion Prompting UI & Facial Action Control:**
  - Với những Frame đã chốt, hiển thị form nhập "Motion Prompt" (mô tả chuyển động máy quay, hành động nhân vật). 
  - **Tích hợp FACS (Facial Action Coding System):** Sử dụng `Docsref/FACS_Prompt_Guide.md` làm tài liệu tham chiếu (RAG) cho AI. Khi người dùng nhập "Nhân vật buồn bã", AI tự động chuyển hóa thành "AU 1+4+15: Inner brows raise, lip corners depress" để ép Veo 3.1 tạo ra biểu cảm khuôn mặt chính xác đến từng cơ mặt.
  - (Tương lai) Tích hợp hệ thống **Facial Action Coding System (FACS)** (tham khảo `Docsref/Facial_Action_Coding_System.md`) để LLM tự động dịch cảm xúc nhân vật trong kịch bản thành các tham số Action Units (A.U.s) cụ thể (vd: vui vẻ = AU 6+12). Việc này giúp motion prompt của Veo 3.1 hoặc các AI Video khác hiểu và điều khiển biểu cảm khuôn mặt chính xác đến mức điện ảnh.
- **[x] 4.2. Video Dispatcher:**
  - Nút "Render Video" gửi yêu cầu tạo video (API 2.2) vào hàng đợi (background job polling).
  - Tích hợp Polling System hiện tại để hiển thị % loading hoặc trạng thái (Pending/Completed/Failed) trực tiếp trên Scene Card.
- **[x] 4.3. Review & Approve Video:**
  - Tự động phát/preview video khi job hoàn thành. 
  - Nút "Regen Video" nếu chuyển động không như ý (sử dụng lại Keyframe cũ, chỉ thay đổi motion prompt).

---

## Phase 5: Lắp Ráp & Đồng Bộ (Final Assembly)
**Mục đích:** Khớp nối thành quả của Video Studio với Audio Studio.

- **5.1. Đồng bộ thời lượng:**
  - Lấy thông tin thời lượng Audio từ Audio Studio để tính toán tốc độ hoặc số lượng video cần thiết cho mỗi cảnh.
- **5.2. Khớp Timeline:**
  - Nút "Sync to Timeline": Đẩy các Video clip đã duyệt vào một Track Video chuyên biệt bên trong UI Timeline (của Audio Studio) để người dùng có cái nhìn tổng quan.
- **5.3. Export Thành Phẩm:**
  - Combine (ghép) chuỗi Video Clips và File Audio (đã mix) thành file `.mp4` hoàn chỉnh.

