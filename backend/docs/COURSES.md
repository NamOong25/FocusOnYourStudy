# API môn học — 3B, cập nhật liên kết bài tập ở 4A

Base `/api/v1/courses`. Mỗi request cần Bearer access token và phiên còn hiệu lực. Chủ sở hữu lấy từ JWT, không lấy `userId` do client gửi. Web dùng Bearer chủ động, không cần cookie/CSRF cho endpoint nghiệp vụ; cookie riêng lẻ không cấp quyền. Quy tắc cookie/CSRF auth giữ như 2B/3A.

| Method/path | Kết quả |
| --- | --- |
| GET `/api/v1/courses` | 200, `data` là toàn bộ môn của tài khoản, rỗng `[]` |
| GET `/api/v1/courses?semesterId={uuid}` | 200, môn trong học kỳ thuộc tài khoản; kỳ không có môn trả `[]` |
| GET `/api/v1/courses/{id}` | 200, một môn thuộc tài khoản |
| POST `/api/v1/courses` | 201 và Location, môn mới |
| PUT `/api/v1/courses/{id}` | 200, cập nhật đủ các trường, cần version mới nhất |
| DELETE `/api/v1/courses/{id}?version=...` | 204 không body, xóa môn; giữ học kỳ/môn khác |

Response dùng envelope `data/meta`, UTC timestamp/requestId và `Cache-Control: no-store`. Danh sách sắp theo code tăng dần rồi ID để ổn định khi có cùng mã ở các kỳ khác nhau. Query học kỳ cũng kiểm tra chủ sở hữu trước khi lấy danh sách; không dùng UUID như quyền truy cập.

POST tối thiểu:

```json
{ "semesterId": "6dedc2ee-6254-4d21-bde7-78dacd8c8dc9", "code": "web101", "name": "Lập trình Web", "credits": 3 }
```

| Trường | Quy tắc |
| --- | --- |
| semesterId | UUID bắt buộc, học kỳ phải thuộc tài khoản |
| code | Bắt buộc, trim/chữ hoa Locale.ROOT, tối đa 64 ký tự sau chuẩn hóa |
| name | Bắt buộc, trim, tối đa 200 ký tự |
| credits | Số nguyên 1–30, không tự cắt số thập phân xuống |
| teacher / room | Tùy chọn/null thành chuỗi rỗng, trim; tối đa 200 / 100 ký tự |
| status | STUDYING / COMPLETED / PLANNED; bỏ trống/null mặc định STUDYING |
| color | lavender / mint / peach / blue; bỏ trống/null mặc định lavender |
| description | Ghi chú/mục tiêu, tùy chọn/null thành rỗng, trim, tối đa 5000 ký tự |
| version | PUT bắt buộc, số nguyên không âm lấy từ GET; DELETE gửi query |

`data` phản hồi gồm `id`, các trường trên và `version`, `createdAt`, `updatedAt`; không trả userId/entity/password. PUT là thay toàn bộ: cần gửi lại các trường muốn giữ; trường tùy chọn bỏ đi được đặt lại theo mặc định, không giữ ngầm giá trị cũ. PUT không thay giá trị thực có thể giữ nguyên version.

## Nghiệp vụ và đồng thời

- Chặn trùng mã đã chuẩn hóa trong cùng học kỳ. Mã giống nhau ở học kỳ khác hoặc tài khoản khác được phép; mỗi lần học có ID riêng. Chưa tự liên kết học lại/GPA.
- Có thể chuyển môn sang kỳ khác của chính tài khoản khi không còn bài tập backend. Từ 4A, môn còn bài (kể cả hoàn thành) bị chặn xóa/chuyển kỳ với `COURSE_HAS_ASSIGNMENTS`; vẫn sửa thông tin trong cùng kỳ được. Kỳ đích không tồn tại/khác chủ trả 404; kỳ đích có mã trùng trả 409, không thay dữ liệu gốc.
- Tất cả ghi môn lấy cùng khóa hàng chủ tài khoản với service học kỳ. Tạo/chuyển môn không chạy lọt giữa lúc kiểm tra và xóa kỳ; unique/composite FK của V1 tiếp tục bảo vệ tính nhất quán.
- Version cũ trả 409, không tự ghi đè; tải lại rồi cho người dùng quyết định. Học kỳ có môn vẫn bị 3A chặn xóa, kể cả thêm môn bằng API 3B.
- Xóa môn không cascade. 4A đã kiểm tra liên kết bài tập và dùng chung khóa chủ tài khoản với ghi bài. Khi thêm lịch/điểm ở đợt sau phải bổ sung guard tương ứng; không coi dữ liệu thử frontend là đã được bảo vệ ở backend.

## Lỗi

| HTTP/code | Ý nghĩa |
| --- | --- |
| 400 VALIDATION_FAILED | Thiếu/sai giới hạn trường, có field/message |
| 400 INVALID_REQUEST | JSON, enum, UUID hoặc version query sai/thiếu |
| 401 AUTHENTICATION_REQUIRED / INVALID_ACCESS_TOKEN | Thiếu token, token/phiên không còn hiệu lực |
| 404 COURSE_NOT_FOUND | Không có hoặc môn khác chủ; cùng phản hồi |
| 404 SEMESTER_NOT_FOUND | Kỳ đích/kỳ lọc không có hoặc khác chủ |
| 409 COURSE_ALREADY_EXISTS | Trùng mã trong kỳ sau chuẩn hóa |
| 409 COURSE_VERSION_CONFLICT | Bản ghi đã thay đổi, cần tải lại |
| 409 COURSE_HAS_ASSIGNMENTS | Môn còn bài tập; xử lý các bài trước khi xóa/chuyển kỳ |
| 409 DATA_CONFLICT | Constraint cuối cùng nếu có tác nhân ghi ngoài luồng service |
| 503 DATABASE_UNAVAILABLE | Chưa truy cập được DB |

Không echo giá trị đầu vào, SQL hoặc token trong lỗi. CORS tiếp tục chặn origin lạ. API bài tập đã mở ở 4A; PATCH và API lịch/điểm chưa mở.

Mẫu request: `../api/courses.http`. Hướng dẫn terminal và kiểm tra: `../../docs/BACKEND-PHASE-3B.md`.
