# UI 4F — Thông báo trong app và trạng thái đã đọc

Project: `D:\Video OBS\QuanLyHocTap`. Đợt này hoàn thiện nút chuông và Góc nhắc nhở trong app. Chưa gửi thông báo hệ thống, xin quyền, đặt chuông hoặc lưu dữ liệu lâu dài.

## Nội dung được hiển thị

- Bài chưa hoàn thành đã quá hạn hoặc có deadline từ hiện tại đến cùng giờ sau 7 ngày. Hạn cũ thiếu giờ dùng 23:59, giống các màn khác. Bài đã hoàn thành không có trong danh sách.
- Các buổi học/lịch thi đang diễn ra hoặc bắt đầu trong 7 ngày tới. Buổi đã hủy, lịch kết thúc và dữ liệu ngày/giờ không hợp lệ được bỏ. Buổi lặp được tạo theo ngày, áp dụng ngoại lệ đổi giờ/phòng và mở đúng ngày đó.
- Sắp xếp bài quá hạn trước, rồi sự kiện đang diễn ra, sau đó các mục sắp đến theo giờ. Đã đọc/chưa đọc không tự đảo thứ tự danh sách.
- Đây là danh sách nhắc việc hiện tại, không phải lịch sử thông báo đã gửi. Hoàn thành/xóa bài, hủy buổi hoặc xóa/kết thúc lịch sẽ bỏ mục đó khỏi danh sách.
- Các lựa chọn nhắc trước và giờ yên lặng mẫu sẽ xử lý ở đợt thông báo thiết bị. Danh sách trong app hiển thị các việc gần đến ngay cả khi chưa chọn gửi nhắc trên thiết bị.

## Trạng thái đọc

- Mở chuông giữ nguyên số mục chưa đọc. Mở một mục đánh dấu riêng mục đó, vẫn có nút đánh dấu đã đọc mà không mở chi tiết.
- Có Tất cả/Chưa đọc và Đánh dấu tất cả đã đọc. Khi không còn mục chưa đọc, nút đánh dấu tất cả bị khóa và bộ lọc Chưa đọc có trạng thái “Bạn đã đọc hết nhắc việc”. Chưa có nguồn phù hợp có trạng thái “Chưa có nhắc việc”.
- Huy hiệu chuông tính từ các mục đang có và trạng thái đọc, không dùng số mẫu cố định; số lớn hơn 99 hiện 99+, số đầy đủ ở Góc nhắc nhở. Không có mục chưa đọc thì ẩn huy hiệu.
- Trạng thái đọc gắn mã mục và phiên bản thông tin. Đổi deadline/tên bài, giờ/phòng/giảng viên buổi học hoặc thông tin kỳ thi làm đúng mục đó thành chưa đọc. Việc đồng hồ chạy, thay số phút đếm ngược hoặc đổi bài từ Chưa làm sang Đang làm không tự đặt lại trạng thái đọc.
- Mỗi ngày của buổi học lặp có mã riêng. Đọc buổi tuần này không đánh dấu buổi tuần sau. Dấu đọc của mục đã bỏ được dọn; bài được mở lại sau khi hoàn thành sẽ xuất hiện như một mục chưa đọc.
- Đóng/mở chuông và chuyển tab vẫn giữ trạng thái đọc trong phiên. Đóng rồi mở lại Góc nhắc nhở mặc định ở Tất cả. Back từ chi tiết giữ bộ lọc và vị trí danh sách; X đóng cả luồng.

## Kiểm tra một vòng

