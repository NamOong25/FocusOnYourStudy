# 6C.1 — API thống kê thời gian học Pomodoro

Ngày 29/10/2026. Backend trả thống kê từ các phiên học đã hoàn tất trong PostgreSQL. Đợt này cung cấp dữ liệu cho màn Thống kê ở 6C.2; chuỗi ngày và Dashboard ở 6C.3. Không sửa giao diện, tạo bảng hoặc thêm dependency; dùng schema V11 hiện có.

## Kết quả

- GET `/api/v1/pomodoro-statistics`: chọn tuần/tháng, ngày neo, múi giờ; tùy chọn lọc môn/học kỳ.
- Tổng số phiên/phút học, đủ dữ liệu từng ngày cho biểu đồ và phân bố theo môn/kỳ.
- Chỉ phiên COMPLETED được công nhận. Phiên hủy, tạm dừng hoặc hết giờ nhưng chưa được backend xác nhận hoàn tất không cộng vào thống kê.
- Tính theo giờ kết thúc thực tế và múi giờ đã chọn; xác nhận muộn không chuyển ngày học. Đổi tên/chuyển kỳ/xóa môn vẫn giữ lịch sử.
- Mỗi tài khoản đọc dữ liệu của mình; các tổng/ngày/môn cùng snapshot. GET không sửa phiên, version hoặc mục tiêu.

## Cách tự kiểm tra

### 1. Chạy lại backend

Trong terminal backend đang chạy, nhấn Ctrl+C rồi chạy lại để nạp API mới:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Giữ terminal này chạy. Có thể chạy backend bằng cấu hình IntelliJ đang dùng thay cho script. Đợt này không cần chạy lại frontend để xem API.

### 2. Đọc thống kê tuần

