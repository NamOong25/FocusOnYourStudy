# 4E.2B — Kiểm tra trùng lịch học và buổi tự học

Backend chặn trùng khi tạo/sửa chuỗi, đổi/khôi phục một buổi và tạo/sửa tự học. Dùng giờ hiệu lực sau ngoại lệ; buổi nghỉ không chiếm giờ. Hai buổi tiếp giáp được phép. Không thêm migration, không seed/xóa/sửa dữ liệu cũ.

## Chuẩn bị

Terminal PowerShell trong VS Code hoặc IntelliJ đều được:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Nếu backend cũ đang chạy, Ctrl+C rồi chạy lại để nạp guard mới. Giữ terminal đó; mở terminal thứ hai cùng thư mục backend để chạy các lệnh bên dưới. Không cần frontend để test API.

Dùng tài khoản test riêng hoặc chọn một ngày còn trống. Ví dụ dưới dùng **thứ Hai 16/11/2026**, một chuỗi chỉ có đúng ngày đó. Nếu đã có lịch, đổi tất cả ngày trong ví dụ sang cùng một thứ Hai trống. Mỗi lệnh hỏi lại email/mật khẩu nhập ẩn và chỉ đóng phiên riêng của script.

```powershell
.\scripts\Try-Courses.ps1 -Mode List
$courseId = 'DAN_UUID_MON_CUA_TAI_KHOAN_VAO_DAY'
.\scripts\Try-ClassSchedules.ps1 -Mode Create -CourseId $courseId `
  -Weekdays @(1) -StartsOn '2026-11-16' -EndsOn '2026-11-16' `
  -StartTime '07:00' -EndTime '09:00' -TimeZone 'Asia/Ho_Chi_Minh'
$classScheduleId = 'DAN_UUID_CHUOI_VUA_TAO_VAO_DAY'
```

Chuỗi mới có version 0. Các ví dụ version dưới đây giả sử chưa thao tác khác; với dữ liệu đã có phải dùng phiên bản mới nhất từ GET.

## Một vòng test

### 1. Lịch học trùng lịch học

```powershell
.\scripts\Try-ClassSchedules.ps1 -Mode Create -CourseId $courseId `
  -Weekdays @(1) -StartsOn '2026-11-16' -EndsOn '2026-11-16' `
  -StartTime '08:00' -EndTime '10:00'
```

Phải báo đỏ `SCHEDULE_TIME_CONFLICT` kèm tên môn/ngày 16/11 và 07:00–09:00. Đây là **đã kiểm tra đúng**, không phải lỗi kết nối. GET/List vẫn chỉ có chuỗi đầu, version 0. Khác môn/học kỳ cũng bị chặn nếu cùng tài khoản/cùng thời điểm.

### 2. Tự học trùng lịch; giờ nối tiếp hợp lệ

```powershell
.\scripts\Try-StudySessions.ps1 -Mode Create -CourseId $courseId `
  -Title 'Test trùng giờ' -StartsAt '2026-11-16T08:00:00+07:00' -DurationMinutes 45
.\scripts\Try-StudySessions.ps1 -Mode Create -CourseId $courseId `
  -Title 'Tự học sau giờ lên lớp' -StartsAt '2026-11-16T09:00:00+07:00' -DurationMinutes 45
$studyAfterId = 'DAN_UUID_BUOI_09_GIO_VUA_TAO'
```

08:00 bị chặn; 09:00 lưu được vì lớp kết thúc đúng 09:00. Nếu làm ngược thứ tự (tạo tự học trước rồi tạo/sửa lớp trùng), backend cũng chặn. Form Tự học đang nối API có thông báo cụ thể khi gặp lớp đã lưu trong backend; thời khóa biểu trên UI vẫn RAM đến 4F.

### 3. Báo nghỉ để giải phóng đúng buổi

```powershell
.\scripts\Try-ClassExceptions.ps1 -Mode Cancel -ClassScheduleId $classScheduleId `
  -Date '2026-11-16' -ScheduleVersion 0 -Reason 'Thử nghỉ một buổi'
.\scripts\Try-StudySessions.ps1 -Mode Create -CourseId $courseId `
  -Title 'Tự học khi lớp nghỉ' -StartsAt '2026-11-16T08:00:00+07:00' -DurationMinutes 45
$studyDuringId = 'DAN_UUID_BUOI_08_GIO_VUA_TAO'
```

Nghỉ thành công → version chuỗi 1; tự học 08:00 giờ lưu được. Với chuỗi nhiều tuần, chỉ ngày đã nghỉ được giải phóng, tuần khác vẫn bị kiểm tra.

### 4. Khôi phục gặp giờ đã có tự học

```powershell
.\scripts\Try-ClassExceptions.ps1 -Mode Restore -ClassScheduleId $classScheduleId `
  -Date '2026-11-16' -ScheduleVersion 1
