# 4E.1 — API lịch học lặp theo môn

## Đã làm

V5 tạo bảng `class_schedules`. API tải/tạo/sửa/xóa cả chuỗi theo tài khoản; lọc môn/kỳ/khoảng ngày, đọc các buổi phát sinh theo thứ. Chuỗi có khoảng ngày, giờ địa phương, múi giờ, phòng/giảng viên, ghi chú và mốc nhắc được lưu. Mọi sửa/xóa cần version; môn còn chuỗi không xóa/chuyển kỳ được. Học kỳ/môn/bài/tự học/phiên cũ được giữ nguyên, không seed vào tài khoản của bạn.

**Ví dụ:** thứ Hai và thứ Tư, 07:00–09:00, từ 26/10/2026 đến 08/11/2026 → 4 buổi: 26/10, 28/10, 02/11 và 04/11. DB lưu một chuỗi; API occurrences tính các buổi khi đọc.

Chỉ backend trong đợt này. **Thời khóa biểu trên giao diện chưa nối API**; sau khi tạo bằng terminal, xem kết quả bằng List/Get/Occurrences. Ngoại lệ/nghỉ/đổi riêng một buổi và kiểm tra trùng giờ để 4E.2; UI nối 4F. Hiện hai chuỗi trùng giờ vẫn được lưu.

## Khởi động

Terminal PowerShell trong VS Code hoặc IntelliJ đều được:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Nếu bản backend trước đang chạy, Ctrl+C ở terminal đó rồi chạy lại. Flyway tự thêm V5, không xóa/tạo lại database. Giữ terminal này chạy. Terminal thứ hai cũng mở tại thư mục `backend` để gọi API; **không cần frontend để test đợt 4E.1**.

Kiểm tra backend:

```powershell
Invoke-RestMethod 'http://localhost:8080/api/v1/health' | ConvertTo-Json -Depth 5
```

Kết quả mong đợi: status và database đều UP. Nếu dùng nút Run của IntelliJ, tiếp tục dùng cấu hình Java 21/biến DB/khóa JWT đã thiết lập trước; scripts API vẫn chạy trong terminal IntelliJ.

## Một vòng kiểm tra

Mỗi lần chạy script sẽ hỏi email/mật khẩu nhập ẩn, tạo một phiên riêng rồi đăng xuất **chỉ phiên script** khi xong. Không đóng phiên đăng nhập app. Script không in token hoặc mật khẩu.

1. Lấy UUID môn đã tạo trên tài khoản của bạn:

```powershell
.\scripts\Try-Courses.ps1 -Mode List
```

2. Điền UUID thật thay chuỗi minh họa, rồi tạo chuỗi:

```powershell
$courseId = 'DAN_UUID_MON_VAO_DAY'
.\scripts\Try-ClassSchedules.ps1 -Mode Create -CourseId $courseId `
  -Weekdays @(1,3) -StartsOn '2026-10-26' -EndsOn '2026-11-08' `
  -StartTime '07:00' -EndTime '09:00' -Room 'A1.01' -Teacher 'Giảng viên'
```

`1 = thứ Hai, 2 = thứ Ba, …, 7 = Chủ nhật`, không có thứ 0. Kết quả có UUID `id`, version ban đầu 0 và thông tin vừa lưu.

3. Xem danh sách và các buổi trong tuần:

```powershell
.\scripts\Try-ClassSchedules.ps1 -Mode List
.\scripts\Try-ClassSchedules.ps1 -Mode Occurrences -From '2026-10-26' -To '2026-11-01' -CourseId $courseId
```

Có 2 buổi trong tuần: 26/10 và 28/10. Giờ hiển thị trong phản hồi là startTime 07:00/endTime 09:00; startsAt UTC là 00:00Z/02:00Z. Cả khoảng 26/10–08/11 có 4 buổi. List trả chuỗi; Occurrences trả từng buổi phát sinh.

4. Điền ID vừa tạo để đọc và sửa **cả chuỗi**:

```powershell
$classScheduleId = 'DAN_UUID_LICH_VAO_DAY'
.\scripts\Try-ClassSchedules.ps1 -Mode Get -ClassScheduleId $classScheduleId
.\scripts\Try-ClassSchedules.ps1 -Mode Update -ClassScheduleId $classScheduleId -Version 0 `
  -CourseId $courseId -Weekdays @(1,3) -StartsOn '2026-10-26' -EndsOn '2026-11-08' `
  -StartTime '07:30' -EndTime '09:30' -Room 'B2.03' -Teacher 'Giảng viên'
```

Đọc version từ kết quả; thường thành 1 nếu nội dung đổi. Update thay toàn bộ, nên luôn truyền đầy đủ giờ/ngày/thứ/môn; các trường tùy chọn bỏ qua có thể về mặc định. Chạy lại Occurrences để thấy tất cả buổi đổi sang 07:30–09:30/phòng B2.03.

