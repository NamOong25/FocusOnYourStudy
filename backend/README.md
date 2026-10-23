# Backend — FocusYourStudy

**Đợt 3B đã xong:** API CRUD môn/lọc theo học kỳ, chuẩn hóa mã, version và quyền theo chủ tài khoản; dùng chung khóa với học kỳ. **92 tests/Maven verify qua**, có 20 test môn mới, script PowerShell 5.1 và đọc lại môn qua khởi động lại backend. UI học kỳ đã nối ở 3C.1; UI môn chờ 3C.2, thiết bị thật 2C.3B để làm sau. Xem [hướng dẫn test 3B](../docs/BACKEND-PHASE-3B.md), [hợp đồng môn](docs/COURSES.md).

**Đợt 3A đã xong:** API CRUD học kỳ theo chủ tài khoản, lưu PostgreSQL, tối đa một CURRENT, kiểm tra version và chặn xóa kỳ còn môn. **72 tests/Maven verify qua** tại đợt 3A, gồm 21 test học kỳ và đọc lại kỳ sau khi backend khởi động lại. UI học kỳ đã nối ở 3C.1; 2C.3B để làm sau. Xem [hướng dẫn test 3A](../docs/BACKEND-PHASE-3A.md) và [hợp đồng API](docs/SEMESTERS.md).

Java 21, Spring Boot **4.1.1**, Maven Wrapper **3.10.0**, PostgreSQL **17.11**, Flyway và Spring Data JPA. **Đợt 2B** bổ sung refresh token luân chuyển, phiên bền vững và đăng xuất thu hồi ngay cả access token của phiên. Native dùng JSON; web dùng cookie HttpOnly và CSRF. **Frontend đã nối 2C.1/2C.2: đăng ký/đăng nhập/hồ sơ, khôi phục/refresh/logout**; nghiệm thu thiết bị thật ở 2C.3. Dữ liệu học tập frontend vẫn trong bộ nhớ. Xem `../docs/FRONTEND-AUTH-2C2.md`.

## Chạy trên máy Windows hiện tại

Máy cần JDK 21 có `java` trong PATH, PowerShell, `tar.exe` (Windows 10/11) và mạng cho lần tải dependency đầu. Không cần Maven/Docker/PostgreSQL cài sẵn.

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Script sẽ:

1. Tải PostgreSQL portable và driver JDBC từ Maven Central, đối chiếu SHA-256 đã ghim trong script.
2. Tạo cluster riêng ở `.local/data`, mật khẩu ngẫu nhiên trong `.local/database.json`, chỉ nghe `127.0.0.1:55432`.
3. Tạo database `focus_study` nếu chưa có; không xóa hoặc tạo lại data khi chạy lần tiếp theo.
4. Tạo cặp khóa RSA ở `.local/auth` nếu chưa có, giữ nguyên khóa ở các lần chạy sau; nạp biến kết nối và chạy Spring Boot. Maven Wrapper tự tải Maven nếu cần.
5. Flyway áp dụng V1 (tài khoản/học kỳ/môn) và V2 (phiên/hash refresh token); Hibernate chỉ `validate`, không tự sửa schema. Không sửa V1 hoặc xóa data đã có.

Mở **http://localhost:8080/api/v1/health**. Kết quả đúng:

```json
{
  "data": { "status": "UP", "database": "UP" },
  "meta": { "timestamp": "2026-10-22T01:30:00Z", "requestId": "..." }
}
```

`timestamp` và `requestId` thay đổi mỗi yêu cầu. Có thể kiểm tra ở terminal khác:

```powershell
Invoke-RestMethod 'http://localhost:8080/api/v1/health' | ConvertTo-Json -Depth 5
```

Nếu PowerShell báo script bị chặn, có thể dùng `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Run-Local.ps1` cho riêng process này, không cần đổi chính sách của máy. Nếu cổng API đã bận, đặt `$env:SERVER_PORT='8085'` trước khi chạy.

Ctrl+C dừng backend, PostgreSQL vẫn chạy để lần mở sau nhanh hơn. Dừng database riêng của project bằng:

```powershell
.\scripts\Stop-LocalDatabase.ps1
```

Nếu cổng database 55432 đã bận ở lần thiết lập đầu, chạy `.\scripts\Setup-LocalDatabase.ps1 -Port 55433` rồi chạy `Run-Local.ps1`; các script sẽ dùng lại cổng đã lưu.

Lần chạy đầu có thể lâu vì tải dependency. Không xóa `.local/data` để xử lý lỗi khởi động. Gói portable này chỉ dành cho phát triển/thử cục bộ, không cài Windows service và không dùng cho triển khai production.

