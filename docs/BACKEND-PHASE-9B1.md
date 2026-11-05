# 9B.1 — API đổi mật khẩu

Đợt này thêm backend: kiểm tra mật khẩu hiện tại, băm/lưu mật khẩu mới, thu hồi mọi phiên của chính tài khoản khi lưu thành công. Dữ liệu học tập và tài khoản khác giữ nguyên. **Giao diện đổi mật khẩu chưa nối; làm ở 9B.2.**

## 1. Khởi động backend

Nếu backend cũ đang chạy, Ctrl+C tại terminal của nó rồi chạy lại:

```text
cd "D:\Video OBS\QuanLyHocTap\backend"
powershell.exe -NoProfile -File ".\scripts\Run-Local.ps1"
```

Đợi `Started FocusStudyBackendApplication`; giữ terminal này mở. Flyway tự nâng V13 → V14: chỉ cho phép lý do thu hồi `PASSWORD_CHANGED`, không đổi dữ liệu đang có. Không xóa database. Kiểm tra health tại địa chỉ localhost:8080/api/v1/health nếu cần.

## 2. Thử bằng script, không nhập token thủ công

Nên đăng ký **tài khoản thử riêng** trên app vì thao tác này đổi mật khẩu thật và làm các phiên hiện tại không còn dùng được. Mở terminal thứ hai:

```text
powershell.exe -NoProfile -File "D:\Video OBS\QuanLyHocTap\backend\scripts\Try-PasswordChange.ps1"
```

Nhập email, mật khẩu hiện tại, mật khẩu mới và nhập lại mật khẩu mới khi script hỏi. Ba ô mật khẩu nhập ẩn, không truyền mật khẩu qua command line. Script kiểm tra hai lần nhập khớp, gọi login mở phiên thử rồi gửi đúng một PUT đổi mật khẩu. Không in token/hash/mật khẩu và không tự gửi lại khi lỗi.

Thành công báo **Đã đổi mật khẩu và thu hồi mọi phiên đăng nhập**. Đăng nhập lại trên app bằng mật khẩu mới: vẫn thấy học kỳ/môn và dữ liệu cũ. Mật khẩu cũ phải bị từ chối. Các tab đang mở có thể còn hiện tên tạm thời, nhưng lần gọi API/refresh tiếp theo sẽ bị từ chối và cần đăng nhập lại; đợt này không có thông báo đẩy đăng xuất.

Nếu chỉ nhập sai mật khẩu hiện tại trong script, login sẽ bị từ chối trước bước PUT. Muốn kiểm tra mã `CURRENT_PASSWORD_INCORRECT` của API, dùng Postman với Bearer hợp lệ như phần dưới.

## 3. Thử từng bước bằng Postman

Mỗi request dùng Body → raw → JSON; token/mật khẩu chỉ giữ trong môi trường local/private của Postman, không đưa vào Git hoặc chia sẻ collection chứa giá trị thật.

1. **Đăng nhập**: POST `http://localhost:8080/api/v1/auth/login`, header `X-Auth-Transport: body`, body `{"email":"EMAIL_THU","password":"MAT_KHAU_CU"}`. Lấy `data.accessToken` vào Authorization → Bearer Token cho các request sau. Có thể login lần hai, giữ token/refresh lần hai để thử thu hồi nhiều phiên.
2. **Sai mật khẩu hiện tại**: PUT `http://localhost:8080/api/v1/users/me/password`, Bearer đúng, body như dưới nhưng currentPassword nhập sai. Phải nhận **400 CURRENT_PASSWORD_INCORRECT**. GET `/api/v1/users/me` bằng token cũ vẫn 200; chưa bị đăng xuất.
3. **Trùng mật khẩu**: nhập currentPassword/newPassword giống mật khẩu đang dùng. Phải nhận **400 PASSWORD_UNCHANGED**, chưa thay đổi.
4. **Đổi thật**: gửi PUT với currentPassword đúng và newPassword khác, 8–128 ký tự. Phải nhận **204**, body rỗng.
5. **Phiên cũ**: GET `/api/v1/users/me` bằng token cũ (cả lần login thứ hai) phải **401**. POST `/api/v1/auth/refresh` với header `X-Auth-Transport: body`, body `{"refreshToken":"REFRESH_CU"}` cũng phải **401**. Không gửi lại PUT bằng token này.
6. **Đăng nhập mới**: login mật khẩu cũ → 401; mật khẩu mới → 200. Lấy token mới đọc hồ sơ/học kỳ/môn: dữ liệu còn nguyên. Tài khoản B vẫn đăng nhập/dùng phiên của B bình thường.

