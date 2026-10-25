# 4H.1B.2 — Lịch học và tự học kiểm tra lịch thi

Đã hoàn thành chiều ngược: tạo/sửa chuỗi lịch học, đổi/khôi phục một buổi và tạo/sửa tự học đều kiểm tra lịch thi đã lưu của cùng tài khoản. Kết hợp 4H.1B.1, các API đã kiểm tra hai chiều; khác môn/học kỳ vẫn bị chặn nếu giao giờ, khác tài khoản không ảnh hưởng.

Đợt này không nối UI lịch thi (4H.2), không thêm migration/seed hoặc thay đổi dữ liệu cũ. Flyway vẫn V7. Màn lịch học và tự học đã dùng API; màn lịch thi vẫn là dữ liệu trong phiên, nên tạo kỳ thi thử bằng script trước.

## Chuẩn bị hai terminal

Terminal 1, tại thư mục backend, chạy lại backend để nạp code mới:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
./scripts/Run-Local.ps1
```

Giữ terminal này chạy. Nếu backend cũ còn chạy, Ctrl+C tại terminal cũ rồi khởi động lại. Terminal 2 cũng ở thư mục backend; các lệnh dưới đây dùng terminal 2 (VS Code hoặc IntelliJ đều được).

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
./scripts/Try-Courses.ps1 -Mode List
$courseId = 'UUID_MON_CUA_BAN'
```

Thay UUID bằng ID môn thật của tài khoản. Mỗi script hỏi email/mật khẩu; dùng cùng tài khoản và một môn/ngày thử riêng. Create/Update/Delete ghi PostgreSQL, nên ghi lại ID và version của những bản ghi thử để dọn sau. Chọn ngày khác nếu các ngày minh họa đã có dữ liệu; Weekdays theo ISO: thứ Hai 1, thứ Ba 2, thứ Tư 3, thứ Năm 4, đến Chủ nhật 7.

## 1. Có kỳ thi trước, thêm lịch học sau

Tạo kỳ thi **thứ Ba 17/11/2026, 08:00–10:00**:

```powershell
./scripts/Try-Exams.ps1 -Mode Create -CourseId $courseId -StartsAt '2026-11-17T08:00:00+07:00' -EndsAt '2026-11-17T10:00:00+07:00'
```

Thử lịch học **09:00–11:00**:

```powershell
./scripts/Try-ClassSchedules.ps1 -Mode Create -CourseId $courseId -Weekdays 2 -StartsOn '2026-11-17' -EndsOn '2026-11-17' -StartTime '09:00' -EndTime '11:00'
```

**Mong đợi:** 409 `SCHEDULE_TIME_CONFLICT`, thông báo “Trùng lịch thi” kèm tên môn, 17/11/2026 và 08:00–10:00. Không thêm chuỗi lịch học. Script in đỏ rồi kết thúc là kết quả đúng của lần thử; backend vẫn chạy.

Đổi sang **10:00–12:00**, nối sau kỳ thi:

```powershell
./scripts/Try-ClassSchedules.ps1 -Mode Create -CourseId $courseId -Weekdays 2 -StartsOn '2026-11-17' -EndsOn '2026-11-17' -StartTime '10:00' -EndTime '12:00'
```

**Mong đợi:** 201 tạo được. Ghi lại `data.id` và `data.version` của chuỗi này.

## 2. Sửa chuỗi bị chặn, dữ liệu vẫn giữ nguyên

GET chuỗi ở mục 1 lấy version mới nhất. Thay UUID và VERSION trong lệnh bằng kết quả thực, không tự cộng/đoán version:

```powershell
./scripts/Try-ClassSchedules.ps1 -Mode Get -ClassScheduleId 'UUID_CHUOI_10_DEN_12'
./scripts/Try-ClassSchedules.ps1 -Mode Update -ClassScheduleId 'UUID_CHUOI_10_DEN_12' -Version 'VERSION_MOI_NHAT' -CourseId $courseId -Weekdays 2 -StartsOn '2026-11-17' -EndsOn '2026-11-17' -StartTime '09:00' -EndTime '11:00' -Room 'Phong thu'
./scripts/Try-ClassSchedules.ps1 -Mode Get -ClassScheduleId 'UUID_CHUOI_10_DEN_12'
```

**Mong đợi:** PUT bị chặn vì kỳ thi; GET cuối vẫn 10:00–12:00, phòng và version cũ. Cả chuỗi được kiểm tra, kể cả buổi ở sau 92 ngày. Khi sửa chuỗi có ngoại lệ, ngày nghỉ vẫn bỏ qua và ngày đổi dùng giờ hiệu lực/kế thừa từ cấu hình mới.

