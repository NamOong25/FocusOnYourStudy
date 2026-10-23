# API bài tập — 4A

Base `/api/v1/assignments`. Tất cả request cần Bearer access token và phiên còn hiệu lực. Chủ sở hữu lấy từ JWT, không từ body/query. Cookie riêng lẻ không cấp quyền cho API học tập; quy tắc cookie/CSRF của auth giữ nguyên.

| Method/path | Kết quả |
| --- | --- |
| GET `/api/v1/assignments` | 200, `data` là danh sách bài của tài khoản, rỗng `[]` |
| GET `/api/v1/assignments?courseId={uuid}&semesterId={uuid}&status=TODO` | 200, kết hợp các bộ lọc được truyền; mỗi bộ lọc đều tùy chọn |
| GET `/api/v1/assignments/{id}` | 200, chi tiết bài thuộc tài khoản |
| POST `/api/v1/assignments` | 201 + Location, tạo bài mới |
| PUT `/api/v1/assignments/{id}` | 200, thay toàn bộ các trường; bắt buộc version mới nhất |
| DELETE `/api/v1/assignments/{id}?version=...` | 204 không body, xóa bài; giữ môn/học kỳ |

Mặc định sắp `dueAt` tăng dần rồi UUID để ổn định khi trùng hạn. Không loại bài hoàn thành khỏi danh sách nếu không truyền status. Kỳ/môn lọc khác chủ hoặc không tồn tại trả 404 giống nhau; hai bộ lọc cùng chủ nhưng không khớp nhau trả `[]`. Chưa phân trang hoặc tổng hợp Dashboard; frontend 4B sẽ dùng danh sách theo tài khoản.

POST tối thiểu:

```json
{
  "courseId": "6dedc2ee-6254-4d21-bde7-78dacd8c8dc9",
  "title": "Báo cáo Web Java",
  "dueAt": "2026-10-30T23:59:00+07:00"
}
```

| Trường | Quy tắc |
| --- | --- |
| courseId | UUID bắt buộc; môn phải thuộc tài khoản |
| title | Bắt buộc, trim, tối đa 200 ký tự; không ép duy nhất vì có thể có nhiều bài cùng tên |
| dueAt | Bắt buộc; chuỗi ISO 8601 có ngày/giờ và `Z` hoặc offset; không đoán múi giờ khi thiếu |
| priority | MEDIUM / HIGH tương ứng Trung bình / Cao trên UI hiện tại; bỏ trống/null mặc định MEDIUM |
| status | TODO / IN_PROGRESS / COMPLETED tương ứng Chưa làm / Đang làm / Hoàn thành; bỏ trống/null mặc định TODO |
| notes | Tùy chọn/null thành rỗng, trim, tối đa 5000 ký tự |
| version | PUT bắt buộc nguyên không âm từ GET; DELETE truyền query |

Response `data` gồm `id`, `courseId`, `title`, `dueAt`, `priority`, `status`, `notes`, `version`, `createdAt`, `updatedAt`; không trả userId/entity/tokens. Tên môn/kỳ lấy qua ID, không sao chép chuỗi tên dễ lệch khi sửa môn. Response có `meta`, request ID và `Cache-Control: no-store` như API khác. PUT bỏ trường tùy chọn sẽ đặt về mặc định, không giữ ngầm giá trị cũ. PUT không thay giá trị thực có thể giữ nguyên version.

## Ngày giờ

- `2026-10-30T23:59:00+07:00` và `2026-10-30T16:59:00Z` là cùng hạn nộp; API trả UTC `2026-10-30T16:59:00Z`.
- Lưu `TIMESTAMPTZ` theo thời điểm tuyệt đối, không lưu múi giờ/offset gốc; hiển thị giờ địa phương thuộc frontend. Không lấy timezone mặc định của máy chạy backend để đoán input thiếu offset.
- Giới hạn thời điểm UTC từ `1900-01-01T00:00:00Z` đến trước `2100-01-01T00:00:00Z`; ngày không tồn tại hoặc chuỗi chỉ có ngày/giờ bị từ chối. Chuẩn hóa đến microsecond trước khi ghi để response và lần GET sau khớp nhau.
- Cho phép hạn đã qua để nhập bài cũ. Quá hạn là kết quả so deadline với thời gian hiện tại và trạng thái, không phải status được lưu tự động. Không tự hoàn thành bài khi hết hạn.

