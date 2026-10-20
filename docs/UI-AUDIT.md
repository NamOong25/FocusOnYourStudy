# Rà soát giao diện và lộ trình

Ngày rà soát: 20/10/2026. Nguồn: DESIGN.md và 5 ZIP Stitch (1)–(5) do người dùng cung cấp. Các file nguồn là tài liệu tham chiếu giao diện; không chạy HTML/script của template trong ứng dụng.

Cập nhật: người dùng xác nhận chỉ có 9 nhóm chức năng; AI (mục 10 cũ) nay là mục 9. Đợt 2A đã dựng thêm Môn học & học kỳ, xem UI-PHASE-2.md; các cải thiện thao tác được hoãn theo UI-BACKLOG.md.

Cập nhật sau đợt 2D: đã có UI chi tiết bài tập/tự học (2B), lịch thi/ngoại lệ/trùng lịch (2C), bảng điểm/trọng số/GPA/học lại và mục tiêu (2D). Bảng đối chiếu phía dưới ghi nhận những gì thiếu trong template ban đầu; trạng thái hiện tại xem `UI-BACKLOG.md` và các tài liệu từng đợt. GPA cố định 3,82 của đợt đầu đã được thay bằng kết quả tính từ điểm trong bộ nhớ. Dữ liệu vẫn là prototype, chưa theo quy chế trường hoặc lưu backend.

Cập nhật sau đợt 2E: đã có khu vực hồ sơ/cài đặt, chỉnh hồ sơ dùng chung trang chủ, các luồng tài khoản/khôi phục mật khẩu minh họa, tùy chọn nhắc và thẻ preview theme/ngôn ngữ. Auth/email/thông báo thật và theme/i18n toàn app vẫn còn thiếu; xem `UI-PHASE-2E.md`.

Cập nhật sau đợt 2F: các công cụ AI có form, duyệt/sửa/bỏ chọn kế hoạch thành buổi tự học dùng chung, thay một buổi chưa học, tóm tắt và quiz có trang nguồn mẫu đọc được. Chưa có AI/PDF thật hoặc lịch sử quiz lâu dài. Xem `UI-PHASE-2F.md`; bước tiếp theo đề xuất là rà soát các mục hoàn thiện đã hoãn.

Cập nhật sau đợt 3A: các form đã dùng lịch/đồng hồ thay gõ chuỗi ngày giờ, gồm cả AI và giờ yên lặng. Có xác nhận/hủy và giữ dữ liệu form; giới hạn/trùng lịch/deadline vẫn kiểm tra khi lưu. Xem `UI-POLISH-3A.md`. Còn ba đợt hoàn thiện: điều hướng, trạng thái và Dashboard.

Cập nhật sau đợt 3B: quay lại một bước/đóng cả luồng tách rõ; giữ màn/bộ lọc/cuộn và quay về nguồn từ Pomodoro, lịch tự học, thông báo và AI. Browser Back/Escape có kiểm tra; Android đã nối handler nhưng cần máy thật. Deep link/Forward replay/gesture iOS chưa có. Xem `UI-POLISH-3B.md`; còn 3C và 3D.

## 5 file đang có gì?

| File | Nội dung |
| --- | --- |
| (1) | Lịch học ngày/tuần/tháng, nhắc lịch, cảnh báo trùng lịch, bài tập theo trạng thái, thao tác tạo mới |
| (2) | Pomodoro, môn đang tập trung, timer, chuỗi học, mục tiêu ngày, gợi ý |
| (3) | GPA/tín chỉ, thống kê giờ học, phân bổ môn học, lịch thi, dự báo GPA |
| (4) | Dashboard, lịch hôm nay, bài sắp đến hạn, thẻ tập trung, gợi ý AI |
| (5) | AI hub, 5 công cụ, câu hỏi nhanh, ô hội thoại |

Đây là 5 màn HTML trình bày. Việc có nút hoặc thẻ trên ảnh chưa có nghĩa là luồng nghiệp vụ đã đầy đủ.

## Đối chiếu nhóm chức năng