1. Mở app → Khám phá dữ liệu mẫu. Ghi lại số **N** trên chuông; số này phụ thuộc giờ hiện tại vì buổi học có thể đang diễn ra/đã qua. Mở chuông: N giữ nguyên và khớp “N chưa đọc” trong Góc nhắc nhở.
2. Mở một bài tập, kiểm tra đúng tên/môn/hạn. Số chưa đọc giảm 1. Back: trở lại Góc nhắc nhở. Chọn Chưa đọc: bài vừa mở không còn ở bộ lọc này; chọn Tất cả vẫn xem được mục đã đọc.
3. Bấm dấu hai dấu tích của một mục chưa đọc mà không mở: số giảm 1. Bấm Đánh dấu tất cả đã đọc: số về 0, huy hiệu ẩn. Chưa đọc hiện trạng thái đã đọc hết. Đóng, đổi tab và mở lại chuông: vẫn giữ trạng thái đọc.
4. Trong một bài đã đọc, sửa giờ hạn nộp và lưu (chọn giờ sau các buổi tự học đã liên kết, ví dụ 23:45 nếu các buổi đều kết thúc trước đó). Mục này thành chưa đọc và giờ mới xuất hiện trong danh sách. Mở lại để đánh dấu đọc; đổi bài thành Hoàn thành rồi Back: mục bài đó được bỏ.
5. Mở một nhắc lịch học, kiểm tra đúng **ngày** và **giờ/phòng**. Đổi phòng cho đúng một buổi rồi lưu: chỉ mục của buổi đó thành chưa đọc. Back và mở lại để đánh dấu đọc. Nghỉ buổi này rồi Back: nhắc của buổi đó được bỏ; các buổi tuần khác không bị đánh dấu đã đọc/hủy theo.
6. Mở một nhắc lịch thi và kiểm tra đúng kỳ thi/ngày. Đổi phòng rồi lưu: mục thành chưa đọc. Xóa kỳ thi trong dữ liệu mẫu: quay lại Góc nhắc nhở, không còn mục hoặc liên kết đã xóa.
7. Sau khi đọc hết, đóng chuông và tạo bài tập mới có hạn trong 7 ngày. Chuông có thêm một mục chưa đọc. Mở mục rồi dùng Escape hoặc Back trình duyệt: về đúng Góc nhắc nhở. X ở chi tiết đóng luồng về màn gốc.
8. Tải lại → Bắt đầu với dữ liệu trống → chuông: không có huy hiệu, hiện Chưa có nhắc việc, nút đánh dấu tất cả bị khóa. Sau khi tạo môn/bài/lịch phù hợp, nhắc việc sẽ xuất hiện từ dữ liệu vừa thêm.

Nên thử trên dữ liệu mẫu để không sửa nhầm nội dung đang kiểm tra ở các đợt khác. Tải lại khởi tạo lại workspace và trạng thái đọc; hiện chưa có lưu bền.

## Kiểm tra kỹ thuật

- `npm run typecheck`: qua.
- `node docs/qa-notifications-unit.cjs`: 62 kiểm tra qua, gồm deadline/khung 7 ngày, đang diễn ra/kết thúc, lịch lặp/ngoại lệ, đọc từng mục/tất cả, phiên bản dữ liệu thay đổi, dọn trạng thái cũ, liên kết đúng và dữ liệu trống/không hợp lệ.
- Hồi quy logic: assignment 62, calendar 18, navigation 30 kiểm tra qua.
- `node docs/qa-notifications.cjs`: qua luồng chuông không tự đọc, huy hiệu số, bộ lọc, nhớ trạng thái qua tab, sửa deadline/phòng, hoàn thành/hủy/xóa, dữ liệu mới, đúng ngày của buổi học và Back/Escape/Back trình duyệt/X.
- Test giao diện dùng đồng hồ 07:00 ngày 21/10/2026 trước khi tải app: dữ liệu mẫu lúc đó có 8 mục (3 bài, 4 buổi học, 1 lịch thi). Đây là giá trị kiểm tra, không cố định trong sản phẩm.
- Ảnh/layout được xem tại 320/390/430/1280px, gồm danh sách, thẻ, chi tiết lịch học và trạng thái trống. Không tràn cuộn ngang, không có lỗi runtime/console trong lượt test. Kết quả/ảnh tại `.expo/qa-notifications/`, Git bỏ qua.
- `node docs/qa-navigation.cjs`: hồi quy điều hướng toàn app qua, gồm lưu màn/bộ lọc/cuộn, các luồng bài → tự học → Pomodoro, nhắc việc → chi tiết → nhắc việc, lịch chọn ngày, Back/Escape, AI và tài khoản. Selector lịch thi được cập nhật theo nhãn mục mới.
- Build web và export bundle Android qua. Chưa chạy trên điện thoại thật hoặc nghiệm thu thông báo khi khóa màn hình.

Script giao diện dùng profile headless riêng, không dùng session trình duyệt cá nhân. Cần Metro tại localhost:8092 (hoặc truyền URL) và Playwright/Chromium. Đặt `PLAYWRIGHT_MODULE`/`CHROME_PATH` nếu bộ công cụ ở ngoài project.

## Cấu trúc và phần còn lại

`features/notifications/notifications.ts` tổng hợp nhắc việc và xử lý trạng thái đọc thuần dữ liệu; `useInAppNotifications.ts` giữ dấu đọc trong AppShell xuyên các tab. `NotificationsCenter.tsx` quản lý danh sách và luồng chi tiết; `components/` chứa chuông và thẻ. Dùng lại TaskDialog/ClassDialog/ExamDialog, không tạo form nhập song song.

Để sau: lưu/đồng bộ trạng thái đọc theo tài khoản, lịch sử sự kiện đã gửi, quyền thiết bị và trạng thái từ chối/thu hồi, nhắc trước/giờ yên lặng, cập nhật/hủy lịch nhắc hệ thống và thử nền/khóa màn hình trên điện thoại thật.

Tên commit: `Hoàn thiện giao diện thông báo và trạng thái đã đọc`. Lệnh push tại `GIT-COMMITS.md`.
