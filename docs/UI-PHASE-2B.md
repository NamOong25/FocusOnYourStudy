# Đợt 2B — Chi tiết bài tập và kế hoạch tự học

## Cách mở

- Bấm một bài tập trên Trang chủ, Lịch học hoặc trong Chi tiết môn để mở **Chi tiết bài tập**.
- Vào **Lịch học → Tự học** để xem kế hoạch theo ngày/tuần, tạo và quản lý buổi tự học.
- Từ chi tiết bài hoặc một buổi học, chọn tập trung để mở Pomodoro đúng ngữ cảnh. Trong Pomodoro có nút mở lại kế hoạch tự học.

## Giao diện và tương tác

- Chi tiết bài tập: tên, môn, ưu tiên, hạn nộp và 3 trạng thái; Tổng quan / Việc nhỏ / Tài liệu / Buổi học.
- Checklist có thêm, đánh dấu và xóa việc nhỏ. Hoàn tất checklist không tự hoàn tất bài tập.
- Tài liệu dùng thư viện mẫu: gắn, đọc nội dung và gỡ. Chưa chọn tệp thật từ thiết bị, chưa upload, chưa dựng trình đọc PDF.
- Một bài tập có nhiều buổi tự học. Thêm buổi từ bài sẽ chọn sẵn môn và bài liên quan.
- Màn Tự học có lịch ngày/tuần, chuyển khoảng, lọc tất cả/chưa xong/hoàn thành và thống kê thời lượng dự kiến. Mỗi buổi có nội dung, môn, bài liên quan tùy chọn, ngày/giờ, thời lượng và ghi chú.
- Tạo/sửa/xóa buổi, đánh dấu hoàn thành/mở lại và xem bài liên quan. Học độc lập không bắt buộc có bài phải nộp.
- Form kiểm tra ngày/giờ/thời lượng, kết thúc trước nửa đêm, trùng ca học mẫu hoặc buổi đã lên lịch, cùng môn với bài liên kết và không sau hạn nộp. Đây chưa phải bộ kiểm tra xung đột lịch đầy đủ với lịch thi/ngoại lệ.
- Pomodoro hiển thị nội dung đã chọn và ghi thời gian của phiên 25 phút hoàn tất vào đúng buổi. Khi tổng thời gian từ các phiên hoàn tất đạt thời lượng dự kiến, buổi học hoàn thành; bài tập giữ nguyên trạng thái.
- Đánh dấu buổi xong thủ công không tự cộng phút Pomodoro. Phiên tạm dừng/chưa hoàn tất chưa được cộng vào tổng này.
- Xóa bài tập gỡ liên kết và giữ các buổi dưới dạng tự học độc lập. Đổi môn hoặc rút hạn nộp của bài có buổi liên quan cần xử lý lịch liên quan trước. Môn có buổi tự học được bảo vệ khỏi xóa/chuyển kỳ.

## Dữ liệu và phạm vi

Dữ liệu vẫn ở bộ nhớ và trở về mẫu khi tải lại. Chưa lưu backend, chưa khôi phục timer khi process bị hủy, chưa có chuông nền/notification thật. Danh sách AI đề xuất mẫu trước đây vẫn là luồng minh họa riêng; chưa tự biến các đề xuất đó thành lịch tự học thật ở đợt này.

Giữ các phần đã hoãn trong `UI-BACKLOG.md`: chọn ngày/giờ bằng lịch/đồng hồ, điều hướng xuyên suốt, hệ thống trạng thái chung và bổ sung Dashboard. Giao diện vẫn dùng sheet/tab nội bộ.

## Kiểm tra

- TypeScript, build web (~666KB) và bundle Android/Hermes: qua.
- `docs/qa-learning.cjs`: qua. Thử checklist giữ dữ liệu qua luồng, gắn/đọc/gỡ tài liệu mẫu, tạo buổi có liên kết và độc lập, validate deadline/trùng giờ, lịch ngày/tuần, sửa/xóa và bảo toàn kế hoạch khi xóa bài.
- Dùng đồng hồ giả trong trình duyệt để thử hoàn tất 25 phút: ghi đúng một phiên, cập nhật buổi được chọn, giữ nguyên trạng thái bài tập. Không dùng kết quả này để kết luận hoạt động nền trên điện thoại thật.
- `docs/qa-academics.cjs` và `docs/qa-smoke.cjs`: các luồng môn học và 5 tab cũ vẫn qua. Cập nhật thao tác test để mở chỉnh sửa từ màn chi tiết bài mới.
- Không có runtime error/console.error trong các lượt smoke cuối. Kiểm tra bố cục Tự học ở 320/390/430/1280px, chi tiết bài và Pomodoro liên kết ở 390px. Ảnh/kết quả tại `.expo/qa-learning/`.
- Chưa chạy ứng dụng trên điện thoại thật.