5. Chạy lại Update với version 0 cũ: phải báo `CLASS_SCHEDULE_VERSION_CONFLICT`, không ghi đè bản đã sửa. Get bản mới trước khi sửa tiếp.
6. Ctrl+C backend → chạy lại Run-Local.ps1 → List/Get: chuỗi vẫn còn, cùng UUID và phiên bản. Không tạo lại chuỗi để thử bước này.
7. Đăng nhập bằng tài khoản B khi script hỏi: List không có lịch A; Get ID của A báo `CLASS_SCHEDULE_NOT_FOUND`. Dùng đúng email A cho các bước sửa/xóa sau.
8. Thử xóa/chuyển học kỳ môn đang có lịch: API môn báo `COURSE_HAS_CLASS_SCHEDULES` nếu không có liên kết khác được ưu tiên trước. Sau khi xử lý chuỗi, môn mới được xóa/chuyển.
9. Xóa cả chuỗi bằng version mới nhất, ví dụ 1:

```powershell
.\scripts\Try-ClassSchedules.ps1 -Mode Delete -ClassScheduleId $classScheduleId -Version 1
.\scripts\Try-ClassSchedules.ps1 -Mode List
.\scripts\Try-ClassSchedules.ps1 -Mode Occurrences -From '2026-10-26' -To '2026-11-08'
```

Chuỗi đó và các buổi phát sinh biến mất; môn, bài tập và tự học vẫn còn. Nếu script báo version cũ, Get rồi xem lại bản mới trước khi chủ động xóa.

## Các trường hợp lỗi nên thử

- Weekdays `[1,1]`, `[0]`, danh sách rỗng; ngày không có thứ tương ứng trong khoảng → không tạo lịch.
- Ngày 30/02, khoảng đảo ngược hoặc dài hơn 366 ngày; kết thúc trước/bằng bắt đầu; 24:00 hoặc giờ có giây → 400.
- Tên múi giờ không có; giờ DST không tồn tại hoặc xuất hiện hai lần ở một buổi trong chuỗi → 400, chỉ rõ field/ngày.
- Occurrences thiếu ngày hoặc dài hơn 92 ngày → 400. Với một ngày hợp lệ không có ca học, kết quả rỗng là bình thường.
- Lỗi mạng lúc ghi: không tự tạo lại ngay. Kiểm tra List/Get sau khi kết nối lại vì server có thể đã lưu dù chưa nhận phản hồi.

`reminderMinutes` chỉ là cấu hình đã lưu, chưa phát thông báo. Không kiểm tra trùng giờ trong đợt này; sẽ kiểm tra hai chiều với tự học ở 4E.2. Giao diện lịch/thi vẫn RAM, các phần học kỳ/môn/bài/tự học đã nối từ những đợt trước.

## Mã nguồn và kiểm thử

Kết quả ngày 24/10/2026: **182 tests/Maven verify qua, không lỗi hoặc bỏ qua**, gồm **27 test mới** (26 API + 1 migration). Đã kiểm tra đóng/mở toàn backend, giá trị DATE/TIME thực trong SQL dưới ba múi giờ JVM và script Windows PowerShell 5.1 đủ 6 chế độ. TypeScript, 29 nhóm unit API môn và 37 nhóm unit API tự học cũng qua. Không coi đây là nghiệm thu UI thời khóa biểu hoặc thiết bị thật.

Các test bảo vệ route cũ đã được cập nhật vì class-schedules nay được mở cho người đã xác thực; endpoint lịch thi chưa triển khai vẫn bị chặn. Test migration V3 → V4 được ghim target 4 để kiểm tra đúng bước cũ; test V4 → V5 mới kiểm tra nâng cấp hiện tại. V1–V4 không bị sửa.

- Contract: `backend/docs/CLASS-SCHEDULES.md`; mẫu HTTP: `backend/api/class-schedules.http`.
- `ClassScheduleIntegrationTests`: API/ownership, ngày/giờ/DST, expansion, version, guard môn, database constraints, ghi đồng thời và script Windows PowerShell 5.1.
- `ClassScheduleMigrationTests`: nâng V4 → V5 giữ dữ liệu cũ, không seed, migration chỉ chạy một lần.
- `SessionRestartTests`: lịch và occurrences giữ qua đóng/mở toàn backend cùng các dữ liệu trước.
- Chạy `.\scripts\Test-Local.ps1` để kiểm tra toàn bộ backend bằng PostgreSQL/schema kiểm thử riêng. Không dùng app của bạn để tự tạo tài khoản QA hàng loạt.

Tên commit: **Triển khai API quản lý lịch học lặp theo môn**. Lệnh trong `docs/GIT-COMMITS.md`; Codex không tự commit/push.