## 3. Thêm/sửa tự học bị chặn

Vẫn ngày 17/11, thử tự học **09:00–09:45**:

```powershell
./scripts/Try-StudySessions.ps1 -Mode Create -CourseId $courseId -Title 'On thi thu' -StartsAt '2026-11-17T09:00:00+07:00' -DurationMinutes 45
```

**Mong đợi:** 409 “Trùng lịch thi”; không tạo buổi tự học.

Tạo tự học **12:00–13:00**, nối sau lịch học 10:00–12:00 ở mục 1:

```powershell
./scripts/Try-StudySessions.ps1 -Mode Create -CourseId $courseId -Title 'On thi thu' -StartsAt '2026-11-17T12:00:00+07:00' -DurationMinutes 60
```

Lấy ID/version buổi vừa tạo và thử sửa về 09:00:

```powershell
./scripts/Try-StudySessions.ps1 -Mode Get -StudySessionId 'UUID_BUOI_TU_HOC'
./scripts/Try-StudySessions.ps1 -Mode Update -StudySessionId 'UUID_BUOI_TU_HOC' -Version 'VERSION_MOI_NHAT' -CourseId $courseId -Title 'On thi thu' -StartsAt '2026-11-17T09:00:00+07:00' -DurationMinutes 45
./scripts/Try-StudySessions.ps1 -Mode Get -StudySessionId 'UUID_BUOI_TU_HOC'
```

**Mong đợi:** PUT bị chặn; GET cuối vẫn 12:00–13:00 và version cũ. Các status PLANNED/IN_PROGRESS/COMPLETED đều giữ quy tắc chiếm giờ. Lỗi quyền/version, liên kết bài tập, deadline hoặc trùng buổi tự học khác vẫn giữ mã và thứ tự kiểm tra trước như cũ.

## 4. Khôi phục buổi nghỉ bị chặn

Dùng ngày **thứ Tư 18/11/2026** còn trống. Tạo lớp 07:00–09:00 trước, rồi báo nghỉ đúng ngày:

```powershell
./scripts/Try-ClassSchedules.ps1 -Mode Create -CourseId $courseId -Weekdays 3 -StartsOn '2026-11-18' -EndsOn '2026-11-18' -StartTime '07:00' -EndTime '09:00'
./scripts/Try-ClassSchedules.ps1 -Mode Get -ClassScheduleId 'UUID_CHUOI_18_THANG_11'
./scripts/Try-ClassExceptions.ps1 -Mode Cancel -ClassScheduleId 'UUID_CHUOI_18_THANG_11' -Date '2026-11-18' -ScheduleVersion 'VERSION_MOI_NHAT' -Reason 'Thu nghi buoi'
```

Tạo kỳ thi vào khoảng đã được giải phóng:

```powershell
./scripts/Try-Exams.ps1 -Mode Create -CourseId $courseId -StartsAt '2026-11-18T08:00:00+07:00' -EndsAt '2026-11-18T10:00:00+07:00'
```

Kỳ thi tạo được vì lớp đang nghỉ ngày đó. Lấy version chuỗi mới nhất, rồi thử khôi phục:

```powershell
./scripts/Try-ClassSchedules.ps1 -Mode Get -ClassScheduleId 'UUID_CHUOI_18_THANG_11'
./scripts/Try-ClassExceptions.ps1 -Mode Restore -ClassScheduleId 'UUID_CHUOI_18_THANG_11' -Date '2026-11-18' -ScheduleVersion 'VERSION_MOI_NHAT'
./scripts/Try-ClassExceptions.ps1 -Mode Get -ClassScheduleId 'UUID_CHUOI_18_THANG_11' -Date '2026-11-18'
./scripts/Try-ClassSchedules.ps1 -Mode Get -ClassScheduleId 'UUID_CHUOI_18_THANG_11'
```

**Mong đợi:** Restore trả 409; ngoại lệ vẫn CANCELLED, giữ ID/lý do, version chuỗi không tăng. Không tự bỏ buổi nghỉ hoặc dời kỳ thi.

Muốn khôi phục được, xử lý kỳ thi cản trước. Với dữ liệu thử ở mục này, GET kỳ thi lấy version mới nhất, xóa kỳ thi đó rồi Restore lại bằng version chuỗi đã GET:

```powershell
./scripts/Try-Exams.ps1 -Mode Get -ExamId 'UUID_KY_THI_18_THANG_11'
./scripts/Try-Exams.ps1 -Mode Delete -ExamId 'UUID_KY_THI_18_THANG_11' -Version 'VERSION_KY_THI_MOI_NHAT'
./scripts/Try-ClassExceptions.ps1 -Mode Restore -ClassScheduleId 'UUID_CHUOI_18_THANG_11' -Date '2026-11-18' -ScheduleVersion 'VERSION_CHUOI_MOI_NHAT'
```

