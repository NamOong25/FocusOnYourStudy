# Backend — FocusYourStudy

Java 21, Spring Boot **4.1.1**, Maven Wrapper **3.10.0**, PostgreSQL **17.11**, Flyway và Spring Data JPA. Khởi tạo từ Spring Initializr chính thức ngày 22/10/2026. **Đợt 2A** đã có API đăng ký/đăng nhập/hồ sơ và access token 15 phút. Frontend ở thư mục cha vẫn dùng dữ liệu trong bộ nhớ, chưa nối API. Refresh token/giữ phiên/đăng xuất thuộc đợt 2B; nối React Native thuộc 2C.

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
5. Flyway tạo ba bảng nền; Hibernate chỉ `validate`, không tự sửa schema.

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

Đã chạy ngày 22/10/2026: **34 tests qua**, Maven verify/đóng gói thành công (17 nền tảng + 13 tích hợp auth + 4 giới hạn tần suất). Có kiểm tra mật khẩu băm riêng theo salt, đăng ký trùng đồng thời, token giả/hết hạn/sai claim, mật khẩu Unicode dài và hai hồ sơ riêng. Test tự sinh khóa thử trong `target/`. Kết quả health 200 → 503 → 200 đã kiểm tra ở đợt 1. Xem `../docs/BACKEND-PHASE-1.md` và `../docs/BACKEND-PHASE-2A.md`.

Thử API thủ công khi backend đang chạy, tại terminal thứ hai:

```powershell
.\scripts\Try-Auth.ps1 -Mode Register
.\scripts\Try-Auth.ps1 -Mode Login
```

Script đăng ký yêu cầu email, họ tên, mật khẩu và xác nhận; sau đó tự đăng nhập và lấy hồ sơ. Chế độ Login dùng lại tài khoản đã tạo. Mật khẩu nhập ẩn, token chỉ giữ trong biến của lần chạy, không in ra hoặc lưu file. Không cần mở Expo để thử API này. API mẫu cho REST Client nằm trong `api/auth.http`.

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
├── api/                          foundation.http và auth.http
├── docs/SCHEMA.md                Quan hệ dữ liệu đã tạo và thiết kế đợt sau
├── docs/API.md                   Phản hồi thành công/lỗi và phạm vi API
├── src/main/java/com/focusstudy/
│   ├── config/                  Security/CORS
│   ├── common/api/              Response, ProblemDetail, request ID
│   ├── common/persistence/      UUID, timestamp và optimistic version
│   ├── health/                  API kiểm tra database
│   ├── auth/                    Đăng ký/đăng nhập, JWT, băm mật khẩu, giới hạn thử
│   │   ├── dto/                 Request/response; không log mật khẩu hoặc token
│   │   └── validation/          Kiểm tra xác nhận mật khẩu
│   ├── users/                   Entity, repository, DTO hồ sơ và GET /users/me
│   └── academics/               Entity học kỳ/môn (chưa có API CRUD)
├── src/main/resources/
│   ├── application.yml
│   └── db/migration/V1__create_accounts_and_academics.sql
└── src/test/java/com/focusstudy/ Kiểm thử API và PostgreSQL
```

POST đăng ký/đăng nhập và hai health endpoint công khai. GET `/api/v1/users/me` bắt buộc Bearer token, lấy danh tính từ token; các endpoint nghiệp vụ khác vẫn khóa. Không tạo tài khoản demo hoặc mật khẩu đăng nhập tự sinh. CORS cho localhost 8092/8081, có thể đổi bằng `CORS_ALLOWED_ORIGINS` phân cách dấu phẩy. API mặc định chỉ nghe localhost; cấu hình truy cập điện thoại sẽ làm khi nối frontend.

Mật khẩu được băm PBKDF2-HMAC-SHA256 với salt ngẫu nhiên 16 byte, 600.000 vòng, hash 256 bit; nhận 8–128 ký tự và giữ nguyên khoảng trắng. JWT ký RS256, kiểm tra chữ ký/issuer/audience/hạn dùng/mục đích/UUID chủ thể; chỉ nhận qua Authorization header. Khóa `.local/auth/private.pem`, thông tin database và `target/` nằm ngoài Git. Với môi trường khác, cấp khóa riêng bằng `JWT_PRIVATE_KEY_LOCATION` và `JWT_PUBLIC_KEY_LOCATION`; không phát hành khóa phát triển lên server. Refresh/thu hồi token và email xác minh/khôi phục mật khẩu chưa được triển khai. Giới hạn thử hiện nằm trong bộ nhớ theo IP của một process, chưa dùng cho nhiều instance/proxy production.

## Nguồn phiên bản và quy ước

- [Spring Initializr metadata](https://start.spring.io/metadata/client)
- [Spring Boot 4.1 system requirements](https://docs.spring.io/spring-boot/4.1/system-requirements.html)
- [Spring Boot 4.1 database initialization/Flyway](https://docs.spring.io/spring-boot/4.1/how-to/data-initialization.html)
- [Spring Framework 7 ProblemDetail](https://docs.spring.io/spring-framework/reference/7.0/web/webmvc/mvc-ann-rest-exceptions.html)
- [Nguồn đóng gói PostgreSQL portable Zonky](https://github.com/zonkyio/embedded-postgres-binaries) và [artifact Maven Central](https://repo.maven.apache.org/maven2/io/zonky/test/postgres/embedded-postgres-binaries-windows-amd64/17.11.0/)

Tiếp theo: 2B refresh/giữ phiên/đăng xuất → 2C nối giao diện tài khoản → đợt 3 API học kỳ/môn. Hai tài khoản hiện có hồ sơ riêng; phân quyền toàn bộ dữ liệu học tập phải được kiểm tra khi mở từng API tương ứng.
