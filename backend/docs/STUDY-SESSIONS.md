# API kế hoạch tự học — đợt 4C

Base URL: `http://localhost:8080/api/v1/study-sessions`. Giao diện tự học nối ở 4D; các buổi RAM hiện tại không tự nhập vào tài khoản.

Mọi request cần `Authorization: Bearer <accessToken>` và thuộc tài khoản trong JWT. Cookie đăng nhập đơn lẻ không cấp quyền cho endpoint nghiệp vụ. Kết quả có `Cache-Control: no-store`; không trả entity, userId hoặc thời gian Pomodoro do client tự khai.

## Endpoint

| Phương thức | Đường dẫn | Kết quả |
| --- | --- | --- |
| GET | `/api/v1/study-sessions` | 200, danh sách toàn tài khoản, sắp theo startsAt rồi id. |
| GET | `/api/v1/study-sessions/{id}` | 200, một buổi tự học. |
| POST | `/api/v1/study-sessions` | 201, Location và buổi đã lưu. |
| PUT | `/api/v1/study-sessions/{id}` | 200, thay toàn bộ các trường cho phép, cần version đã đọc. |
| DELETE | `/api/v1/study-sessions/{id}?version=...` | 204, body rỗng. Không xóa bài/môn/học kỳ. |

GET danh sách hỗ trợ `courseId`, `semesterId`, `assignmentId`, `status`, `from`, `to`; các điều kiện kết hợp AND. Các ID bộ lọc phải thuộc tài khoản, kể cả khi danh sách kết quả rỗng. Khoảng lọc dùng giao nhau của các khoảng nửa mở: `endsAt > from` và `startsAt < to`. Ví dụ lọc 19:15–19:30 có buổi 19:00–19:45; buổi kết thúc đúng mốc from hoặc bắt đầu đúng mốc to không được tính. Chỉ một mốc cũng hợp lệ; nếu có cả hai thì from < to. Ngày giờ bộ lọc phải kèm offset/Z và được URL-encode, đặc biệt dấu `+`.

## Body POST/PUT

```json
{
  "courseId": "UUID môn của tài khoản",
  "assignmentId": null,
  "title": "Ôn tập Java",
  "startsAt": "2026-10-30T19:00:00+07:00",
  "timeZone": "Asia/Ho_Chi_Minh",
  "durationMinutes": 45,
  "status": "PLANNED",
  "notes": "Đọc chương 3 và ghi lại câu hỏi"
}
```

PUT dùng cùng body và thêm `"version": 0` (thay bằng phiên bản mới nhất). `assignmentId` bỏ trống/null nghĩa là tự học độc lập; PUT bỏ trường này cũng gỡ liên kết. Không dùng PUT như PATCH. Trạng thái bỏ trống/null mặc định PLANNED, notes mặc định chuỗi rỗng.

- `courseId` bắt buộc, phải là môn cùng tài khoản.
- `assignmentId` tùy chọn; khi có phải cùng tài khoản và cùng môn. Một bài có thể có nhiều buổi không trùng giờ; không gắn một buổi với nhiều bài.
- `title` trim, bắt buộc, tối đa 200 ký tự; `notes` trim, tối đa 5000.
- `startsAt` ISO-8601 có offset/Z. Đây là thời điểm tuyệt đối, không cần offset trong chuỗi giống timeZone; ví dụ 12:00Z và 19:00+07 biểu diễn cùng một thời điểm.
- `timeZone` bắt buộc, tên múi giờ được Java hỗ trợ như Asia/Ho_Chi_Minh, Asia/Saigon, UTC, America/New_York. Backend dùng múi giờ này để xác định ngày của buổi học và giới hạn trước 24:00. Không suy từ múi giờ của máy chủ.
- Giờ bắt đầu theo phút, giây/phần lẻ phải bằng 0 theo múi giờ đã chọn. Buổi học nằm trong năm 1900–2099; startsAt >= 1900-01-01Z, endsAt < 2100-01-01Z. Lọc danh sách cho phép mốc cuối 2100-01-01Z.
- `durationMinutes` là số nguyên 1–240; endsAt do backend tính theo thời lượng thực tế. Phải kết thúc trước 24:00 cùng ngày theo timeZone, kể cả khi deadline nằm ở ngày khác. 23:59 + 1 phút bị từ chối; 23:58 + 1 phút hợp lệ.
- Trạng thái `PLANNED / IN_PROGRESS / COMPLETED`, tương ứng Đã lên lịch / Đang học / Hoàn thành. Thời gian đã qua không tự hoàn thành buổi; trạng thái và Pomodoro là những nghiệp vụ riêng.