**Mong đợi:** Restore thành công, ngoại lệ bị xóa và version chuỗi tăng. Đợt này không làm tự động hóa xóa/dời dữ liệu thật; chọn thao tác phù hợp với lịch của mình.

## 5. Buổi đã đổi giờ cũng được bảo vệ

Dùng một ngày khác, ví dụ **thứ Năm 19/11**:

1. Tạo lớp gốc 07:00–09:00, Weekdays 4, chỉ ngày 19/11.
2. Dùng `Try-ClassExceptions.ps1 -Mode Change` đổi riêng ngày đó thành 12:00–14:00, với ScheduleVersion mới nhất.
3. Tạo kỳ thi 08:00–10:00 ngày 19/11: được phép vì lớp hiệu lực đang 12:00–14:00.
4. Thử Change buổi đó thành 09:00–11:00: bị chặn, vẫn giữ ngoại lệ 12:00–14:00 và version cũ.
5. Thử Restore về giờ gốc 07:00–09:00: cũng bị chặn, không mất ngoại lệ.

## Thử trên giao diện

Sau khi đã lưu kỳ thi bằng script, có thể đăng nhập app bằng cùng tài khoản và thử form lịch học/tự học đã nối API. Chọn đúng môn/kỳ/ngày ở các ví dụ trên. Lỗi từ server phải hiện rõ kỳ thi đang cản và giữ bản nháp. Màn **Lịch thi** hiện chưa tạo/sửa dữ liệu PostgreSQL; phần đó làm ở 4H.2.

Các lệnh Update là thay đầy đủ, nên khi sửa dữ liệu thật phải truyền lại những thông tin muốn giữ (phòng, giảng viên, ghi chú, link bài, status, cấu hình nhắc...). Nếu có lỗi mạng không rõ kết quả, GET trước khi quyết định gửi lại; không tự tăng version để vượt lỗi.

## Quy tắc và kiểm thử

- Cùng tài khoản, kể cả khác môn/kỳ. Trả một kỳ thi/buổi đã lưu đang cản, không lộ dữ liệu người khác.
- So Instant UTC theo `[start,end)`, cho phép chạm hai đầu, xét cả lệch ngày/múi giờ/DST.
- Bỏ chính chuỗi/tự học/lịch thi đang sửa. Lịch học áp dụng ngoại lệ trước; khôi phục kiểm tra giờ gốc trước khi xóa ngoại lệ. Báo nghỉ/xóa tiếp tục giải phóng giờ.
- Ghi và kiểm tra trong cùng transaction giữ khóa tài khoản; không thể cùng lưu thi và lớp/tự học vào một giờ dù hai request chạy đồng thời. Không dùng snapshot UI hoặc giới hạn 92 ngày để quyết định.
- Lỗi giữ toàn bộ dữ liệu: ID, nội dung, ngoại lệ, version/counter, timestamps và cấu hình nhắc. Dữ liệu trùng đã có vẫn đọc/xóa được, hoặc sửa sang giờ trống; không tự sửa hàng loạt.
- **31 kiểm thử tích hợp mới qua** trên PostgreSQL: các kiểu giao/chạm, chuỗi dài hơn 92 ngày, nghỉ/đổi/kế thừa, rollback toàn cột, quyền/version và ưu tiên lỗi cũ, UTC/DST/đường đổi ngày, dữ liệu cũ, ghi đồng thời cả hai chiều và Windows PowerShell 5.1 cho cả ba script (gồm Change/Restore), đóng đúng phiên thử khi có lỗi.
- Kết quả toàn bộ: **325 backend tests/Maven verify qua, không bỏ qua**; TypeScript và **140 test lịch frontend** hồi quy qua.
- Kiểm thử dùng schema ngẫu nhiên riêng và tự dọn, không seed schema ứng dụng. Source: `backend/src/test/java/com/focusstudy/ExamReverseConflictIntegrationTests.java`. Source nghiệp vụ chỉ mở rộng bộ kiểm tra chung, không thay endpoint hoặc migration.

Contract: [SCHEDULE-CONFLICTS.md](../backend/docs/SCHEDULE-CONFLICTS.md), [EXAMS.md](../backend/docs/EXAMS.md). Request HTTP: `backend/api/exam-reverse-conflicts.http`. Checklist: [UI-BACKLOG.md](UI-BACKLOG.md); tên commit/lệnh push: [GIT-COMMITS.md](GIT-COMMITS.md).