Mở terminal thứ hai trong VS Code hoặc IntelliJ:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Try-Pomodoro.ps1 -Mode Statistics -Period WEEK
```

Nhập email/mật khẩu tài khoản đã đăng ký. Script in JSON và dòng “Thống kê: … phiên · … phút”. Không nhập token thủ công. Script đăng nhập tạm để đọc rồi đăng xuất phiên của chính script, không đăng xuất phiên app.

Kiểm tra `fromDate/toDate` là thứ Hai/Chủ nhật của tuần hiện tại, `days` có 7 phần tử. Bỏ `-TimeZone` thì dùng múi giờ hồ sơ. Chưa có phiên hoàn tất trong tuần thì kết quả **0 phiên, 0 phút**, 7 ngày bằng 0 và `courses` rỗng là đúng.

### 3. Xem tháng và tuần chứa một ngày cụ thể

```powershell
.\scripts\Try-Pomodoro.ps1 -Mode Statistics -Period MONTH -Date '2026-10-29' -TimeZone 'Asia/Ho_Chi_Minh'
.\scripts\Try-Pomodoro.ps1 -Mode Statistics -Period WEEK -Date '2026-10-29' -TimeZone 'Asia/Ho_Chi_Minh'
```

Tháng 10 có 31 dòng ngày, từ 01/10 đến 31/10. Tuần chứa 29/10 là 26/10 đến 01/11. Thay ngày bằng thời gian bạn có phiên đã hoàn tất. Tổng tháng và tuần không bắt buộc bằng nhau vì có phạm vi khác nhau.

`completedSessions` là số phiên, `studySeconds / 60` là phút học; một phiên 25 phút tương ứng `studyMillis=1500000`, `studySeconds=1500`. Tổng các dòng `days` và tổng các nhóm `courses` đều phải bằng tổng ở đầu response khi cùng query.

### 4. Đối chiếu với app và Daily

1. Đăng nhập app, chọn môn, bắt đầu một phiên Pomodoro, học đủ 25 phút và chờ xác nhận hoàn tất từ server.
2. Chạy lại Statistics cho tuần/tháng chứa ngày kết thúc: tăng đúng **1 phiên, 25 phút** ở ngày và môn đó.
3. Kiểm tra mục Lịch sử trong Tập trung; chọn cùng múi giờ/ngày để đối chiếu với `days`.
4. Có thể đọc API Daily bằng lệnh dưới; kết quả phải khớp dòng ngày tương ứng của Statistics **không lọc môn/kỳ**. Thay ngày bằng ngày vừa kết thúc phiên.

```powershell
.\scripts\Try-Pomodoro.ps1 -Mode Daily -Date '2026-10-29' -TimeZone 'Asia/Ho_Chi_Minh'
```

Hủy một phiên đang học rồi đọc Statistics: không tăng tổng. Đăng nhập tài khoản khác chưa học trong khoảng đó: không thấy số liệu hoặc tên môn của tài khoản trước. Không sửa giờ trong database tài khoản thật để rút ngắn bài kiểm tra.

### 5. Lọc theo môn/học kỳ

Lấy UUID môn/học kỳ từ API hoặc JSON lịch sử, rồi thay phần giữ chỗ bên dưới bằng UUID thực:

```powershell
.\scripts\Try-Pomodoro.ps1 -Mode Statistics -Period MONTH -CourseId '<UUID môn>'
.\scripts\Try-Pomodoro.ps1 -Mode Statistics -Period MONTH -SemesterId '<UUID học kỳ>'
```

Có thể kết hợp hai tham số. Lọc theo mã gốc lưu trên phiên, kể cả khi nguồn đã đổi/xóa. UUID khác tài khoản hoặc không có phiên phù hợp cho kết quả 0. Không nhập tên môn vào tham số UUID.

## Hợp đồng và mã nguồn

Xem [hợp đồng đầy đủ](../backend/docs/POMODORO.md#thống-kê-tuầntháng--6c1), [request HTTP cho IntelliJ/REST client](../backend/api/pomodoro-statistics.http).

Trong `backend/src/main/java/com/focusstudy/focus/`: `PomodoroStatisticsWindow` xác định khoảng tuần/tháng; `PomodoroStatisticsRepository` chỉ đọc phiên hoàn tất của owner trong khoảng; `PomodoroStatisticsService` tổng hợp các nhóm; `PomodoroStatisticsController` trả response. `SecurityConfig` chỉ mở GET thống kê cho tài khoản đã xác thực. Không có truy vấn riêng cho từng ngày hoặc nối dữ liệu môn đã thay đổi vào lịch sử cũ.

## Kiểm tra tự động

**Maven verify/đóng gói đạt: 639 tests backend, 0 lỗi, 0 thất bại, 0 bỏ qua (33 tests mới).**

- 16 unit tests mới: tuần/tháng, năm nhuận, DST, ngày lịch bị bỏ qua, dữ liệu trống, múi giờ, nhãn snapshot và các lần học khác kỳ.
- 17 integration tests mới: HTTP + PostgreSQL, tổng khớp Daily/lịch sử, replay không cộng trùng, loại phiên hủy/chưa hoàn tất, ranh giới thời gian, tách tài khoản, đổi/xóa/chuyển kỳ, query lỗi, auth/no-store, đọc không ghi và hoàn tất đồng thời.
- Bao gồm chạy script Statistics trên Windows PowerShell 5.1 cho tuần/tháng và múi giờ mặc định hồ sơ, không in token/mật khẩu; thu hồi đúng phiên đăng nhập của script.
- TypeScript và toàn bộ 505 tests frontend hồi quy đã qua, không lỗi/bỏ qua. Frontend không thay đổi trong đợt này.

Các test tích hợp tạo schema biệt lập và tự dọn; không seed hoặc reset dữ liệu tài khoản đang dùng.

Chạy lại toàn bộ backend:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Test-Local.ps1
```

## Tiếp theo

- **6C.2:** nối màn Thống kê vào API này, chọn tuần/tháng, biểu đồ ngày và phân bố môn; tải/lỗi/trống/thử lại, cập nhật sau hoàn tất phiên và đổi tài khoản.
- **6C.3:** chuỗi ngày học và Dashboard dùng dữ liệu thật, nghiệm thu liên thông.
- Kiểm tra điện thoại/chạy nền giữ ở 2C.3B theo yêu cầu đã hoãn.

Tên commit: **Bổ sung API thống kê thời gian học Pomodoro**. Lệnh push tại [GIT-COMMITS.md](GIT-COMMITS.md).
