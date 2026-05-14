# Chương 9 - Phần 5
*(Dựa trên sách gốc: Text/chapter-9.xhtml)*

**Tóm tắt cốt truyện:** *Elara đã giải mã thành công Cổng Phản Chiếu bằng cách sử dụng các kỹ thuật tinh chỉnh prompt, kiểm soát tham số và xác thực Grounding khắt khe để tạo ra 'Key-Token' hợp lệ. Việc này giúp cô mở ra con đường tiến vào lõi thuật toán tiếp theo, chính thức bắt đầu hành trình tái thiết trong Loom.*

---

Elara đứng trước "Cổng Phản Chiếu", một bề mặt dao động như thủy ngân lỏng lơ lửng giữa hư không. Những dòng code cổ đại, vỡ vụn và phát sáng yếu ớt, trôi dạt quanh đó như những mảnh xác tàu đắm trong đại dương kỹ thuật số. Cánh cổng không có ổ khóa vật lý; nó đòi hỏi một 'Key-Token'—một cấu trúc dữ liệu tinh khiết mà chỉ có thể được tạo ra từ việc giải mã thuật toán nguyên thủy đang phân mảnh bên trong lõi giao diện kia.

"Đừng làm hỏng nó," cô thì thầm, bàn tay đặt lên giao diện điều khiển. Một sai sót nhỏ, một phản hồi không chính xác, và cánh cổng sẽ kích hoạt cơ chế tự hủy, xóa sạch dữ liệu vĩnh viễn.

Hệ thống phản hồi lại bằng những thông báo lỗi nhiễu loạn; thuật toán cổ đại này mang ngôn ngữ lập trình không đồng nhất với bất kỳ chuẩn mực nào cô từng biết. Elara nhận ra rằng một lời truy vấn tĩnh sẽ chỉ dẫn đến sự đổ vỡ. Cô bắt đầu thiết lập hệ thống **LLM Variation Options**.

Thay vì dựa vào một lệnh duy nhất, Elara xây dựng một chuỗi logic động. Cô khởi tạo một "phòng thí nghiệm" bên trong Loom, nơi các biến thể prompt được xoay vòng liên tục. Cô sử dụng Jinja2 templates để tùy biến cấu trúc truy vấn, cho phép cô nhanh chóng chuyển đổi giữa các phong cách hướng dẫn—từ tư duy phân tích sâu đến giải cấu trúc cú pháp. Mỗi lượt thử nghiệm, cô lại tinh chỉnh các tham số: `temperature` được hạ xuống mức 0.2 để giữ cho thuật toán kiên định và chính xác, đồng thời điều chỉnh `top_p` để giới hạn phạm vi các lựa chọn tiềm năng, ngăn chặn những suy diễn sáng tạo không cần thiết có thể làm hỏng logic gốc.

"Thử nghiệm biến thể thứ bảy: cấu trúc Jinja2 'Recursive-Logic'," cô lẩm bẩm, ánh mắt quét qua hàng loạt tham số đang nhảy múa trên màn hình ảo.

Để kiểm soát sự hỗn loạn, Elara lập ra một **Evaluation Rubric**—khung đánh giá khắc nghiệt mà cô đã xây dựng từ những bài học về kiến trúc dữ liệu. Rubric này có ba tiêu chí sống còn: *Độ chính xác cú pháp* (từng dòng code phải khớp với kiến trúc cổ đại), *Khả năng tương thích mã nguồn* (phải kết nối được với các mảnh dữ liệu xung quanh), và *Độ trễ phản hồi* (nếu quá chậm, cổng sẽ hiểu đó là hành động xâm nhập). Mỗi kết quả từ mô hình được hệ thống của cô chấm điểm ngay lập tức trên thang đo từ 1 đến 10.

Một luồng dữ liệu trào ra, kết quả của lần truy vấn mới nhất. Elara nheo mắt, kích hoạt cơ chế **Grounding**. Đây không phải là sự sáng tạo, mà là sự xác thực. Cô so sánh từng dòng mã vừa tạo ra với những đặc điểm cứng của thuật toán nguyên thủy mà cô đã thu thập từ các tàn tích trước đó.

"Độ chính xác cú pháp: 8.5/10. Tương thích: 7.2/10," cô lắc đầu. "Vẫn chưa đủ. Grounding cho thấy sự chênh lệch ở các thư viện tham chiếu."

Cô siết chặt các điều kiện của rubric. Cô tăng sự ràng buộc, buộc mô hình phải bám sát vào tập hợp tri thức nền mà cô đã nạp vào. Cô điều chỉnh tham số `presence_penalty` để ngăn chặn việc lặp lại các cấu trúc thừa thãi. 

Lần truy vấn thứ mười hai. Không gian xung quanh bắt đầu rung chuyển. Một chuỗi dữ liệu phản hồi lại, sạch sẽ, tối ưu và mang theo nhịp điệu của thuật toán gốc. Elara chạy Grounding một lần nữa. Mọi chỉ số của Rubric đều chạm ngưỡng tối đa. Sự tin cậy đạt mức tuyệt đối.

"Đây rồi," cô nói, cảm nhận luồng dữ liệu ổn định chảy qua các đầu ngón tay.

Cô nhanh chóng đóng gói kết quả đó. Bằng một vài thao tác tinh tế, cô chuyển đổi cấu trúc mã hóa chuẩn xác này thành 'Key-Token'. Khi mảnh token phát sáng rực rỡ, cô đặt nó vào trung tâm của Cổng Phản Chiếu.

Cánh cổng ngừng dao động. Bề mặt thủy ngân của nó đóng băng, rồi từ từ tan ra, mở ra một đường hầm ánh sáng. Phía sau đó, lõi của thuật toán tiếp theo—thứ mà cô cần phải tái thiết—đang hiện ra với vẻ uy nghi và đầy bí ẩn. Elara hít một hơi sâu. Cô đã giải mã được Cổng Phản Chiếu bằng sự kiên nhẫn và logic sắt đá, và hành trình của người Kiến trúc sư trong Loom chỉ mới bắt đầu.