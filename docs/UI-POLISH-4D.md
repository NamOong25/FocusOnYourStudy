# UI 4D — Thống kê từ phiên học và bài tập

Project: `D:\Video OBS\QuanLyHocTap`. Đợt frontend theo ảnh Thống kê đã được duyệt: tông tím, thẻ trắng bo góc, bộ lọc, tổng thời gian, chuỗi ngày, biểu đồ, phân bổ môn và tiến độ bài tập. Giữ lối vào Điểm & GPA để tiếp tục nhập/xem điểm.

## Đã làm và quy tắc số liệu

- Chọn học kỳ bằng hộp chọn có tên, năm học và trạng thái; các học kỳ có môn trùng tên vẫn tách bằng mã học kỳ/môn.
- Chọn 7 ngày (hôm nay + 6 ngày trước), 30 ngày (hôm nay + 29 ngày trước) hoặc Tùy chọn. Ngày bắt đầu/kết thúc chọn bằng lịch và tính trọn cả hai ngày; ngày đảo ngược báo lỗi, Hủy/Quay lại giữ lựa chọn cũ.
- Khoảng ngày áp dụng cho tổng thời gian, số phiên, biểu đồ và phân bổ môn. Tổng phút chỉ cộng `studySeconds` từ các bản ghi hoàn tất, loại trùng mã phiên và bỏ bản ghi có giờ kết thúc trong tương lai. Tạm dừng, nghỉ hoặc phiên bỏ dở không tạo phút học.
- Biểu đồ mỗi ngày có cả ngày 0 phút. Khoảng dài gộp thành tối đa 7 cột liên tục; 30 ngày chia thành 6 cột, mỗi cột 5 ngày. Nhãn ghi ngày đầu/cuối, chạm cột xem cả khoảng, thời lượng và số phiên.
- Phân bổ theo mã môn, cộng cùng tập bản ghi với biểu đồ; hiển thị thời lượng, số phiên, phần trăm và thanh tiến độ. Môn đã xóa vẫn dùng tên được chụp trong lịch sử. Phần trăm làm tròn một chữ số thập phân nên tổng các nhãn có thể lệch 0,1%; tổng phút không bị làm tròn theo các nhãn đó.
- Mỗi phiên mới lưu thêm mã học kỳ lúc bắt đầu; đổi học kỳ/xóa môn sau đó không chuyển phút học cũ sang kỳ khác. Bản ghi trước đợt này chưa có mã học kỳ sẽ tra theo mã môn trong danh sách hiện tại. Dữ liệu vẫn trong bộ nhớ phiên, không có migration database trong đợt này.
- Chuỗi ngày học xét các phiên của học kỳ đang chọn đến hôm nay theo quy tắc Pomodoro; không cắt chuỗi theo khoảng ngày biểu đồ. Chú thích trên thẻ và cuối màn hình để làm rõ phạm vi.
- Tiến độ bài tập gồm **toàn bộ bài của học kỳ đang chọn**, không lọc theo khoảng ngày: hoàn thành, chưa xong còn hạn, chưa xong quá hạn. Quá hạn xét mốc ngày/giờ ở hiện tại và không tính bài đã hoàn thành. Chưa có thời điểm hoàn thành bài trong model nên không trình bày đây là “số bài hoàn thành trong khoảng ngày”.
- Có trạng thái chưa có học kỳ, chưa có phiên trong khoảng, chưa có bài tập; workspace khởi đầu trống vẫn lên thống kê sau khi thêm dữ liệu.

Ảnh minh họa trước triển khai dùng bộ ví dụ 250 phút. App tính theo dữ liệu hiện có: chế độ mẫu ban đầu có 3 phiên ở ba ngày trước, tổng 75 phút cho môn Cấu trúc dữ liệu & Giải thuật và có nhãn Mẫu. Không thêm phút chỉ để khớp các con số trong ảnh.

## Kiểm tra một vòng