Phản hồi `data` gồm `id, courseId, assignmentId, title, startsAt, endsAt, timeZone, durationMinutes, status, notes, version, createdAt, updatedAt`. Các thời điểm trả về UTC. Ví dụ trên trả startsAt 12:00Z, endsAt 12:45Z, timeZone vẫn Asia/Ho_Chi_Minh. Thời lượng tính theo thời gian thực trôi qua ở vùng có DST; không trừ hai chuỗi giờ địa phương.

## Quy tắc liên kết và xung đột

- Không trùng giờ với bất kỳ buổi tự học nào của cùng tài khoản, kể cả khác môn hoặc đã COMPLETED. Dùng `[startsAt,endsAt)`, nên 19:00–19:45 và 19:45–20:30 được nối tiếp nhau. PUT loại trừ chính buổi đang sửa.
- Buổi gắn bài phải kết thúc không sau dueAt; bằng đúng deadline được phép nếu vẫn thỏa điều kiện trước 24:00.
- Đổi môn của bài đang có buổi liên kết: 409. Cần gỡ liên kết hoặc xử lý các buổi trước.
- Rút deadline của bài về trước giờ kết thúc bất kỳ buổi liên kết nào: 409, không thay đổi bài/buổi. Đổi ghi chú/trạng thái hoặc kéo deadline ra sau vẫn được phép.
- Xóa bài: gỡ assignmentId của tất cả buổi liên quan, giữ nguyên kế hoạch/môn/thời gian/trạng thái/ghi chú; tăng version của các buổi bị gỡ liên kết. Thực hiện trong cùng giao dịch với xóa bài. Form dựa trên version cũ sẽ nhận 409, không tự gắn lại bài đã mất.
- Môn còn buổi tự học, kể cả độc lập/COMPLETED, bị chặn xóa hoặc chuyển học kỳ; sửa tên/thông tin thường vẫn được. Nếu môn còn bài, ưu tiên mã lỗi COURSE_HAS_ASSIGNMENTS đã có ở 4A.
- Đổi trạng thái buổi học không tự hoàn thành bài, không sửa deadline và không ghi nhận thời gian Pomodoro.

## Mã lỗi

