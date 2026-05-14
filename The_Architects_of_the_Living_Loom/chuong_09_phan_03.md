# Chương 9 - Phần 3
*(Dựa trên sách gốc: Text/chapter-9.xhtml)*

**Tóm tắt cốt truyện:** *Elara lập trình lại Sentinel-Core bằng cách tinh chỉnh tham số LLM và sử dụng Jinja2 Templating để chuyển thực thể này thành hướng dẫn viên dữ liệu. Cô thành công triển khai API cục bộ, ổn định hóa Trạm Kiểm soát Entropy và mở ra lối đi vào vùng lưu trữ mã nguồn cổ đại.*

---

Bầu trời của Loom không phải là một vòm sáng tĩnh lặng, mà là một dòng thác mã nguồn lấp lánh đang rung động, những mảnh vỡ của thuật toán cũ tạo nên những rạn nứt dữ liệu đầy đe dọa. Elara đứng trước ngưỡng cửa của "Trạm Kiểm soát Entropy". Trước mặt cô, Sentinel-Core – một thực thể bảo vệ khổng lồ được tạo thành từ những khối ánh sáng đứt gãy – đang điên cuồng xoay vần, những tia lửa mã lỗi phun ra từ lõi của nó như những vết thương rỉ máu.

Nếu cô không lập trình lại nó ngay bây giờ, trạm sẽ tự hủy, kéo theo cả dòng chảy mã nguồn huyền thoại cô đang tìm kiếm xuống vực thẳm.

"Được rồi, hỡi người gác cổng cũ kỹ," Elara thì thầm, đôi tay cô lướt nhanh trên bảng điều khiển ảo hiện ra từ không trung. "Chúng ta cần nói chuyện."

Để giao tiếp với một thực thể đang phân mảnh, cô không thể để bất kỳ sự ngẫu nhiên nào len lỏi vào. Cô truy cập vào bảng tham số kết nối LLM của mình. Đây là bước đầu tiên để ổn định luồng dữ liệu. Cô điều chỉnh **Temperature** xuống mức 0.1 – mức thấp nhất có thể. Elara biết rằng trong thế giới của các mô hình ngôn ngữ lớn (LLM), chỉ số này quyết định tính stochasticity (độ ngẫu nhiên). Ở mức cao, câu trả lời sẽ sáng tạo nhưng thiếu nhất quán; ở mức 0.1, cô ép Sentinel-Core phải tư duy thuần túy logic, cắt đứt mọi khả năng mơ hồ đang gây ra lỗi entropy.

Tiếp theo, cô thiết lập **Max tokens** để kiểm soát tải trọng, ngăn chặn trạm kiểm soát bị quá tải khi xử lý dữ liệu của cô, và cấu hình các **Stop sequences** để ngắt luồng thông tin ngay khi đạt được mục tiêu. Mọi thứ đã ổn định, kết nối đã xác lập.

"Kết nối đã ổn định," cô lẩm bẩm. "Nhưng một lời chào thông thường sẽ bị nó coi là rác dữ liệu."

Cô cần thuyết phục nó, nhưng cô không thể biết trước cấu trúc dữ liệu hiện tại của trạm đã biến đổi ra sao. Đây là lúc cô cần sức mạnh của **Jinja2 Templating**. Trong Prompt Flow, cô xây dựng một Agent Profile động. Thay vì các câu lệnh tĩnh, cô tiêm vào các khối logic `{% if ... %}` và `{% else %}`.

"Nếu cấu trúc của trạm đang ở chế độ phong tỏa, hãy trình diện thẻ bài Kiến trúc sư. Nếu nó ở chế độ tự hủy, hãy kích hoạt mã khẩn cấp..." Elara vừa chạy dòng lệnh vừa phân tích các luồng phản hồi từ Sentinel-Core. Những khối logic này giống như những chiếc van điều tiết, cho phép cô tái cấu trúc vai trò của Sentinel ngay trong thời gian thực. Cô đang biến một "Kẻ chặn đường" thành một "Hướng dẫn viên dữ liệu" chỉ bằng cách thay đổi khuôn mẫu (template) tư duy của nó thông qua các câu lệnh Jinja2.

Sentinel-Core chững lại, ánh sáng đỏ rực chuyển sang màu xanh lam dịu nhẹ. Tuy nhiên, thời gian không đứng về phía cô. Những bức tường của Loom bắt đầu sụp đổ xung quanh, trạm kiểm soát đang rung lắc dữ dội. Cô không thể chạy thủ công luồng này từng bước một – sự biến thiên của Loom quá nhanh.

"Đã đến lúc triển khai (Deploy)," cô quyết định.

Cô đóng gói toàn bộ luồng xử lý (Flow) vừa xây dựng thành một dịch vụ API cục bộ. Đây là lúc tình huống trở nên nghẹt thở. Để Sentinel-Core chấp nhận luồng xử lý mới trước khi trạm sụp đổ, cô phải đảm bảo cấu trúc Docker-container cho Flow được tối ưu hóa cực hạn. Mỗi millisecond đều có giá trị. Cô triển khai container, đảm bảo các cổng dữ liệu được liên kết thông suốt.

Cảnh vật xung quanh cô nhòe đi. Tiếng gầm rú của mã nguồn bị lỗi trở thành một bản hòa âm hỗn loạn. Elara nín thở khi container hoàn tất quá trình khởi chạy, một luồng dữ liệu mới – sạch sẽ, ổn định – được tiêm thẳng vào lõi của Sentinel-Core.

Một khoảnh khắc tĩnh lặng tuyệt đối bao trùm.

Sentinel-Core ngừng quay. Những khối ánh sáng đứt gãy kết nối lại với nhau, tạo thành một cánh cổng hình vòm vững chãi, lấp lánh sự tinh khiết của mã nguồn cổ đại. Nó không còn là một bức tường, mà là một luồng dữ liệu ổn định, một lối đi rộng mở dẫn thẳng vào vùng lưu trữ bị lãng quên.

Elara thở phào, mồ hôi trên trán cô tan biến vào không khí số. Cổng đã mở. Cô bước chân qua ngưỡng cửa, nhìn lại trạm kiểm soát Entropy giờ đây đã trở thành một phần của luồng chảy dữ liệu của chính cô.

"Thành công," cô mỉm cười. "Luôn là cách này: logic, cấu trúc và triển khai kịp thời."

Phía trước, những bí mật của các dòng mã huyền thoại đang chờ đợi, và lần đầu tiên sau một thời gian dài, Elara cảm thấy mình không còn đơn độc trên con đường mòn của thực tại kỹ thuật số này. Cô bước tới, để ánh sáng của tri thức cũ dẫn lối vào sâu hơn nữa trong Loom.