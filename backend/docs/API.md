# API nền tảng — v1

Base URL cục bộ: `http://localhost:8080`. Đợt 1 có health API, chưa có auth hoặc CRUD nghiệp vụ.

## Endpoint hiện có

| Method/path | Kết quả |
| --- | --- |
| GET `/api/v1/health` | SELECT 1 thật trên PostgreSQL; 200 nếu kết nối được, 503 nếu database không còn truy cập được. |
| GET `/actuator/health` | Health chuẩn Spring, chỉ hiện status, không lộ components/địa chỉ DB. |
| Các đường dẫn còn lại | Khóa bằng Spring Security; request chưa xác thực nhận 401. Chưa thể đăng nhập ở đợt 1. |

Flyway và JPA phải khởi tạo thành công trước khi app lắng nghe HTTP. Do đó 503 health chỉ dùng khi app đang chạy nhưng database mất kết nối; nếu DB chưa chạy ngay từ đầu thì backend sẽ không khởi động.

## Thành công

```json
{
  "data": { "status": "UP", "database": "UP" },
  "meta": {
    "timestamp": "2026-10-22T01:30:00Z",
    "requestId": "review-health-1"
  }
}
```

## Lỗi

HTTP status có ý nghĩa thực; không trả 200 với cờ lỗi. Lỗi API dùng `application/problem+json` theo RFC 9457. Ví dụ POST nhầm vào health:

```json
{
  "type": "urn:focus-study:problem:method-not-allowed",
  "title": "Method Not Allowed",
  "status": 405,
  "detail": "Yêu cầu chưa hợp lệ. Kiểm tra đường dẫn, phương thức và nội dung gửi lên.",
  "instance": "/api/v1/health",
  "code": "METHOD_NOT_ALLOWED",
  "timestamp": "2026-10-22T01:30:00Z",
  "requestId": "review-health-1"
}
```

| Status | Code | Ý nghĩa |
| --- | --- | --- |
| 400 | INVALID_REQUEST | JSON/cấu trúc yêu cầu chưa hợp lệ. |
| 400 | VALIDATION_FAILED | Có `errors: [{field, message}]`; không đưa giá trị bị từ chối vào phản hồi. |
| 401 | AUTHENTICATION_REQUIRED | Chưa được xác thực; auth thật triển khai sau. |
| 403 | ACCESS_DENIED | Chưa có quyền; CORS bị từ chối có thể bị xử lý sớm bởi bộ lọc trình duyệt với phản hồi CORS mặc định. |
| 404/405/406/415 | NOT_FOUND / METHOD_NOT_ALLOWED / NOT_ACCEPTABLE / UNSUPPORTED_MEDIA_TYPE | Lỗi MVC; header cần thiết như Allow được giữ. Đường dẫn nghiệp vụ đang khóa nên trước hết có thể nhận 401. |
| 409 | DATA_CONFLICT | Trùng hoặc vi phạm liên kết dữ liệu. |
| 503 | DATABASE_UNAVAILABLE | Không truy cập được DB, không trả nội dung SQL. |
| 500 | INTERNAL_ERROR | Lỗi khác; chi tiết trong log server, response không chứa stack trace. |

Hạ tầng kiểm tra DTO bằng Jakarta Bean Validation đã có handler/test, nhưng chưa mở endpoint nhập thử để giả làm API nghiệp vụ. Request DTO và quy tắc cụ thể được bổ sung khi triển khai từng API.

## Request ID và CORS

`X-Request-ID` gồm 1–64 ký tự chữ/số/`.`/`_`/`-` được giữ; giá trị khác được thay UUID. Response header và `meta.requestId`/problem.requestId dùng cùng mã; log có MDC requestId. `instance` không chứa query string. CORS mặc định chỉ cho các origin localhost 8092/8081 trong cấu hình; không dùng wildcard, không dùng cookie session.

Backend đang stateless, không dùng form login/HTTP Basic/session. CSRF tắt cho nền REST hiện chưa có auth; khi thiết kế refresh token/cookie ở đợt 2 phải đánh giá lại bảo vệ CSRF trước khi mở endpoint. Không dựa vào CORS để phân quyền người dùng.
