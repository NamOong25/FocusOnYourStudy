# Backend 2B — Làm mới phiên và đăng xuất

Ngày 22/10/2026. Chỉ triển khai cơ chế phiên ở backend và công cụ thử API. **Chưa nối các nút đăng ký/đăng nhập trên React Native; đó là đợt 2C.**

## Hiểu bằng một ví dụ

Bạn đăng nhập tài khoản Nam. Backend cấp access token để đọc hồ sơ và refresh token để xin access token mới khi cần. Sau 15 phút, access token hết hạn; client có thể dùng refresh token để nhận bộ token mới mà không nhập lại mật khẩu. Mỗi refresh token chỉ dùng một lần.

Khi đăng xuất, backend đánh dấu phiên đó đã thu hồi trong PostgreSQL. Access token của phiên dù còn hạn cũng bị từ chối. Tài khoản và dữ liệu học tập vẫn còn. Một lần đăng nhập khác trên thiết bị khác không bị đăng xuất theo.

## Đã triển khai

- Flyway **V2** tạo `refresh_sessions`, `refresh_tokens`; không sửa V1 hoặc xóa bảng/dữ liệu cũ. Mỗi phiên gắn một tài khoản, một kênh BODY/COOKIE và thời hạn tuyệt đối.
- Refresh token sinh từ 32 byte ngẫu nhiên, base64url 43 ký tự; DB chỉ lưu SHA-256 và trạng thái tiêu thụ, không lưu token rõ.
- POST `/api/v1/auth/refresh`: nhận token hiện tại, tiêu thụ token cũ và cấp cặp token mới trong transaction. Không cần mật khẩu hoặc access token.
- Phát hiện token cũ đã dùng: thu hồi cả phiên và các access token/token con của phiên. Khóa hàng phiên trong PostgreSQL để hai refresh đồng thời không tạo hai nhánh hợp lệ.
- POST `/api/v1/auth/logout`: trả 204 và thu hồi đúng phiên. Gọi lại không lỗi; token không tồn tại không thu hồi phiên khác.
- Access token RS256 bổ sung claim UUID `sid`; mỗi request xác thực kiểm tra phiên thuộc đúng `sub`, chưa thu hồi, chưa hết hạn. Token cũ của 2A thiếu sid cần đăng nhập lại sau nâng cấp.
- Phiên tối đa **30 ngày** kể từ đăng nhập. Mỗi refresh token tối đa **7 ngày** kể từ lúc cấp, không vượt hạn phiên. Refresh không kéo dài hạn tuyệt đối.
- Phiên và dấu thu hồi lưu PostgreSQL: đóng/mở backend không mất phiên và không khôi phục phiên đã logout. Khóa RSA cục bộ được giữ nguyên như 2A.
- Web: cookie `FOCUS_REFRESH` HttpOnly/SameSite=Strict, path `/api/v1/auth`; refresh token không xuất trong JSON. Spring Security bảo vệ CSRF, kèm kiểm tra Origin/transport. Cookie Secure bật qua cấu hình khi chạy HTTPS.
- Native/terminal: token qua JSON, không Origin/cookie browser; đã chuẩn bị hợp đồng để 2C lưu bằng kho bảo mật thiết bị.
- Giới hạn refresh/logout 60 lần/phút/IP cho mỗi API, độc lập với login/register.

## Thử trong IntelliJ hoặc VS Code

Mở project `D:\Video OBS\QuanLyHocTap\backend`, chọn JDK 21. Các lệnh dưới dùng **Terminal PowerShell** trong IDE.

Terminal 1:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Nếu backend cũ đang chạy, Ctrl+C rồi chạy lại lệnh trên để nạp code/migration mới. Giữ terminal chạy; đợi log Started hoặc kiểm tra `http://localhost:8080/api/v1/health` trả UP.

Terminal 2, nếu chưa có tài khoản:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Try-Auth.ps1 -Mode Register
```

Nhập email, họ tên, mật khẩu ít nhất 8 ký tự và nhập lại. Tài khoản được lưu; phiên thử của script tự đóng ở cuối. Dùng lại tài khoản đó cho kiểm tra 2B:

```powershell
.\scripts\Try-Session.ps1
```

Nhập email/mật khẩu. Kết quả mong đợi:

1. `[PASS] 1.` Đăng nhập và đọc đúng hồ sơ.
2. `[PASS] 2.` Refresh được không cần nhập lại mật khẩu, hồ sơ không đổi.
3. `[PASS] 3.` Đăng xuất thành công.
4. `[PASS] 4.` Access token và refresh token của phiên vừa logout đều bị từ chối.

Script dùng token trong biến của lần chạy, không in/lưu file. Nó tự đóng phiên thử ở cuối, kể cả khi một kiểm tra thất bại; không xóa tài khoản/dữ liệu. Nếu backend dùng cổng 8085, thêm `-BaseUrl http://localhost:8085`.

## Thử token cũ bị dùng lại

```powershell
.\scripts\Try-Session.ps1 -SimulateReplay
```

Script đăng nhập → refresh thành công → cố ý dùng lại token cũ. Backend phải trả `REFRESH_TOKEN_REUSED`, thu hồi cả phiên; access token và refresh token mới cũng bị từ chối. Đây là kiểm tra có chủ đích, không phải lỗi bất ngờ. Đăng nhập lại sau đó vẫn bình thường.

