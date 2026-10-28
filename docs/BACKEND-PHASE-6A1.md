# 6A.1 — Lưu phiên Pomodoro đang học

Ngày 28/10/2026. Project `D:\Video OBS\QuanLyHocTap`, backend Spring Boot/PostgreSQL.

## Kết quả

Đã thêm V10 và API bắt đầu/tạm dừng/tiếp tục/đọc phiên Pomodoro thực tế. Giờ bắt đầu và thời lượng 25 phút do server quyết định; tạm dừng không tiêu hao thời gian học. Mỗi tài khoản chỉ có một phiên chạy hoặc tạm dừng. Gửi lại cùng yêu cầu bắt đầu không tạo trùng hoặc reset đồng hồ; version chống thao tác từ tab cũ.

Phiên lưu snapshot môn/học kỳ/bài tập/buổi tự học lúc bắt đầu. Đổi tên/chuyển kỳ/xóa nguồn sau đó không sửa ngữ cảnh phiên cũ. Không tự thay trạng thái bài tập hoặc buổi tự học; không gộp Pomodoro vào bảng kế hoạch `study_sessions`.

**Đợt này chưa nối giao diện Pomodoro.** Dùng script hoặc IntelliJ HTTP để test API. Hoàn tất/hủy, lịch sử và mục tiêu ngày ở **6A.2**; nối UI/khôi phục khi tải lại trang ở **6B**; thống kê dữ liệu thật ở **6C**. Điện thoại/chạy nền vẫn chưa nghiệm thu.

## Cách test bằng hai terminal

Nên dùng tài khoản test riêng đã có một học kỳ và môn. Không cần xóa database hoặc nạp dữ liệu mẫu. Mỗi lệnh script hỏi email/mật khẩu; script không in/lưu token và đăng xuất riêng phiên đăng nhập tạm của nó sau khi xong. Phiên học Pomodoro vẫn được giữ.

### 1. Terminal chạy backend

Mở terminal trong VS Code hoặc IntelliJ đều được:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Giữ terminal này chạy. Flyway tự nâng V9 lên **V10**, chỉ thêm bảng mới và giữ dữ liệu cũ. Nếu đã có backend cũ chạy cổng 8080 thì dừng nó bằng Ctrl+C trước khi chạy lại; không mở hai backend trên cùng cổng.

### 2. Terminal gửi lệnh kiểm tra

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Try-Pomodoro.ps1 -Mode Active
```

Tài khoản chưa có phiên: `data: null`, báo **Chưa có phiên Pomodoro đang hoạt động**.

Lấy ID môn bằng:

```powershell
.\scripts\Try-Courses.ps1 -Mode List
```

Chép `id` của môn thuộc tài khoản test, rồi chạy:

```powershell
$monId = 'DAN-ID-MON-VAO-DAY'
$maBatDau = [guid]::NewGuid()
.\scripts\Try-Pomodoro.ps1 -Mode Start -CourseId $monId -ClientRequestId $maBatDau
```

Kỳ vọng: `RUNNING`, `durationSeconds: 1500`, `remainingSeconds: 1500`, `version: 0`. Giữ `$maBatDau` để đối chiếu hoặc thử gửi lại **đúng yêu cầu cũ**, không tạo GUID mới khi chưa biết yêu cầu trước đã thành công hay chưa.

### 3. Tạm dừng và kiểm tra thời gian đứng yên

```powershell
.\scripts\Try-Pomodoro.ps1 -Mode Pause
.\scripts\Try-Pomodoro.ps1 -Mode Active
```

Kỳ vọng: `PAUSED`, version 1, `endsAt: null`. Chờ một lúc rồi chạy Active lần nữa: **remainingMillis giữ nguyên**, pausedMillis tăng. Các request Active không tăng version.

### 4. Tiếp tục và đọc lại

```powershell
.\scripts\Try-Pomodoro.ps1 -Mode Resume
.\scripts\Try-Pomodoro.ps1 -Mode Active
```

Kỳ vọng: `RUNNING`, version 2, giữ nguyên id/startedAt; thời gian còn lại tiếp tục giảm, không trở lại 25 phút. endsAt dịch theo khoảng tạm dừng.

### 5. Kiểm tra gửi trùng và version cũ

```powershell
# Cùng mã và nội dung Start: trả đúng phiên cũ, không reset.
.\scripts\Try-Pomodoro.ps1 -Mode Start -CourseId $monId -ClientRequestId $maBatDau

