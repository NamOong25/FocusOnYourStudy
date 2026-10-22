# API — v1

Base URL cục bộ: `http://localhost:8080`. Đợt 2A có đăng ký/đăng nhập/hồ sơ; chưa mở CRUD học tập hoặc nối frontend.

## Endpoint hiện có

| Method/path | Quyền | Kết quả |
| --- | --- | --- |
| GET `/api/v1/health` | Công khai | SELECT 1 thật; 200 khi DB truy cập được, 503 nếu DB mất kết nối sau lúc app khởi động. |
| GET `/actuator/health` | Công khai | Chỉ status, không lộ components/địa chỉ DB. |
| POST `/api/v1/auth/register` | Công khai | 201, hồ sơ mới; không tự đăng nhập. |
| POST `/api/v1/auth/login` | Công khai | 200, access token và hồ sơ. |
| GET `/api/v1/users/me` | Bearer access token | 200, hồ sơ đúng chủ thể của token. |
| Các đường dẫn nghiệp vụ còn lại | Chưa mở | 401 khi chưa xác thực; 403 khi có token hợp lệ. |

Flyway/JPA phải thành công trước khi app lắng nghe HTTP. DB chưa chạy từ đầu sẽ làm backend không khởi động.

## Đăng ký

Content-Type `application/json`:

```json
{
  "email": "sinhvien@example.com",
  "password": "MatKhauThu123!",
  "confirmPassword": "MatKhauThu123!",
  "fullName": "Nguyễn Văn An",
  "school": "Đại học Công nghiệp TP.HCM",
  "major": "Công nghệ thông tin"
}
```

Đây là thông tin ví dụ, không dùng mật khẩu này cho tài khoản thật. Email trim/lowercase, tối đa 254 ký tự và có dạng email hợp lệ. Mật khẩu 8–128 ký tự, không chỉ khoảng trắng; giữ nguyên khoảng trắng đầu/cuối, không chuẩn hóa Unicode, xác nhận phải khớp chính xác. `fullName` bắt buộc/tối đa 60 ký tự; `school`, `major` tùy chọn/tối đa 100 ký tự. Các trường hồ sơ được trim. Múi giờ ban đầu `Asia/Ho_Chi_Minh`.

Phản hồi 201:

```json
{
  "data": {
    "id": "6dedc2ee-6254-4d21-bde7-78dacd8c8dc9",
    "email": "sinhvien@example.com",
    "fullName": "Nguyễn Văn An",
    "school": "Đại học Công nghiệp TP.HCM",
    "major": "Công nghệ thông tin",
    "timeZone": "Asia/Ho_Chi_Minh"
  },
  "meta": { "timestamp": "2026-10-22T03:00:00Z", "requestId": "..." }
}
```

409 `EMAIL_ALREADY_EXISTS` khi email đã có, kể cả hai request đồng thời. Không trả mật khẩu/hash hoặc token. Chưa gửi email xác minh.

## Đăng nhập

POST `/api/v1/auth/login` với `email`, `password` theo cùng giới hạn. Email được chuẩn hóa như đăng ký. Phản hồi 200:

```json
{
  "data": {
    "accessToken": "<JWT ký RS256>",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "6dedc2ee-6254-4d21-bde7-78dacd8c8dc9",
      "email": "sinhvien@example.com",
      "fullName": "Nguyễn Văn An",
      "school": "Đại học Công nghiệp TP.HCM",
      "major": "Công nghệ thông tin",
      "timeZone": "Asia/Ho_Chi_Minh"
    }
  },
  "meta": { "timestamp": "2026-10-22T03:00:00Z", "requestId": "..." }
}
```

Sai mật khẩu và email không tồn tại cùng trả 401 `INVALID_CREDENTIALS` và cùng thông báo. Token hạn 15 phút; thời gian lệch đồng hồ cho phép 30 giây. Chưa refresh, tự giữ phiên hay thu hồi khi đăng xuất; hết hạn thì đăng nhập lại. Các API auth/hồ sơ dùng `Cache-Control: no-store`, không tạo cookie phiên.

## Hồ sơ hiện tại

GET `/api/v1/users/me` với header `Authorization: Bearer <accessToken>`. Phản hồi `data` là hồ sơ như đăng ký. Chủ sở hữu lấy từ `sub` UUID trong token đã xác thực; query `userId` không thay đổi chủ thể. Token ở query string không được dùng để xác thực. JWT không chứa email, mật khẩu hoặc hồ sơ; hồ sơ được đọc từ database mỗi lần. Token của tài khoản đã xóa bị từ chối.

## Lỗi

HTTP status có ý nghĩa thực. Lỗi dùng `application/problem+json` theo RFC 9457:

```json
{
  "type": "urn:focus-study:problem:invalid-credentials",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Email hoặc mật khẩu chưa đúng.",
  "instance": "/api/v1/auth/login",
  "code": "INVALID_CREDENTIALS",
  "timestamp": "2026-10-22T03:00:00Z",
  "requestId": "..."
}
```

| Status | Code | Ý nghĩa |
| --- | --- | --- |
| 400 | INVALID_REQUEST | JSON/cấu trúc yêu cầu chưa hợp lệ. |
| 400 | VALIDATION_FAILED | `errors: [{field, message}]`, không chứa giá trị bị từ chối. |
| 401 | AUTHENTICATION_REQUIRED | Chưa gửi Bearer token cho API cần xác thực. |
| 401 | INVALID_CREDENTIALS | Đăng nhập không thành công. |
| 401 | INVALID_ACCESS_TOKEN | Token giả/hết hạn/sai claim hoặc tài khoản không còn tồn tại. |
| 403 | ACCESS_DENIED | Endpoint chưa mở hoặc không có quyền. CORS có thể từ chối sớm với phản hồi CORS mặc định. |
| 404/405/406/415 | NOT_FOUND / METHOD_NOT_ALLOWED / NOT_ACCEPTABLE / UNSUPPORTED_MEDIA_TYPE | Lỗi MVC; header như Allow được giữ. Đường dẫn đang khóa có thể nhận 401/403 trước. |
| 409 | EMAIL_ALREADY_EXISTS / DATA_CONFLICT | Email trùng hoặc dữ liệu vi phạm liên kết. |
| 429 | AUTH_RATE_LIMITED | Thử auth quá nhiều; `Retry-After` là số giây cần chờ. |
| 503 | DATABASE_UNAVAILABLE | Không truy cập DB; không trả SQL. |
| 500 | INTERNAL_ERROR | Lỗi khác; response không chứa stack trace. |

Mặc định giới hạn theo IP trực tiếp: 10 lần đăng ký/phút, 30 lần đăng nhập/phút, cửa sổ độc lập cho từng API. Hiện lưu trong bộ nhớ của một process; không tin `X-Forwarded-For`. Cần thiết kế proxy và chia sẻ giới hạn khi triển khai nhiều instance.

## Request ID và CORS

`X-Request-ID` gồm 1–64 ký tự chữ/số/`.`/`_`/`-` được giữ, giá trị khác thay UUID. Header và `meta.requestId`/problem.requestId thống nhất; log có MDC requestId. `instance` không chứa query string. CORS chỉ cho origin localhost 8092/8081 theo cấu hình, không wildcard/cookie; expose request ID, Retry-After, WWW-Authenticate.

Stateless, không dùng form login/HTTP Basic/session; chỉ nhận access token qua Authorization header. CSRF đang tắt với cơ chế này; phải đánh giá lại nếu đợt 2B thêm cookie. Không dùng CORS để thay thế phân quyền.
