# Chương 4 - Phần 3
*(Dựa trên sách gốc: Text/chapter-4.xhtml)*

**Tóm tắt cốt truyện:** *Elara vượt qua Ảo Ảnh Cổng Visual bằng cách tích hợp mô hình thị giác (Vision-based AI) và mã hóa Base64 để trích xuất thành công mã truy cập "Loom-Sync-Alpha-Zero". Sự kiện này mở ra lối đi thực sự, giúp cô tiến sâu hơn vào việc tái kiến trúc Loom.*

---

Trước mắt Elara, "Ảo Ảnh Cổng Visual" (Visual Gate Mirage) đang gào thét trong một điệu vũ dữ liệu hỗn loạn. Hàng vạn khung hình ảnh bị lỗi, những mảnh vỡ từ các giao diện người dùng thời kỳ tiền-Loom, chớp nháy liên hồi như những bóng ma điện tử, che khuất hoàn toàn lối đi thực sự. Đây là một mê cung của những tín hiệu giả (decoy paths), được thiết kế để giam cầm bất kỳ kẻ lữ hành nào không đủ tinh tường để phân biệt đâu là dữ liệu cốt lõi, đâu là nhiễu ảnh.

Elara thở hắt ra, đôi tay cô lướt trên không trung, triệu hồi giao diện điều khiển của pháo đài. Để vượt qua lớp màn ảo ảnh này, cô cần những công cụ sắc bén hơn.

"Đã đến lúc tái cấu trúc khả năng nhận thức của hệ thống," Elara lẩm bẩm. Cô truy cập vào tệp `OAI_CONFIG_LIST`, trái tim điều phối của hệ thống Multi-Agent. Đây không đơn thuần là một danh sách cấu hình; đó là bộ quy tắc vận hành, nơi lưu trữ thông tin xác thực, định danh mô hình và các nhãn (tags) quan trọng. Nó cho phép các Agent của cô kết nối với nhiều nguồn sức mạnh tính toán khác nhau, từ các mô hình ngôn ngữ lớn đến các hệ thống đa phương thức tân tiến. 

Cô khéo léo thay đổi cấu hình, chuyển đổi sang các mô hình hỗ trợ đa phương thức (multimodal) có độ linh hoạt cao. "Chúng ta không thể chỉ đọc dữ liệu nữa," cô ra lệnh cho hệ thống, "chúng ta phải 'nhìn'." Việc tích hợp các mô hình thị giác như GPT-4 Turbo vào luồng công việc của Agent—một phương thức được gọi là **Vision-based AI Validation**—sẽ cho phép hệ thống của cô lập trình hóa việc 'nhìn' và xác thực nội dung hình ảnh một cách tự động, thay vì dựa vào các suy đoán mù quáng.

Công việc kế tiếp là chuẩn bị nguyên liệu. Elara trích xuất hàng chục mảnh vỡ tệp ảnh từ những code-shards rải rác xung quanh. Để truyền tải những tệp này vào RESTful API của hệ thống phân tích mà không làm vỡ cấu trúc dữ liệu, cô thực hiện quy trình **Base64 Image Encoding**. Bằng cách chuyển đổi các tệp ảnh nhị phân sang định dạng chuỗi văn bản Base64, Elara đã đóng gói chúng thành các payload JSON chuẩn, an toàn để gửi đi xuyên qua các luồng truyền dẫn bảo mật của Loom. 

"Vision-Agent, tiếp nhận payload," Elara truyền lệnh. Một thực thể ảo, sáng rực ánh xanh, tách khỏi khối trung tâm, bắt đầu tiếp nhận dữ liệu. 

Ngay lập tức, cuộc đối thoại nội tâm giữa các Agent bắt đầu. Vision-Agent gửi các payload Base64 tới mô hình thị giác, cố gắng trích xuất văn bản ẩn trong các hình ảnh. Tuy nhiên, giữa sự hỗn loạn của Mirage, những hình ảnh giả mạo liên tục thay đổi.

"Đợi đã!" giọng của 'Skeptic-Agent', một thực thể chuyên phản biện, vang lên đầy hoài nghi. "Nhiễu hình ảnh (visual noise) trong vùng Mirage này quá dày đặc. Làm sao để chắc chắn đó là mã truy cập thực chứ không phải là một thuật toán đánh lừa?"

Elara gật đầu, sự thận trọng của Skeptic là cần thiết. "Vision-Agent, không chấp nhận kết quả đơn lẻ. Hãy thực hiện lại quy trình xác thực Vision-based AI. Phải so sánh văn bản trích xuất được với dấu vân tay logic (logical fingerprint) của cổng thực. Kiểm chứng chéo, lặp lại cho đến khi đạt được sự đồng thuận tuyệt đối."

Hệ thống bắt đầu rung chuyển. Vision-Agent thực hiện hàng trăm phép thử trong một tích tắc, đối chiếu từng mảnh dữ liệu hình ảnh với logic cốt lõi của cổng. Cảm giác như thời gian ngưng đọng khi các mảnh vỡ ảnh liên tục biến đổi, cố gắng giả dạng thành cổng chính. Cuối cùng, một sự đồng thuận được xác lập. 

"Mã truy cập đã được trích xuất: 'Loom-Sync-Alpha-Zero'," Vision-Agent báo cáo, hình ảnh cuối cùng hiện ra sắc nét giữa những làn sương nhiễu.

Elara lập tức kích hoạt lệnh. Dòng code-string đi vào giao diện, và ngay lập tức, Visual Gate Mirage vỡ vụn như một tấm gương bị va đập mạnh. Những hình ảnh giả mạo tan biến, để lộ ra lối đi thực sự phía sau. Một dòng dữ liệu thuần khiết, bị giam cầm từ lâu, ào ạt tuôn chảy, lấp đầy những khoảng trống hư vô trên chân trời kỹ thuật số.

Cô đã vượt qua, nhưng ánh mắt Elara vẫn hướng về phía trước. Loom vẫn còn những bí ẩn cần được kiến trúc lại, và cô chỉ mới bắt đầu.