# 6A.2 — Hoàn tất/hủy Pomodoro, lịch sử và mục tiêu ngày

Ngày 28/10/2026. Backend Spring Boot/PostgreSQL trong `D:\Video OBS\QuanLyHocTap`.

## Đã bổ sung

- **Hoàn tất:** chỉ công nhận phiên đã học đủ 25 phút, không gồm thời gian tạm dừng. Lưu giờ kết thúc thực tế và giờ server nhận xác nhận riêng, nên xác nhận muộn không làm tăng phút học hoặc chuyển phiên sang ngày khác.
- **Hủy:** giữ thời gian đã học dở để tra cứu, không cộng vào số phiên/phút học hoàn tất. Hủy phiên chạy hoặc tạm dừng còn thời gian; phiên đã đủ giờ cần hoàn tất để lưu kết quả.
- **Chống ghi trùng:** gửi lại hoàn tất/hủy cùng phiên trả lại kết quả đã lưu, không tăng version hoặc cộng lại lần nữa. Phiên kết thúc giữ nguyên, không đổi hoàn tất thành hủy hoặc ngược lại; có thể bắt đầu phiên mới.
- **Lịch sử:** phân trang, lọc hoàn tất/hủy, môn/học kỳ/bài/buổi tự học và khoảng giờ kết thúc. Giữ snapshot tên và liên kết lúc bắt đầu kể cả nguồn sau này được đổi/xóa.
- **Mục tiêu:** chọn 1–12 phiên/ngày, mặc định 4; lưu theo tài khoản và có version chống ghi đè. Xem tiến độ một ngày theo múi giờ, chỉ cộng phiên COMPLETED.

V11 nâng từ V10, giữ nguyên các phiên đang chạy/tạm dừng và dữ liệu học tập cũ. Không seed tài khoản thật, không đổi frontend/dependency. Giao diện Pomodoro nối API ở **6B**; biểu đồ/chuỗi ngày đầy đủ ở **6C**. Điện thoại/chạy nền vẫn nghiệm thu riêng theo 2C.3B.

## Quy tắc cần biết khi test

`COMPLETED` được công nhận 1 phiên và 1.500 giây học; `CANCELLED` được 0 phiên và 0 giây công nhận dù vẫn giữ thời gian học dở. RUNNING đã hết giờ vẫn chờ lệnh Complete; GET không tự ghi hoặc công nhận phiên.

Khi gửi Complete muộn, `endedAt` giữ deadline thật, `finalizedAt` là lúc server xử lý lệnh. Lịch sử và tiến độ ngày dùng **endedAt**, không dùng finalizedAt. Thời gian nghỉ được loại trừ.

Tiến độ ngày là khoảng từ đầu ngày đến trước đầu ngày sau trong múi giờ đã chọn, xử lý đúng ngày 23/25 giờ khi DST thay đổi. Mục tiêu là cài đặt chung hiện tại, không lưu một mục tiêu riêng cho từng ngày quá khứ. Đổi mục tiêu chỉ đổi mức cần đạt, giữ nguyên phiên và số phút đã học.

Liên kết bài tập/buổi tự học được giữ để truy vấn thời gian thực tế; hoàn tất Pomodoro **không tự đổi trạng thái** bài tập hoặc kế hoạch. Chưa có việc cộng điểm/thời gian vào cột riêng của bảng kế hoạch; phút thật lấy từ các phiên COMPLETED liên kết đúng ID.

## Hướng dẫn test nhanh

Mở terminal backend (VS Code hoặc IntelliJ đều được), dừng backend cũ bằng Ctrl+C rồi chạy:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Flyway tự nâng V10 → V11. Giữ terminal này chạy, mở terminal thứ hai cũng tại thư mục `backend`. Mỗi lệnh Try-Pomodoro hỏi tài khoản/mật khẩu, không in token và chỉ đăng xuất phiên đăng nhập tạm của script; phiên Pomodoro vẫn được giữ.

### 1. Xem và đổi mục tiêu

```powershell
.\scripts\Try-Pomodoro.ps1 -Mode Goal
.\scripts\Try-Pomodoro.ps1 -Mode SetGoal -DailySessions 6
.\scripts\Try-Pomodoro.ps1 -Mode Goal
.\scripts\Try-Pomodoro.ps1 -Mode Daily
```

Tài khoản chưa lưu mục tiêu: 4 phiên/ngày, version 0, persisted=false. Lưu lần đầu thành version 1, persisted=true; đọc lại phải hiện 6. Daily chỉ tính phiên hoàn tất trong ngày ở múi giờ mặc định của script là Asia/Ho_Chi_Minh.

### 2. Hủy một phiên và xem lịch sử

Nếu đã có phiên đang chạy/tạm dừng từ 6A.1, dùng Active để xem. Nếu chưa có, lấy ID môn bằng Try-Courses rồi bắt đầu:

```powershell
.\scripts\Try-Courses.ps1 -Mode List
$monId = 'DAN-ID-MON-CUA-BAN'
$maBatDau = [guid]::NewGuid()
.\scripts\Try-Pomodoro.ps1 -Mode Start -CourseId $monId -ClientRequestId $maBatDau
.\scripts\Try-Pomodoro.ps1 -Mode Active
.\scripts\Try-Pomodoro.ps1 -Mode Cancel
.\scripts\Try-Pomodoro.ps1 -Mode Active
.\scripts\Try-Pomodoro.ps1 -Mode History -Status CANCELLED
.\scripts\Try-Pomodoro.ps1 -Mode Daily
```

