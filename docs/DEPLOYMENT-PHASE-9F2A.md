# 9F.2A — Chuẩn bị Render Free và Neon Free

Render sẽ chạy backend từ Dockerfile của project. Neon lưu PostgreSQL cho bản demo. Chuẩn bị cấu hình và thử trước trên Docker Desktop. Dùng địa chỉ HTTPS của Render khi nghiệm thu 9F.2B.

## Cấu hình dịch vụ trên Render

Tạo một **Web Service** từ nhánh `main` của repository sau khi đã đẩy code Docker lên GitHub. Khi cấu hình Render, dùng các giá trị sau.

| Mục | Giá trị |
| --- | --- |
| Language | Docker |
| Instance Type | Free |
| Root Directory | `backend` |
| Dockerfile Path | `./Dockerfile` |
| Docker Build Context | `.` |
| Health Check Path | `/api/v1/health` |
| Docker Command | Để trống để dùng lệnh trong image |

Render cấp `PORT`, mặc định `10000`. Profile `prod` đọc biến này và lắng nghe trên `0.0.0.0`. Đường dẫn Dockerfile và build context tính từ `backend`. [Web services](https://render.com/docs/web-services) · [Root directory](https://render.com/docs/monorepo-support#root-relative-settings)

Nhập các giá trị từ `backend/deploy/render.env.example` trong **Environment**. Giá trị `JAVA_TOOL_OPTIONS` dùng nguyên dòng `-Xmx256m -XX:ActiveProcessorCount=2`. Cấu hình này dành cho dịch vụ Render Free, có giới hạn 512 MB. [Giá và cấu hình Render](https://render.com/pricing)

## PostgreSQL trên Neon

Tạo project Neon Free riêng cho demo. Trong **Connect**, chọn database, role và tắt **Connection pooling** để lấy hostname direct. Nhập hostname và tên database vào `DB_URL`. Nhập role và mật khẩu vào `DB_USER` và `DB_PASSWORD` riêng. Ví dụ dạng JDBC

```text
jdbc:postgresql://NEON_DIRECT_HOST:5432/NEON_DATABASE?sslmode=verify-full&sslfactory=org.postgresql.ssl.DefaultJavaSSLFactory&channelBinding=require
```

`verify-full` xác minh cả chứng chỉ và hostname. Factory dùng kho CA của Java. `channelBinding=require` theo cấu hình kết nối Java của Neon. Giữ endpoint direct để Flyway chạy migration. Đợt demo dùng database mới. Flyway tạo các bảng khi backend khởi động. [Kết nối Java với Neon](https://neon.com/docs/guides/java) · [Endpoint direct](https://neon.com/docs/connect/connection-pooling#enable-disable-and-find-the-pooled-connection-string-in-the-console) · [TLS pgJDBC](https://jdbc.postgresql.org/documentation/ssl/)

## Khóa JWT và origin

Từ thư mục `backend`, tạo một cặp khóa riêng cho lần deploy Render.

```powershell
java scripts/CreateLocalAuthKeys.java .local/render-auth
```

Trong **Environment → Secret Files** của Render, thêm hai tệp `private.pem` và `public.pem` với nội dung tương ứng từ thư mục vừa tạo. Render mount tại `/etc/secrets`. Dockerfile chạy user `focus` với UID `10001` và nhóm phụ `1000` để đọc khóa mount. Giữ cùng hai khóa và `JWT_ISSUER` khi redeploy để token còn hạn có thể tiếp tục xác thực. Dùng URL HTTPS thật của API làm `JWT_ISSUER`. [Render Docker secrets](https://render.com/docs/docker-secrets#accessing-secret-files-at-runtime)

Đặt `CORS_ALLOWED_ORIGINS` thành origin HTTPS của web app, bỏ dấu `/` ở cuối. Nếu đợt đầu chỉ thử API qua PowerShell hoặc app native, điền origin HTTPS của chính API cho tới khi có địa chỉ web. Khi triển khai web, kiểm tra cookie `SameSite=Strict` qua cùng origin hoặc hai subdomain HTTPS cùng site. Mật khẩu database và khóa riêng điền trực tiếp trong Render. Các mẫu trong Git chỉ chứa placeholder.

Giữ `PASSWORD_RESET_ENABLED=false` khi demo trên Render Free. Đợt này cần thử đăng ký và đăng nhập. Tính năng gửi email đặt lại mật khẩu cần cấu hình riêng vì Render Free chặn các cổng SMTP 25, 465 và 587. [Giới hạn Render Free](https://render.com/docs/free#other-limitations)

## Bài test Docker tại máy

Chạy image với `--memory 512m --memory-swap 512m`, `PORT=10000` và PostgreSQL 17 trong mạng QA riêng. Đo đỉnh RAM của toàn container bằng `memory.peak` từ cgroup, gồm JVM và bộ nhớ ngoài heap. Cấu hình JVM mặc định đã đạt 475,3 MiB ở lượt khởi động và ghi dữ liệu đầu tiên. Vì mức đó gần giới hạn, mẫu Render đặt heap tối đa 256 MiB và giới hạn số CPU JVM dùng để chọn số luồng nội bộ.

Image chạy user `focus` đã được thử với khóa chỉ đọc do root sở hữu, nhóm `1000`, quyền `0440`, tương tự trường hợp khóa bị giới hạn theo nhóm. Bài thử bao gồm health, Flyway trên database mới, đăng ký, đăng nhập, đọc hồ sơ và tạo học kỳ. Sau restart, kiểm tra đúng tài khoản, cùng học kỳ, access token cũ và refresh token. Đây là bài thử cục bộ bằng PostgreSQL QA. Kết nối TLS tới Neon và cold start của Render sẽ được đo ở 9F.2B.

| Lượt kiểm tra với image 9F.2A | Thời gian sẵn sàng cục bộ | Đỉnh RAM |
| --- | --- | --- |
| Khởi động và ghi dữ liệu đầu tiên | 8,7 giây | 325,3 MiB |
| Restart, đọc dữ liệu và refresh phiên | 7,5 giây | 335,8 MiB |

Đã dọn container, network và volume QA do bài thử tạo.

## Nghiệm thu 9F.2B

1. Deploy lên Render Free và xác nhận `/api/v1/health` trả `status: UP`, `database: UP` qua URL HTTPS công khai.
2. Thử đăng ký, đăng nhập và tạo một học kỳ demo. Redeploy cùng cấu hình khóa, rồi đọc lại dữ liệu và kiểm tra phiên.
3. Đo bộ nhớ và lần gọi đầu sau khi dịch vụ ngủ. Xác nhận đăng nhập hoạt động qua proxy và chỉ cho phép origin web đã cấu hình. Nếu web được triển khai cùng đợt, kiểm tra cookie refresh và F5 trên trình duyệt.

Render Free cho dịch vụ ngủ sau 15 phút không có lượt truy cập. Thời gian khởi động trong bài test local không gồm thời gian Render bật lại dịch vụ hoặc Neon mở kết nối. [Render Free và trạng thái ngủ](https://render.com/docs/free#spinning-down-on-idle)
