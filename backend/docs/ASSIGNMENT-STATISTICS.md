# Thống kê bài tập — 7A.1

`GET /api/v1/assignment-statistics?semesterId=<UUID>[&courseId=<UUID>][&timeZone=<IANA>]`

Bearer token bắt buộc. Hợp đồng trả `ApiResponse { data, meta }`, `Cache-Control: no-store`. Không nhận owner từ client; subject JWT quyết định dữ liệu. Chỉ đọc, không tạo row/cấu hình, không cập nhật trạng thái hoặc version của bài.

## Phạm vi

| Tham số | Quy tắc |
| --- | --- |
| `semesterId` | Bắt buộc, học kỳ thuộc tài khoản; không tự chọn kỳ CURRENT hoặc tất cả học kỳ. |
| `courseId` | Tùy chọn, môn thuộc tài khoản. Giao hai điều kiện môn/kỳ; môn thuộc kỳ khác của chính bạn trả 0 giống GET assignments. |
| `timeZone` | Tùy chọn; bỏ qua thì lấy IANA zone từ hồ sơ. Chấp nhận `Asia/Ho_Chi_Minh`, `UTC`, `America/New_York`…; không chấp nhận offset `+07:00`, zone rỗng/không tồn tại. |

Không có lọc ngày giả định hoặc trạng thái: phần trăm cần mẫu số là toàn bộ bài đang có trong phạm vi kỳ/môn. `asOf` lấy từ một lần đọc Clock của server, cắt tới microsecond khớp độ chính xác PostgreSQL; không dùng đồng hồ trình duyệt. `date` là ngày địa phương của `asOf` trong zone được chọn. UTC JVM không làm đổi quy tắc này.

Đây là thống kê **trạng thái hiện tại**, không phải lịch sử trạng thái trong tuần/tháng. Bài được chuyển sang môn khác sẽ thuộc kỳ hiện tại của môn mới; bài bị xóa không còn trong thống kê. Không suy ra ngày hoàn thành/hoàn thành đúng hạn vì model bài tập hiện chưa lưu các sự kiện đó. Không tính checklist, tài liệu, buổi tự học hoặc Pomodoro thành bài tập.

## Các trường `data`

| Trường | Ý nghĩa |
| --- | --- |
| `semesterId`, `courseId` | Phạm vi đã chọn, courseId = null nếu cả kỳ. |
| `asOf`, `date`, `timeZone` | Thời điểm tham chiếu UTC, ngày địa phương và zone. |
| `dueSoonThrough` | Mốc trên của sắp hạn, bao gồm chính thời điểm này. |
| `totalAssignments` | Tất cả bài trong phạm vi. |
| `todoAssignments`, `inProgressAssignments`, `completedAssignments` | Số bài TODO, IN_PROGRESS, COMPLETED. |
| `pendingAssignments` | TODO + IN_PROGRESS. |
| `overdueAssignments` | Chưa hoàn thành và dueAt < asOf. |
| `notDueAssignments` | Chưa hoàn thành và dueAt >= asOf; bao gồm cả sắp hạn và xa hơn 7 ngày. |
| `dueSoonAssignments` | Chưa hoàn thành và asOf <= dueAt <= dueSoonThrough. |
| `completionPercent` | completed / total × 100, số nguyên làm tròn HALF_UP. Khi total = 0 trả 0, UI phải dùng total = 0 để hiện trạng thái chưa có bài. |

Hai nhóm **trạng thái** và **hạn nộp** có phần giao nhau, không cộng tất cả các nhãn thành tổng. Luôn có:

```text
total = todo + inProgress + completed = pending + completed
pending = overdue + notDue
0 <= dueSoon <= notDue
```

Bài COMPLETED không thuộc overdue/notDue/dueSoon, kể cả hạn nộp đã qua. Bài đúng `asOf` chưa quá hạn và có trong sắp hạn; vượt `dueSoonThrough` một microsecond không còn sắp hạn.

`dueSoonThrough` là cùng giờ địa phương **sau 7 ngày lịch**, dùng `asOf.atZone(zone).plusDays(7)`, không phải cuối ngày thứ bảy hoặc mặc định 168 giờ. Cách tính này tương ứng hàm `addDays(now, 7)` hiện có trong bộ lọc bài tập. DST có thể tạo cửa sổ 167/169 giờ; so sánh deadline cuối cùng đều bằng Instant. Múi giờ thiết bị khác zone hồ sơ có thể làm bộ lọc frontend cũ khác ở ranh giới DST; 7A.2 phải dùng các mốc API/zone cùng nhau khi nối UI.

## Ví dụ hợp đồng

Ví dụ minh họa 5 bài, 2 hoàn thành; không phải dữ liệu được seed vào tài khoản:

```json
{
  "semesterId": "11111111-1111-4111-8111-111111111111",
  "courseId": null,
  "asOf": "2026-10-28T18:00:00Z",
  "date": "2026-10-29",
  "timeZone": "Asia/Ho_Chi_Minh",
  "dueSoonThrough": "2026-11-04T18:00:00Z",
  "totalAssignments": 5,
  "todoAssignments": 2,
  "inProgressAssignments": 1,
  "completedAssignments": 2,
  "pendingAssignments": 3,
  "overdueAssignments": 1,
  "notDueAssignments": 2,
  "dueSoonAssignments": 1,
  "completionPercent": 40
}
```

## Lỗi

- 401 theo auth hiện có khi thiếu/sai/hết hạn/phiên bị thu hồi.
- 400 `INVALID_REQUEST` khi thiếu semesterId hoặc UUID sai.
- 400 `INVALID_ASSIGNMENT_STATISTICS_FILTER` khi zone không hợp lệ. Có UUID hợp lệ nhưng không thuộc quyền truy cập thì kiểm tra quyền trước và trả 404.
- 404 `SEMESTER_NOT_FOUND` / `COURSE_NOT_FOUND`: không tồn tại, đã xóa hoặc của tài khoản khác dùng cùng mã lỗi, không lộ sự tồn tại.
- 403 `ACCESS_DENIED` cho POST/PUT/DELETE có Bearer hợp lệ theo allowlist hiện có; chỉ GET được đăng ký, không có endpoint ghi thống kê.
- Lỗi database không biến thành counts 0; dùng xử lý lỗi chung 503 hiện có.

## Truy vấn và tính nhất quán

Service `readOnly + REPEATABLE_READ`: kiểm tra quyền kỳ/môn và đọc profile/aggregate trong cùng snapshot. Một câu SQL aggregate có join course + owner ở cả hai phía, lọc theo kỳ và course tùy chọn; không tải entity/notes/title hoặc chạy N+1 theo môn. Các count đến từ cùng hàng kết quả, không chạy nhiều câu count rời có thể thấy các lần ghi khác nhau. Không cần khóa ghi tài khoản, bảng, index, migration, dependency mới; Flyway vẫn V11.

Thử bằng `scripts/Try-AssignmentStatistics.ps1`, IntelliJ `api/assignment-statistics.http`; hướng dẫn từng bước ở [BACKEND-PHASE-7A1.md](../../docs/BACKEND-PHASE-7A1.md). Frontend/điều hướng nối ở 7A.2, nghiệm thu liên thông ở 7A.3.
