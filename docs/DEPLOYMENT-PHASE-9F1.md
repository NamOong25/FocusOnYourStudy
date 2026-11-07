# 9F.1 — Chuẩn bị backend cho server

Đợt này bổ sung profile `prod`, Dockerfile và mẫu biến môi trường. Backend vẫn chạy local như trước bằng `scripts/Run-Local.ps1`. Chưa tạo dịch vụ hosting, chưa đưa dữ liệu lên mạng và chưa đổi địa chỉ API của frontend.

## Những gì đã thêm

- `backend/src/main/resources/application-prod.yml` yêu cầu database, issuer, khóa JWT và CORS được cấu hình rõ ràng. Lắng nghe `0.0.0.0`, hỗ trợ biến `PORT` từ hosting và mặc định cookie `Secure`.
- `ProductionConfig` kiểm tra cấu hình trước khi tạo các bean database/xác thực. Thiếu cấu hình, dùng placeholder, CORS HTTP/wildcard, khóa trong classpath/đường dẫn tương đối hoặc tắt Secure sẽ bị từ chối.
- `backend/Dockerfile` build bằng Java 21 và Maven wrapper của project. Image chạy dùng JRE 21, UID/GID `10001`, chỉ chép JAR từ bước build. Không sinh khóa hoặc database trong image. Thiết kế build nhiều giai đoạn theo [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/).
- `backend/.dockerignore` chỉ đưa wrapper, POM và mã nguồn main vào build context, loại các tệp môi trường, cấu hình local và định dạng khóa thông dụng.
- `backend/deploy/production.env.example` là mẫu điền thông tin thật. File `.env.production`, khóa, database cục bộ và thư mục `target` tiếp tục bị Git bỏ qua.