1. Mở app → **Khám phá dữ liệu mẫu → Thống kê → Tổng quan**. Mặc định học kỳ 1 năm 2026–2027, 7 ngày: **1 giờ 15 phút**, **3 phiên**, chuỗi **3 ngày**, có nhãn 3 phiên mẫu. Chạm một cột ngày đã học: 25 phút/1 phiên. Phân bổ môn: 75 phút, 100%; bài tập: 1/4 hoàn thành, 25%.
2. Chọn **30 ngày**: biểu đồ đổi thành các khoảng ngày, tổng thời gian giữ 75 phút nếu chỉ có ba phiên mẫu. Chạm cột để xem tổng của khoảng đó.
3. Chọn **Tùy chọn**, đặt từ hôm kia đến hôm qua → Áp dụng: 2 phiên, 50 phút. Tiến độ bài tập vẫn 1/4 vì tính toàn bộ học kỳ. Mở lại, chọn ngày bắt đầu sau ngày kết thúc: có lỗi, không đổi số liệu; Hủy giữ khoảng cũ.
4. Chọn học kỳ 2 năm 2025–2026: không có phiên/bài trong dữ liệu mẫu. Chọn học kỳ 2 năm 2026–2027: có hướng dẫn thêm môn. Chọn lại học kỳ 1 năm 2026–2027 và 7 ngày để tiếp tục.
5. Sang **Tập trung**, hoàn tất một phiên 25 phút rồi quay lại Thống kê: **1 giờ 40 phút**, **4 phiên**, cột hôm nay 25 phút, phân bổ môn tăng đúng 25 phút, chuỗi 4 ngày. Chạy nghỉ ngắn hoặc reset một phiên dở: số liệu không tăng. Các mốc trên giả định thử cùng ngày.
6. Vào danh sách bài tập, đổi một bài chưa hoàn thành thành Hoàn thành rồi quay lại: **2/4**, **50%**. Sửa deadline của bài không có buổi tự học liên kết về trước hiện tại để kiểm tra hàng Quá hạn; bài đã hoàn thành không xuất hiện trong số quá hạn. Deadline có buổi tự học liên kết vẫn dùng kiểm tra xung đột đã có.
7. Đổi tab khác rồi quay lại: giữ bộ lọc. Mở **Điểm & GPA** để kiểm tra vẫn xem bảng điểm và nhập điểm được.
8. Tải lại → **Bắt đầu với dữ liệu trống → Thống kê**: có hướng dẫn tạo học kỳ. Thêm học kỳ/môn, hoàn tất một phiên Pomodoro rồi quay lại: 25 phút, 1 phiên và phân bổ 100% môn vừa học; không có nhãn phiên mẫu. Khi chưa tạo bài tập, thẻ Tiến độ hiện trạng thái trống.

## Kiểm tra đã thực hiện

- `npm run typecheck`: qua.
- `node docs/qa-statistics-unit.cjs`: 71 kiểm tra qua; chạy ở Asia/Saigon và America/New_York để kiểm tra ngày chuyển DST. Bao gồm tách học kỳ, snapshot môn đã đổi/xóa, 7/30/tùy chọn, nhóm liên tục, ngày/năm mới, không tính trùng/tương lai, tổng các biểu đồ và deadline theo phút.
- Hồi quy: focus 88, assignment 62, Dashboard 28, AI 31, navigation 30 kiểm tra logic qua.
- `node docs/qa-statistics.cjs`: kiểm tra trình duyệt headless riêng với đồng hồ test. Chọn học kỳ/ngày, áp dụng/hủy/lỗi khoảng ngày, cập nhật sau phiên Pomodoro/nghỉ, deadline cập nhật theo phút, bài hoàn thành, lối vào bảng điểm và workspace trống phát triển thành thống kê.
- Kiểm tra bố cục/ảnh tại 320/390/430/1280px: Tổng quan, biểu đồ, phân bổ môn và hộp chọn ngày; không tràn cuộn ngang, không có lỗi runtime/console trong luồng test. Ảnh/kết quả nằm trong `.expo/qa-statistics/`, được Git bỏ qua.
- Build web và export bundle Android qua. Android mới kiểm tra bundle, chưa chạy UI trên điện thoại thật.

Script giao diện cần Playwright/Chromium; dùng `PLAYWRIGHT_MODULE` và `CHROME_PATH` nếu bộ công cụ nằm ngoài project, giống các script QA trước. Mở `npx expo start --web --port 8092` trước khi chạy hoặc truyền URL vào script. Đồng hồ test tăng thời gian để thử hoàn tất phiên, không rút ngắn thời lượng Pomodoro trong sản phẩm. Công cụ điều khiển trình duyệt trực tiếp lỗi khởi tạo; ảnh được chụp từ test headless và xem lại từ file.

## Giới hạn và phần tiếp theo

- Frontend vẫn chỉ giữ dữ liệu trong phiên. Tải lại/tắt ứng dụng không giữ lịch sử và bộ lọc; backend, lưu bền, đồng bộ chưa triển khai.
- Chưa bổ sung đợt so sánh GPA giữa học kỳ; giao diện Điểm & GPA đang có được giữ nguyên.
- Chạy nền/khóa màn hình, thông báo và nghiệm thu điện thoại thật vẫn theo checklist riêng.

Tên commit: `Hoàn thiện thống kê từ phiên học và bài tập`. Lệnh push ở `GIT-COMMITS.md`.