| Nhóm yêu cầu | Template đã thể hiện | Còn thiếu để hoàn chỉnh |
| --- | --- | --- |
| 1. Dashboard | Ca học, bài sắp đến hạn, tiến độ, GPA | Tổng hợp lịch thi ngay trên dashboard; trạng thái lần đầu/rỗng/lỗi; chọn học kỳ; quy tắc tổng hợp dữ liệu thật |
| 2. Thời khóa biểu | Tab ngày/tuần/tháng, thẻ ca học, cảnh báo trùng | Luồng sửa một buổi hoặc cả chuỗi, nghỉ/đổi phòng/đổi giờ, khoảng ngày áp dụng, trùng với kỳ thi, chi tiết quy tắc nhắc |
| 3. Bài tập | Deadline, ưu tiên, trạng thái, tài liệu, ghi chú | Màn chi tiết/tệp thật, tiến độ theo bước, quá hạn, tìm kiếm; tách bài phải nộp khỏi phiên tự học |
| 4. Điểm/GPA | Thẻ GPA/tín chỉ, gợi ý mục tiêu | Nhập điểm thành phần, trọng số, quy đổi thang điểm, GPA kỳ/tích lũy, học lại, làm tròn; điểm chưa nhập phải là chưa đủ dữ liệu |
| 5. Môn học/học kỳ | Tên môn xuất hiện ở các thẻ | Danh sách và chi tiết môn/học kỳ, tạo/sửa, năm học, tín chỉ, giảng viên, trạng thái hoàn thành, liên kết lịch/bài/điểm |
| 6. Lịch thi | Môn, ngày/giờ/phòng/hình thức, đếm ngày, nhắc | Chi tiết/sửa/xóa lịch thi, phát hiện trùng, phân loại giữa/cuối kỳ, cấu hình nhắc đồng bộ |
| 7. Pomodoro | Timer, đổi môn, mục tiêu, chuỗi ngày | Liên kết bài đang học, lịch sử theo ngày, quy tắc hoàn thành/chuỗi, app chạy nền/bị hủy, âm thanh và quyền thông báo |
| 8. Thống kê | Giờ học, hoàn thành/trễ hạn, phân bổ môn | So sánh GPA nhiều kỳ, biểu đồ từ dữ liệu thật, định nghĩa chỉ số, kỳ không có dữ liệu |

| 9. AI | Đủ 5 lối vào và hội thoại | Form đầu vào, xử lý/chờ/lỗi, preview/chấp nhận/sửa, kiểm tra lịch rảnh/deadline, tải PDF, dẫn nguồn, câu hỏi/giải thích, kiểm soát chi phí |
| Nền tảng | Avatar, chuông thông báo | Đăng ký/đăng nhập/quên mật khẩu, hồ sơ chỉnh sửa, cài đặt sáng/tối/ngôn ngữ, quiet hours/quyền thông báo, lỗi mạng, đồng bộ và quyền riêng tư |

## Những điểm chỉnh ngay trong đợt đầu

1. Đồng nhất tên FocusYourStudy, người dùng Nguyễn Hoàng Nam, GPA 3.82, học kỳ 5; bỏ tên Manythings và người dùng khác ở template (3).
2. Ngày mẫu bám theo ngày khởi chạy, không trộn 2024 và 2025. Biểu đồ vẫn ghi rõ dữ liệu mẫu, tránh giả là đã thu thập hoạt động.
3. Chuẩn hóa palette/font/bo góc theo một bộ token. DESIGN.md có hai giá trị primary/canvas khác nhau giữa YAML và mô tả: ưu tiên primary #5341CD, canvas #F4FAFD như template; gradient dùng #6C5CE7 → #A29BFE.
4. Cho tiêu đề dài xuống dòng ở thẻ chính. Ở hàng danh sách gọn chỉ cắt 1 dòng và bấm để xem đầy đủ. Không giữ lỗi chữ chồng trong ảnh lịch học.
5. Giữ vùng chạm đủ lớn, nhãn truy cập, safe area và chừa khoảng dưới để dock không đè nội dung. Cỡ 320–520px được ưu tiên; desktop giữ một cột ứng dụng.
6. Dock trung tâm là đồng hồ Pomodoro theo cả 5 ảnh; thao tác “thêm” đặt trong màn Lịch học. Đây là lựa chọn nhất quán với ảnh dù đoạn mô tả DESIGN.md gọi nút giữa là dấu cộng.
7. Bỏ các tuyên bố AI “online 24/7”, gắn GPT-4o, phần trăm hiệu quả/tốc độ không có dữ liệu. Màn AI thể hiện rõ nội dung mẫu và bước chấp nhận.
8. Nối tương tác UI bằng state dùng chung: đổi trạng thái bài ở form cập nhật dashboard/thống kê, thêm lịch xuất hiện theo ngày; timer giữ mốc thời gian khi đổi tab.