## Thử giữ phiên qua khởi động lại

```powershell
.\scripts\Try-Session.ps1 -PauseForRestart
```

Sau `[PASS] 1`, script dừng chờ. Giữ nguyên terminal 2. Tại terminal 1: Ctrl+C, chạy lại `Run-Local.ps1`, đợi backend Started. Quay lại terminal 2 nhấn Enter. Refresh phải thành công mà không nhập lại mật khẩu, sau đó logout và kiểm tra token bị chặn.

Không tắt terminal 2 vì token thử chỉ ở trong bộ nhớ process đó. Bài test này kiểm tra backend giữ phiên, chưa phải tính năng app tự giữ đăng nhập sau khi đóng app (2C).

## Web và native khác nhau ở đâu?

| Client | Refresh token | Bảo vệ/đầu vào |
| --- | --- | --- |
| Web | Browser giữ cookie HttpOnly, JavaScript không đọc token | GET CSRF trước; POST có X-XSRF-TOKEN, X-Auth-Transport: cookie, origin được phép, credentials: include. |
| Native/terminal | Backend trả refreshToken trong JSON | Body refreshToken, không gửi cookie/Origin browser; native secure storage làm ở 2C. |

File `../backend/api/auth.http` có flow body; `auth-browser.http` có flow cookie/CSRF cho REST Client bật cookie jar. Không gửi Authorization cũ vào auth endpoint. Cookie đơn lẻ không đọc được hồ sơ; `/users/me` luôn yêu cầu Bearer.

2C cần dùng cùng hostname frontend/API khi thử cookie (ví dụ localhost ở cả hai), gộp refresh đồng thời và xử lý lỗi mạng không rõ server đã đổi token hay chưa. Không tự retry token cũ; có thể cần đăng nhập lại. HTTPS production phải đặt `AUTH_COOKIE_SECURE=true`; SameSite=Strict yêu cầu frontend/API cùng site theo thiết kế hiện tại.

## Kiểm thử tự động

```powershell
.\scripts\Test-Local.ps1
```

**51 tests qua, không failure/error/skip; Maven verify và đóng gói thành công.**

- 17 nền tảng: migration đến V2/chạy lại không trùng, JPA, ràng buộc học kỳ/môn, health/lỗi/CORS/request ID.
- 13 auth: đăng ký/đăng nhập/validation/mật khẩu/hash/token và hai hồ sơ.
- 5 giới hạn tần suất: login/register/refresh/logout, reset cửa sổ và 429.
- 15 phiên/script: hết hạn, xoay token, replay, cạnh tranh đồng thời, logout độc lập, sid đúng chủ, thời hạn tuyệt đối, constraint thu hồi, cookie/CSRF/origin/transport; script Try-Session thực sự chạy bằng Windows PowerShell 5.1 với API HTTP thật, cả logout và replay.
- 1 restart: khởi động và đóng toàn bộ Spring application context ba lần trên cùng schema; phiên hợp lệ tiếp tục refresh, phiên logout vẫn bị từ chối.

Tất cả dữ liệu tích hợp nằm trong schema `backend_it_<uuid>` riêng rồi chỉ dọn schema thử; không tạo tài khoản test trong schema app. Khóa test trong target, không thay khóa thật. Báo cáo trong `backend/target/surefire-reports` ngoài Git. Test script PowerShell dành cho Windows; CI hệ điều hành khác sẽ bỏ riêng test script đó, các test API còn lại vẫn chạy.

Đã chạy thêm `Run-Local.ps1` thật ở cổng 8085: schema public nâng Flyway **1 → 2**, health trả UP, GET CSRF trả 200 và cookie HttpOnly. Số hàng tài khoản/học kỳ/môn trước và sau không đổi (cả ba bảng đang trống tại thời điểm kiểm tra); các ví dụ có dữ liệu được kiểm tra trong schema tích hợp riêng. Tiến trình smoke được dừng sau kiểm tra.

## Chưa làm trong 2B

- Nối UI, tự refresh, lưu/khôi phục token phía client và dọn dữ liệu frontend khi logout/đổi tài khoản: **2C**.
- CRUD học kỳ/môn/bài/lịch/điểm: các đợt backend tương ứng.
- Xác minh email, quên/đổi mật khẩu, danh sách/đăng xuất mọi thiết bị, job dọn bản ghi phiên hết hạn, giới hạn chia sẻ nhiều instance và kiểm tra production: còn trong checklist.

## Nguồn kỹ thuật

- [RFC 9700 mục 4.14.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14.2): luân chuyển token, lưu quan hệ để phát hiện replay và thu hồi phiên. Áp dụng nguyên tắc này cho API tài khoản riêng; không coi backend hiện tại là một OAuth authorization server đầy đủ.
- [Spring Data JPA 4.1 — Locking](https://docs.spring.io/spring-data/jpa/reference/4.1/jpa/locking.html): @Lock trên repository, dùng PESSIMISTIC_WRITE để tuần tự hóa đổi token.
- [Spring Security 7.1 — CSRF](https://docs.spring.io/spring-security/reference/7.1/servlet/exploits/csrf.html): CookieCsrfTokenRepository, mã CSRF và bảo vệ đăng nhập/đăng xuất.

Tên commit: **Bổ sung làm mới phiên đăng nhập và đăng xuất**. Lệnh trong `GIT-COMMITS.md`.
