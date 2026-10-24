# 4E.2A — Nghỉ, đổi và khôi phục từng buổi

Ví dụ chuỗi Java học thứ Hai/thứ Tư hằng tuần. Riêng thứ Hai 26/10 nghỉ, hoặc đổi 07:00–09:00 thành 10:00–12:00/phòng B2. Các buổi thứ Tư và tuần sau giữ nguyên. Đợt này làm API/database; thời khóa biểu trên UI vẫn RAM, nối ở 4F. Kiểm tra trùng giờ làm ở 4E.2B.

## Chạy và chuẩn bị

Terminal backend, PowerShell trong VS Code/IntelliJ đều được:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Nếu backend cũ đang chạy, Ctrl+C rồi chạy lại. Flyway tự áp dụng V6; không xóa/tạo lại database. Giữ terminal này, mở terminal thứ hai cùng thư mục backend để thử API. Không cần chạy frontend để kiểm tra đợt này.

Lấy UUID môn cùng tài khoản, tạo một chuỗi thử riêng:

```powershell
.\scripts\Try-Courses.ps1 -Mode List
$courseId = 'DAN_UUID_MON_VAO_DAY'
.\scripts\Try-ClassSchedules.ps1 -Mode Create -CourseId $courseId `
  -Weekdays @(1,3) -StartsOn '2026-10-26' -EndsOn '2026-11-08' `
  -StartTime '07:00' -EndTime '09:00' -Room 'A1.01' -Teacher 'Giảng viên gốc'
$classScheduleId = 'DAN_UUID_CHUOI_VUA_TAO_VAO_DAY'
```

Tài khoản đã có chuỗi phù hợp thì dùng chuỗi đó, nhưng phải lấy version mới nhất. Các ví dụ version 0/1/2 dưới đây giả sử **chuỗi vừa tạo**, chưa thao tác khác.

Mỗi lệnh script hỏi email/mật khẩu nhập ẩn, dùng một phiên riêng và đăng xuất chỉ phiên đó khi xong. Không in token hoặc đóng phiên đang dùng trong app.

## Một vòng test

1. Đọc chuỗi và xem các ngoại lệ ban đầu:

```powershell
.\scripts\Try-ClassSchedules.ps1 -Mode Get -ClassScheduleId $classScheduleId
.\scripts\Try-ClassExceptions.ps1 -Mode List -ClassScheduleId $classScheduleId
```

Chuỗi mới có version 0, danh sách ngoại lệ rỗng.

2. Báo nghỉ riêng ngày 26/10:

```powershell
.\scripts\Try-ClassExceptions.ps1 -Mode Cancel -ClassScheduleId $classScheduleId `
  -Date '2026-10-26' -ScheduleVersion 0 -Reason 'Giảng viên báo nghỉ'
.\scripts\Try-ClassSchedules.ps1 -Mode Occurrences -CourseId $courseId `
  -From '2026-10-26' -To '2026-11-08'
```

Chỉ 26/10 có cancelled=true; 28/10, 02/11 và 04/11 vẫn bình thường. Buổi nghỉ vẫn hiện một dòng để sau này hiển thị/khôi phục; không có nghĩa là vẫn đi học. Kết quả ngoại lệ có scheduleVersion mới, thường là 1.

3. Đổi buổi nghỉ đó thành buổi học 10:00–12:00 ở B2.03:

```powershell
.\scripts\Try-ClassExceptions.ps1 -Mode Change -ClassScheduleId $classScheduleId `
  -Date '2026-10-26' -ScheduleVersion 1 -StartTime '10:00' -EndTime '12:00' `
  -Room 'B2.03' -Teacher 'Giảng viên thay thế' -Reason 'Học bù trong ngày'
.\scripts\Try-ClassExceptions.ps1 -Mode Get -ClassScheduleId $classScheduleId -Date '2026-10-26'
```

Occurrence ngày đó có changed=true, cancelled=false; startsAt UTC là 03:00Z, endsAt 05:00Z. Các ngày khác vẫn 07:00–09:00/A1.01. Parent version thường thành 2.

4. Thử lại lệnh Change/Cancel với ScheduleVersion 1 cũ: phải báo `CLASS_SCHEDULE_VERSION_CONFLICT`, không ghi đè. Đọc Get chuỗi/ngoại lệ để xem lại và lấy phiên bản hiện tại trước khi sửa tiếp.
5. Ctrl+C backend, chạy lại Run-Local.ps1 rồi List/Get/Occurrences: ngoại lệ vẫn còn. Không tạo lại chuỗi để thử bước này.
6. Khôi phục riêng ngày 26/10:

```powershell
.\scripts\Try-ClassExceptions.ps1 -Mode Restore -ClassScheduleId $classScheduleId `
  -Date '2026-10-26' -ScheduleVersion 2
