# API lịch thi — 4H.1A / 4H.1B.1

Base: `/api/v1`. Bearer access token và phiên hoạt động bắt buộc. Chủ sở hữu lấy từ token; không nhận `userId`/`id`/`version` tùy ý khi tạo. 4H.1B.1 đã kiểm tra trùng khi tạo/sửa lịch thi. Kiểm tra chiều ngược khi ghi lịch học/tự học ở 4H.1B.2; nối UI ở 4H.2, thông báo thiết bị làm riêng.

## Endpoint

| Method/path | Kết quả |
| --- | --- |
| GET `/exams` | 200, danh sách theo tài khoản, sắp startsAt UTC rồi id. |
| GET `/exams/{id}` | 200; ID không có/khác chủ cùng 404 EXAM_NOT_FOUND. |
| POST `/exams` | 201 + Location, server tạo ID, version 0. |
| PUT `/exams/{id}` | 200, thay đầy đủ dữ liệu, bắt buộc version mới nhất. |
| DELETE `/exams/{id}?version=...` | 204 không body, bắt buộc version mới nhất. |

Đọc/ghi thành công có `Cache-Control: no-store`. Body đọc/ghi theo `{data, meta:{timestamp, requestId}}`; lỗi theo Problem Detail như các API khác.

## Body tạo/sửa

```json
{
  "courseId": "UUID môn của tài khoản",
  "kind": "FINAL",
  "format": "WRITTEN",
  "startsAt": "2026-11-10T08:00:00+07:00",
  "endsAt": "2026-11-10T10:00:00+07:00",
  "timeZone": "Asia/Ho_Chi_Minh",
  "room": "A2.03",
  "reminder": true,
  "reminderMinutes": [1440, 180, 0],
  "notes": "Mang thẻ sinh viên"
}
```

PUT thêm `version` nguyên không âm từ GET mới nhất. Mỗi PUT thành công tiêu thụ một version, kể cả nội dung giống hệt; không dùng PUT như PATCH và không tự thay version rồi gửi lại khi bị 409.

| Trường | Quy tắc |
| --- | --- |
| courseId | Bắt buộc, môn thuộc tài khoản. Có thể đổi lịch thi sang môn khác của mình, cả kỳ khác. |
| kind | Bắt buộc: MIDTERM = Giữa kỳ, FINAL = Cuối kỳ, OTHER = Khác. |
| format | Bắt buộc: WRITTEN = Tự luận, MULTIPLE_CHOICE = Trắc nghiệm, PRACTICAL = Thực hành, ORAL = Vấn đáp, ONLINE = Trực tuyến. |
| startsAt/endsAt | Bắt buộc ISO datetime có offset/Z; tối đa 40 ký tự. Kết thúc sau bắt đầu theo thời điểm tuyệt đối. |
| timeZone | Bắt buộc IANA zone có trong Java, tối đa 100; dùng để xác định ngày địa phương và hiển thị. |
| room | Trim, tối đa 100, thiếu/null thành rỗng. Không lưu chuỗi giả Chưa cập nhật. |
| reminder | Thiếu/null mặc định true; chỉ là cấu hình, chưa tạo job/gửi nhắc. |
| reminderMinutes | Tối đa 10 số nguyên khác nhau, mỗi số 0–10080, trả về giảm dần. 0 = đúng giờ bắt đầu. |
| notes | Trim, tối đa 5000, thiếu/null thành rỗng. |

- Bật nhắc phải có ít nhất một mốc. Thiếu/null danh sách khi bật mặc định `[1440,180]`.
- Tắt nhắc phải có danh sách rỗng; thiếu/null danh sách khi tắt mặc định `[]`. Tắt nhưng gửi mốc khác rỗng trả 400; không im lặng bỏ cấu hình.
- Giờ đến phút, giây và phần lẻ bằng 0 theo zone. Hai đầu phải cùng một ngày địa phương, kết thúc trước 24:00 của ngày đó.
- Thời điểm tuyệt đối nằm từ `1900-01-01T00:00:00Z` đến trước `2100-01-01T00:00:00Z`, ngày địa phương trong năm 1900–2099.
- Offset của chuỗi gửi lên xác định **một instant**, không phải giờ thiếu múi giờ để server đoán. Có thể gửi Z rồi giữ timeZone để hiển thị; khi DST lặp giờ, offset rõ ràng xác định đúng lần xuất hiện. Thứ tự xét bằng UTC, không so sánh chuỗi HH:mm.
- Không ép ngày thi vào khoảng năm học tự suy ra: học kỳ hiện chỉ có số kỳ/năm, chưa có phạm vi ngày học chính thức.

Response: `id, courseId, kind, format, startsAt, endsAt, timeZone, room, reminder, reminderMinutes, notes, version, createdAt, updatedAt`. `startsAt/endsAt` trả UTC Z, không mất zone đã chọn. Không lộ userId hoặc counter nội bộ.

## List và bộ lọc

Tùy chọn `courseId`, `semesterId`, `kind`, `format`, `from`, `to`, kết hợp **AND**. Môn/kỳ lọc phải thuộc mình kể cả khi không có lịch. Mốc from/to là datetime có offset, không phải ngày thuần; hai đầu nếu đủ phải from < to.

Lọc giao khoảng nửa mở `[from,to)`:

- Có from: `exam.endsAt > from`.
- Có to: `exam.startsAt < to`.
- Chạm đúng biên nhưng không giao thì không được lấy. Có thể chỉ gửi một đầu.
- Mốc lọc cho phép từ đầu năm 1900 đến đầu năm 2100; danh sách sắp thời điểm tuyệt đối rồi ID để ổn định.

