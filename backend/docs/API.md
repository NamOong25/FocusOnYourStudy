# API — v1

Base URL cục bộ: `http://localhost:8080`. **Đã mở CRUD học kỳ/môn/bài tập/tự học/lịch học/lịch thi theo tài khoản**, xem [học kỳ](SEMESTERS.md), [môn học](COURSES.md), [bài tập 4A](ASSIGNMENTS.md) và [tự học 4C](STUDY-SESSIONS.md). Frontend đã nối tài khoản/phiên, học kỳ/môn/bài/tự học và lịch học/nhắc việc đến 4G.2. API lịch thi đã có ở 4H.1A, xem [lịch thi](EXAMS.md); kiểm tra trùng ở 4H.1B và UI ở 4H.2. Thiết bị thật 2C.3B để làm sau.

## Endpoint hiện có

| Method/path | Quyền | Kết quả |
| --- | --- | --- |
| GET `/api/v1/health` | Công khai | SELECT 1 thật; 200 khi DB truy cập được, 503 nếu DB mất kết nối sau lúc app khởi động. |
| GET `/actuator/health` | Công khai | Chỉ status, không lộ components/địa chỉ DB. |
| POST `/api/v1/auth/register` | Công khai | 201, hồ sơ mới; không tự đăng nhập. |
| POST `/api/v1/auth/login` | Mật khẩu; web có CSRF | 200, cặp token và hồ sơ; web giữ refresh token trong cookie. |
| POST `/api/v1/auth/refresh` | Refresh token; web có CSRF | 200, đổi token một lần, không yêu cầu mật khẩu/access token. |
| POST `/api/v1/auth/logout` | Refresh token; web có CSRF | 204, thu hồi đúng phiên; lặp lại không lỗi. |
| GET `/api/v1/auth/csrf` | Công khai | 200, mã/header CSRF và cookie CSRF HttpOnly; không có phiên tài khoản/JSESSIONID. |
| GET `/api/v1/users/me` | Bearer access token và phiên hoạt động | 200, hồ sơ đúng chủ thể của token. |
| GET `/api/v1/semesters` và `/{id}` | Bearer và phiên hoạt động | 200, danh sách/chi tiết của chủ token; ID khác chủ trả 404. |
| POST `/api/v1/semesters` | Bearer và phiên hoạt động | 201, tạo kỳ 1/2/3; chặn trùng kỳ/năm và chuyển CURRENT trong transaction. |
| PUT `/api/v1/semesters/{id}` | Bearer và version mới nhất | 200, cập nhật; 409 nếu trùng hoặc version cũ. |
| DELETE `/api/v1/semesters/{id}?version=...` | Bearer và version mới nhất | 204, xóa kỳ trống; 409 nếu còn môn. |
| GET `/api/v1/courses` và `/{id}` | Bearer và phiên hoạt động | 200, danh sách/chi tiết của mình; có query semesterId để lọc kỳ thuộc mình. |
| POST `/api/v1/courses` | Bearer và học kỳ thuộc mình | 201, tạo môn; chặn trùng mã trong kỳ. |
| PUT `/api/v1/courses/{id}` | Bearer và version mới nhất | 200, sửa/chuyển sang kỳ của mình; 409 nếu trùng/version cũ hoặc chuyển kỳ khi còn bài. |
| DELETE `/api/v1/courses/{id}?version=...` | Bearer và version mới nhất | 204, xóa môn trống; từ 4A chặn môn còn bài tập. |
| GET `/api/v1/assignments` và `/{id}` | Bearer và phiên hoạt động | 200, bài của mình; lọc tùy chọn courseId/semesterId/status. |
| POST `/api/v1/assignments` | Bearer và môn thuộc mình | 201, bài mới; deadline cần ngày/giờ và offset. |
| PUT `/api/v1/assignments/{id}` | Bearer và version mới nhất | 200, thay đầy đủ trường; 409 nếu version cũ. |
| DELETE `/api/v1/assignments/{id}?version=...` | Bearer và version mới nhất | 204, xóa bài, giữ môn/học kỳ. |
| GET `/api/v1/study-sessions` và `/{id}` | Bearer và phiên hoạt động | 200, buổi cùng tài khoản; lọc môn/kỳ/bài/trạng thái/khoảng giờ. |
| POST `/api/v1/study-sessions` | Bearer và phiên hoạt động | 201, kế hoạch độc lập hoặc gắn bài; kiểm tra trùng và deadline. |
| PUT `/api/v1/study-sessions/{id}` | Bearer và version mới nhất | 200, thay toàn bộ trường; 409 nếu version cũ/trùng giờ/liên kết không hợp lệ. |
| DELETE `/api/v1/study-sessions/{id}?version=...` | Bearer và version mới nhất | 204, giữ bài/môn/kỳ. |
| GET `/api/v1/exams` và `/{id}` | Bearer và phiên hoạt động | 200, lịch thi thuộc mình; lọc môn/kỳ/loại/hình thức/khoảng thời điểm. |
| POST `/api/v1/exams` | Bearer và môn thuộc mình | 201; giờ có offset, zone, mốc nhắc hợp lệ. Chưa kiểm tra trùng ở 4H.1A. |
| PUT `/api/v1/exams/{id}` | Bearer và version mới nhất | 200, thay đầy đủ dữ liệu; PUT giống hệt cũng tăng version. |
| DELETE `/api/v1/exams/{id}?version=...` | Bearer và version mới nhất | 204, giữ môn/bài/lịch học/tự học. |
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
    "refreshToken": "<bí mật ngẫu nhiên 43 ký tự; chỉ có ở native/body>",
    "refreshExpiresAt": "2026-10-29T03:00:00Z",
    "sessionExpiresAt": "2026-11-21T03:00:00Z",
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

