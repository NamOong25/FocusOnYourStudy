# 6C.3A — API chuỗi ngày học Pomodoro

Ngày 29/10/2026. Backend có API tính chuỗi từ các phiên đã hoàn tất trong PostgreSQL. Giao diện chuỗi ngày/lịch và Dashboard sẽ nối ở **6C.3B**. Không thêm bảng, migration, dependency hoặc sửa frontend trong đợt này.

## Quy tắc bạn sẽ thấy

- Học hoàn tất ít nhất **một phiên 25 phút** trong ngày thì ngày đó được đánh dấu đã học. Học nhiều phiên vẫn chỉ tính một ngày cho chuỗi; số phiên/phút vẫn được lưu đầy đủ trên lịch.
- Học ngày 27, 28, 29 liên tiếp: chuỗi 3 ngày. Nếu hôm nay là 29 và mới học tới ngày 28 thì vẫn giữ chuỗi 2 ngày; bạn còn hôm nay để tiếp tục.
- Sang ngày 30 mà cả 29/30 chưa học: chuỗi hiện tại về 0; chuỗi dài nhất trước đó vẫn giữ.
- Một ngày học được tính theo **giờ kết thúc phiên và múi giờ tài khoản**, không theo giờ bắt đầu hay lúc xác nhận muộn.
- Phiên hủy, đang chạy, tạm dừng hoặc chưa được backend xác nhận hoàn tất không đánh dấu ngày. Không cần đạt toàn bộ mục tiêu ngày để được tính một ngày học.
- Chuỗi tính toàn bộ tài khoản. Đổi tháng trên lịch chỉ đổi các ô ngày hiển thị, không cắt hoặc làm reset chuỗi hiện tại/dài nhất.

## Cách tự kiểm tra

### 1. Chạy lại backend

Nhấn Ctrl+C trong terminal backend cũ rồi chạy lại để nạp API mới:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Có thể dùng cấu hình IntelliJ hiện tại thay cho script. Giữ terminal đó chạy. Các bảng/chỉ mục V11 hiện có được giữ; không cần tạo lại database hoặc nhập dữ liệu mẫu.

### 2. Xem chuỗi hiện tại

