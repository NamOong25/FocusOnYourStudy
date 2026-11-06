# 9D.1 — API tùy chọn nhắc học

API lưu các lựa chọn theo tài khoản vào PostgreSQL. Giao diện **Hồ sơ → Tùy chọn nhắc học** và phần áp dụng vào thông báo trong app sẽ nối ở 9D.2.

## Chạy backend

Mở PowerShell trong thư mục backend. Dừng phiên Spring Boot đang chạy ở cổng 8080 trước khi chạy lại để Flyway áp dụng V16. Migration tạo bảng riêng cho tùy chọn và giữ dữ liệu hiện có.

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
powershell.exe -NoProfile -File .\scripts\Run-Local.ps1
```

## Kiểm tra bằng Postman

1. Gửi `POST http://localhost:8080/api/v1/auth/login` với JSON chứa `email` và `password` của tài khoản thử A. Sao chép `data.accessToken` vào **Authorization → Bearer Token** của các yêu cầu tiếp theo. Giữ token và mật khẩu ở máy bạn.
2. Gửi `GET http://localhost:8080/api/v1/notification-preferences`. Tài khoản chưa từng lưu có `version: 0`, bật cả ba loại nhắc, mốc 15 phút và giờ yên lặng từ 22:00 đến 07:00.
3. Gửi `PUT` đến cùng địa chỉ. Trong **Body → raw → JSON**, dùng mẫu bên dưới và điền `version` từ bước 2.

```json
{
  "assignments": true,
  "classes": false,
  "exams": true,
  "reminderMinutes": 30,
  "quiet": true,
  "quietStart": "23:00",
  "quietEnd": "06:30",
  "version": 0
}
```

4. Kết quả là `200` với cấu hình đã lưu và version tăng 1. Đăng nhập lại A để lấy token mới rồi gọi `GET`. Kết quả vẫn tắt nhắc lịch học, chọn 30 phút và giữ khung 23:00–06:30.
5. Đăng nhập tài khoản thử B, thay token bằng token của B rồi gọi `GET`. B có cấu hình riêng. Nếu B chưa từng lưu, kết quả là cấu hình mặc định.
6. Dùng token của A gửi lại nguyên yêu cầu ở bước 3. API trả `409 NOTIFICATION_PREFERENCES_VERSION_CONFLICT`. Gọi `GET` để lấy phiên bản hiện tại trước khi quyết định lưu tiếp.

[Mẫu HTTP](../backend/api/notification-preferences.http)

## Hợp đồng API

- Cả hai lệnh cần Bearer. Tài khoản được xác định từ phiên xác thực. `GET` trả mặc định cho tài khoản chưa có bản lưu và không tạo bản ghi.
- `PUT` yêu cầu đủ các trường. Mốc nhắc nhận 5, 15, 30 hoặc 60 phút. Hai giờ dùng định dạng 24 giờ `HH:mm`, giữ theo giờ địa phương của tài khoản và có thể qua nửa đêm. Khi bật giờ yên lặng, hai mốc phải khác nhau. Khi tắt, hai mốc vẫn được lưu để chỉnh lại sau.
- Mỗi lần lưu thành công tăng `version` một đơn vị. Lần lưu đầu nhận `version: 0`. Khi thấy `409` hoặc mất phản hồi sau khi gửi, đọc lại cấu hình trước khi lưu tiếp.
- Dữ liệu gửi thiếu hoặc sai trả `400`. Thiếu token hoặc token không hợp lệ trả `401`.
