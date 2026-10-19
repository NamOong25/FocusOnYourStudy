# Đợt 2A — Môn học & học kỳ

## Mở ở đâu?

Trong tab **Lịch học**, chọn **Môn & học kỳ** ở thanh chuyển nội dung phía trên. Giữ nguyên dock 5 tab theo template.

## Giao diện đã thêm

- Danh sách học kỳ cuộn ngang, trạng thái đang học/sắp tới/đã kết thúc, năm học, số môn/tín chỉ và tiến độ theo tín chỉ môn hoàn thành.
- Tạo/sửa học kỳ và ghi chú mục tiêu. Có kỳ đã học và kỳ tương lai để thử các bố cục khác nhau.
- Danh sách môn có mã môn, giảng viên, tín chỉ, màu nhận diện, trạng thái, số ca học và bài tập liên quan. Tìm theo tên/mã/giảng viên và lọc trạng thái.
- Form tạo/sửa môn: học kỳ, mã/tên, tín chỉ, giảng viên, phòng thường dùng, trạng thái, màu và mô tả.
- Chi tiết môn gồm Tổng quan / Lịch học / Bài tập / Điểm số. Chỉnh sửa ca học/bài tập hoặc thêm mới với môn được chọn sẵn; mở Pomodoro cho môn đó.
- Xóa môn chưa có dữ liệu liên quan, xác nhận trong form. Môn đã có lịch/bài/thi được giữ lại để tránh mất liên kết.
- Điểm số là phần xem bố cục với trọng số minh họa và trạng thái Chưa nhập/Chưa đủ dữ liệu, chưa triển khai nhập điểm hoặc GPA thật.

## Liên kết dữ liệu trong prototype

Môn có ID riêng, thuộc học kỳ. Bài tập, ca học và kỳ thi tham chiếu ID để hai học kỳ có thể có môn trùng tên. Sửa tên môn cập nhật nhãn ở các mục liên quan; đổi giảng viên cập nhật các ca đang dùng giảng viên mặc định, giữ các ca có giảng viên khác. Môn mới xuất hiện trong lựa chọn môn ở bài tập, lịch học, lịch thi và Pomodoro.

Không cho chuyển môn đã có dữ liệu liên quan sang học kỳ khác. Tín chỉ trong màn môn/học kỳ lấy từ catalog; các thẻ GPA/tín chỉ tốt nghiệp ở Dashboard/Thống kê vẫn là mẫu độc lập, sẽ nối khi làm bảng điểm. Danh sách lịch/bài tập hiện là toàn bộ dữ liệu mẫu; chưa lọc toàn ứng dụng theo học kỳ vì bộ chọn học kỳ Dashboard được hoãn.

Dữ liệu vẫn chỉ ở bộ nhớ; tải lại ứng dụng trở về mẫu. Không thêm API, backend hay persistence trong đợt này. Các nhóm cải thiện đã hoãn được giữ ở `UI-BACKLOG.md`.

## Kết quả kiểm tra đợt 2A

- TypeScript, build web (khoảng 631KB) và bundle Android/Hermes: qua.
- `docs/qa-academics.cjs`: qua trên Chrome headless; xem bố cục catalog ở 320/390/430/1280px và chi tiết môn/điểm mẫu ở 390px.
- Đã thử: đổi/tạo học kỳ, validate form; tìm/lọc môn; tạo/sửa/xóa môn; chặn mã trùng trong cùng học kỳ; cho phép cùng mã/tên ở học kỳ khác; chọn sẵn môn và giảng viên trong form; đổi tên giữ liên kết; chặn xóa môn có dữ liệu liên quan; mở Pomodoro cho môn vừa chọn.
- `docs/qa-smoke.cjs`: các luồng 5 tab cũ, bài tập, lịch, timer, AI preview vẫn qua sau thay đổi.
- Không có runtime error/console.error ở hai lượt smoke cuối. Kết quả và ảnh ở `.expo/qa-academics/` và `.expo/qa/` (không theo dõi bằng Git).
- Chưa chạy trên điện thoại thật; bundle Android không thay cho kiểm tra native layout, chuông hoặc chạy nền.