Mở terminal thứ hai trong VS Code hoặc IntelliJ:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Try-Pomodoro.ps1 -Mode Streak
```

Nhập email và mật khẩu tài khoản đã đăng ký. Script in JSON và các dòng:

```text
Chuỗi hiện tại: ... ngày · Dài nhất: ... ngày.
Hôm nay: ... · ... · Đã học: ...
Lịch tháng ...: ... ngày học · ... phiên.
```

Đây là kết quả từ dữ liệu tài khoản của bạn. Nếu chưa có phiên hoàn tất thì số ngày/phiên là 0, các mốc bắt đầu/kết thúc là null và lịch có đủ ngày nhưng chưa đánh dấu ô nào. Đây là trạng thái hợp lệ.

### 3. Xem lịch tháng khác

```powershell
.\scripts\Try-Pomodoro.ps1 -Mode Streak -Month '2026-10'
.\scripts\Try-Pomodoro.ps1 -Mode Streak -Month '2026-09'
```

Thay bằng tháng bạn có lịch sử. `calendar.month/days` đổi theo tháng chọn; `currentStreakDays/longestStreakDays` giữ nguyên nếu không có phiên mới hoặc chưa qua ngày. Một tháng không học có lịch 0 nhưng không xóa thành tích ở tháng khác.

`totalStudiedDays` là số ngày đã học trong toàn bộ lịch sử; `calendar.studiedDays` chỉ là số ngày học trong tháng đang xem. Hai số này có thể khác nhau.

### 4. Kiểm tra một phiên mới

1. Giữ frontend chạy, đăng nhập đúng tài khoản và vào Tập trung.
2. Học đủ 25 phút và chờ backend xác nhận hoàn tất.
3. Chạy lại lệnh Streak. Hôm nay phải được đánh dấu `studiedToday: true`; dòng ngày hôm nay trong calendar có `studied: true`, tăng 1 phiên và 1.500 giây.
4. Nếu đó là phiên hoàn tất đầu tiên của hôm nay, số ngày học tăng 1. Học phiên thứ hai cùng ngày: số phiên/phút tăng tiếp, chuỗi và số ngày học không tăng thêm.
5. Hủy một phiên khác rồi chạy lại: không tăng ngày học hoặc tổng phút công nhận.

Đối chiếu cùng ngày/múi giờ với Daily và cùng tháng với Statistics:

```powershell
.\scripts\Try-Pomodoro.ps1 -Mode Daily -Date '2026-10-29' -TimeZone 'Asia/Ho_Chi_Minh'
.\scripts\Try-Pomodoro.ps1 -Mode Statistics -Period MONTH -Date '2026-10-29' -TimeZone 'Asia/Ho_Chi_Minh'
.\scripts\Try-Pomodoro.ps1 -Mode Streak -Month '2026-10' -TimeZone 'Asia/Ho_Chi_Minh'
```

Thay ngày/tháng bằng lúc bạn đã học. Tổng phiên/phút calendar phải khớp Statistics tháng không lọc môn/kỳ, dòng ngày tương ứng phải khớp Daily. Lịch sử chỉ lấy tới hôm nay của múi giờ đang chọn; các ví dụ này giả định so sánh cùng khoảng dữ liệu đã xảy ra.

Không sửa đồng hồ máy hoặc timestamp trong database tài khoản thật để tạo chuỗi giả. Các tình huống nhiều ngày và DST được kiểm tra tự động bằng schema riêng.

### 5. Múi giờ và dữ liệu riêng

```powershell
.\scripts\Try-Pomodoro.ps1 -Mode Streak -Month '2026-10' -TimeZone 'UTC'
```

Phiên gần nửa đêm ở Việt Nam có thể nằm ở ngày khác khi xem UTC; today và chuỗi cũng tính theo múi giờ đó. Bỏ `-TimeZone` để theo hồ sơ. Đăng nhập tài khoản B chưa học thì phải có 0 ngày, không thấy thành tích của A.

Chạy `-Month '2026-13'` phải báo lỗi tháng hợp lệ. Streak không dùng `-Date`, `-Period`, `-CourseId` hay `-SemesterId`; script sẽ nhắc chọn đúng tham số trước khi hỏi đăng nhập. Các lần chạy script dùng phiên đăng nhập tạm và thu hồi đúng phiên của script, không đăng xuất app.

## API và mã nguồn

Endpoint: `GET /api/v1/pomodoro-streak?month=yyyy-MM&timeZone=...`, xác thực Bearer, response `{data,meta}`, không cache. Month/timeZone tùy chọn; today lấy từ server. [Hợp đồng đầy đủ](../backend/docs/POMODORO.md#chuỗi-ngày-học--6c3a), [request HTTP cho IntelliJ/REST client](../backend/api/pomodoro-streak.http).

Các file trong `backend/src/main/java/com/focusstudy/focus/`:

- `PomodoroStreakWindow`: snapshot ngày hiện tại, lịch tháng và giới hạn lịch sử.
- `PomodoroStreakRepository`: đọc hai cột của các phiên hoàn tất theo owner, cursor 256 dòng rồi gộp theo ngày bằng Java; không tải toàn bộ entity vào bộ nhớ.
- `PomodoroStreakTimeline`: ngày học duy nhất, chuỗi hiện tại/dài nhất và các mốc; khi dài bằng nhau chọn chuỗi gần nhất.
- `PomodoroStreakService/Controller`: cùng snapshot cho chuỗi và calendar, chỉ đọc, không sửa phiên/mục tiêu.

DST 23/25 giờ vẫn là một ngày. Ngày local bị bỏ qua hoàn toàn do thay đổi múi giờ lịch sử được để trống trên lịch; không tính thành ngày học và không bẻ gãy chuỗi giữa hai ngày thực tế liền kề. Ngày bình thường không học vẫn làm đứt chuỗi.

## Kiểm tra đã thực hiện

**Toàn bộ Maven verify/đóng gói đạt: 686 tests backend, 0 lỗi/thất bại/bỏ qua (47 tests mới).**

- **27 unit tests mới**: chuỗi hôm nay/hôm qua/ngắt quãng, nhiều phiên/ngày, trùng/thứ tự ngày, dài nhất/đồng hạng, giao tháng/năm/năm nhuận, giới hạn năm, DST/ngày bị bỏ qua và snapshot đồng hồ qua nửa đêm.
- **20 integration tests mới**: HTTP/PostgreSQL thật, replay không tăng ngày, giữ/mất chuỗi, đổi tháng, account/Bearer/cookie/no-store, nguồn đổi/xóa, múi giờ/qua nửa đêm, DST, alias ZoneId Java, lỗi query, GET không ghi, khớp Statistics/Daily và Complete đồng thời.
- Có ca đọc qua hơn một batch cursor: 301 phiên QA cùng ngày vẫn chỉ một ngày học; tổng phiên/ms đúng. Dữ liệu này chỉ để thử kỹ thuật trong schema test, không phải lịch học mẫu cho người dùng.
- Script chạy được trên **Windows PowerShell 5.1**, đọc tháng/múi giờ hồ sơ và thu hồi riêng phiên đăng nhập tạm, không in token/mật khẩu. Đã kiểm tra chặn nhầm bộ lọc môn trước khi hỏi tài khoản.
- **TypeScript và 529 tests frontend hồi quy đạt**, không lỗi/bỏ qua. Frontend không thay đổi trong đợt này.

Các test tạo schema PostgreSQL biệt lập và tự dọn. Đồng hồ cố định chỉ nằm trong test của service chuỗi ngày; không sửa giờ server sản phẩm hoặc đồng hồ xác thực JWT. Không seed/reset dữ liệu tài khoản đang dùng.

Chạy lại toàn bộ backend:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Test-Local.ps1
```

Tiếp theo là **6C.3B — Nối giao diện chuỗi ngày và Dashboard**, kiểm tra khớp Trang chủ/Tập trung/Thống kê. Điện thoại/chạy nền vẫn giữ ở 2C.3B đã hoãn.

Tên commit: **Bổ sung API chuỗi ngày học Pomodoro**. Lệnh push tại [GIT-COMMITS.md](GIT-COMMITS.md).