.\scripts\Try-ClassExceptions.ps1 -Mode Get -ClassScheduleId $classScheduleId -Date '2026-11-16'
```

Phải báo trùng với “Tự học khi lớp nghỉ” 08:00–08:45. Ngoại lệ vẫn CANCELLED, version vẫn 1. Backend không tự xóa tự học hoặc khôi phục một phần.

Xóa **đúng buổi 08:00 vừa tạo để thử**, rồi khôi phục lại:

```powershell
.\scripts\Try-StudySessions.ps1 -Mode Delete -StudySessionId $studyDuringId -Version 0
.\scripts\Try-ClassExceptions.ps1 -Mode Restore -ClassScheduleId $classScheduleId `
  -Date '2026-11-16' -ScheduleVersion 1
```

Khôi phục được → version 2, lớp trở lại 07:00–09:00. Buổi tự học 09:00 vẫn còn và không trùng.

### 5. Đổi buổi dùng giờ mới

```powershell
.\scripts\Try-ClassExceptions.ps1 -Mode Change -ClassScheduleId $classScheduleId `
  -Date '2026-11-16' -ScheduleVersion 2 -StartTime '10:00' -EndTime '12:00'
.\scripts\Try-StudySessions.ps1 -Mode Create -CourseId $courseId `
  -Title 'Thử giờ mới của lớp' -StartsAt '2026-11-16T11:00:00+07:00' -DurationMinutes 45
.\scripts\Try-ClassSchedules.ps1 -Mode Occurrences -CourseId $courseId `
  -From '2026-11-16' -To '2026-11-16'
```

Đổi thành công → version 3; tự học 11:00 bị chặn. Occurrences hiển thị changed=true, 10:00–12:00. Giờ cũ đã trống; khi sửa/khôi phục về giờ cũ sau này vẫn phải kiểm tra lại.

### 6. Dọn dữ liệu thử nếu muốn

Chỉ dùng UUID của hai bản ghi vừa tạo ở trên. GET trước, lấy version hiện tại nếu đã sửa thêm:

```powershell
.\scripts\Try-StudySessions.ps1 -Mode Delete -StudySessionId $studyAfterId -Version 0
.\scripts\Try-ClassSchedules.ps1 -Mode Delete -ClassScheduleId $classScheduleId -Version 3
```

Xóa chuỗi đồng thời xóa ngoại lệ của chính chuỗi đó, không xóa môn hoặc dữ liệu khác. Không cần tạo lại database.

## Các điểm cần nhớ

- Khi báo lỗi trùng, các giá trị/version cũ giữ nguyên; điều chỉnh trước khi lưu lại, không tự gửi lại thao tác ghi.
- Lỗi bản cũ vẫn là `CLASS_SCHEDULE_VERSION_CONFLICT`/`STUDY_SESSION_VERSION_CONFLICT`; không đổi sang lỗi trùng.
- Khác múi giờ có thể khác ngày nhưng vẫn trùng UTC. Các quy tắc giờ đến phút/cùng ngày/DST vẫn giữ như 4E.1/4C.
- Hai cửa sổ cùng ghi một giờ trống: chỉ một thao tác được lưu, thao tác sau báo trùng (hoặc version cũ nếu cùng sửa một chuỗi).
- Dữ liệu trùng đã lưu từ trước vẫn đọc được; không tự sửa. Báo nghỉ, đổi sang giờ trống hoặc xóa đúng bản ghi thử để giải quyết.

Contract: `backend/docs/SCHEDULE-CONFLICTS.md`; ví dụ HTTP cho IntelliJ: `backend/api/schedule-conflicts.http`. Kiểm thử tự động dùng schema PostgreSQL riêng, không tạo dữ liệu mẫu trong tài khoản của bạn.

## Nghiệm thu ngày 24/10/2026

**238 tests/Maven verify qua, không lỗi hoặc bỏ qua**, gồm 30 test mới. Kiểm tra trùng mọi chiều ghi, giờ nối tiếp/bao nhau, ngoại lệ nghỉ/đổi/kế thừa/khôi phục, version/rollback, dữ liệu cũ, tách tài khoản, DST/khác ngày địa phương, chuỗi cả năm, ghi đồng thời và lỗi trên ba script Windows PowerShell 5.1. Hồi quy các đợt trước có migration và restart toàn backend. Các fixture cũ từng tạo hai lớp trùng giờ để test lọc/múi giờ/sở hữu đã đổi sang giờ nối tiếp; mục đích kiểm tra cũ giữ nguyên.

`npm run typecheck` và 6 tình huống smoke HTTP client qua, xác nhận thông báo riêng cho lỗi 409 đã biết và fallback cho detail thiếu/sai/quá dài hoặc lỗi khác. Không thay layout/điều hướng và chưa nghiệm thu UI thời khóa biểu/native. Chạy lại backend bằng `.\scripts\Test-Local.ps1` để kiểm thử toàn bộ trên schema riêng.

Tên commit: **Bổ sung kiểm tra trùng giờ lịch học và buổi tự học**. Bước tiếp theo theo lộ trình: 4F nối UI thời khóa biểu với API; lịch thi theo đợt riêng.
