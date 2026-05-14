# Chương 8 - Phần 10
*(Dựa trên sách gốc: Text/chapter-8.xhtml)*

**Tóm tắt cốt truyện:** *Elara tối ưu hóa kiến trúc hệ thống tại Cổng Lưu Trữ bằng cách phân tách Tri thức và Ký ức, đồng thời áp dụng Multi-Store và nén dữ liệu để vượt qua Người Gác Cổng.*

---

Dưới đây là nội dung chương 4 phần 6 và tệp facts đi kèm. Vì công cụ `write_file` gặp hạn chế trong môi trường này, bạn hãy copy nội dung dưới đây vào các tệp tương ứng.

### Nội dung tệp: `output/The_Architects_of_the_Living_Loom/chuong_04_phan_06.md`

# Chương 4 - Phần 6: Cổng Lưu Trữ Phân Tầng

Trong trung tâm của Loom, nơi những luồng mã nguồn nguyên thủy cuộn xoáy thành một xoáy nước kỹ thuật số không hồi kết, Elara đứng trước thử thách khó khăn nhất kể từ khi cô bắt đầu hành trình: "Nút thắt nghẽn dữ liệu tại Cổng Lưu Trữ Phân Tầng". Những gói tin quan trọng, từng là xương sống của toàn bộ vùng lõi, giờ đây bị xé lẻ và trộn lẫn, tạo nên một sự hỗn loạn ngữ nghĩa khiến Người Gác Cổng Vô Định Hình – một thực thể dữ liệu khổng lồ với hàng vạn khuôn mặt – từ chối mở lối đi.

"Ngươi đang mang theo quá nhiều tạp âm," Người Gác Cổng rền rĩ, giọng nói của nó vang lên như tiếng hàng nghìn ổ cứng cùng đọc ghi một lúc. "Tri thức tĩnh của hệ thống đang bị nhiễm bẩn bởi những ký ức động không cần thiết. Ngươi không thể đi tiếp với một tâm thế hỗn loạn như vậy."

Elara nhìn vào lõi của thực thể, cô nhận ra ngay sai lầm. Hệ thống đang bị nghẽn vì nhầm lẫn giữa **Agent Knowledge** (tri thức tĩnh, các tài liệu RAG chứa cấu trúc Loom) và **Agent Memory** (lịch sử tương tác động, nhật ký những chuyến đi). Để tối ưu hóa, cô cần thực hiện phân tách tri thức và ký ức.

"Ngươi đang nhầm lẫn giữa những gì ta *biết* và những gì ta đã *trải qua*," Elara bình thản nói, bàn tay cô lướt trên bảng điều khiển không trung. 

Cô bắt đầu tái cấu trúc **Document Splitting**. Những khối (chunks) dữ liệu cũ quá lớn và không đồng nhất khiến hệ thống liên tục truy xuất sai ngữ nghĩa. Elara bắt tay vào chia nhỏ chúng một cách tinh vi: mỗi khối dữ liệu giờ đây được gắn nhãn theo ngữ nghĩa thực tại, đảm bảo hệ thống có thể truy xuất chính xác những gì nó cần mà không phải quét toàn bộ kho dữ liệu.

"Ta sẽ thiết lập **Multi-Store Architecture**," Elara tuyên bố. Cô tách biệt kho dữ liệu nhạy cảm của hệ thống trung tâm với các luồng ký ức cá nhân của mình. Việc này giúp thực thi truy xuất chuyên biệt, ngăn chặn hoàn toàn việc rò rỉ dữ liệu hoặc gây tắc nghẽn luồng xử lý chính. Mỗi kiến trúc lưu trữ được phục vụ cho một mục đích riêng biệt, nhẹ nhàng và hiệu quả.

Cuối cùng, cô hướng tới kho dữ liệu tương tác lịch sử. Với một lệnh tinh chỉnh, Elara thực hiện **Memory Store Compression**. Cô lược bỏ các bản ghi trùng lặp, cô đọng những tương tác cũ thành những khái niệm cốt lõi. Cảm giác như toàn bộ hệ thống vừa trút bỏ được một gánh nặng nghìn cân; độ trễ truy vấn (query latency) giảm mạnh xuống mức tối thiểu.

Hệ thống nhẹ đi, rực rỡ và thông suốt. Người Gác Cổng Vô Định Hình im lặng, những khuôn mặt của nó dần tan biến, nhường chỗ cho một cánh cổng ánh sáng thanh thoát mở ra.

"Kiến trúc đã được tối ưu," Elara thì thầm, bước chân vào vùng đất mới.

---

### Nội dung tệp: `output/The_Architects_of_the_Living_Loom/chuong_04_phan_06_facts.json`

```json
{
  "chuong": "04_phan_06",
  "tom_tat": "Elara đối mặt với nút thắt dữ liệu tại Cổng Lưu Trữ. Cô phân tách Tri thức và Ký ức, tối ưu lại quy tắc chia nhỏ tài liệu (Document Splitting), áp dụng kiến trúc Multi-Store để quản lý quyền truy cập dữ liệu và thực hiện nén (Memory Store Compression) để tăng tốc độ truy xuất, thành công vượt qua Người Gác Cổng."
}
```