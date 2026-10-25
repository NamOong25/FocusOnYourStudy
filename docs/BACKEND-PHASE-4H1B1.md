# 4H.1B.1 — Chặn lịch thi trùng với lịch đã lưu

Đã làm **chiều thêm/sửa lịch thi**: backend kiểm tra kỳ thi khác, lịch học sau khi áp dụng nghỉ/đổi buổi và tự học của cùng tài khoản. Khác môn/học kỳ vẫn kiểm tra; dữ liệu người khác không ảnh hưởng. Đây là backend, **màn Lịch thi chưa nối API** đến 4H.2, nên thử bằng terminal hoặc request HTTP.

4H.1B.2 sẽ bổ sung chiều ngược: tạo/sửa lịch học, đổi/khôi phục buổi hoặc ghi tự học sau khi đã có lịch thi. Checklist 4H.1B tổng vẫn để chưa hoàn thành.

## Chuẩn bị

1. Mở terminal tại `D:\Video OBS\QuanLyHocTap\backend`, chạy `./scripts/Run-Local.ps1` và giữ terminal đó. Nếu backend cũ đang chạy, dừng bằng Ctrl+C rồi chạy lại để dùng code mới.
2. Mở terminal thứ hai cùng thư mục (VS Code hoặc IntelliJ đều được). Đã có tài khoản, học kỳ và một môn thử; lấy ID môn bằng `./scripts/Try-Courses.ps1 -Mode List`.
3. Trong các lệnh sau thay `UUID_MON_CUA_BAN` bằng ID thực. Mỗi script hỏi email/mật khẩu; dùng cùng tài khoản. Ngày 10/11/2026 là thứ Ba (Weekdays 2).

```powershell
$courseId = 'UUID_MON_CUA_BAN'
```

Các thao tác Create/Update/Delete dưới đây ghi PostgreSQL của tài khoản. Chọn môn/ngày thử riêng để dễ xóa sau; nếu ngày đã có dữ liệu, xem thông báo để chọn khoảng trống khác. Không cần tạo lại DB, import SQL hay thêm migration: vẫn V7.

## 1. Lịch học cản lịch thi

Tạo lịch học **07:00–09:00** chỉ ngày 10/11:

```powershell
./scripts/Try-ClassSchedules.ps1 -Mode Create -CourseId $courseId -Weekdays 2 -StartsOn '2026-11-10' -EndsOn '2026-11-10' -StartTime '07:00' -EndTime '09:00'
```

Ghi lại `data.id` của chuỗi lịch học. Thử tạo kỳ thi **08:00–10:00**:

```powershell
./scripts/Try-Exams.ps1 -Mode Create -CourseId $courseId -StartsAt '2026-11-10T08:00:00+07:00' -EndsAt '2026-11-10T10:00:00+07:00'
```

**Mong đợi:** 409 `SCHEDULE_TIME_CONFLICT`, thông báo “Trùng lịch học” kèm môn/ngày/07:00–09:00; không thêm kỳ thi. Script in lỗi đỏ và kết thúc là đúng kết quả thử, backend tiếp tục chạy.

Thử kỳ thi **09:00–10:00**, nối ngay sau buổi học:

```powershell
./scripts/Try-Exams.ps1 -Mode Create -CourseId $courseId -StartsAt '2026-11-10T09:00:00+07:00' -EndsAt '2026-11-10T10:00:00+07:00'
```

**Mong đợi:** tạo thành công, ghi lại `data.id` và `data.version` của kỳ thi.

## 2. Kỳ thi cản kỳ thi khác

Với kỳ thi 09:00–10:00 vừa tạo, thử thêm 09:30–10:30 cùng ngày. Mong đợi “Trùng lịch thi”, 409 và không thêm bản ghi.

```powershell
./scripts/Try-Exams.ps1 -Mode Create -CourseId $courseId -StartsAt '2026-11-10T09:30:00+07:00' -EndsAt '2026-11-10T10:30:00+07:00'
./scripts/Try-Exams.ps1 -Mode List
```

Đổi sang môn khác của **cùng tài khoản** vẫn bị chặn nếu trùng giờ. Với tài khoản khác và môn của họ, cùng giờ vẫn được phép, không lộ lịch tài khoản đầu.

## 3. Sửa thất bại giữ nguyên dữ liệu

Lấy bản mới nhất rồi thử đổi kỳ thi 09:00–10:00 sang 08:00–10:00 (trùng lịch học). Thay UUID/VERSION bằng kết quả GET, không tự đoán/cộng phiên bản:

```powershell
./scripts/Try-Exams.ps1 -Mode Get -ExamId 'UUID_KY_THI'
./scripts/Try-Exams.ps1 -Mode Update -ExamId 'UUID_KY_THI' -Version 'VERSION_MOI_NHAT' -CourseId $courseId -StartsAt '2026-11-10T08:00:00+07:00' -EndsAt '2026-11-10T10:00:00+07:00' -Room 'Phong thu'
./scripts/Try-Exams.ps1 -Mode Get -ExamId 'UUID_KY_THI'
```