Sai mật khẩu và email không tồn tại cùng trả 401 `INVALID_CREDENTIALS` và cùng thông báo. Access token hạn 15 phút, lệch đồng hồ tối đa 30 giây; refresh/phiên dùng hạn chính xác ở database, không thêm khoảng dung sai. Mỗi đăng nhập tạo một phiên riêng, các thiết bị/phiên khác độc lập. API auth/hồ sơ dùng `Cache-Control: no-store`, không tạo HTTP session/JSESSIONID.

## Làm mới phiên và đăng xuất — native/terminal

Không có header Origin hoặc cookie web. `X-Auth-Transport: body` được khuyến nghị; bỏ header này vẫn dùng body nếu không có đặc điểm browser. Login/refresh/logout **không gửi Authorization**, để token hết hạn hoặc phiên đã thu hồi không chặn bước phục hồi.

POST `/api/v1/auth/refresh`, Content-Type `application/json`:

```json
{ "refreshToken": "<refreshToken hiện tại>" }
```

Trả 200 cùng cấu trúc login, với access token và refresh token mới. Lưu token mới thay token cũ; mỗi token chỉ refresh được một lần. `refreshExpiresAt` tăng tối đa 7 ngày từ lần đổi nhưng không vượt `sessionExpiresAt` (30 ngày từ đăng nhập). Refresh giữ nguyên chủ tài khoản/phiên/hạn tuyệt đối, không tạo phiên đăng nhập mới. Token ngẫu nhiên 256 bit; database chỉ có SHA-256, không lưu bản rõ hoặc JWT refresh.

Dùng lại refresh token đã tiêu thụ trả 401 `REFRESH_TOKEN_REUSED` và **thu hồi cả phiên**, gồm access token và token con đã phát hành. Hai refresh đồng thời cùng token: một request có thể thành công, request còn lại phát hiện replay và thu hồi cả phiên; client phải gộp refresh thành một request. Nếu lỗi mạng khiến không biết server đã xử lý hay chưa, không gửi lại token cũ một cách mù quáng; quay về đăng nhập nếu không có token mới.

POST `/api/v1/auth/logout` với cùng cấu trúc body: trả **204, không body**, thu hồi đúng phiên gắn với token đó. Có thể dùng token cũ đã tiêu thụ để đóng cả phiên. Token ngẫu nhiên không tồn tại, token đã logout hoặc body `{}` đều trả 204; không ảnh hưởng phiên khác. Token có định dạng sai vẫn bị validation 400. Sau logout, access token còn hạn cũng nhận 401 khi đọc hồ sơ. Tài khoản/dữ liệu không bị xóa.

Không nhận refresh token từ URL/query, không dùng refresh token làm Bearer access token. Body token có định dạng 43 ký tự base64url không padding; không echo token trong lỗi/log.

## Phiên web — cookie HttpOnly và CSRF

Web không nhận refresh token trong JSON. Luồng chuẩn bị cho 2C:

1. GET `/api/v1/auth/csrf` với `credentials: include`. Server đặt cookie `FOCUS_XSRF` HttpOnly và trả `data: {headerName: "X-XSRF-TOKEN", token: "<mã CSRF>"}`. Giữ mã này trong bộ nhớ frontend.
2. POST login (hoặc register) cùng cookie CSRF, header `X-XSRF-TOKEN` bằng mã vừa nhận, `X-Auth-Transport: cookie`, Content-Type JSON và Origin được cấu hình cho frontend. Login đặt `FOCUS_REFRESH` HttpOnly, SameSite=Strict, path `/api/v1/auth`, không Domain; JSON có access token/hồ sơ/hạn nhưng **không có trường refreshToken**.
3. Refresh: POST JSON `{}`, giữ credentials/cookie, header transport và CSRF. Browser tự gửi refresh cookie, server xoay cookie. Logout tương tự, server xóa cookie với đúng path và thu hồi phiên. 401 refresh cũng xóa refresh cookie; lỗi CSRF/origin/429 không xóa để tránh mất phiên do request không hợp lệ.