Ví dụ: `/exams?kind=FINAL&format=WRITTEN&from=2026-11-10T00:00:00Z&to=2026-11-11T00:00:00Z`. Khi dùng offset `+07:00` trong query, phải URL encode dấu +; script PowerShell thực hiện tự động.

## Quan hệ và đồng thời

- FK `(course_id,user_id)` → courses giữ đúng chủ. Xóa lịch thi không xóa môn/bài/lịch học/tự học.
- Môn còn lịch thi chặn xóa/chuyển kỳ với COURSE_HAS_EXAMS; vẫn sửa tên, giảng viên và thông tin thường được. Sau khi xử lý các lịch thi mới chuyển/xóa môn.
- Ghi dùng cùng khóa hàng tài khoản với môn/kỳ/bài/lịch học/tự học, tránh tạo lịch lọt giữa kiểm tra và xóa/chuyển môn.
- `@Version` + version yêu cầu bảo vệ bản cũ; counter `update_revision` buộc tiêu thụ version cho cả PUT giống hệt. Hai request dùng cùng bản chỉ một thành công; update/delete thua không tự tạo lại dữ liệu.

## Trùng giờ — 4H.1B.1

- POST/PUT lịch thi so với lịch thi khác, các buổi hiệu lực của lịch học và buổi tự học của cùng tài khoản; xét cả khác môn/học kỳ. PUT loại chính lịch thi đang sửa khỏi tập so sánh.
- Áp dụng ngoại lệ: buổi nghỉ không chiếm giờ, buổi đổi dùng giờ mới; trường bỏ trống kế thừa từ chuỗi. Trạng thái tự học COMPLETED vẫn chiếm giờ như contract lịch học/tự học hiện có.
- So sánh Instant UTC theo khoảng nửa mở `[start,end)`: chạm giờ được phép, trùng một phút/chứa nhau/trùng hoàn toàn bị chặn. Không so chuỗi giờ, không bỏ qua lịch ở ngày địa phương khác do múi giờ.
- Trả 409 `SCHEDULE_TIME_CONFLICT` và `conflict` theo [contract chung](SCHEDULE-CONFLICTS.md); kind là EXAM, CLASS hoặc STUDY. Mô tả buổi đã lưu đang cản, gồm môn, ngày/giờ/zone và UTC; không có dữ liệu người khác.
- Sở hữu/version kiểm tra trước xung đột. Thất bại không lưu một phần hoặc đổi version, counter, timestamps, cấu hình nhắc. Hai POST lịch thi trùng hoặc hai PUT khác lịch thi về một giờ trống chỉ một request thành công nhờ khóa hàng tài khoản.
- Dữ liệu trùng đã tồn tại vẫn đọc/xóa được; sửa sang giờ không trùng để xử lý, không tự di chuyển dữ liệu.
- **Chưa kiểm tra chiều ngược ở 4H.1B.2:** khi tạo/sửa lịch học, đổi/khôi phục buổi hoặc tạo/sửa tự học sau khi đã có kỳ thi, các luồng đó chưa so với lịch thi. Vì vậy 4H.1B chưa hoàn thành toàn phần; khóa ghi hiện có không tự bảo đảm bất biến hai chiều này.

## Lỗi

| HTTP/code | Ý nghĩa |
| --- | --- |
| 400 VALIDATION_FAILED | Trường thiếu/sai, thời gian/mốc nhắc không hợp lệ; có danh sách field/message. |
| 400 INVALID_REQUEST | JSON/enum/UUID hoặc version query sai/thiếu. |
| 400 INVALID_EXAM_RANGE | from/to sai/đảo/bằng nhau hoặc ngoài giới hạn. |
| 401 AUTHENTICATION_REQUIRED / INVALID_ACCESS_TOKEN | Token/phiên thiếu hoặc hết hiệu lực. |
| 404 EXAM_NOT_FOUND | Lịch không có hoặc khác chủ. |
| 404 COURSE_NOT_FOUND / SEMESTER_NOT_FOUND | Môn/kỳ không có hoặc khác chủ. |
| 409 EXAM_VERSION_CONFLICT | Bản cũ; GET lại trước khi người dùng quyết định sửa/xóa. |
| 409 SCHEDULE_TIME_CONFLICT | Khi tạo/sửa lịch thi: trùng lịch thi khác, lịch học hiệu lực hoặc tự học của mình. |
| 409 COURSE_HAS_EXAMS | Môn còn lịch thi; xử lý các lịch trước khi xóa/chuyển kỳ. |
| 409 DATA_CONFLICT | Vi phạm ràng buộc cuối cùng ở DB. |
| 503 DATABASE_UNAVAILABLE | Chưa truy cập được PostgreSQL. |

## Migration và thử API

V7 tạo `exams` cùng hàm kiểm tra mảng mốc nhắc, không sửa V1–V6/seed/reset database. 4H.1B.1 không thêm migration hoặc reset dữ liệu; chạy lại backend để dùng code kiểm tra mới. UI lịch thi vẫn dùng dữ liệu trong phiên đến 4H.2.

- Request IntelliJ: `../api/exams.http`.
- Script tương thích PowerShell 5.1: `../scripts/Try-Exams.ps1` (UTF-8 BOM để thông báo tiếng Việt đọc đúng).
- Hướng dẫn từng bước: `../../docs/BACKEND-PHASE-4H1A.md`.
- Hướng dẫn trùng giờ: `../../docs/BACKEND-PHASE-4H1B1.md`, request `../api/exam-conflicts.http`.
