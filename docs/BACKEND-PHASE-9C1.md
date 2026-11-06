# 9C.1 — Backend quên mật khẩu qua email

Backend nhận email và gửi liên kết đặt lại mật khẩu qua SMTP. Dùng Mailpit trên máy để thử với địa chỉ `@example.test`. Form mở liên kết và nhập mật khẩu mới thuộc 9C.2. Trong 9C.1, dùng HTTP client hoặc Postman để xác nhận.

## Chạy thử trên Windows

Mở một cửa sổ PowerShell và chạy Mailpit, chỉ lắng nghe trên máy này. Nếu chưa có `mailpit.exe`, tải bản Windows từ [trang cài đặt Mailpit](https://mailpit.axllent.org/docs/install/), giải nén rồi chạy trong thư mục chứa file.

```powershell
.\mailpit.exe --listen 127.0.0.1:8025 --smtp 127.0.0.1:1025
```

Trên máy dùng để kiểm thử 9C.1, bản portable đã xác minh nằm trong `backend/.local/password9c1-mailpit`. Có thể chạy từ thư mục `backend` bằng lệnh sau.

```powershell
.\.local\password9c1-mailpit\mailpit.exe --listen 127.0.0.1:8025 --smtp 127.0.0.1:1025
```

Mở cửa sổ PowerShell thứ hai trong project. Các biến dưới đây có hiệu lực trong cửa sổ này. Nếu backend cũ vẫn dùng cổng 8080, dừng backend đó bằng `Ctrl+C` trước khi chạy lại.

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
$env:PASSWORD_RESET_ENABLED = 'true'
$env:PASSWORD_RESET_FROM = 'focus@example.test'
$env:PASSWORD_RESET_URL = 'http://localhost:8092/'
$env:RESET_SMTP_HOST = '127.0.0.1'
$env:RESET_SMTP_PORT = '1025'
$env:RESET_SMTP_AUTH = 'false'
$env:RESET_SMTP_STARTTLS = 'false'
powershell.exe -NoProfile -File .\scripts\Run-Local.ps1
```

Flyway áp dụng V15 khi backend khởi động. Dùng một tài khoản thử đã đăng ký, chẳng hạn `reset-qa@example.test`. Gửi yêu cầu trong mẫu HTTP. Mở hộp thư Mailpit tại [127.0.0.1:8025](http://127.0.0.1:8025/).

1. Gửi email thử đến endpoint `/request`. Kết quả là `202` và thông báo chung.
2. Mở thư vừa nhận và sao chép phần sau `#reset-token=` vào biến riêng `resetToken` trong HTTP client. Điền mật khẩu thử mới vào biến `newPassword` rồi gửi `/confirm`.
3. Sau `204`, gửi lại mã vừa dùng. Kết quả phải là `400 PASSWORD_RESET_LINK_INVALID`. Thử đăng nhập với mật khẩu cũ rồi mật khẩu mới. Phiên đăng nhập cũ bị thu hồi và dữ liệu học tập vẫn truy cập được sau khi đăng nhập lại.
4. Gửi `/request` cho một email chưa đăng ký. API trả cùng `202` và thông báo như bước 1. Hộp thư không nhận thư cho địa chỉ này.

[Mẫu yêu cầu HTTP](../backend/api/password-reset.http)

## Hợp đồng API

| Lệnh | Body JSON | Kết quả |
| --- | --- | --- |
| `POST /api/v1/auth/password-reset/request` | `{ "email": "reset-qa@example.test" }` | `202` với `data.message` giống nhau cho email hợp lệ đã đăng ký hoặc chưa đăng ký. |
| `POST /api/v1/auth/password-reset/confirm` | `{ "token": "…", "newPassword": "…", "confirmPassword": "…" }` | `204` khi đã đặt lại mật khẩu và thu hồi phiên. Đăng nhập lại qua API login. |

- Email được chuẩn hóa như khi đăng nhập. Mật khẩu dài 8–128 ký tự, giữ khoảng trắng và Unicode, hai lần nhập phải khớp.
- Link có hiệu lực 30 phút. Mỗi tài khoản có một mã đang lưu. Sau 60 giây mới có thể gửi một mã mới cho tài khoản đó và mã mới thay thế mã cũ. Đổi mật khẩu qua 9B hoặc dùng mã thành công cũng vô hiệu hóa mã đang lưu.
- API trả `400 PASSWORD_RESET_LINK_INVALID` cho mã sai, hết hạn hoặc đã dùng, `400 PASSWORD_CONFIRMATION_MISMATCH` khi hai lần nhập khác nhau và `400 VALIDATION_FAILED` cho dữ liệu không hợp lệ.
- Mặc định giới hạn theo IP là 5 lượt/phút cho `/request` và 10 lượt/phút cho `/confirm`. Khi vượt giới hạn, API trả `429` kèm `Retry-After`. Trình duyệt lấy CSRF từ `GET /api/v1/auth/csrf` và gửi kèm cookie cùng header `X-XSRF-TOKEN` theo cơ chế auth hiện có. HTTP client cục bộ gửi JSON trực tiếp, không dùng cookie.
- `202` xác nhận yêu cầu đã vào hàng đợi trong bộ nhớ. Nếu backend dừng hoặc SMTP lỗi, người dùng có thể gửi lại sau thời gian chờ. Hệ thống gửi thêm thư thông báo sau khi đổi thành công. Lỗi gửi thư thông báo không làm hỏng việc đặt lại đã hoàn tất.

Tính năng mặc định tắt và trả `503 PASSWORD_RESET_UNAVAILABLE`. Khi cấu hình SMTP ngoài máy cục bộ, dùng STARTTLS và khai báo `RESET_SMTP_HOST`, `RESET_SMTP_PORT`, `RESET_SMTP_USERNAME`, `RESET_SMTP_PASSWORD`, `PASSWORD_RESET_FROM` và `PASSWORD_RESET_URL` trỏ đến trang HTTPS của ứng dụng. Giữ thông tin SMTP, mã và mật khẩu trong cấu hình riêng. Health chung của backend kiểm tra dịch vụ lõi. Kiểm tra việc gửi thư bằng hộp thư thử và log của worker.

Liên kết lấy địa chỉ từ cấu hình, với mã trong fragment `#reset-token=`. Cơ sở dữ liệu lưu SHA-256 của mã. Bước xác nhận khóa tài khoản, kiểm tra lại mã và ghi mật khẩu, xóa mã, thu hồi phiên trong cùng transaction. [Hướng dẫn bảo mật OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)

## Kiểm thử ngày 06/11/2026

Maven verify qua 74 bài thuộc 7 bộ liên quan, gồm 9 bài mới cho luồng đặt lại mật khẩu và giới hạn lượt gửi. Đã kiểm tra HTTP với PostgreSQL cho mã hết hạn, xác nhận trùng thời điểm, vô hiệu hóa mã sau 9B, rollback khi thu hồi phiên lỗi và CSRF của trình duyệt. JAR đóng gói thành công.

JAR đã gửi thư qua SMTP tới Mailpit cục bộ bằng tài khoản `@example.test` trong schema thử. API trả `202` cho cả email có và chưa có tài khoản. Dùng mã từ thư trả `204`, dùng lại trả `400`. Mật khẩu cũ và các phiên cũ trả `401`, mật khẩu mới đăng nhập được và hộp thư nhận thông báo hoàn tất. Backend và Mailpit của lượt thử đã dừng, schema và dữ liệu hộp thư thử đã dọn.
