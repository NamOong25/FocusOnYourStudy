# UI 4H — Rà soát giao diện và trình diễn trực tiếp

Ngày 21/10/2026. Kiểm tra frontend tại `D:\Video OBS\QuanLyHocTap`, sau UI 4G. Dùng workspace trống/mẫu riêng trong mỗi lượt trình duyệt; không truy cập tài khoản hoặc dữ liệu bên ngoài.

## Kết quả

Luồng từ dữ liệu trống chạy qua: tạo học kỳ → môn → lịch học lặp → bài tập có hạn → điểm → Dashboard. Sau đó kiểm tra sửa lịch thi, bài quá hạn/hoàn thành, nhắc việc, một phiên Pomodoro, Thống kê, điểm không đạt, học kỳ thứ hai cùng mã môn và bản nháp chưa lưu.

| Nội dung | Kết quả đối chiếu |
| --- | --- |
| Điểm thường kỳ/giữa kỳ/cuối kỳ đều 8 | Tổng kết 8.0, GPA 3.50/4 cho môn 3 tín chỉ |
| Bài tập chưa làm → hoàn thành | Dashboard từ 0/1, 0% sang 1/1, 100%; bỏ khỏi việc cần làm và chuông |
| Đổi phòng thi B202 → C303 | Thẻ gần nhất trên Dashboard cập nhật C303 |
| Một phiên Pomodoro hoàn tất | Lịch sử có 1 phiên/25 phút; buổi tự học nhận 25/45 phút; Thống kê nhận cùng 25 phút |
| Cuối kỳ 2.9 → sửa lại 8 | Có cảnh báo không đạt/GPA 0.00; sau sửa GPA trở về 3.50 |
| Cùng mã TEST101 ở học kỳ khác | Không trộn lịch, bài, điểm hoặc GPA giữa các kỳ |
| Form chưa lưu | Tiếp tục chỉnh sửa giữ tên; bỏ thay đổi không tạo bài mới |

Chưa phát hiện lỗi chặn luồng trong các lượt đã chạy. Có một bài test GPA cũ chưa thao tác hộp xác nhận mới: đã cập nhật `qa-gpa-comparison.cjs` thêm bước **Bỏ thay đổi** sau Back, rồi chạy lại để kiểm tra dữ liệu điểm cũ vẫn nguyên. Đợt này không đổi mã giao diện sản phẩm hoặc công thức điểm.

## Cách xem thao tác trực tiếp

Mở hai terminal trong thư mục project. Terminal đầu chạy:

```powershell
npx expo start --web --port 8092
```

Nếu máy chủ 8092 đang chạy thì dùng lại. Terminal thứ hai chạy:

```powershell
$env:PLAYWRIGHT_MODULE='C:/Users/PC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:CHROME_PATH='C:/Program Files/Google/Chrome/Application/chrome.exe'
node docs/qa-frontend-review.cjs --live
```

Đường dẫn runtime trên là công cụ sẵn có của máy hiện tại, không phải dependency của app. Máy khác cần trỏ hai biến tới Playwright/Chrome đã cài.

- Mở Chrome bằng profile tạm riêng, không gắn vào tab hoặc tài khoản cá nhân.
- Chạy chậm, có nhãn từng bước ở lề khi cửa sổ đủ rộng; ảnh kiểm tra không chứa nhãn này.
- Dùng đồng hồ kiểm thử bắt đầu 21/10/2026 07:00 theo giờ Việt Nam, để các tình huống lịch lặp/quá hạn có thể lặp lại. Phần Pomodoro tua đồng hồ 25 phút, không chờ 25 phút thật.
- Sau khi xong, giữ Chrome ở Dashboard với dữ liệu thử để tự thao tác tiếp. Đóng cửa sổ khi đã xem xong; tải lại sẽ mất dữ liệu trong bộ nhớ.
- Bỏ `--live` để kiểm tra ẩn và tự đóng trình duyệt. Thêm `--fast` để bỏ thời gian chờ trình diễn khi chạy lại.
- Kết quả và ảnh ở `.expo/qa-frontend-review/`, được Git bỏ qua.

Trong lượt này công cụ điều khiển tab trong Codex không khởi tạo được (`failed to write kernel assets`), nên dùng cửa sổ Chrome hiển thị từ runner Playwright của project.

## Các bài đã kiểm tra

- 11 script `qa-*-unit.cjs`: tổng cộng 630 kiểm tra về AI lập lịch, hạn nộp, lịch/ngoại lệ, Dashboard, Pomodoro, GPA/BTL/cột điểm, điều hướng, nhắc việc, bộ chọn ngày giờ và thống kê.
- `qa-frontend-review.cjs`: luồng xuyên suốt nêu trên, kích thước 320/390/430/1280px, không có lỗi console/runtime trong lượt kiểm tra.
- `qa-calendar.cjs`: lịch lặp, đổi/nghỉ/khôi phục một buổi, xung đột, sửa/xóa chuỗi và lịch thi.
- `qa-focus.cjs`, `qa-statistics.cjs`: tạm dừng/tiếp tục, không ghi trùng phiên, thời gian nghỉ không cộng vào thống kê; bộ lọc và số liệu thống nhất.
- `qa-account.cjs`, `qa-ai.cjs`: các luồng tài khoản/hồ sơ và AI/tài liệu/quiz ở mức prototype; không có request ghi dữ liệu bên ngoài.
- `qa-gpa-comparison.cjs`, `qa-notifications.cjs`: so sánh/điểm thiếu/điểm 0, sửa/hủy bản nháp, trạng thái đã đọc và nguồn nhắc việc thay đổi.
- `qa-navigation.cjs`, `qa-ui-states.cjs`: Back/X/bộ chọn/giữ ngữ cảnh và form lưu/lỗi/thử lại, workspace trống.

## Giới hạn và các phần còn lại

Đây là kiểm tra web trên máy tính, gồm viewport giả lập điện thoại. Không thay thế thử Android/iOS thật, bàn phím, khóa màn hình/chạy nền hoặc thông báo hệ điều hành. Chưa nghiệm thu backend, dữ liệu bền/đồng bộ, đăng nhập thật, email, đọc PDF hoặc gọi AI thật.

Các việc giao diện còn lại vẫn nằm trong `UI-BACKLOG.md`: cảnh báo bản nháp cho tài khoản/AI, form dài và bàn phím điện thoại, sáng/tối và ngôn ngữ toàn app, trạng thái quyền thông báo. Chưa đánh dấu hoàn thành các mục này chỉ vì lượt rà soát lõi đã qua. Lộ trình backend giữ riêng để triển khai theo từng đợt.

## Commit

`Bổ sung kiểm thử tổng thể giao diện và trình diễn trực tiếp`