**Mong đợi:** PUT bị chặn; GET cuối vẫn 09:00–10:00, phòng và version cũ. Update là thay đầy đủ, nên khi thử sửa thành công trên dữ liệu thật phải truyền lại loại/hình thức, phòng, ghi chú, cấu hình nhắc muốn giữ (xem [4H.1A](BACKEND-PHASE-4H1A.md)).

## 4. Buổi nghỉ hoặc đổi giờ

Dùng chuỗi 07:00–09:00 ở mục 1. GET chuỗi lấy version mới nhất rồi báo nghỉ đúng ngày:

```powershell
./scripts/Try-ClassSchedules.ps1 -Mode Get -ClassScheduleId 'UUID_CHUOI'
./scripts/Try-ClassExceptions.ps1 -Mode Cancel -ClassScheduleId 'UUID_CHUOI' -Date '2026-11-10' -ScheduleVersion 'VERSION_MOI_NHAT' -Reason 'Thu nghi buoi'
./scripts/Try-Exams.ps1 -Mode Create -CourseId $courseId -StartsAt '2026-11-10T07:00:00+07:00' -EndsAt '2026-11-10T09:00:00+07:00'
```

**Mong đợi:** kỳ thi 07:00–09:00 tạo được, chạm kỳ thi 09:00–10:00 đã có. Chỉ buổi nghỉ đúng ngày được bỏ qua, các ngày còn lại vẫn chiếm giờ.

Để thử **đổi giờ**, dùng bộ dữ liệu khác chưa có kỳ thi: tạo buổi 07:00–09:00, đổi riêng ngày đó thành 12:00–14:00 bằng `Try-ClassExceptions.ps1 -Mode Change` với `-StartTime '12:00' -EndTime '14:00'`. Sau đó thi 08:00–10:00 tạo được, thi 12:30–13:30 bị chặn. Đổi phòng riêng lẻ vẫn giữ nguyên khoảng giờ.

**Khôi phục buổi sau khi có kỳ thi** thuộc kiểm tra chiều ngược 4H.1B.2, chưa dùng làm tiêu chí nghiệm thu đợt này.

## 5. Buổi tự học cản kỳ thi

Chọn ngày 11/11 chưa có dữ liệu thử. Tạo buổi 19:00–19:45 trước, rồi tạo thi 19:15–20:00:

```powershell
./scripts/Try-StudySessions.ps1 -Mode Create -CourseId $courseId -Title 'On thi thu' -StartsAt '2026-11-11T19:00:00+07:00' -DurationMinutes 45
./scripts/Try-Exams.ps1 -Mode Create -CourseId $courseId -StartsAt '2026-11-11T19:15:00+07:00' -EndsAt '2026-11-11T20:00:00+07:00'
```

**Mong đợi:** 409 “Trùng buổi tự học” kèm tên/môn/ngày/giờ; đổi giờ bắt đầu thi thành 19:45 thì tạo được. Các trạng thái tự học đều chiếm khoảng giờ, nhất quán với guard lịch học/tự học đã có.

## Chi tiết kỹ thuật và kiểm thử

- Giao khoảng `[start,end)` bằng UTC; không nhầm cùng giờ hiển thị ở hai múi giờ, DST lặp giờ hoặc lệch ngày qua đường đổi ngày.
- POST/PUT lịch thi chạy kiểm tra và ghi trong cùng transaction có khóa tài khoản; PUT kiểm tra quyền/version trước và loại chính nó ra. Không tự retry sau 409 hoặc lỗi mạng không rõ kết quả; GET để đối chiếu trước.
- Lỗi dùng contract chung `SCHEDULE_TIME_CONFLICT` với `conflict.kind` EXAM/CLASS/STUDY, ID buổi đã lưu, môn, ngày/giờ/zone và instants UTC. Tập so sánh toàn tài khoản, không lọc theo môn/học kỳ đang xem.
- Không thêm migration, seed hoặc job thông báo. Lịch thi cũ đang trùng vẫn đọc/xóa được, có thể sửa sang giờ trống; không bị tự động xóa/dời.
- 26 kiểm thử tích hợp mới đã qua trên PostgreSQL: các kiểu giao/chạm, nghỉ/đổi/kế thừa giờ, UTC/DST/đường đổi ngày, dữ liệu khác chủ, thứ tự lỗi, rollback toàn bộ cột, dữ liệu cũ, ghi đồng thời và script Windows PowerShell 5.1 (kể cả đóng đúng phiên thử khi có lỗi).
- Kết quả toàn bộ: **294 backend tests/Maven verify qua, không bỏ qua**; TypeScript và **140 test lịch frontend** hồi quy qua.
- Bộ kiểm thử dùng schema ngẫu nhiên riêng và tự dọn; không thêm dữ liệu mẫu vào schema ứng dụng. Xem `backend/src/test/java/com/focusstudy/ExamConflictIntegrationTests.java`.

Contract: [EXAMS.md](../backend/docs/EXAMS.md), [SCHEDULE-CONFLICTS.md](../backend/docs/SCHEDULE-CONFLICTS.md). Request IntelliJ: `backend/api/exam-conflicts.http`. Tên commit và lệnh push ở [GIT-COMMITS.md](GIT-COMMITS.md).
