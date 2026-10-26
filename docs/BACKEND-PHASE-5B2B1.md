# Điểm thấp và phạm vi GPA tích lũy — 5B.2B.1

## Kết quả hiện tại

Đã thêm cảnh báo màu cam cho **môn đã đủ kết quả, đã đạt và điểm tổng kết hệ 10 không quá 5**. Dùng chung quy tắc hiển thị ở bảng điểm trong kỳ, bảng điểm mở từ so sánh học kỳ, chi tiết môn và xem trước khi nhập điểm.

| Kết quả môn | Hiển thị |
| --- | --- |
| Đã đạt, tổng kết ≤ 5/10 | Cam, nền cam nhạt và nhãn “Đạt môn · Điểm thấp”. |
| Đã đạt, tổng kết > 5/10 | Màu điểm đã đạt thông thường, không cảnh báo cam. |
| Không đạt hoặc bị chặn thi | Đỏ như trước; luôn ưu tiên hơn cảnh báo cam. |
| Chưa đủ dữ liệu | Giữ trống/trạng thái chưa đủ; không tạo điểm 0 hoặc cảnh báo cam. |

Mốc 5 là tùy chọn cảnh báo của app. Không nâng ngưỡng qua môn lên trên 5, không áp dụng ngưỡng này cho GPA hệ 4 hoặc từng cột điểm thành phần. Bảng điểm vẫn hiển thị môn rớt; không thêm bộ lọc chỉ giữ môn đạt và không đổi tử số/mẫu số GPA. Giao diện điểm hiện vẫn dùng dữ liệu trong phiên; API lưu điểm và GPA đã có, nối màn hình ở 5C.

**Phần học cải thiện/phục hồi điểm được để sau theo yêu cầu người dùng ngày 26/10/2026.** Không thêm nghiệp vụ hủy/phục hồi hoặc tự đổi chính sách chọn điểm trong đợt này. Backend lịch sử 5B.2A vẫn chỉ đọc, `cumulativeSelection=NOT_IMPLEMENTED`; GPA tích lũy backend chưa nghiệm thu.

**Đã chốt với người dùng:** khi có nhiều lần cùng môn đều đạt, phần GPA tích lũy sắp làm sẽ lấy **điểm đạt cao nhất** (ví dụ 8 và 6 thì lấy 8). Đây là chính sách riêng của app, không phải kết luận đã xác minh quy chế K19. Ghi nhận để triển khai 5B.2B.2; không dùng lựa chọn này để tự thực hiện nghiệp vụ hủy/phục hồi, ẩn môn rớt hoặc đổi mẫu số GPA trong đợt giao diện này. Khi triển khai cần đối chiếu tổng kết hệ 10, không chỉ hệ 4 vì nhiều điểm hệ 10 có thể cùng một mức quy đổi.

## Những gì đã đối chiếu được

Nguồn và nội dung dưới đây là căn cứ nghiên cứu, không phải quy tắc mới được tự động áp vào phép tính hiện có.

