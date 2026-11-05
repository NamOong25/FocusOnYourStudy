# Hồ sơ tài khoản — 9A.1

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| GET | `/api/v1/users/me` | Đọc hồ sơ và version hiện tại. |
| PUT | `/api/v1/users/me` | Thay thế họ tên, trường, ngành của tài khoản trong Bearer. |

Cần Bearer hợp lệ và phiên còn hoạt động; cookie refresh không tự xác thực request này. Endpoint `/me` lấy chủ sở hữu từ token, không nhận ID tài khoản đích. Thành công HTTP 200, envelope `data/meta`, `Cache-Control: no-store`. PUT không tạo hoặc thu hồi phiên đăng nhập.

## Request PUT

```json
{
  "fullName": "Nguyễn Văn A",
  "school": "Đại học Công nghiệp TP.HCM",
  "major": "Công nghệ thông tin",
  "version": 0
}
```

- Họ tên bắt buộc, sau `strip()` còn 1–60 ký tự; giới hạn thống nhất với đăng ký. Trường/ngành tùy chọn, mỗi ô tối đa 100 ký tự. Dùng quy tắc độ dài Java String như API đăng ký, không đổi quy tắc Unicode của các API trước.
- Khoảng trắng đầu/cuối được bỏ. School/major không gửi hoặc null thành chuỗi rỗng: đây là PUT thay cả ba ô. Muốn giữ một ô, gửi lại giá trị đã đọc của ô đó.
- `version` bắt buộc, số nguyên không âm, tối đa 9007199254740991 để tương thích số nguyên an toàn của frontend. Lấy version từ **GET đã xem**, không tự tăng hoặc tự nạp bản mới rồi ép ghi bản nháp cũ.
- ID/email/mật khẩu/múi giờ không nằm trong DTO cập nhật. Trường thừa không thay thế danh tính và các thuộc tính do server quản lý. Các trường đó trong response vẫn lấy từ DB.

## Response

`data` giữ các trường cũ `id`, `email`, `fullName`, `school`, `major`, `timeZone` và thêm `version`. Thêm version cũng áp dụng cho hồ sơ trong kết quả register/login/refresh; parser frontend hiện tại chấp nhận trường bổ sung này. Không trả password hash hoặc token trong endpoint hồ sơ.

Version sử dụng cột `app_users.version` có từ V1. Transaction lấy khóa owner chung với writer học tập, đọc/check version **sau khi chờ khóa**, sửa ba ô và flush trước khi trả response. Cùng version với hai bản khác nhau: chỉ một bản thành công, bản còn lại 409. Dữ liệu thực sự không đổi và đúng version có thể trả 200 với version giữ nguyên.

Mất phản hồi sau PUT: dùng GET đối chiếu. Nếu lần trước đã commit, gửi lại version cũ trả 409; điều này không có nghĩa lần trước chắc chắn thất bại. Không tự retry hoặc ghi đè bản mới.

| HTTP | Code | Ý nghĩa |
| --- | --- | --- |
| 400 | `VALIDATION_FAILED` | Lỗi fullName/school/major/version; `errors` chỉ ra trường. |
| 400 | `INVALID_REQUEST` | JSON sai dạng, version không đọc được hoặc phần thập phân. |
| 401 | `AUTHENTICATION_REQUIRED`, `INVALID_ACCESS_TOKEN` | Thiếu Bearer hoặc token/phiên không hợp lệ. |
| 403 | `ACCESS_DENIED` | Method hoặc đường dẫn không được mở, ví dụ PUT `/users/{id}`. |
| 409 | `PROFILE_VERSION_CONFLICT` | Bản hồ sơ đã đọc cũ; đọc và xem lại trước khi sửa tiếp. |
| 409/503 | `DATA_CONFLICT`, `DATABASE_UNAVAILABLE` | Lỗi DB theo hợp đồng lỗi chung; không có xác nhận lưu giả. |

Không migration hoặc dependency mới, vẫn V13. Form sửa họ tên/trường/ngành React Native đã nối ở [9A.2](../../docs/FRONTEND-PHASE-9A2.md); chưa mở sửa email/mật khẩu/avatar/múi giờ/cài đặt. [Hướng dẫn terminal](../../docs/BACKEND-PHASE-9A1.md), [mẫu HTTP](../api/user-profile.http).