Spring Boot nạp `application-prod.yml` khi bật profile `prod` và cho phép truyền biến môi trường bên ngoài. Tham khảo [Externalized Configuration Spring Boot 4.1](https://docs.spring.io/spring-boot/4.1/reference/features/external-config.html).

## Bạn kiểm tra trên máy hiện tại như thế nào?

Mở terminal trong thư mục `backend`. Database cục bộ cần đang chạy, có thể giữ backend local hiện tại mở. Smoke test dùng cổng riêng được hệ điều hành cấp và schema QA riêng.

Nếu chưa có JAR vừa build, tạo bằng lệnh sau. Lệnh này đóng gói và bỏ qua chạy test.

```powershell
.\mvnw.cmd -B -ntp -DskipTests package
```

Sau đó chạy

```powershell
powershell.exe -NoProfile -File .\scripts\Test-ProductionProfile.ps1
```

Script tự tạo khóa QA, mở JAR với profile `prod`, tạo tài khoản và học kỳ giả, tắt/mở lại JAR rồi kiểm tra phiên cũ, học kỳ và refresh token. Kết thúc sẽ dừng tiến trình QA, xóa schema và các tệp khóa/JAR QA. Không cần nhập tài khoản cá nhân. Log nằm trong `backend/target/production9f1-*.log`.

Kết quả mong đợi

```text
Verified persisted QA data and migrations in PostgreSQL.
PASS production JAR: health, login, persisted semester, same-key restart and refresh.
Removed owned production QA schema.
```

Đây là kiểm tra profile production qua HTTP nội bộ bằng cách gửi phiên dành cho native. Để thử web dùng cookie Secure, cần HTTPS thật ở đợt 9F.2. Mở `localhost:8092` với API production có CORS HTTPS sẽ bị từ chối theo cấu hình.

Muốn chạy toàn bộ test backend với PostgreSQL cục bộ, dùng `scripts/Test-Local.ps1` hiện có. Hai bộ mới là `ProductionConfigTests` và `ProductionIntegrationTests`.

## Cấu hình khi đã chọn được server

Tại thư mục `backend`, sao chép mẫu rồi điền bằng thông tin thật của môi trường deploy

```powershell
Copy-Item deploy/production.env.example .env.production
```

| Biến | Cần điền |
| --- | --- |
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DB_URL` | JDBC PostgreSQL của database riêng. Mẫu dùng TLS `verify-full` cùng CA certificate |
| `DB_USER`, `DB_PASSWORD` | Tài khoản database do bạn quản lý hoặc nhà cung cấp cấp |
| `JWT_ISSUER` | Định danh cố định, ví dụ URL HTTPS của API |
| `JWT_PRIVATE_KEY_LOCATION`, `JWT_PUBLIC_KEY_LOCATION` | URI `file:` tuyệt đối tới khóa được mount vào runtime |
| `CORS_ALLOWED_ORIGINS` | Các origin web HTTPS chính xác, phân tách dấu phẩy, không có dấu `/` cuối |
| `PORT` hoặc `SERVER_PORT` | Hosting có `PORT` thì được ưu tiên, còn lại mặc định 8080 |
| `FORWARD_HEADERS_STRATEGY` | Giữ `NONE` khi chưa biết proxy. Dùng `NATIVE` cùng `TRUSTED_PROXY_IPS` sau khi xác định mạng proxy |

Không có tên miền/database thật trong file mẫu. Các giá trị `replace-with-...` bị từ chối khi chạy. Java không tự đọc `.env.production`. Docker đọc nó qua `--env-file`, hoặc bạn đặt biến trong dashboard hosting/process Java.

### Khóa JWT và kết nối database

Tạo một cặp RSA PKCS8/SPKI riêng cho môi trường production. Có thể dùng tiện ích Java sẵn có của project để tạo vào thư mục được Git bỏ qua

```powershell
java scripts/CreateLocalAuthKeys.java .local/production-auth
```

Tiện ích giữ nguyên cặp đã có, không tạo lại trong mỗi lần deploy. Lưu khóa ở nơi bền vững hoặc secret storage, mount chỉ đọc vào `/run/secrets/jwt`. Trên Linux, bảo đảm UID `10001` đọc được thư mục và tệp khóa. Không chép khóa vào `src/main/resources` hoặc Docker image. Giữ cùng cặp khóa và issuer khi khởi động lại hoặc chạy nhiều instance để phiên cũ còn xác thực được.

Mẫu JDBC dùng CA tại `/run/secrets/postgres/root.crt`. Lấy certificate và hostname chính xác theo hướng dẫn của nhà cung cấp database, rồi mount file CA vào đúng đường dẫn đó. PostgreSQL local của script phát triển không được bật TLS cho mục đích deploy. Không dùng localhost trong container để chỉ database trên máy chủ khác.

Flyway tiếp tục áp dụng V1–V16 trên database mới và kiểm tra checksum trên database hiện có. Hibernate dùng `validate`, không tạo lại bảng hoặc xóa dữ liệu. Khi deploy thật cần database riêng, bản sao lưu và phương án phục hồi của nhà cung cấp.

### Build và mở container khi máy có Docker

Đã thử build và chạy image trên Docker Desktop với PostgreSQL QA. Ví dụ dưới đây dùng cấu hình server tự quản. Sau khi đã điền môi trường, chuẩn bị khóa và CA database, chạy từ `backend`.

```powershell
docker build -t focus-study-backend:9f1 .
$jwtFolder = (Resolve-Path .local/production-auth).Path
$dbCaFile = (Resolve-Path .local/production-db/root.crt).Path
docker run --detach --name focus-study-api --env-file .env.production --mount "type=bind,source=$jwtFolder,target=/run/secrets/jwt,readonly" --mount "type=bind,source=$dbCaFile,target=/run/secrets/postgres/root.crt,readonly" --publish 127.0.0.1:18080:8080 --stop-timeout 30 focus-study-backend:9f1
docker logs focus-study-api
```

Lệnh ví dụ giữ cổng trong container ở 8080. Truy cập [health nội bộ](http://localhost:18080/api/v1/health) phải thấy backend và database `UP`. Container chạy dưới user riêng. Reverse proxy/hosting cung cấp HTTPS ở bên ngoài và chuyển tiếp vào cổng nội bộ. Với hosting tự quản lý cổng, cấu hình tương ứng theo nền tảng ở 9F.2.

Dockerfile bỏ qua test khi build image vì build không cần truy cập database. Chạy test và nghiệm thu riêng trước khi phát hành. Java 21 JDK/JRE dùng [Eclipse Temurin official image](https://hub.docker.com/_/eclipse-temurin).

### Web, HTTPS và proxy

Cookie hiện dùng `SameSite=Strict`. Nên đặt web/API cùng origin qua reverse proxy, hoặc hai subdomain HTTPS của cùng tên miền đăng ký, ví dụ `app.your-domain.com` và `api.your-domain.com`. Hai domain hosting khác site có thể khiến trình duyệt không gửi cookie refresh dù CORS đã cho phép. CORS và SameSite cần được kiểm tra riêng bằng đăng nhập → F5 → refresh → đăng xuất. Tham khảo [Set-Cookie và SameSite](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).

Mặc định không tin các header forwarded do client gửi. Nếu nền tảng cần `NATIVE`, cấu hình regex `TRUSTED_PROXY_IPS` khớp đúng proxy thực tế và chặn truy cập công khai trực tiếp vào backend. Không đặt regex tin mọi địa chỉ. Cần xác nhận hành vi IP/rate limit và HTTPS qua proxy trong 9F.2. Cấu hình dựa trên [Spring Boot chạy sau proxy](https://docs.spring.io/spring-boot/4.1/how-to/webserver.html#howto.webserver.use-behind-a-proxy-server).

Rate limit hiện lưu trong bộ nhớ của từng instance. Bắt đầu với một instance và kiểm tra proxy trước khi mở rộng. SMTP/khôi phục mật khẩu chỉ bật khi đã có URL web HTTPS và thông tin gửi thư thật. Health không kiểm tra khả năng gửi email.

## Kết quả và phần còn lại

- 47 test liên quan đạt trong 5 bộ ProductionConfig, ProductionIntegration, SessionIntegration, FoundationIntegration và AuthRateLimit, gồm 13 test mới. Đã kiểm tra cấu hình không hợp lệ, profile production với PostgreSQL thật, health, CORS, cookie Secure/HttpOnly/SameSite và phiên native. Không chạy lại toàn bộ test backend trong đợt này.
- Maven verify/đóng gói JAR đạt. Script PowerShell 5.1 đã qua kiểm tra giữ phiên/dữ liệu và refresh qua hai lần khởi động JAR với cùng khóa JWT. Đã dọn tiến trình, schema và tệp QA riêng.
- Đã build image, chạy Docker Desktop, kiểm tra health, đăng ký, đăng nhập và đọc lại cùng hồ sơ sau restart. Xem [bài thử giới hạn 512 MB và quyền đọc khóa](DEPLOYMENT-PHASE-9F2A.md). TLS tới database hosting, proxy và cookie trong trình duyệt HTTPS thật còn nghiệm thu ở 9F.2B.
- Frontend, API nghiệp vụ, database migration và dependency của ứng dụng giữ nguyên trong đợt này. Native 2C.3B và tạo APK vẫn nằm ở các đợt riêng.
