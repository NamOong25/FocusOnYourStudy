# API lịch học lặp — 4E.1

Base: `/api/v1/class-schedules`. Cần Bearer access token của phiên đang hoạt động. Chủ sở hữu lấy từ JWT, không nhận từ body. Cookie riêng lẻ không cấp quyền nghiệp vụ. Các kết quả nghiệp vụ có `Cache-Control: no-store`; DTO không lộ userId hoặc weekdayMask.

## Endpoint

| Phương thức | Đường dẫn | Kết quả |
| --- | --- | --- |
| GET | `/class-schedules` | 200, các chuỗi của tài khoản; sắp startsOn, startTime, id. |
| GET | `/class-schedules/{id}` | 200, một chuỗi. |
| POST | `/class-schedules` | 201, Location và chuỗi đã lưu. |
| PUT | `/class-schedules/{id}` | 200, thay toàn bộ chuỗi; cần version đã đọc. |
| DELETE | `/class-schedules/{id}?version=0` | 204, xóa cả chuỗi, không xóa môn/bài/tự học. |
| GET | `/class-schedules/occurrences?from=2026-10-26&to=2026-11-01` | 200, các buổi phát sinh, sắp startsAt UTC rồi scheduleId. |

List hỗ trợ `courseId`, `semesterId`, `from`, `to`, kết hợp AND; bộ lọc cha phải thuộc tài khoản dù danh sách rỗng. from/to là ngày ISO, gồm cả hai đầu, cho phép một mốc ở List. List lọc **khoảng áp dụng chuỗi giao với khoảng ngày**: một chuỗi thứ Hai vẫn có thể xuất hiện khi lọc thứ Ba. Muốn lấy đúng buổi trong ngày thì dùng occurrences.

Occurrences bắt buộc đủ from/to, tối đa **92 ngày tính cả hai đầu**. Ngày lọc là ngày địa phương theo múi giờ của **từng chuỗi**; không mặc định theo server hoặc thiết bị. Cần dùng startsAt/endsAt khi hiển thị ở múi giờ thiết bị khác. Ví dụ cùng ngày `2026-10-26` có thể có startsAt UTC rơi vào ngày trước đó. Không ghi thêm hàng database khi đọc occurrences; một buổi xác định bằng cặp `(scheduleId,date)`.

## Body POST/PUT

```json
{
  "courseId": "UUID môn của tài khoản",
  "weekdays": [1, 3],
  "startsOn": "2026-10-26",
  "endsOn": "2026-11-08",
  "startTime": "07:00",
  "endTime": "09:00",
  "timeZone": "Asia/Ho_Chi_Minh",
  "room": "A1.01",
  "teacher": "Giảng viên môn học",
  "reminderMinutes": 15,
  "notes": "Mang laptop"
}
```

PUT thêm `"version": 0`, thay bằng version mới nhất. PUT sửa **cả chuỗi**, không chỉ các buổi tương lai. Không dùng PUT như PATCH; room/teacher/notes bỏ trống/null thành chuỗi rỗng, reminderMinutes bỏ trống/null mặc định 15. Các trường lịch/môn/múi giờ bắt buộc đầy đủ.

- **Thứ dùng chuẩn ISO: 1 = thứ Hai, …, 6 = thứ Bảy, 7 = Chủ nhật. Không dùng 0 cho Chủ nhật.** 1–7 thứ, không trùng và không null. Phản hồi luôn sắp tăng dần. Adapter frontend cũ đang dùng 0–6 sẽ được chuyển khi nối ở 4F.
- startsOn/endsOn là `YYYY-MM-DD`, năm 1900–2099; từ bắt đầu đến kết thúc tối đa **366 ngày gồm cả hai đầu** (chênh lệch <=365). Phải có ít nhất một ngày trúng các thứ đã chọn.
- startTime/endTime đúng `HH:mm`, từ 00:00 đến 23:59, không nhận giây, offset hay 24:00. Kết thúc sau bắt đầu trong cùng ngày; không có ca qua đêm.
- timeZone là tên múi giờ được Java hỗ trợ như Asia/Ho_Chi_Minh, Asia/Saigon, UTC, America/New_York; không dùng offset trần `+07:00` thay múi giờ.
- Chuỗi giữ **giờ địa phương cố định**, không giữ một offset UTC cố định qua cả năm. Từng occurrence có startsAt/endsAt UTC đúng ngày đó. Thời gian thực trôi qua lấy từ hai instant, đặc biệt nếu ca bao qua lần đổi giờ DST.
- Với vùng có DST: từ chối toàn bộ request nếu bất kỳ buổi nào có giờ bắt đầu/kết thúc không tồn tại hoặc có hai lần. Trả lỗi field và ngày liên quan, không tự dịch giờ hoặc chọn một offset ngầm. Asia/Ho_Chi_Minh hiện không có DST. Mọi instant phát sinh phải >=1900-01-01Z và <2100-01-01Z.
- room/teacher/notes trim, tối đa 100/200/5000 ký tự. Đây là thông tin riêng của chuỗi, không tự đổi theo giảng viên/phòng mặc định của môn.
- reminderMinutes 0–10080 là **cấu hình được lưu**, chưa gửi thông báo hệ điều hành hoặc tạo lịch nhắc. 0 nghĩa là mốc tại giờ bắt đầu.

Response chuỗi: `id, courseId, weekdays, startsOn, endsOn, startTime, endTime, timeZone, room, teacher, reminderMinutes, notes, version, createdAt, updatedAt`.

