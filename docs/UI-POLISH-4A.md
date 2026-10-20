# UI 4A — Điều hướng Lịch học và màn Bài tập riêng

## Phạm vi

Đợt 1 trong hai phần người dùng ưu tiên sau rà soát giao diện. Giảm tầng tab và đưa Bài tập ra lối vào trực tiếp. React Native/Expo, dữ liệu vẫn trong bộ nhớ phiên; chưa triển khai backend.

Khu vực Lịch học hiện gồm một hàng bốn lối vào: **Lịch học · Bài tập · Lịch thi · Tự học**. Nút **Môn & học kỳ** nằm ngay phía trên. Lịch học giữ chế độ ngày/tuần/tháng; Lịch thi mở trực tiếp. Bài tập mở riêng với nút thêm ở đầu trang, không nằm cuối lịch nữa.

Màn Bài tập mặc định xem **Tất cả**, có trạng thái Chưa làm/Đang làm/Hoàn thành và lọc môn. Bộ chọn môn có mã môn, học kỳ và năm học để phân biệt các lần học. Dữ liệu bài tập/chi tiết/checklist/tài liệu/buổi tự học vẫn dùng chung store.

Các trang có khóa riêng trong bộ nhớ điều hướng. Đổi sang lịch thi hoặc Pomodoro rồi quay lại giữ được trang/bộ lọc trước đó. Hướng dẫn bắt đầu và nút đến danh sách bài trên Dashboard dẫn đến Bài tập mới.

## Thử một vòng

1. Chọn Khám phá dữ liệu mẫu → Lịch học: thấy bốn lối vào và nút Môn & học kỳ; trang lịch không còn danh sách bài bên dưới.
2. Chọn Bài tập: thấy toàn bộ bài, nút thêm bài ở trên. Chọn Chưa làm hoặc lọc một môn.
3. Chuyển Lịch thi → bấm Quay lại màn trước: trở về Bài tập với bộ lọc cũ. Mở chi tiết bài → quay lại vẫn giữ bộ lọc.
4. Thêm bài mới: tạo bài rồi thấy ở Tất cả/Chưa làm; đổi trạng thái trong chi tiết thì danh sách dùng cùng dữ liệu.
5. Mở Lịch học → Theo tuần, chọn ngày khác → chuyển Bài tập rồi Quay lại: ngày/chế độ lịch được giữ.
6. Mở Tự học hoặc Môn & học kỳ trực tiếp, thử đi vào chi tiết rồi quay lại; thanh dưới vẫn có 5 mục.
7. Bắt đầu với dữ liệu trống: mở Bài tập thấy trạng thái trống. Hướng dẫn trên Trang chủ dẫn tạo học kỳ/môn, rồi dẫn sang Bài tập để ghi việc đầu tiên.
8. Kiểm tra ở màn hình hẹp: bốn lối vào không tràn ngang; nhãn Hoàn thành có thể xuống dòng. Kiểm tra tiếp trên điện thoại thật với bàn phím trước khi nghiệm thu ứng dụng native.

## Kiểm tra đã thực hiện

- TypeScript và xuất bundle web/Android thành công; chưa chạy trên điện thoại thật.
- 30 kiểm tra trạng thái điều hướng, 18 kiểm tra lịch và 28 kiểm tra tổng hợp Dashboard đều qua.
- Trình duyệt: thử cả năm mục học tập tại 320/390/430/1280 px, không tràn ngang; không có lỗi console trong phiên kiểm tra.
- Thử Tất cả/Chưa làm, tạo bài mới → mở chi tiết → Pomodoro → quay lại đúng chi tiết; chuyển lịch thi rồi quay lại giữ bộ lọc; lịch Theo tuần được giữ khi quay lại; dữ liệu trống có màn Chưa có bài tập.
- Đã cập nhật các script QA điều hướng/picker/trạng thái/smoke dùng lối vào Bài tập mới. Các script giao diện đó chưa chạy lại toàn bộ trong đợt này; các luồng nêu trên được kiểm tra trực tiếp trên bản web.

## Đợt tiếp theo

UI 4B: chọn giờ deadline, tìm kiếm và lọc Hôm nay/Quá hạn/Sắp hạn. Đợt này đã có xem tất cả theo trạng thái nhưng chưa có tìm kiếm hoặc lọc theo thời hạn, chưa sửa cách xử lý deadline theo giờ.

Các đề xuất Pomodoro, thống kê, thông báo, nội dung chưa lưu và sáng/tối/ngôn ngữ đã ghi ở đầu `UI-BACKLOG.md` với ô chưa hoàn thành. Lộ trình backend 5 đợt vẫn giữ nguyên trong checklist.