.\scripts\Try-ClassSchedules.ps1 -Mode Get -ClassScheduleId $classScheduleId
.\scripts\Try-ClassSchedules.ps1 -Mode Occurrences -CourseId $courseId `
  -From '2026-10-26' -To '2026-11-08'
```

Ngày đó trở về 07:00–09:00/A1.01 theo chuỗi hiện tại; cancelled/changed=false, exceptionId=null. Version chuỗi tăng, thường thành 3. Get ngoại lệ ngày đó báo không còn ngoại lệ là đúng; chuỗi vẫn còn.

## Các test nên thử thêm

- **Đổi phòng thôi:** Change với `-Room 'C3.01'`, bỏ StartTime/EndTime/Teacher → kế thừa các trường đó từ chuỗi. `-Teacher ''` chủ động để trống giảng viên. PUT thay toàn bộ ngoại lệ, nên bỏ tham số sẽ xóa ghi đè cũ của trường đó.
- **Hai cửa sổ:** cùng đọc version mới; cửa sổ A lưu trước, B dùng version cũ bị chặn, kể cả B sửa ngày khác. Không tự lấy version mới rồi ghi lại nếu chưa xem thay đổi của A.
- **Không phải ngày học:** 27/10 là thứ Ba, không thuộc chuỗi ví dụ → `CLASS_OCCURRENCE_NOT_FOUND`. Không dùng ngoại lệ để thêm một buổi ngoài lịch.
- **Giờ sai sau kế thừa:** chỉ đổi bắt đầu 10:00 nhưng giữ kết thúc gốc 09:00 → lỗi. Cần đặt lại cả giờ kết thúc phù hợp.
- **Sửa cả chuỗi:** khi 26/10 đang nghỉ/đổi, thử bỏ thứ Hai hoặc dời ngày bắt đầu sang 28/10 → báo `CLASS_SCHEDULE_HAS_EXCEPTIONS`. Khôi phục 26/10 trước khi bỏ ngày đó khỏi chuỗi. Chuyển môn khi còn ngoại lệ cũng bị chặn.
- **Kế thừa:** trường không ghi đè sẽ theo chuỗi khi sửa cả chuỗi. Trường đã đặt riêng giữ nguyên nếu còn hợp lệ; thay đổi chuỗi khiến giờ buổi đổi sai sẽ rollback.
- **Hai tài khoản:** tài khoản B không xem/sửa/khôi phục được ngoại lệ A dù biết UUID chuỗi.
- **Xóa cả chuỗi:** dùng version mới nhất; ngoại lệ của chính chuỗi bị xóa cùng. Môn/bài/tự học và ngoại lệ chuỗi khác vẫn còn.

**ScheduleVersion dùng chung cho cả chuỗi**, không phải version riêng của từng ngoại lệ. GET chuỗi gọi trường này là `version`; GET ngoại lệ/Occurrences gọi là `scheduleVersion`. Đọc kết quả server, không tự cộng hoặc cố định số phiên bản khi test trên dữ liệu đã có.

## Nghiệm thu và phần sau

Ngày 24/10/2026: **208 tests/Maven verify qua, không lỗi hoặc bỏ qua**, gồm **26 test mới** (25 API + 1 migration). Đã chạy script bằng Windows PowerShell 5.1, kiểm tra khôi phục/tạo lại cùng ngày, ghi đồng thời, snapshot đọc, và đóng/mở toàn backend ba lần. Các schema kiểm thử được tạo riêng và dọn sau mỗi lớp test; không seed vào tài khoản của bạn. Frontend không đổi trong đợt này, chưa nghiệm thu UI/native.

Test tích hợp dùng PostgreSQL/schema riêng, bao gồm giữ nguyên tuần khác, cancel/change/restore, quyền truy cập, phiên bản và khôi phục/tạo lại cùng ngày, snapshot khi đọc song song với ghi, ghi đồng thời, cascade đúng chuỗi và script PowerShell 5.1. Test migration nâng V5 → V6 giữ dữ liệu và version cũ, không seed. Test restart giữ ngoại lệ và trạng thái đã khôi phục qua đóng/mở toàn backend.

Chạy toàn bộ bằng `.\scripts\Test-Local.ps1`. Contract ở `backend/docs/CLASS-EXCEPTIONS.md`, mẫu HTTP ở `backend/api/class-exceptions.http`.

4E.2B tiếp theo kiểm tra trùng lịch–lịch/tự học, bỏ buổi nghỉ khi xét giờ bận và kiểm tra cả chiều sửa tự học. 4F mới nối UI; chưa phát thông báo hệ điều hành hoặc nghiệm thu máy thật.

Tên commit: **Bổ sung API nghỉ đổi và khôi phục từng buổi học**; lệnh trong `docs/GIT-COMMITS.md`. Không tự commit/push.