# Lúc này version đã là 2 nên lệnh dùng 0 bị từ chối.
.\scripts\Try-Pomodoro.ps1 -Mode Pause -Version 0
```

Kỳ vọng lệnh cuối: **POMODORO_VERSION_CONFLICT**, không đổi trạng thái/giờ. Dùng Active để đọc lại. Nếu thử Start bằng mã mới khi đã có phiên, nhận **POMODORO_ALREADY_ACTIVE**.

Nếu mất mạng/timeout khi ghi, không lặp pause/resume ngay. Chạy Active/Get để biết server đã lưu gì trước khi thao tác tiếp.

### 6. Khởi động lại backend

Tạm dừng bằng Pause rồi Ctrl+C terminal backend; chạy lại Run-Local.ps1, sau đó Active trong terminal kiểm tra. **Cùng id và remainingMillis**, trạng thái vẫn PAUSED.

Tiếp tục bằng Resume; dừng/chạy lại backend một lần nữa rồi Active. **Cùng id/startedAt/endsAt**, thời gian còn lại giảm theo thời gian thực, kể cả lúc backend tắt. Không tạo phiên mới.

Nếu đã đủ 25 phút: remainingMillis = 0, timeUp = true. **6A.1 chưa hoàn tất/hủy phiên**, nên phiên vẫn chiếm chỗ; pause/resume bị báo POMODORO_TIME_UP. Giữ lại để triển khai tiếp 6A.2, không xóa bảng/reset dữ liệu để test lại. Phiên chưa được cộng vào lịch sử/thống kê.

### 7. Hai tài khoản và IntelliJ

Chạy Active bằng tài khoản B: không thấy phiên A; B có thể bắt đầu phiên riêng với môn của B. Biết ID phiên A cũng không có quyền đọc/sửa bằng B (404).

Trong IntelliJ mở [`backend/api/pomodoro.http`](../backend/api/pomodoro.http). Dùng accessToken trong private environment như các API trước; điền courseId/sessionId/clientRequestId và version hiện tại. Không commit token thật.

Nếu dùng backend cổng khác, thêm `-BaseUrl 'http://localhost:CONG'` vào các lệnh Try-Pomodoro/Try-Courses.

## Nghiệm thu tự động

Xem hợp đồng đầy đủ tại [`backend/docs/POMODORO.md`](../backend/docs/POMODORO.md). Bộ kiểm tra mới gồm 8 test thời gian, 22 test API/PostgreSQL/PowerShell và 1 test nâng cấp V9 → V10. Test restart chung được mở rộng qua ba lần khởi động backend: PAUSED giữ thời gian, RUNNING giữ deadline và tiếp tục tính.

Các test dùng schema `backend_it_<UUID>` riêng và tự dọn, không seed tài khoản thật. Không thêm dependency hoặc thay frontend. **568 tests/Maven verify đạt (31 test mới), không lỗi/bỏ qua; TypeScript và 403 test frontend hồi quy đạt.** Đã kiểm tra API/PostgreSQL, PowerShell 5.1, đồng thời, nâng V9 → V10 và đóng/mở toàn backend ba lần; schema test riêng tự dọn, không seed tài khoản thật.

## Tên commit

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git add .
git commit -m "Lưu phiên Pomodoro và hỗ trợ tạm dừng, tiếp tục qua API"
git push origin main
```

Chưa tự commit/push.
