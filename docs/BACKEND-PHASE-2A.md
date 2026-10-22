# Backend 2A — Đăng ký, đăng nhập và hồ sơ

Ngày 22/10/2026. Đợt tài khoản chia **2A API → 2B phiên → 2C nối React Native**. Tài liệu này chỉ nghiệm thu 2A; không sửa giao diện hoặc lưu dữ liệu học tập ở đợt này.

## Đã làm

- POST `/api/v1/auth/register`: chuẩn hóa email/hồ sơ, xác nhận mật khẩu, lưu tài khoản và hash vào PostgreSQL; trả 201, trùng email trả 409 kể cả hai yêu cầu đồng thời.
- POST `/api/v1/auth/login`: kiểm tra mật khẩu, trả access token RS256 hạn 15 phút và hồ sơ. Sai email/mật khẩu cùng thông báo 401.
- GET `/api/v1/users/me`: token hợp lệ mới được đọc hồ sơ của chính chủ thể token. Hai tài khoản không thể đổi `userId` để đọc hồ sơ của nhau.
- Validation 400 theo từng trường; không trả mật khẩu/hash hoặc nội dung kỹ thuật JWT trong lỗi. Các DTO chứa bí mật có `toString` ẩn dữ liệu; không log request body/token.
- Mật khẩu PBKDF2-HMAC-SHA256, salt ngẫu nhiên 16 byte, 600.000 vòng, hash 256 bit, hỗ trợ 8–128 ký tự theo Java String; không cắt/trộn khoảng trắng. Khóa ký RSA được tạo một lần trong `.local/auth`, dùng lại sau khi khởi động lại.
- Giới hạn theo IP trực tiếp: đăng ký 10/phút, đăng nhập 30/phút; trả 429/Retry-After. Giới hạn hiện nằm trong bộ nhớ một process.
- Cấu trúc riêng `auth/dto`, `auth/validation`, `users`; không đưa auth vào entity hoặc controller học kỳ/môn.

Chưa có refresh, thu hồi token/đăng xuất, email xác minh, quên/đổi mật khẩu, API sửa hồ sơ, hoặc kết nối UI. Access token ở 2A cần cho hồ sơ có bảo vệ; 2B vẫn chịu trách nhiệm giữ phiên và đăng xuất. Các endpoint học tập tiếp tục khóa; dữ liệu hai tài khoản phải được kiểm tra theo chủ sở hữu khi mở từng API học tập.

## Thử thủ công — hai terminal

Terminal 1, backend:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Nếu đang chạy bản backend cũ, Ctrl+C terminal đó rồi chạy lại lệnh trên để nhận code mới. Giữ terminal chạy. Health vẫn ở `http://localhost:8080/api/v1/health`.

Terminal 2, thử đăng ký:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Try-Auth.ps1 -Mode Register
```

Nhập email thử chưa dùng, họ tên, mật khẩu ít nhất 8 ký tự và nhập lại. Mật khẩu được nhập ẩn. Kết quả mong đợi: **Đăng ký thành công → Đăng nhập thành công → hồ sơ có email/họ tên vừa nhập**. Script giữ token trong biến của lần chạy, không in/lưu token ra file; mở trình duyệt trực tiếp `/users/me` sẽ 401 vì không có Bearer header.

Thử lại tài khoản đã tạo:

```powershell
.\scripts\Try-Auth.ps1 -Mode Login
```

Không cần khởi động Expo để thử API. Giao diện đăng nhập trên web vẫn là minh họa cho đến 2C. Nếu backend dùng cổng khác, thêm `-BaseUrl http://localhost:8085` vào lệnh thử.

## Một vòng kiểm tra

| Thao tác | Kết quả mong đợi |
| --- | --- |
| Register email A mới | Đăng ký/đăng nhập thành công, hồ sơ A. |
| Register lại A, đổi hoa/thường hoặc thêm khoảng trắng ngoài email | `EMAIL_ALREADY_EXISTS`; tài khoản cũ không đổi mật khẩu. |
| Login A với mật khẩu sai | `INVALID_CREDENTIALS`, không có hồ sơ/token mới. |
| Register với xác nhận mật khẩu khác | `VALIDATION_FAILED`, trường confirmPassword; chưa tạo tài khoản. |
| Register B rồi Login lại A | Mỗi lần nhận đúng ID/email/họ tên của tài khoản đăng nhập. |
| Ctrl+C backend, chạy lại Run-Local, Login A | A vẫn còn vì dữ liệu nằm trong PostgreSQL. |
| Gọi `/users/me` không token | 401, không có hồ sơ. |
| Token hết hạn | 401; ở 2A đăng nhập lại. |

File `../backend/api/auth.http` có các request mẫu cho VS Code REST Client. API chi tiết ở `../backend/docs/API.md`.

## Kiểm thử tự động đã chạy

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Test-Local.ps1
```

**34 tests, 0 failures, 0 errors, 0 skipped; Maven verify/đóng gói thành công.** Gồm:

- 17 tests nền tảng: migration/JPA/ràng buộc sở hữu/health/lỗi/CORS/request ID.
- 13 tests tích hợp auth: salt/hash, chuẩn hóa, đăng ký trùng đồng thời, validation, đăng nhập, chữ ký/claims/thời hạn JWT, hai hồ sơ, query token bị bỏ qua, mật khẩu Unicode dài và tài khoản đã xóa.
- 4 tests giới hạn tần suất: hai cửa sổ độc lập, hết cửa sổ, giới hạn bộ nhớ, 429/Retry-After, không tin X-Forwarded-For và bỏ qua OPTIONS.

Tích hợp chạy với PostgreSQL thật trong schema `backend_it_<uuid>` riêng rồi chỉ dọn schema thử; không tạo tài khoản thử trong schema ứng dụng. Khóa test nằm trong `target/`, không dùng khóa cục bộ của app. Báo cáo ở `backend/target/surefire-reports` (ngoài Git).

## Phạm vi đợt kế tiếp

- **2B:** refresh token lưu hash, hết hạn/luân chuyển/thu hồi, đăng xuất và kiểm tra phát lại; chốt cơ chế web/native và CSRF nếu dùng cookie.
- **2C:** nối UI đăng ký/đăng nhập/hồ sơ với API, tự refresh, lưu phiên phù hợp thiết bị, timeout/thử lại và dọn trạng thái khi đổi tài khoản.
- **Đợt 3:** CRUD học kỳ/môn; lấy owner từ phiên, kiểm tra hai tài khoản không đọc/ghi chéo.

## Nguồn kỹ thuật đã đối chiếu

- [Spring Security 7.1 — JWT resource server](https://docs.spring.io/spring-security/reference/7.1/servlet/oauth2/resource-server/jwt.html): decoder, validator và cơ chế Bearer của Spring.
- [Spring Security 7.1 — Password storage](https://docs.spring.io/spring-security/reference/7.1/features/authentication/password-storage.html): PasswordEncoder và PBKDF2.
- [Spring Security 7.1 — Bearer tokens](https://docs.spring.io/spring-security/reference/7.1/servlet/oauth2/resource-server/bearer-tokens.html): Authorization header; không bật token ở query/form.

Tên commit: **Triển khai API đăng ký đăng nhập và hồ sơ tài khoản**. Lệnh push trong `GIT-COMMITS.md`.