Body đổi mật khẩu:

```json
{
  "currentPassword": "MAT_KHAU_CU",
  "newPassword": "MAT_KHAU_MOI"
}
```

API không có email/userId mục tiêu và không cần `version` từ hồ sơ. Mật khẩu không bị trim; nhớ đúng cả khoảng trắng/chữ hoa nếu có. Xác nhận mật khẩu mới là bước của form/script.

## 4. Khi lỗi kết nối hoặc mất phản hồi

Không tự thử lại PUT: backend có thể đã lưu trước khi mất kết nối. Khi mạng ổn, thử login mật khẩu mới trước. Nếu đăng nhập được thì thay đổi đã có hiệu lực; dùng phiên mới. Nếu vẫn lỗi kết nối, kết quả còn chưa xác nhận. Không cần xóa database hoặc đổi hash bằng SQL.

Endpoint chỉ yêu cầu Bearer, không xác thực bằng cookie và không yêu cầu CSRF token. Các API login/refresh sử dụng cookie trong trình duyệt vẫn giữ cơ chế CSRF cũ; Postman/script dùng body transport rõ ràng.

## Kiểm tra triển khai

Ngày 05/11/2026: **báo cáo cuối 884 tests backend/58 bộ không lỗi/bỏ qua; TypeScript và 738 tests frontend đạt**. Có **21 tests backend mới**; bộ liên quan chạy trước đạt **73/73**. Lượt full có hai kiểm tra phụ thuộc mốc V13 cũ: Foundation cần mốc mới V14; kiểm tra nâng V12 → V13 cần chỉ rõ target 13 thay vì chạy đến bản mới nhất. Đã sửa và chạy lại 52 tests Foundation/StudyPlanApply bằng Maven verify, đóng gói thành công. Không chạy full lần hai; báo cáo cuối tổng hợp lượt full và lượt chạy lại hai bộ liên quan. Không đổi frontend hoặc dependency; không chạy lại export web vì không đổi mã/giao diện frontend. Chưa kiểm tra form/native, chưa thao tác Postman trực tiếp (có hướng dẫn để tự thử).

Kết quả cuối được ghi tại [báo cáo 9B.1](test-results/password-api-9b1.json). Bộ kiểm tra dùng tài khoản/schema PostgreSQL riêng, tự dọn; không đổi mật khẩu tài khoản thật của người dùng. Có validation/biên 8–128/Unicode/khoảng trắng, cookie/Bearer/hai tài khoản, nhiều phiên, rollback hash + phiên khi ghi lỗi, hai lệnh đồng thời, đăng nhập chờ khóa, refresh đua với đổi mật khẩu, nâng V13 → V14 và khởi động lại backend. Script Windows PowerShell 5.1 cũng được thử bằng mật khẩu giả.

Thiết kế chi tiết và mã lỗi: [PASSWORD-CHANGE.md](../backend/docs/PASSWORD-CHANGE.md). Đợt 9B.2 mới thêm form, hiển thị lỗi và dọn phiên frontend sau đổi thành công. Các phần quên mật khẩu qua email, native 2C.3B và mục đã hoãn tiếp tục để riêng. Chưa tự commit/push.
