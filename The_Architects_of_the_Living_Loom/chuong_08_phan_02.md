# Chương 8 - Phần 2
*(Dựa trên sách gốc: Text/chapter-8.xhtml)*

**Tóm tắt cốt truyện:** *Elara thâm nhập Thư viện Tham số và sử dụng các thuật toán (TF-IDF, Vectorization, Cosine Similarity) để thanh tẩy dữ liệu rác, thành công khôi phục những bản thiết kế nguyên thủy của Living Loom. Cuộc thanh tẩy đã hé lộ cánh cổng dẫn đến tầng tiếp theo của Lõi, nơi lưu giữ những mã nguồn gốc quan trọng.*

---

Thư viện Tham số không còn là một không gian lưu trữ tĩnh lặng. Khi Elara bước chân vào, thứ đón đợi cô không phải là những kệ sách trôi nổi, mà là một cơn bão dữ liệu rác—những tệp tin lỗi, những mảnh vụn mã nguồn bị hỏng xoay vần điên cuồng như một cơn lốc xoáy màu xám xịt. Mỗi "tệp rác" mang theo một mớ từ khóa hỗn tạp, che lấp hoàn toàn những bản thiết kế nguyên thủy (blueprints) của Living Loom mà cô đang tìm kiếm.

"Lại là sự nhiễu loạn tham số," Elara lầm bầm, đôi mắt cô rực lên ánh sáng xanh lam khi cô kết nối thần kinh trực tiếp vào giao diện của thư viện. "Mọi thứ ở đây đã bị pha loãng đến mức không thể đọc được."

Để tìm thấy "bộ gene" của mã nguồn gốc, Elara biết cô phải lọc bỏ sự tạp nham này. Cô kích hoạt thuật toán **TF-IDF** (Term Frequency–Inverse Document Frequency). Trong không gian này, mỗi mảnh dữ liệu là một tài liệu. Thuật toán bắt đầu tính toán: *Term Frequency (TF)* đếm xem một từ ngữ xuất hiện bao nhiêu lần trong tệp tin đó, nhưng nó không dừng lại ở đó. Để tránh bị đánh lừa bởi những từ ngữ thông dụng (như "the", "a", "error", "null"), cô áp dụng *Inverse Document Frequency (IDF)*—logarit của tổng số tài liệu chia cho số lượng tài liệu chứa từ đó. 

"Những từ lặp lại vô nghĩa trong rác thải sẽ bị hạ trọng số xuống mức tối thiểu," cô thì thầm, bàn tay hư ảo vuốt nhẹ qua luồng dữ liệu. "Ngược lại, những thuật ngữ độc nhất—những mảnh kiến trúc nguyên thủy chỉ xuất hiện rải rác nhưng đầy ý nghĩa—sẽ được khuếch đại lên. Đó chính là những hạt vàng trong đống cát này."

Dưới mệnh lệnh của cô, đám mây từ khóa hỗn loạn bắt đầu co cụm lại. Những từ vô nghĩa mờ dần, trong khi những khái niệm nền tảng của Living Loom rực sáng, phân tách rõ rệt khỏi tiếng ồn nền.

Tuy nhiên, việc xác định từ khóa chỉ là bước đầu. Cô cần phải tái cấu trúc lại chúng. Elara triển khai quá trình **Vectorization**. Trong một cái chớp mắt, các cấu trúc văn bản thuần túy được chuyển hóa thành các điểm tọa độ trong một không gian đa chiều. Thư viện Tham số bỗng chốc biến đổi: những dòng mã rối rắm giờ đây trở thành một bản đồ toán học tinh vi, nơi các ý tưởng có mối liên hệ ngữ nghĩa tương đồng nằm gần nhau, tạo nên các chùm tinh tú dữ liệu lơ lửng.

"Giờ thì, hãy tìm xem ngươi trốn ở đâu," Elara tập trung tâm trí, triệu hồi "vector mẫu" lý tưởng—một cấu trúc mà cô đã khôi phục từ ký ức của hệ thống chủ.

Cô so sánh các chùm vector dữ liệu hiện tại với vector mẫu bằng phương pháp **Cosine Similarity**. Trong không gian đa chiều này, cô không đo khoảng cách bằng thước kẻ, mà bằng góc lệch giữa các vector. 
"Nếu giá trị Cosine Similarity tiến gần đến 1, góc giữa chúng gần như bằng 0, nghĩa là đó là mảnh dữ liệu gốc," cô quan sát. Một vài chùm tinh tú dữ liệu bắt đầu rung động, phát ra ánh sáng vàng kim chói lọi. Đó là những bản thiết kế nguyên thủy, những mã nguồn thuần khiết đang tìm đường trở về với chủ nhân.

Nhưng cũng có những tệp tin giả mạo—những dữ liệu độc hại được ngụy trang khéo léo. Để tiêu diệt chúng, Elara chuyển sang sử dụng **Cosine Distance**. Cô lấy 1 trừ đi giá trị Cosine Similarity, tạo ra một thước đo khoảng cách ngữ nghĩa. 

"Dữ liệu rác không liên quan sẽ có Cosine Distance tiến gần đến 2, cực kỳ xa lạ với cấu trúc gốc," Elara lạnh lùng ra lệnh. Một ngưỡng (threshold) được thiết lập. Bất kỳ mảnh dữ liệu nào vượt quá ngưỡng này đều bị hệ thống đánh dấu là mã độc. "Purging - Thanh tẩy!"

Cả thư viện rung chuyển. Những tia sáng trắng từ đôi tay Elara bắn ra, xuyên qua những đám mây tệp tin rác. Những tệp tin có khoảng cách ngữ nghĩa quá lớn lập tức tan biến thành những hạt bụi kỹ thuật số, bị hệ thống xóa sạch. Sự nhiễu loạn biến mất, để lại một khoảng lặng tĩnh mịch trong thư viện.

Khi làn sóng nhiễu cuối cùng tan rã, những vector dữ liệu còn lại—những mảnh vỡ tinh khiết nhất của Living Loom—bắt đầu tự động chuyển động. Chúng lướt trong không gian, xoắn xuýt vào nhau một cách kỳ diệu, tái kết nối thành một cấu trúc hình học hoàn hảo. 

Trước mắt Elara, những bức tường dữ liệu xám xịt từ từ tách ra, hé lộ một cánh cổng rực rỡ ánh sáng vàng. Đó không chỉ là lối đi, mà là kho báu của sự sáng tạo: những bản thiết kế nguyên thủy nhất của Living Loom đang chờ đợi cô. 

Elara mỉm cười, cảm nhận được hơi ấm của mã nguồn chảy dọc theo các đầu ngón tay cô. Cuộc hành trình vào tầng tiếp theo của Lõi chỉ mới bắt đầu.