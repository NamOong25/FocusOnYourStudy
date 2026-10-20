# UI 3D — Dashboard theo học kỳ

## Kết quả

- Bộ chọn học kỳ hiển thị cả năm học; giữ lựa chọn khi đổi tab hoặc quay lại từ chi tiết. Mặc định kỳ Đang học, nếu chưa có thì kỳ đầu tiên. Kỳ không có môn hiển thị hướng dẫn riêng.
- Tất cả thẻ lọc theo ID môn thuộc kỳ đang chọn: GPA học kỳ, bài tập/tiến độ, ca học hôm nay, lịch thi gần nhất, buổi tự học và kế hoạch AI đã duyệt. Môn trùng tên/mã ở kỳ khác không đưa dữ liệu vào thẻ.
- Bỏ mục tiêu cố định 5 phiên và số phiên mẫu khỏi Dashboard; phần tiến độ dựa trên bài đã hoàn thành/tổng bài trong kỳ. Khi chưa có bài thì hiển thị dấu — và 0/0, tránh tạo cảm giác đã có dữ liệu.
- GPA dùng chung `courseResult`/`summarizeGrades`; chưa có điểm thì —, môn không đạt/chặn thi hiện cảnh báo đỏ mở đúng bảng điểm. Có thể sửa điểm từ Dashboard rồi quay lại để xem cập nhật.
- Lịch thi gần nhất loại kỳ thi đã kết thúc, giữ kỳ thi đang diễn ra, sắp theo ngày/giờ; có ngày, giờ bắt đầu/kết thúc, phòng, hình thức và đếm ngược. Tạo lịch thi từ thẻ trống chọn sẵn môn thuộc kỳ đang xem.
- Lịch hôm nay dùng lịch lặp và ngoại lệ có sẵn: loại buổi nghỉ, dùng giờ/phòng đã đổi; mở đúng buổi và ngày. Nhãn Sắp học/Đang học/Đã học dựa trên thời gian thực tế.
- Bài tập chia Cần làm/Quá hạn/7 ngày tới; hoàn thành không còn trong việc cần xử lý. Deadline chỉ có ngày, quá hạn từ đầu ngày kế tiếp. 7 ngày tới gồm hôm nay đến ngày +7.
- Đồng hồ cập nhật mỗi 30 giây khi Trang chủ đang hoạt động và khi app trở lại foreground; dữ liệu theo ngày được tính lại khi qua ngày.
- Nút quản lý/thêm môn từ bộ chọn Dashboard mở Môn & học kỳ đúng kỳ; tìm kiếm/lọc cũ được đặt lại khi đổi kỳ. Đổi kỳ Dashboard đơn thuần không tự đổi kỳ ở các màn khác.

## Cấu trúc

`src/features/dashboard/dashboard.ts` tập trung việc chọn dữ liệu/đếm ngược; `useDashboardClock.ts` cập nhật mốc thời gian; `components/` chứa bộ chọn học kỳ, thẻ lịch thi và thẻ tổng quan. `HomeScreen.tsx` ghép các khối, giữ bộ lọc và mở chi tiết dùng lại từ tính năng hiện có.

## Kiểm tra

- `qa-dashboard-unit.cjs`: 28 kiểm tra học kỳ, deadline, ca nghỉ/đổi, ngày chuyển tiếp, thi đã kết thúc/đang diễn ra, dữ liệu trống và điểm dùng chung.
- `qa-dashboard.cjs`: UI từ dữ liệu trống qua học kỳ → môn → lịch → bài tập → điểm → Dashboard; thay đổi deadline/trạng thái/điểm/phòng thi; cùng mã môn ở hai kỳ; kỳ trống; quay lại và bố cục 320/390/430/1280px.
- Hướng dẫn kiểm tra tay có kết quả đối chiếu: [DASHBOARD-TEST.md](./DASHBOARD-TEST.md).

## Giới hạn

Đây là frontend với dữ liệu trong bộ nhớ phiên. Tải lại trang khởi tạo lại dữ liệu; chưa có backend/lưu lâu dài/đồng bộ. GPA vẫn mô phỏng theo các quy tắc của phần điểm. Biểu đồ ở màn Thống kê tổng quan còn dùng dữ liệu mẫu, không được nghiệm thu là thống kê thật ở đợt này. Build Android xác nhận bundle, chưa thay thế chạy ứng dụng trên thiết bị.