Nguồn quy ước timestamp: [PostgreSQL 17 — date/time](https://www.postgresql.org/docs/17/datatype-datetime.html). Migration chạy bằng Flyway theo [Spring Boot 4.1 — database initialization](https://docs.spring.io/spring-boot/4.1/how-to/data-initialization.html).

## Quan hệ và ghi đồng thời

- V3 thêm bảng `assignments`; FK ghép `(course_id,user_id)` → `courses(id,user_id)` ngăn gắn bài vào môn khác chủ ngay tại database. Không sửa V1/V2; không cascade xóa dữ liệu học tập.
- Được đổi bài sang môn khác của cùng tài khoản vì backend chưa có buổi tự học/checklist/tệp liên quan. Khi mở các bảng con ở đợt sau phải bổ sung kiểm tra các liên kết đó.
- Môn còn **bất kỳ bài tập nào**, kể cả hoàn thành, bị chặn xóa hoặc chuyển học kỳ với `COURSE_HAS_ASSIGNMENTS`. Vẫn sửa tên/giảng viên/tín chỉ/các thông tin khác trong cùng kỳ được; bài giữ courseId.
- Sau khi xóa/chuyển hết bài sang môn khác, môn cũ được xóa/chuyển kỳ theo quy tắc 3B. Học kỳ còn môn vẫn bị 3A chặn xóa.
- Ghi bài lấy cùng khóa hàng chủ tài khoản với môn/học kỳ trước khi kiểm tra bản ghi, version và liên kết. Tạo/chuyển bài không chạy lọt giữa kiểm tra và xóa/chuyển môn. PUT/DELETE version cũ trả 409; không tự ghi đè.
- POST là tạo bản ghi mới mỗi lần, có thể cùng tên. Không tự gửi lại thao tác ghi khi mất phản hồi; GET để xác nhận trước. Idempotency key chưa triển khai.

## Lỗi

| HTTP/code | Ý nghĩa |
| --- | --- |
| 400 VALIDATION_FAILED | Trường thiếu/sai giới hạn, deadline sai; có field/message |
| 400 INVALID_REQUEST | JSON/UUID/enum/version query không hợp lệ |
| 401 AUTHENTICATION_REQUIRED / INVALID_ACCESS_TOKEN | Chưa có Bearer hoặc token/phiên không còn hợp lệ |
| 404 ASSIGNMENT_NOT_FOUND | Bài không có hoặc khác chủ, cùng phản hồi |
| 404 COURSE_NOT_FOUND / SEMESTER_NOT_FOUND | Môn đích/kỳ lọc không có hoặc khác chủ |
| 409 ASSIGNMENT_VERSION_CONFLICT | Bản bài tập đã thay đổi; cần GET mới |
| 409 COURSE_HAS_ASSIGNMENTS | Xóa/chuyển kỳ môn đang còn bài |
| 409 DATA_CONFLICT | Constraint/optimistic conflict cuối cùng nếu ghi ngoài luồng service |
| 503 DATABASE_UNAVAILABLE | Không truy cập được database |

Không echo SQL/token/mật khẩu trong lỗi. PATCH và các API lịch/tự học/điểm chưa mở. Chưa có upload/tài liệu/checklist hoặc gửi thông báo thật. UI bài tập hiện vẫn RAM; nối ở 4B. Hướng dẫn terminal/IntelliJ: `../../docs/BACKEND-PHASE-4A.md`; mẫu request: `../api/assignments.http`.