Response occurrence: `scheduleId, courseId, date, startTime, endTime, timeZone, startsAt, endsAt, room, teacher, reminderMinutes, notes, scheduleVersion`. Cấu hình trên sinh 4 buổi: 26/10, 28/10, 02/11, 04/11; buổi đầu startsAt `2026-10-26T00:00:00Z`, endsAt `02:00:00Z`.

## Liên kết, version và lỗi

- Môn phải cùng tài khoản. Sửa chuỗi có thể chọn môn khác của cùng tài khoản; giữ UUID chuỗi. Không tự chuyển môn sang kỳ khác.
- Môn còn bất kỳ chuỗi nào, kể cả đã hết khoảng áp dụng, bị chặn xóa/chuyển học kỳ với `COURSE_HAS_CLASS_SCHEDULES`. Xử lý/xóa/chuyển chuỗi trước; sửa tên môn vẫn được phép. Nếu còn bài hoặc tự học, mã guard cũ có thể được ưu tiên trước mã này.
- Mọi ghi lịch/môn/kỳ/bài/tự học cùng khóa hàng tài khoản đầu tiên. Khóa chung bảo vệ đua với xóa/chuyển môn; sửa/xóa lịch yêu cầu version. PUT không đổi nội dung có thể giữ version; luôn dùng version server trả.
- Xóa chuỗi không xóa dữ liệu học tập khác. Sửa/xóa UUID không thuộc tài khoản trả cùng 404 như UUID không có.

| HTTP/code | Ý nghĩa |
| --- | --- |
| 400 VALIDATION_FAILED / INVALID_REQUEST | Thiếu trường, sai ngày/thứ/giờ/múi giờ hoặc version; lỗi body có field. |
| 400 INVALID_CLASS_RANGE | from/to sai, đảo khoảng hoặc occurrences quá 92 ngày. Thiếu query bắt buộc có thể là INVALID_REQUEST. |
| 401 AUTHENTICATION_REQUIRED / INVALID_ACCESS_TOKEN | Thiếu hoặc phiên/token không còn hợp lệ. |
| 404 CLASS_SCHEDULE_NOT_FOUND | Chuỗi không có hoặc không thuộc tài khoản. |
| 404 COURSE_NOT_FOUND / SEMESTER_NOT_FOUND | Cha/bộ lọc không có hoặc không được truy cập. |
| 409 CLASS_SCHEDULE_VERSION_CONFLICT | Sửa/xóa từ bản cũ; GET rồi xem lại trước khi chủ động gửi tiếp. |
| 409 COURSE_HAS_CLASS_SCHEDULES | API môn chặn xóa/chuyển kỳ vì còn lịch. |
| 409 DATA_CONFLICT / 503 DATABASE_UNAVAILABLE | Ràng buộc hoặc kết nối dữ liệu. |

Không tự gửi lại POST/PUT/DELETE khi mất phản hồi. Kiểm tra List/Get trước để tránh tạo trùng. 4E.1 chưa có idempotency key.

## Database và phạm vi kế tiếp

V5 tạo `class_schedules`, không sửa V1–V4 hoặc seed dữ liệu. `weekday_mask` 1–127 là biểu diễn 7 thứ nội bộ; không dùng làm contract API. FK `(course_id,user_id)` → courses bảo vệ chủ sở hữu; UNIQUE `(id,user_id)` chuẩn bị liên kết ngoại lệ. CHECK bảo vệ mask, khoảng ngày, giờ phút/cùng ngày, reminder, notes và version. Việc có buổi trúng thứ, múi giờ hợp lệ và DST được kiểm tra ở API; SQL ngoài API có thể bỏ qua các quy tắc này.

**Chưa làm trong 4E.1:** ngoại lệ nghỉ/đổi/khôi phục từng buổi; kiểm tra trùng lịch–lịch hoặc lịch–tự học/thi; nối UI; gửi thông báo; seed demo. Hai chuỗi trùng giờ hiện có thể cùng được lưu. 4E.2 sẽ kiểm tra xung đột dưới khóa chung và bảo vệ cả chiều sửa tự học; lịch thi theo đợt riêng. Giao diện lịch học hiện vẫn RAM, nối sau ở 4F; dữ liệu đã tạo bằng API không tự xuất hiện trên thời khóa biểu trước 4F.

Đối chiếu kỹ thuật: [Java 21 ZoneRules.getValidOffsets](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/zone/ZoneRules.html#getValidOffsets(java.time.LocalDateTime)) phân biệt giờ bình thường, khoảng giờ không tồn tại và giờ xuất hiện hai lần. Chính sách từ chối giờ không rõ là lựa chọn của dự án, không phải mặc định tự xử lý DST của Java.

Mapping LocalDate/LocalTime dùng [Hibernate 7.4 SqlTypes.LOCAL_DATE/LOCAL_TIME](https://docs.hibernate.org/orm/7.4/javadocs/org/hibernate/type/SqlTypes.html), đọc/ghi trực tiếp java.time qua JDBC để giữ nguyên DATE/TIME. Không dùng chuyển đổi java.sql.Time qua Calendar UTC cho giờ địa phương; các Instant ở nghiệp vụ khác vẫn giữ cấu hình UTC hiện có. Kiểm tra API và giá trị SQL trực tiếp dưới UTC, Asia/Ho_Chi_Minh và America/Los_Angeles bảo vệ việc đổi múi giờ JVM.
