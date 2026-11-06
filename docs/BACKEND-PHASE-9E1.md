# 9E.1 — API xuất dữ liệu cá nhân

API trả một tệp JSON UTF-8 chứa dữ liệu học tập của tài khoản đang đăng nhập. Tên tệp có dạng `focusyourstudy-20261106-083000.json`, dùng thời gian UTC.

## Chạy và kiểm tra

Khởi động lại backend để dùng API mới.

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
powershell.exe -NoProfile -File .\scripts\Run-Local.ps1
```

Trong Postman, thực hiện các bước sau.

1. Gửi `POST http://localhost:8080/api/v1/auth/login` với email và mật khẩu của tài khoản thử A. Lấy `data.accessToken`.
2. Tạo yêu cầu `GET http://localhost:8080/api/v1/users/me/export`. Ở **Authorization → Bearer Token**, điền token vừa lấy. Gửi yêu cầu.
3. Phản hồi thành công là `200`, có `Content-Type: application/json; charset=utf-8` và `Content-Disposition` chứa tên tệp. Lưu phần phản hồi thành tệp `.json` và mở bằng VS Code.
4. Đối chiếu tên hồ sơ, học kỳ, môn và bài tập với dữ liệu tài khoản A. Kiểm tra các ID liên kết giữa môn và học kỳ, bài tập và môn.
5. Đăng nhập tài khoản thử B, thay token rồi gọi lại. File của B chứa dữ liệu của B. Tài khoản mới có các danh sách rỗng và cấu hình mặc định.
6. Bỏ Bearer Token rồi gửi lại. API trả `401`. Nếu đã đăng xuất, đăng nhập lại để lấy token mới trước khi xuất.

[Mẫu yêu cầu HTTP](../backend/api/personal-data-export.http)

## Nội dung tệp

Phản hồi là nội dung tệp trực tiếp. Các trường nằm ở gốc JSON.

| Trường | Nội dung |
| --- | --- |
| `format`, `formatVersion`, `exportedAt` | Nhận diện định dạng, phiên bản 1 và thời điểm bắt đầu xuất. |
| `profile` | ID, email, họ tên, trường, ngành, múi giờ và phiên bản hồ sơ. |
| `semesters`, `courses`, `assignments` | Học kỳ, môn và bài tập, gồm các ID liên kết và thời hạn. |
| `studySessions` | Buổi tự học đã lưu, liên kết môn/bài tập, thời gian và trạng thái. |
| `classSchedules`, `classExceptions` | Chuỗi lịch gốc và các buổi nghỉ/đổi. |
| `exams` | Lịch thi và các mốc nhắc riêng. |
| `gradeConfigurations` | `configurationId`, môn, loại học phần, bộ cột, cách quy BTL, trọng số và điểm. Điểm chưa nhập giữ `null`, điểm 0 giữ giá trị 0. |
| `pomodoroSessions` | Phiên Pomodoro đã lưu và thông tin môn/bài tại lúc bắt đầu. Phiên đang chạy có số liệu tại `exportedAt`. |
| `pomodoroGoal`, `notificationPreferences` | Mục tiêu Pomodoro và tùy chọn nhắc học có hiệu lực, gồm cả giá trị mặc định nếu chưa từng lưu. |

Các danh sách được sắp theo ID để có thứ tự ổn định. Giờ UTC và múi giờ gốc được giữ theo hợp đồng API hiện có.

## Giới hạn và tính nhất quán

- API lấy chủ dữ liệu từ Bearer đã xác thực. Các trường trong file được chọn từ những mẫu phản hồi nghiệp vụ hiện có.
- Toàn bộ dữ liệu được đọc trong một transaction `REPEATABLE_READ`. Các bảng cùng thuộc một bản chụp dù có thao tác chỉnh sửa đồng thời.
- Mỗi lần xuất hỗ trợ tối đa 10.000 bản ghi cộng lại trong các danh sách cấp ngoài và tệp JSON tối đa 20 MiB. Vượt giới hạn trả `413 EXPORT_TOO_LARGE`.
- Backend chuẩn bị xong nội dung trước khi trả header tải tệp. Lỗi trả JSON theo hợp đồng lỗi thông thường. Phản hồi có `Cache-Control: no-store`.
- Các GET xuất dữ liệu giữ nguyên dữ liệu học tập. Mốc Flyway hiện tại vẫn là V16. Nút tải file trên app thuộc 9E.2.

## Kết quả kiểm tra

Maven verify và đóng gói JAR đã qua. Bảy bài kiểm tra xuất dữ liệu bao gồm tài khoản trống, dữ liệu đủ các nhóm, điểm 0/null và BTL, Bearer/cookie/CORS, cách ly hai tài khoản, giới hạn số dòng/dung lượng và chỉnh sửa đồng thời. Các bộ Auth, UserProfile và NotificationPreferences liên quan cũng đã qua.

Đã chạy JAR trên cổng QA riêng, tải tệp ra máy và đọc lại JSON UTF-8, đối chiếu ID và ghi chú tiếng Việt. Đã kiểm tra dữ liệu nguồn sau xuất, file của tài khoản khác và phiên đã đăng xuất. Backend QA đã dừng và schema thử đã được dọn.
