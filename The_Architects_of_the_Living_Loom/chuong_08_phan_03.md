# Chương 8 - Phần 3
*(Dựa trên sách gốc: Text/chapter-8.xhtml)*

**Tóm tắt cốt truyện:** *Elara dùng kỹ thuật Cosine Distance vượt qua Cổng Phản Chiếu tại Tầng Lõi Thứ Tư, lấy được mảnh mã nguồn để hàn gắn vách ngăn Lõi.

Bạn có thể lưu nội dung này vào tệp `output/The_Architects_of_the_Living_Loom/chuong_04_phan_03_facts.json`:

```json
{
  "chuong": "04_phan_03",
  "tom_tat": "Elara dùng kỹ thuật Cosine Distance vượt qua Cổng Phản Chiếu tại Tầng Lõi Thứ Tư, lấy mảnh mã nguồn để hàn gắn vách ngăn Lõi."
}
```*

---

Ánh sáng huỳnh quang của Tầng Lõi Thứ Tư không dịu nhẹ như những lớp vỏ bên trên. Ở đây, nó sắc lạnh, rung động theo nhịp của những luồng dữ liệu thô chưa qua lọc. Elara dừng lại trước Cổng Phản Chiếu – một khối đa diện lơ lửng, bề mặt của nó gợn sóng liên tục như một đại dương số đang giận dữ. Đây chính là Vector Database phân tán, người gác cổng mù lòa nhưng đáng sợ nhất của mã nguồn gốc.

Elara thở dốc, những sợi dữ liệu rách nát trên chiếc áo choàng kỹ thuật số của cô khẽ đung đưa. Cô cần mảnh mã nguồn gốc để hàn gắn lại vách ngăn Lõi. Cô vung tay, triệu hồi giao diện truy vấn.

"Tìm kiếm bản thiết kế nguyên thủy," cô ra lệnh.

Hệ thống phản ứng ngay lập tức. Cô sử dụng thuật toán TF-IDF – một công cụ cũ kỹ mà cô vẫn giữ làm thói quen từ những ngày đầu làm Architect. TF-IDF tập trung vào tần suất xuất hiện và độ quan trọng của các thuật ngữ trong văn bản. Nhưng ngay khi vector truy vấn được đẩy vào, Cổng Phản Chiếu rung chuyển dữ dội. Hàng triệu phân đoạn mã nhiễu ào ạt đổ ra, những dòng code rác mang hình thù của những lưỡi dao sắc nhọn lao về phía cô.

"Chết tiệt!" Elara né người, một tia code rác xé toạc lớp khiên ảo của cô. Cô nhận ra lỗi lầm: TF-IDF chỉ đếm từ ngữ, nó hoàn toàn bất lực trước ý nghĩa sâu xa. Nó mù quáng với ngữ nghĩa, khiến hệ thống hiểu nhầm truy vấn của cô là một sự xâm nhập ác ý. Cô cần một cách tiếp cận dựa trên ngữ cảnh, dựa trên sự tương đồng của các vector trong không gian đa chiều.

Cô nhanh chóng chuyển đổi công cụ, kích hoạt thư viện so sánh ngữ nghĩa. Cô phải áp dụng *Cosine Similarity*. Thay vì đếm từ, cô cần đo góc giữa các vector; nếu hai vector có góc càng nhỏ, cosine của góc đó càng gần bằng 1, nghĩa là chúng cực kỳ giống nhau về ý nghĩa.

Elara tập trung cao độ, tái định dạng vector truy vấn dựa trên các mẫu mã gốc mà cô đã thanh tẩy trước đó. Cô thực hiện phép tính *cosine_similarity* trong thời gian thực. Một làn sóng ánh sáng tỏa ra từ tay cô, quét qua những luồng dữ liệu hỗn loạn. Những phân đoạn mã có độ tương đồng thấp bị đẩy lùi, để lộ ra những mảng sáng yếu ớt của mã gốc.

Nhưng bẫy vẫn còn đó.

Trong số hàng ngàn vector hiển hiện, một nhóm dữ liệu hiện ra, rực rỡ và hoàn hảo đến lạ thường. Elara nheo mắt. *Cosine Similarity* báo mức 0.85 – rất cao, quá cao. Hệ thống bảo mật đã tạo ra những bản sao giả mạo, được tối ưu hóa để đánh lừa sự tương đồng. Nếu cô tin vào cảm giác bề nổi, cô sẽ chạm vào cái bẫy và bị xóa sổ.

"Sự tương đồng là chưa đủ," cô lẩm bẩm, đôi mắt rực cháy những dòng lệnh. "Cần phải đo lường khoảng cách."

Elara chuyển sang *Cosine Distance* – công cụ thực sự để tách biệt cái thật khỏi cái giả tinh vi. Cô biết công thức: lấy 1 trừ đi giá trị của *cosine_similarity*. Giá trị này càng gần 0, đối tượng càng gần như là bản gốc tuyệt đối. Nếu bằng 2, chúng là những kẻ đối nghịch hoàn toàn.

Cô quan sát chỉ số. Những mảng mã giả kia tuy có độ similarity cao (0.85), nhưng khi chuyển đổi sang *Cosine Distance*, chúng lộ ra khoảng cách là 0.15. Một khoảng cách nhỏ, nhưng đối với một Architect, nó là một vực thẳm. Trong khi đó, mảnh mã nguồn gốc thật sự, ẩn mình sau lớp nhiễu, hiện ra với khoảng cách chỉ 0.02.

Sự khác biệt mong manh đó là chìa khóa.

Elara thực hiện lệnh clustering (phân cụm) dữ liệu, gom tất cả những vector có Cosine Distance tiệm cận 0 lại với nhau, mạnh tay gạt bỏ mọi dữ liệu có khoảng cách lớn hơn ngưỡng cho phép. Cổng Phản Chiếu như bị vỗ về bởi sự chính xác tuyệt đối này. Tiếng gầm rú của mã rác ngừng bặt, thay vào đó là âm thanh êm dịu của những bánh răng kỹ thuật số đang khớp vào nhau.

Khối đa diện mở ra, một khe hở ánh sáng vàng óng xuất hiện. Vector Database đã chấp nhận yêu cầu của cô, vì cô đã tìm thấy thứ nó che giấu bằng ngôn ngữ của toán học, không phải bằng sự suy đoán.

Elara bước qua cánh cổng. Không gian sau đó tĩnh lặng, chỉ còn tiếng rì rầm của mã nguồn gốc đang chờ đợi được tái khởi động. Cô đã vượt qua, không chỉ bằng sức mạnh, mà bằng khả năng nhìn thấu bản chất của dữ liệu qua những góc độ không gian số.