Kỳ vọng: Active trả null sau hủy; History có trạng thái CANCELLED và creditedStudyMillis=0. Daily không tăng số phiên/phút học được công nhận. Nếu phiên đã đủ 25 phút, Cancel báo POMODORO_TIME_UP; chuyển sang Complete.

### 3. Hoàn tất phiên đã đủ giờ

Tạo phiên mới bằng **mã bắt đầu mới**, cho chạy đủ 25 phút; thời gian tạm dừng không tính vào 25 phút. Có thể dùng phiên đã hết giờ từ 6A.1 để test ngay:

```powershell
.\scripts\Try-Pomodoro.ps1 -Mode Active
.\scripts\Try-Pomodoro.ps1 -Mode Complete
.\scripts\Try-Pomodoro.ps1 -Mode History -Status COMPLETED
.\scripts\Try-Pomodoro.ps1 -Mode Daily
```

Chưa đủ giờ thì báo POMODORO_NOT_READY, giữ nguyên phiên. Đủ giờ thì trả COMPLETED, creditedStudyMillis=1500000; Active trả null, ngày kết thúc tăng 1 phiên/1500 giây. Nếu kết thúc hôm trước nhưng xác nhận hôm nay, hãy dùng Daily -Date đúng ngày kết thúc.

Không chỉnh giờ máy, sửa database hoặc tạo API bỏ qua thời lượng để test nhanh. Bộ test tự động dùng schema QA riêng và mốc thử riêng để kiểm tra trường hợp đủ giờ.

### 4. Gửi lại và kiểm tra không cộng trùng

Chép id phiên đã hoàn tất/hủy từ History:

```powershell
$phienId = 'DAN-ID-PHIEN-DA-KET-THUC'
.\scripts\Try-Pomodoro.ps1 -Mode Get -SessionId $phienId
# Chọn đúng hành động đã làm: Complete hoặc Cancel.
.\scripts\Try-Pomodoro.ps1 -Mode Complete -SessionId $phienId
.\scripts\Try-Pomodoro.ps1 -Mode History
.\scripts\Try-Pomodoro.ps1 -Mode Daily
```

Trạng thái/endedAt/finalizedAt/version giữ nguyên; lịch sử không thêm dòng, Daily không tăng lần nữa. Đổi sang hành động ngược lại nhận 409. Nếu mất phản hồi lúc ghi, Get/History để đối chiếu; không tự tăng version hoặc gửi lặp với nội dung mới.

### 5. Lọc, phân trang và ngày khác

```powershell
.\scripts\Try-Pomodoro.ps1 -Mode History -Page 0 -Size 5
.\scripts\Try-Pomodoro.ps1 -Mode History -Page 1 -Size 5
.\scripts\Try-Pomodoro.ps1 -Mode History -CourseId $monId -Status COMPLETED
.\scripts\Try-Pomodoro.ps1 -Mode History -From '2026-10-27T00:00:00+07:00' -To '2026-10-29T00:00:00+07:00'
.\scripts\Try-Pomodoro.ps1 -Mode Daily -Date '2026-10-28' -TimeZone 'Asia/Ho_Chi_Minh'
```

Lịch sử mới nhất trước, khoảng từ gồm mốc đầu và không gồm mốc cuối; chỉ có phiên đã kết thúc, không có RUNNING/PAUSED. Đổi ngày trong ví dụ theo dữ liệu thật của bạn. Page bắt đầu từ 0; số dòng 1–100. Nếu có phiên mới được ghi giữa hai lần tải trang, nên tải lại từ trang 0; đây là phân trang offset, không giữ snapshot xuyên nhiều request.

### 6. Khởi động lại và hai tài khoản

Dừng/chạy lại backend, đọc Goal/History/Get/Daily: phiên kết thúc, mục tiêu và số phút vẫn còn, không tự cộng thêm. Đăng nhập tài khoản B trong script: chỉ thấy lịch sử/mục tiêu của B. Mục tiêu mặc định không có nghĩa tài khoản B đã được seed dữ liệu.

Trong IntelliJ dùng [`backend/api/pomodoro.http`](../backend/api/pomodoro.http), token trong private environment. Nếu dùng cổng khác, thêm `-BaseUrl 'http://localhost:CONG'` vào script.

## Nghiệm thu

**606 tests/Maven verify đạt (38 test mới), không lỗi/bỏ qua; TypeScript và 403 tests frontend hồi quy đạt.** Đã kiểm tra gửi lặp/đồng thời, tài khoản/Bearer/cookie/CSRF auth, phân trang, DST/ranh giới ngày, PowerShell 5.1, nâng V10 → V11 và ba lần khởi động backend; schema QA riêng tự dọn, không seed tài khoản thật.

Bộ mới gồm 28 test API/PostgreSQL/PowerShell, 6 test cửa sổ ngày/múi giờ, 3 test thời gian terminal và 1 test migration. Test restart chung được mở rộng để giữ phiên hoàn tất/hủy và mục tiêu qua ba lần khởi động; snapshot giờ/credit và số phiên không tăng sau restart.

## Tên commit và push

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git add .
git commit -m "Thêm hoàn tất, hủy, lịch sử và mục tiêu Pomodoro"
git push origin main
```

Chưa tự commit/push.
