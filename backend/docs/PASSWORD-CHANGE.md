# Đổi mật khẩu tài khoản — 9B.1

## PUT /api/v1/users/me/password

Yêu cầu `Authorization: Bearer <access token>` của một phiên còn hiệu lực. Cookie refresh không tự xác thực endpoint này. ID chủ và ID phiên lấy từ JWT đã kiểm tra, không lấy từ body/query.

```json
{
  "currentPassword": "MAT_KHAU_HIEN_TAI",
  "newPassword": "MAT_KHAU_MOI"
}
```

- Mật khẩu hiện tại bắt buộc, không quá 128 ký tự. Mật khẩu mới bắt buộc, 8–128 ký tự như đăng ký, khác mật khẩu hiện tại; không chỉ gồm khoảng trắng.
- Không trim hoặc chuẩn hóa mật khẩu; khoảng trắng đầu/cuối, chữ hoa/thường và Unicode được giữ nguyên. Không yêu cầu quy tắc ký tự mới khác đăng ký.
- Chỉ hai trường trên có tác dụng. Không cập nhật ID/email/họ tên/trường/ngành/múi giờ từ payload. Xác nhận mật khẩu mới là bước nhập liệu của UI/script; không phải trường API.
- Thành công: **204 No Content**, `Cache-Control: no-store`, không token/mật khẩu/hash trong response. Cần đăng nhập lại; endpoint không cấp phiên mới.
- Băm theo encoder PBKDF2 hiện có. Đổi hash và thu hồi mọi phiên của owner (BODY/COOKIE, kể cả phiên gửi yêu cầu) trong cùng transaction. Không thu hồi phiên tài khoản khác, không xóa dữ liệu học tập.
- Sau commit, access token cũ bị từ chối ngay ở lần kiểm tra phiên tiếp theo, dù JWT chưa đến hạn; refresh cũ cũng không dùng được. App khác tab/thiết bị nhận ra khi gọi API, không có cơ chế đẩy đăng xuất chủ động trong đợt này.

## Đồng thời và lỗi

Đổi mật khẩu khóa owner trước, kiểm tra lại phiên còn hoạt động sau khi chờ khóa, rồi kiểm tra mật khẩu hiện tại, khóa các phiên chưa thu hồi và ghi toàn bộ. Login cũng kiểm tra hash và tạo phiên dưới cùng khóa owner: request đăng nhập đang chờ phải kiểm tra hash đã commit, không dùng kết quả kiểm tra cũ. Refresh/logout chỉ khóa phiên; refresh chạy trước có thể trả token nhưng phiên đó vẫn bị lần đổi mật khẩu thu hồi.

Nếu ghi phiên lỗi, hash và phiên cùng rollback. Mất phản hồi không chứng minh thao tác chưa thành công: **không tự gửi lại PUT**; thử đăng nhập bằng mật khẩu mới để xác nhận. Nếu thành công, lần đổi trước đã có hiệu lực. Nếu lỗi mạng vẫn còn, giữ trạng thái chưa xác nhận, không tự đổi ngược hoặc thử lặp hàng loạt.

| HTTP | Code | Ý nghĩa |
| --- | --- | --- |
| 400 | `VALIDATION_FAILED` | Thiếu/trống/quá dài mật khẩu hoặc mật khẩu mới dưới 8 ký tự; có lỗi theo trường. |
| 400 | `CURRENT_PASSWORD_INCORRECT` | Mật khẩu hiện tại sai; phiên và hash giữ nguyên. Không dùng 401 vì phiên vẫn hợp lệ. |
| 400 | `PASSWORD_UNCHANGED` | Mật khẩu mới trùng mật khẩu hiện tại. |
| 400/415 | `INVALID_REQUEST` / `UNSUPPORTED_MEDIA_TYPE` | JSON hoặc kiểu nội dung sai. |
| 401 | `AUTHENTICATION_REQUIRED` / `INVALID_ACCESS_TOKEN` | Thiếu Bearer, token/phiên hết hiệu lực; cả khi phiên vừa bị thu hồi trong lúc chờ khóa. |
| 403 | `ACCESS_DENIED` | Method/route không được phép, ví dụ chọn ID người khác. |
| 429 | `AUTH_RATE_LIMITED` | Quá số lượt theo IP; có Retry-After. Bucket đổi mật khẩu riêng, dùng mức cấu hình login-per-minute, không tin X-Forwarded-For. |
| 409/503 | `DATA_CONFLICT` / `DATABASE_UNAVAILABLE` | Lỗi ghi/kết nối theo hợp đồng chung; cần xác nhận trạng thái sau lỗi. |

V14 chỉ mở rộng CHECK lý do thu hồi thêm `PASSWORD_CHANGED`; không thay hàng dữ liệu cũ, không seed hay dependency mới. Khởi động lại backend để Flyway áp dụng; không chỉnh/xóa migration cũ và không xóa database.

[Hướng dẫn thử terminal/Postman](../../docs/BACKEND-PHASE-9B1.md), [mẫu IntelliJ HTTP](../api/password-change.http). Giao diện đổi mật khẩu sẽ nối ở 9B.2.
