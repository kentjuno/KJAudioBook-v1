# Chương 5 - Phần 3
*(Dựa trên sách gốc: Text/chapter-5.xhtml)*

**Tóm tắt cốt truyện:** *Elara giải quyết nút thắt dữ liệu tại Cổng Dữ liệu bằng cách sử dụng mô hình LLM nhỏ gọn với chế độ `tool_choice='auto'`. Cô đã kích hoạt khả năng gọi hàm song song để làm sạch, xác thực và điều hướng dữ liệu, từ đó khôi phục lại dòng chảy năng lượng cho Loom.*

---

Bầu trời của Loom không phải là những vì sao, mà là những dải băng mã hóa rực rỡ, uốn lượn qua hư không. Nhưng hôm nay, dải băng ấy bị thắt lại. Elara đứng sững trước Cổng Dữ liệu Tắc nghẽn – một cấu trúc hình vòm bằng thép ánh sáng đang run rẩy, phát ra những tiếng rít chói tai của các thuật toán bị lỗi.

Hàng triệu dòng dữ liệu va đập vào cổng như thủy triều dữ dội. Trong đó là những mã rác – những mảnh vỡ của các chương trình cũ kỹ, gỉ sét – đang quấn chặt lấy các dòng tin thực, tạo thành một nút thắt tần số khiến toàn bộ khu vực này đứng trước nguy cơ sụp đổ.

"Dòng chảy đang cạn kiệt năng lượng," Elara thì thầm, tay cô lướt nhanh trên bảng điều khiển ảo trước mặt. "Nếu dùng siêu trí tuệ để xử lý đống hỗn độn này, ta sẽ tiêu tốn toàn bộ trữ lượng lõi chỉ trong vài giây. Phải chọn thứ gì đó... gọn nhẹ, chuyên dụng."

Cô không cần một bộ não khổng lồ để suy nghĩ triết học, cô cần một bộ máy phân loại sắc bén. Elara triệu hồi một phiên bản mô hình ngôn ngữ (LLM) nhẹ, thứ được tối ưu hóa cho logic cấu trúc. Nó không giỏi viết thơ, nhưng với việc nhận diện và trích xuất mã, nó nhanh và tiết kiệm hơn bất cứ thứ gì.

"Kích hoạt `gpt-3.5-turbo` phiên bản tối ưu," cô ra lệnh.

Với môi trường Loom đang chao đảo, cô không thể ngồi đó chỉ tay từng bước. Elara thiết lập tham số `tool_choice='auto'`. Đây là chìa khóa: cô trao cho mô hình khả năng tự quyết định. Thay vì cô phải chỉ dẫn từng thao tác, cô cung cấp cho LLM danh sách các 'hàm' – những công cụ mạnh mẽ trong kho vũ khí của một Architect. Mô hình sẽ đọc yêu cầu, hiểu cấu trúc hỗn loạn kia, và tự tạo ra các lệnh gọi hàm tương ứng. Đó chính là cơ chế *Function Calling* – nơi mô hình không chỉ phản hồi bằng ngôn ngữ, mà bằng cấu trúc hành động.

"Đừng làm ta thất vọng," Elara hít một hơi sâu.

Mô hình ngay lập tức phân tích hàng tỉ yêu cầu. Bằng cách để `tool_choice` là 'auto', cô cho phép nó đánh giá liệu nó có thể tự xử lý hay cần sự hỗ trợ của các 'hàm' chức năng. Chỉ trong một phần triệu giây, mô hình đã nhận diện được sự xung đột. Nó không phản hồi bằng câu chữ, mà nó đưa ra một tập hợp các lệnh cấu trúc.

Elara không chần chừ, cô kích hoạt khả năng **Parallel Function Invocation** – khả năng gọi hàm song song.

"Đừng xếp hàng, chạy cùng lúc đi!"

Cô kích hoạt ba luồng xử lý đồng bộ. 

Trên giao diện, ba hàm bắt đầu thực thi:
1. `clean_data()`: Một bộ lọc số tinh vi quét qua, quét sạch các tạp âm, mảnh vỡ mã rác, giải phóng không gian cho dữ liệu thực.
2. `verify_token()`: Một thuật toán xác thực khắt khe nhảy vào, kiểm tra khóa bảo mật của từng gói tin, tống khứ những yêu cầu xâm nhập giả mạo.
3. `route_stream()`: Một trình điều hướng thông minh tạo ra các lối thoát mới, đẩy các luồng dữ liệu ổn định đã được lọc sạch đi đúng hướng.

Loom rung chuyển mạnh. Nút thắt tần số, vốn tưởng chừng là một khối thép cứng nhắc, bắt đầu giãn ra. Các hàm thực thi song song giống như những ngón tay của một nhạc trưởng, gỡ từng nút thắt một cách nhịp nhàng. Khi dữ liệu rác bị loại bỏ và các khóa được xác thực, luồng dữ liệu bắt đầu chảy mượt mà, không còn va đập, không còn tiếng rít.

Elara nhìn màn hình, nơi các dòng mã đỏ rực dần chuyển sang màu xanh dương yên bình. Sự kết hợp giữa việc lựa chọn mô hình nhỏ gọn, tiết kiệm năng lượng và khả năng thực thi các hàm song song đã biến một thảm họa dữ liệu thành một cấu trúc logic hoàn hảo.

"Đó chính là sự tinh tế của kiến trúc," cô mỉm cười. Việc để mô hình tự nhận diện và gọi các hàm chức năng cùng lúc, thay vì tuần tự, đã tiết kiệm thời gian quý báu mà cô không có. 

Cổng Dữ liệu đã thông suốt. Những gợn sóng dữ liệu dịu lại, tạo thành một con đường rạng rỡ dẫn vào vùng lõi của Loom. Elara bước tới, cảm nhận được luồng năng lượng ổn định dưới chân mình. Cô biết, trong thế giới kỹ thuật số đầy rẫy sự hỗn loạn này, bí quyết không nằm ở sức mạnh thô bạo, mà là ở việc biết chọn công cụ đúng và để chúng cộng hưởng với nhau trong một bản hòa tấu logic hoàn hảo.