## Kiểm tra

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Test-Local.ps1
```

Chạy test API, Bean Validation và migration trên PostgreSQL thật. Test tích hợp tự tạo schema `backend_it_<uuid>` rồi chỉ xóa schema thử đó; không dùng H2 hoặc xóa dữ liệu trong schema app. Kết quả ở `target/surefire-reports`. File jar được đóng gói trong `target` sau khi `verify` qua.

Test xác nhận: Flyway chạy lại không tạo trùng; JPA khớp schema; term chỉ 1–3; kỳ/mã môn không trùng trong cùng phạm vi; chỉ một kỳ hiện tại/tài khoản; môn không thể tham chiếu học kỳ của tài khoản khác; số tín chỉ hợp lệ; API health/401/405/CORS/request ID và thông báo lỗi không lộ nội dung SQL/stack trace.

Đã chạy ngày 22/10/2026: **51 tests qua**, Maven verify/đóng gói thành công (17 nền tảng + 13 auth + 5 giới hạn tần suất + 15 phiên/script PowerShell 5.1 + 1 kiểm tra đóng/mở backend ba lần). Có token hết hạn/phát lại, refresh đồng thời, logout chỉ đúng phiên, cookie/CSRF/origin, hai hồ sơ và không nhận token ở query. Test tự sinh khóa thử trong `target/`. Xem `../docs/BACKEND-PHASE-2B.md`; kết quả các đợt cũ giữ trong tài liệu tương ứng.

Thử API thủ công khi backend đang chạy, tại terminal thứ hai:

```powershell
.\scripts\Try-Auth.ps1 -Mode Register
.\scripts\Try-Auth.ps1 -Mode Login
.\scripts\Try-Session.ps1
```

Try-Auth thử đăng ký/đăng nhập/hồ sơ và đóng phiên thử ở cuối. Try-Session thử đăng nhập → refresh → logout → hai loại token bị từ chối; thêm `-SimulateReplay` để thử dùng lại token cũ, hoặc `-PauseForRestart` để dừng giữa chừng và khởi động lại backend. Mật khẩu nhập ẩn, token chỉ giữ trong biến của lần chạy, không in/lưu file. Không cần mở Expo. REST Client có `api/auth.http` cho native/terminal và `api/auth-browser.http` cho cookie/CSRF.

## Dùng PostgreSQL đã cài hoặc môi trường CI

Tạo trước database và quyền tạo schema/migration cho role của môi trường phát triển. Đặt biến trực tiếp, không chỉ sửa `.env.example` vì Spring/Maven không tự đọc file đó:

```powershell
$env:DB_URL='jdbc:postgresql://127.0.0.1:5432/focus_study'
$env:DB_USER='your_database_role'
$env:DB_PASSWORD='your_local_password'
.\scripts\Setup-LocalAuth.ps1
.\mvnw.cmd spring-boot:run
```

Với test trên database riêng: đặt thêm `TEST_DB_URL`, `TEST_DB_USER`, `TEST_DB_PASSWORD`, rồi chạy `.\mvnw.cmd verify`. Role test cần tạo/drop schema thử. Các script `Run-Local`/`Test-Local` chủ động dùng bộ PostgreSQL portable; dùng lệnh Maven trực tiếp nếu muốn kết nối PostgreSQL bên ngoài.

Maven dùng `.mvn/settings.xml` riêng của project để tải các dependency công khai từ Maven Central, tránh repository thương mại/snapshot được khai báo gián tiếp trong dependency. Không sửa cấu hình Maven toàn máy. Chạy lệnh từ thư mục `backend` để đường dẫn settings được nhận đúng.

## Cấu trúc

```text
backend/
├── .mvn/                         Maven Wrapper và repository của project
├── scripts/                      Khởi tạo/chạy/dừng database, chạy app/test
├── api/                          foundation.http, auth.http, auth-browser.http
├── docs/SCHEMA.md                Quan hệ dữ liệu đã tạo và thiết kế đợt sau
├── docs/API.md                   Phản hồi thành công/lỗi và phạm vi API
├── src/main/java/com/focusstudy/
│   ├── config/                  Security/CORS
│   ├── common/api/              Response, ProblemDetail, request ID
│   ├── common/persistence/      UUID, timestamp và optimistic version
│   ├── health/                  API kiểm tra database
│   ├── auth/                    Đăng ký/đăng nhập, JWT, băm mật khẩu, giới hạn thử
│   │   ├── dto/                 Request/response; không log mật khẩu hoặc token
│   │   ├── validation/          Kiểm tra xác nhận mật khẩu
│   │   └── session/             Phiên, hash refresh token, transport và kiểm tra thu hồi
│   ├── users/                   Entity, repository, DTO hồ sơ và GET /users/me
│   └── academics/               Entity, service, DTO/API học kỳ và môn theo tài khoản
├── src/main/resources/
│   ├── application.yml
│   └── db/migration/             V1 nền tảng; V2 phiên và refresh token
└── src/test/java/com/focusstudy/ Kiểm thử API và PostgreSQL
```

GET/POST/PUT/DELETE học kỳ/môn đã mở ở 3A/3B và cần Bearer/phiên hoạt động. POST đăng ký/đăng nhập/refresh/logout, GET CSRF và hai health endpoint không yêu cầu access token. Cookie auth bắt buộc CSRF và origin được phép. GET `/api/v1/users/me` cần Bearer token gắn phiên còn hiệu lực; các endpoint học tập khác vẫn khóa. CORS cho localhost 8092/8081 và cho credentials với origin cụ thể, không wildcard. API mặc định chỉ nghe localhost; cấu hình điện thoại sẽ làm ở 2C.

Mật khẩu PBKDF2-HMAC-SHA256 với salt 16 byte, 600.000 vòng, hash 256 bit; nhận 8–128 ký tự và giữ nguyên khoảng trắng. JWT RS256 chỉ nhận qua Authorization, có `sid`; mỗi request kiểm tra phiên chưa bị thu hồi/hết hạn trong DB. Refresh token là bí mật ngẫu nhiên 256 bit, chỉ lưu SHA-256, dùng một lần. Phiên tối đa 30 ngày; mỗi refresh token tối đa 7 ngày và không vượt hạn phiên. Dùng lại token đã tiêu thụ sẽ thu hồi cả phiên; client 2C cần gộp refresh đồng thời và không tự gửi lại token cũ sau lỗi mạng không rõ kết quả.

Web dùng `FOCUS_REFRESH` HttpOnly/SameSite=Strict/path `/api/v1/auth`; lấy CSRF qua GET `/api/v1/auth/csrf`, gửi mã trong `X-XSRF-TOKEN` và `X-Auth-Transport: cookie` cùng origin được phép. Native/terminal không có Origin dùng body token; không dùng cookie auth ở chế độ này. Không gửi Authorization cũ cho login/refresh/logout. Xem hợp đồng chi tiết trong `docs/API.md`.

Khóa `.local/auth`, thông tin DB và `target/` ngoài Git. Môi trường khác cấp khóa riêng bằng `JWT_PRIVATE_KEY_LOCATION`/`JWT_PUBLIC_KEY_LOCATION`. Production HTTPS phải đặt `AUTH_COOKIE_SECURE=true`, cùng cấu hình origin/host theo deployment; không trộn localhost và 127.0.0.1 khi thử cookie web. Xác minh email/khôi phục mật khẩu, giới hạn chia sẻ giữa các instance, danh sách/thu hồi mọi thiết bị và job dọn phiên hết hạn chưa triển khai.

## Nguồn phiên bản và quy ước

- [Spring Initializr metadata](https://start.spring.io/metadata/client)
- [Spring Boot 4.1 system requirements](https://docs.spring.io/spring-boot/4.1/system-requirements.html)
- [Spring Boot 4.1 database initialization/Flyway](https://docs.spring.io/spring-boot/4.1/how-to/data-initialization.html)
- [Spring Framework 7 ProblemDetail](https://docs.spring.io/spring-framework/reference/7.0/web/webmvc/mvc-ann-rest-exceptions.html)
- [Nguồn đóng gói PostgreSQL portable Zonky](https://github.com/zonkyio/embedded-postgres-binaries) và [artifact Maven Central](https://repo.maven.apache.org/maven2/io/zonky/test/postgres/embedded-postgres-binaries-windows-amd64/17.11.0/)

UI học kỳ đã nối ở **3C.1**; xem `../docs/FRONTEND-SEMESTERS-3C1.md`. Tiếp theo: **3C.2 nối giao diện môn**; API học kỳ/môn 3A/3B đã có. 2C.3A đã kiểm tra web, 2C.3B thiết bị thật để làm sau. Token 2A cũ thiếu `sid` cần đăng nhập lại sau nâng cấp 2B. Phân quyền dữ liệu học tập phải kiểm tra khi mở từng API tương ứng.