| Nguồn chính thức | Nội dung sử dụng | Giới hạn |
| --- | --- | --- |
| [Phòng Đào tạo — quy chế tín chỉ](https://pdt.iuh.edu.vn/quy-che-dao-tao), bài đề ngày 29/10/2025 | Các điều về điểm, học kỳ/tích lũy và đăng ký học lại/cải thiện. | Trang HTML, không phải bản quyết định có chữ ký; không suy thêm điều khoản không có trong văn bản. |
| [Cẩm nang IUH — quy chế tín chỉ](https://camnang.iuh.edu.vn/quy-che-dao-tao-theo-he-thong-tin-chi.php) | Cuối trang ghi phạm vi khóa tuyển sinh 2025 trở về trước; Điều 19 tách môn tính điểm và P/I/X/M; Điều 21 tách công thức học kỳ và tích lũy. | Định nghĩa tích lũy nhắc các học phần đạt, nhưng ghi chú liền sau công thức còn nhắc chèn 0 khi không đạt/cấm thi/vắng thi. Cần làm rõ phạm vi ghi chú trước chốt mẫu số GPA tích lũy trong mọi trường hợp. |
| [CTSV — cải thiện thấp hơn điểm cũ](https://ctsv.iuh.edu.vn/feedback.html@detail@216@127@Cai-thien-diem.), đề ngày 27/02/2018 | Câu trả lời mô tả thủ tục xin phục hồi qua Khoa/Viện rồi Phòng Đào tạo, dẫn mốc HK1 2014–2015. | Là hướng dẫn cũ; không xác nhận tự động lấy điểm cao nhất cho K19. |
| [CTSV — đề nghị phục hồi sau đăng ký nhầm](https://ctsv.iuh.edu.vn/feedback.html@detail@216@2553@Lo-bam-nham-hoc-c%C3%A3i-thien-v%C3%A0-muon-kh%C3%B4i-phuc-diem-lai-nhu-cu), trả lời 21/06/2023 | Hướng sinh viên liên hệ giáo vụ để làm đơn. | Trả lời một trường hợp, không công bố thuật toán chọn điểm hoặc thời điểm hủy/khôi phục cho mọi lần học. |
| [Phòng Đào tạo — hướng dẫn điều chỉnh điểm](https://pdt.iuh.edu.vn/huong-dan-quy-trinh-bo-sung-diem-dieu-chinh-diem-xoa-va-mo-khoa-cot-diem), bài đề ngày 09/09/2026, PDF 3 trang | Quy trình giảng viên bổ sung/sửa/xóa hoặc mở khóa cột điểm với hồ sơ và phê duyệt. | Không phải quy tắc tự chọn kết quả giữa các lần học cải thiện. Đã xem đủ 3 trang PDF. |

Điều 6 khoản 5 điểm c của các trang quy chế đề cập lựa chọn kết quả trong nhóm môn tự chọn; không suy rộng điều đó thành cách chọn giữa mọi lần của cùng môn. Thang hệ 4 và làm tròn hai chữ số còn được đối chiếu ở sổ tay khoa năm 2023, mục 6.5, trang PDF 68. Chế độ HALF_UP của app là lựa chọn triển khai; nguồn này chỉ ghi mức làm tròn, không chỉ rõ mọi quy tắc xử lý trường hợp đúng nửa.

Chưa xác nhận quy tắc phổ quát K19 khi điểm cải thiện thấp hơn lần trước, lần mới chưa đủ điểm, điểm cũ bị hủy/đang chờ phục hồi hoặc mã/tín chỉ thay đổi. Không gắn nhãn “chuẩn IUH” cho tùy chọn cao nhất/gần nhất của bản UI. Phần này đã được ghi lại để xử lý khi mở lại phạm vi học cải thiện; không cản thay đổi màu giao diện.

## Kiểm tra giao diện

Chạy frontend như trước. Có thể dùng bản xem trước/dữ liệu thử; việc nhập điểm ở UI hiện không thay điểm PostgreSQL.

1. Vào **Điểm số & GPA**, mở một môn → **Nhập / chỉnh sửa điểm** → chọn **Lý thuyết**.
2. Dùng ba cột TK/GK/CK theo bộ đề xuất; nhập cùng một giá trị vào cả ba để dễ kiểm tra:

| TK/GK/CK | Kết quả mong đợi |
| --- | --- |
| 5 / 5 / 5 | Tổng 5.0, đã đạt, màu cam. |
| 4 / 4 / 4 | Tổng 4.0, đã đạt, màu cam; không tự chuyển thành rớt. |
| 6 / 6 / 6 | Tổng 6.0, màu thông thường. |
| 3.9 / 3.9 / 3.9 | Tổng 3.9, không đạt, màu đỏ; không bị đổi sang cam. |
| 8 / 8 / 2 | Không đạt do CK thấp, đỏ dù có các cột cao. |
| 8 / 0 / 8 | Bị chặn thi, đỏ, không tự tạo tổng kết. |
| 5 / 5 / trống | Chưa đủ điểm, không có màu cam. |

3. Xem màu ngay trong khung kết quả; bấm **Lưu điểm môn học**, quay về chi tiết và bảng điểm để đối chiếu.
4. Đổi bộ lọc **Không đạt**: môn rớt vẫn có trong danh sách. Quay về **Tất cả** thấy cả môn đạt/cam và môn rớt/đỏ.
5. Từ so sánh học kỳ mở bảng điểm kỳ đó: cảnh báo phải cùng cách hiển thị. Các ô GPA /4 giữ cách hiển thị hiện có.

TypeScript và build web đã qua. Đã thử 7 tình huống trong bảng trên bằng thao tác nhập điểm trên trình duyệt: đúng màu, nhãn và tổng kết; dùng dữ liệu mẫu trong phiên riêng. Đã kiểm tra hiển thị sau lưu. Kết quả 504 test backend thuộc đợt 5B.2A; đợt này thay giao diện/tài liệu, không đổi Java, schema, API hoặc phép tính.

## Git

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Thêm cảnh báo màu cam cho môn đạt điểm thấp"
git push
```