| HTTP/code | Ý nghĩa |
| --- | --- |
| 400 VALIDATION_FAILED / INVALID_REQUEST | Thiếu trường, lịch/múi giờ/thời lượng/version không hợp lệ. Validation body trả errors theo field. |
| 400 INVALID_STUDY_RANGE | Khoảng GET thiếu offset, ngoài giới hạn hoặc from >= to. |
| 401 AUTHENTICATION_REQUIRED / INVALID_ACCESS_TOKEN | Thiếu/không còn phiên hợp lệ. |
| 404 STUDY_SESSION_NOT_FOUND | Buổi không có hoặc không thuộc tài khoản; không phân biệt hai trường hợp. |
| 404 COURSE_NOT_FOUND / ASSIGNMENT_NOT_FOUND / SEMESTER_NOT_FOUND | Mục liên kết/bộ lọc không có hoặc thuộc người khác. |
| 409 STUDY_SESSION_VERSION_CONFLICT | PUT/DELETE dùng phiên bản cũ. |
| 409 STUDY_TIME_CONFLICT | Trùng buổi tự học khác trong tài khoản. |
| 409 SCHEDULE_TIME_CONFLICT | Từ 4E.2B: trùng một buổi lên lớp sau khi áp dụng ngoại lệ; conflict mô tả chuỗi/ngày/giờ cản. |
| 409 STUDY_ASSIGNMENT_COURSE_MISMATCH | Bài và buổi khác môn. |
| 409 STUDY_AFTER_DEADLINE | Buổi học kết thúc sau hạn bài đang gắn. |
| 409 ASSIGNMENT_HAS_STUDY_SESSIONS | API bài tập chặn đổi môn vì còn buổi liên kết. |
| 409 ASSIGNMENT_DEADLINE_CONFLICT | API bài tập chặn rút hạn vì làm buổi liên kết vượt hạn. |
| 409 COURSE_HAS_STUDY_SESSIONS | API môn chặn xóa/chuyển học kỳ vì còn buổi tự học. |
| 409 DATA_CONFLICT / 503 DATABASE_UNAVAILABLE | Ràng buộc dữ liệu hoặc dịch vụ dữ liệu chưa sẵn sàng. |

Sau lỗi mất phản hồi khi ghi, đọc List/Get để xác định kết quả trước khi chủ động thử lại. Không tự lặp thao tác ghi. Bản PUT không thay đổi giá trị có thể giữ nguyên version; luôn dùng version server vừa trả, không tự cộng.

## Database và kiểm tra đồng thời

V4 thêm study_sessions và UNIQUE(id,user_id,course_id) cho assignments, không sửa V1–V3 hoặc tạo seed. Khóa ngoại ghép bảo vệ chủ sở hữu, môn và bài ngay cả với ghi SQL trực tiếp. Link assignmentId null được phép, courseId/userId vẫn bắt buộc. CHECK bảo vệ thời lượng, khoảng ngày, minute, trước 24:00, status, notes và version.

Mọi ghi tự học, bài, môn và học kỳ cùng khóa hàng tài khoản đầu tiên trong giao dịch. Điều này bảo vệ cả trường hợp khung giờ đang trống: hai POST hoặc hai PUT khác bản ghi không thể cùng vượt kiểm tra trùng. Xóa/sửa parent, đổi deadline và tạo/sửa buổi học cũng được xếp thứ tự. Gỡ liên kết qua entity có @Version, flush trước khi xóa parent; rollback nếu xóa không thành công.

Trùng giờ và deadline liên bảng được kiểm tra trong service dưới khóa chung; không dùng CHECK truy vấn bảng khác. Ghi SQL ngoài API có thể bỏ qua hai quy tắc này, nên không dùng SQL tay để thay dữ liệu nghiệp vụ. Không yêu cầu extension PostgreSQL mới.

Từ **4E.2B backend đã kiểm tra trùng với lịch lên lớp** theo giờ hiệu lực sau ngoại lệ, bỏ buổi nghỉ; chiều thêm/sửa lớp và đổi/khôi phục buổi cũng đối chiếu tự học. Tất cả status tự học chiếm giờ như quy tắc cũ, hai buổi nối tiếp được phép. Lỗi giữ nguyên dữ liệu/version, form Tự học đã nối ở 4D hiển thị thông báo cụ thể. Xem [contract trùng giờ](SCHEDULE-CONFLICTS.md).

UI thời khóa biểu còn RAM đến 4F; các guard RAM của giao diện chỉ hỗ trợ trải nghiệm, backend quyết định đối với dữ liệu đã lưu. Lịch thi, focus records/Pomodoro, checklist/tài liệu, phân trang/cập nhật thời gian thực và nghiệm thu native vẫn làm sau.

Nguồn đối chiếu: [PostgreSQL 17 — Constraints](https://www.postgresql.org/docs/17/ddl-constraints.html), [Java 21 — ZonedDateTime](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/ZonedDateTime.html).
