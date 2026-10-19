# Đợt 2C — Lịch thi, lịch học lặp và ngoại lệ

## Cách mở

- **Lịch học → Lịch & bài tập → Thời khóa biểu**: chọn ngày và bấm một ca học để mở chi tiết đúng buổi.
- **Lịch học → Lịch & bài tập → Kỳ thi**: danh sách kỳ thi, thêm và mở chi tiết. Mục lịch thi ở Thống kê dùng chung giao diện/dữ liệu.
- Chi tiết môn cũng mở được chuỗi lịch học và chi tiết lịch thi liên quan.

## Giao diện đã thêm

- Form lịch học lặp có nhiều thứ trong tuần, ngày bắt đầu/kết thúc, giờ, phòng, giảng viên và tùy chọn nhắc mẫu.
- Chi tiết buổi hiển thị lịch gốc, ngày cụ thể, giờ/phòng hiện tại và phạm vi chuỗi. Có đổi giờ/phòng/giảng viên cho một buổi, ghi nghỉ một buổi, khôi phục và sửa/xóa cả chuỗi.
- Buổi nghỉ có màu đỏ nhạt và tên gạch ngang; buổi thay đổi có nhãn riêng. Ngoại lệ không làm thay đổi buổi tương ứng ở tuần khác.
- Lịch thi có danh sách sắp tới/đã qua/tất cả, chi tiết, tạo/sửa/xóa; môn, loại giữa kỳ/cuối kỳ/khác, hình thức, ngày, giờ bắt đầu/kết thúc, phòng và ghi chú.
- Chọn nhiều mốc nhắc thi hoặc tắt nhắc. Khi xóa lịch, các tùy chọn đi cùng lịch cũng được bỏ.
- Cảnh báo trùng giờ nêu loại lịch, tên, ngày và khoảng giờ của tối đa 5 lịch liên quan; chỉnh ngày/giờ ngay trong form rồi lưu lại.

## Dữ liệu và quy tắc trong prototype

- Một chuỗi gắn với môn/học kỳ và có khoảng ngày áp dụng riêng do người dùng nhập; không sinh buổi trước/sau khoảng đó. Mẫu mới mặc định từ 30 ngày trước đến 90 ngày sau ngày mở app; cần chỉnh theo lịch thực tế. Học kỳ hiện chỉ có nhãn năm học, chưa có ngày bắt đầu/kết thúc riêng để tự giới hạn khoảng chuỗi.
- Ngoại lệ được định danh bằng chuỗi + ngày. Nghỉ hoặc đổi đúng buổi; khôi phục trở về lịch gốc. Khi sửa chuỗi, giữ ngoại lệ còn đúng ngày/thứ trong phạm vi mới, bỏ các ngoại lệ ngoài phạm vi. Xóa chuỗi xóa cả ngoại lệ.
- Trang chủ, lịch ngày/tuần/tháng, gợi ý thời gian rảnh mẫu và form tự học dùng chung cách tính các buổi thực tế. Trang chủ bỏ qua ca đã nghỉ. Số ca mỗi tuần ở môn học tính theo các thứ của chuỗi gốc.
- Kiểm tra trùng giữa ca học, kỳ thi và buổi tự học theo ngày thực tế, kể cả khi tên học kỳ khác nhau. Hai lịch nối tiếp đúng giờ kết thúc/bắt đầu không bị coi là trùng.
- Kiểm tra cả chuỗi xét các ngày trong phạm vi, tính cả ngoại lệ. Khôi phục một buổi cũng được kiểm tra: nếu đã đặt kỳ thi/tự học vào giờ vừa nghỉ, app yêu cầu xử lý xung đột trước.
- Không đổi database/API hoặc cài thư viện mới. Tất cả dữ liệu trong bộ nhớ, tải lại sẽ trở về mẫu. Tùy chọn nhắc chưa phát chuông/notification thật. Bộ chọn ngày/giờ và điều hướng toàn app vẫn được hoãn theo checklist.

## Kiểm tra

- TypeScript: qua. Build web và bundle Android/Hermes được kiểm tra trong đợt này.
- `docs/qa-calendar-unit.cjs`: 18 kiểm tra logic về biên ngày, nhiều thứ, hủy/đổi đúng một ngày, tuần sau giữ nguyên, giờ nối tiếp, loại trừ đúng lịch đang sửa và trùng giữa các loại lịch.
- `docs/qa-calendar.cjs`: tạo chuỗi nhiều thứ/có giới hạn; đổi một buổi và đối chiếu tuần sau; nghỉ buổi; đặt thi vào giờ được giải phóng; chặn khôi phục khi bị thi chiếm giờ; chuyển thi sang giờ liền kề rồi khôi phục; sửa/xóa chuỗi; không hiển thị sau ngày kết thúc; tạo/sửa/xóa kỳ thi và lưu tùy chọn nhắc.
- Kiểm tra lại `qa-academics.cjs`, `qa-learning.cjs` và `qa-smoke.cjs`: các luồng cũ vẫn qua. Ca học thử trong test môn học chuyển sang 22:00 để tránh buổi tự học mẫu 18:00 nay được kiểm tra chung.
- Xem ảnh chi tiết buổi, cảnh báo khôi phục và chi tiết thi ở 390px; danh sách thi ở 320/390/430/1280px. Kết quả/ảnh tại `.expo/qa-calendar/`. Không có lỗi runtime/console.error ở các lượt smoke cuối.
- Chưa chạy trên điện thoại thật; bundle Android không thay cho kiểm tra native layout hoặc thông báo nền.