Cookie transport phải có Origin nằm trong danh sách CORS; thiếu Origin hoặc Origin `null` bị từ chối. Body transport không được dùng từ request browser có Origin/cookie web. Không gửi refresh token trong body khi đang dùng cookie; phiên được gắn BODY/COOKIE từ lúc login, không đổi kênh giữa chừng. Truy cập hồ sơ vẫn yêu cầu Bearer header; chỉ có cookie không đủ để đọc hồ sơ.

Cookie Secure cấu hình qua `AUTH_COOKIE_SECURE`, mặc định false cho localhost HTTP; production HTTPS bắt buộc true. Cookie SameSite=Strict phù hợp triển khai frontend/API cùng site; dùng cùng hostname (localhost hoặc 127.0.0.1) khi thử cục bộ. Đổi host hoặc triển khai khác site cần thiết kế/cấu hình lại trước khi dùng.

CSRF do Spring Security CookieCsrfTokenRepository xử lý, giữ cơ chế XOR mặc định; các request thay đổi có Origin/cookie/transport cookie cần token. Không tắt CSRF chỉ vì không dùng HttpSession. Xem `api/auth-browser.http`; việc fetch và lưu/khôi phục phiên trên React Native sẽ làm ở 2C.

## Hồ sơ hiện tại

GET `/api/v1/users/me` với header `Authorization: Bearer <accessToken>`. Chủ sở hữu lấy từ `sub` và phiên từ `sid`, cả hai là UUID đã xác thực; DB kiểm tra phiên thuộc đúng người, chưa thu hồi và chưa hết hạn trên mỗi request. Query userId không thay đổi chủ thể, token ở query không xác thực. JWT không chứa email/mật khẩu/hồ sơ; hồ sơ đọc từ DB. Token của tài khoản đã xóa, phiên bị thu hồi hoặc JWT 2A cũ thiếu sid đều bị từ chối; sau nâng cấp cần đăng nhập lại.

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
| 401 | INVALID_ACCESS_TOKEN | Token giả/hết hạn/sai claim, phiên không hoạt động/khác chủ hoặc tài khoản không còn. |
| 401 | INVALID_REFRESH_TOKEN | Refresh token không tồn tại, phiên bị thu hồi hoặc sai transport. |
| 401 | REFRESH_TOKEN_REUSED | Dùng lại token đã tiêu thụ; đã thu hồi cả phiên. |
| 401 | SESSION_EXPIRED | Refresh token/phiên hết hạn; đã ghi nhận thu hồi phiên. |
| 400 | AUTH_TRANSPORT_INVALID | Trộn cookie/body, cookie trùng hoặc transport không hợp lệ. |
| 403 | CSRF_INVALID / AUTH_ORIGIN_REJECTED / COOKIE_TRANSPORT_REQUIRED | Request web thiếu/sai bảo vệ CSRF, origin sai hoặc cố dùng body transport. |
| 403 | ACCESS_DENIED | Endpoint chưa mở hoặc không có quyền. CORS có thể từ chối sớm với phản hồi CORS mặc định. |
| 404/405/406/415 | NOT_FOUND / METHOD_NOT_ALLOWED / NOT_ACCEPTABLE / UNSUPPORTED_MEDIA_TYPE | Lỗi MVC; header như Allow được giữ. Đường dẫn đang khóa có thể nhận 401/403 trước. |
| 409 | EMAIL_ALREADY_EXISTS / DATA_CONFLICT | Email trùng hoặc dữ liệu vi phạm liên kết. |
| 429 | AUTH_RATE_LIMITED | Thử auth quá nhiều; `Retry-After` là số giây cần chờ. |
| 503 | DATABASE_UNAVAILABLE | Không truy cập DB; không trả SQL. |
| 500 | INTERNAL_ERROR | Lỗi khác; response không chứa stack trace. |

Mặc định theo IP trực tiếp: register 10/phút, login 30/phút, refresh/logout mỗi API 60/phút, cửa sổ độc lập. Hiện lưu trong bộ nhớ một process; không tin `X-Forwarded-For`. Cần thiết kế proxy và chia sẻ giới hạn khi triển khai nhiều instance.

## Request ID và CORS

`X-Request-ID` gồm 1–64 ký tự chữ/số/`.`/`_`/`-` được giữ, giá trị khác thay UUID. Header/meta/problem dùng cùng mã, log có MDC. `instance` không chứa query string. CORS cho origin localhost 8092/8081 theo cấu hình, không wildcard, có allow credentials; nhận header X-Auth-Transport/X-XSRF-TOKEN và expose request ID/Retry-After/WWW-Authenticate.

Không dùng form login, HTTP Basic hoặc HttpSession. Phiên tài khoản riêng được lưu trong PostgreSQL; chỉ nhận access token qua Authorization. CSRF áp dụng cho browser/cookie như trên, không yêu cầu native body transport. Không dùng CORS để thay thế CSRF hoặc kiểm tra quyền sở hữu.