## Thứ tự làm theo từng đợt

### Đợt 1 — Chốt phong cách và 5 màn lõi (bản hiện tại)

Tạo project React Native độc lập, bộ thành phần, 5 màn tương ứng 5 mẫu, form bài tập/ca học/lịch thi, timer dùng thử, mẫu AI có preview và chấp nhận. Người dùng chạy và đánh giá màu sắc, khoảng cách, chữ, khả năng thao tác và cách tổ chức nội dung.

Điều kiện chốt: chuyển 5 tab được; thêm/sửa bài tập và ca học có phản hồi; các màn đọc chung dữ liệu; typecheck, dependency check, web bundle thành công; kiểm tra trực quan ở màn điện thoại. Không coi bản UI là nghiệp vụ hoàn chỉnh.

### Đợt 2 — Hoàn chỉnh các luồng học tập trên frontend

Làm môn học/học kỳ trước vì lịch học, bài tập và điểm phụ thuộc chúng. Tiếp theo: chi tiết bài/tệp và tách kế hoạch tự học; lịch lặp có khoảng áp dụng/ngoại lệ; chi tiết và sửa/xóa lịch thi. Bổ sung các trạng thái rỗng, loading, lỗi và xác nhận xóa; navigation stack/back/deep link.

Điều kiện chốt: dùng được trọn một học kỳ mẫu từ tạo môn → lịch học → bài tập → lịch thi; không có nút dẫn tới ngõ cụt.

### Đợt 3 — Điểm số, thống kê và cài đặt

Chốt quy tắc GPA theo trường rồi làm bảng điểm thành phần, trọng số, GPA kỳ/tích lũy/mục tiêu và so sánh các kỳ. Kế tiếp là hồ sơ, theme, ngôn ngữ, màn cài đặt nhắc và quyền bị từ chối. Bảo đảm điểm thiếu không bị tính thành 0.

### Đợt 4 — Spring Boot + PostgreSQL, nối một luồng mỗi lần

Chốt API/schema từ những màn đã duyệt. Xây auth và quyền sở hữu dữ liệu, migration/validation/error format. Nối theo thứ tự tài khoản → học kỳ/môn → lịch → bài tập → kỳ thi → điểm. Mỗi luồng có kiểm tra dữ liệu người dùng riêng và lỗi mạng. Thay dữ liệu mẫu theo từng module, không viết lại toàn bộ frontend.

### Đợt 5 — Hoạt động bền vững trên thiết bị

Lưu và khôi phục timer khi process bị hủy, nhắc lịch thật, quiet hours, đổi/cancel lời nhắc khi deadline thay đổi, thử trên điện thoại thật; lưu cục bộ/sync và quy tắc xử lý xung đột. Không dùng Mobile View để kết luận app chạy nền đúng.

### Đợt 6 — AI sau khi có lịch và dữ liệu đáng tin cậy

Kết nối AI qua backend, giữ API key phía server. Làm kế hoạch/kiểm tra rảnh/deadline và bước duyệt trước; sau đó PDF có dẫn trang, quiz có lời giải, điều chỉnh kế hoạch; thêm quota, hủy/yêu cầu lại, xử lý lỗi và riêng tư dữ liệu.

Mỗi đợt có thể chia thành vài lượt làm nhỏ. Ưu tiên chốt một luồng có thể thử được rồi mới mở nhóm kế tiếp.
