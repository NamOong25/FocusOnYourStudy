# Backend 1 — Nền tảng Spring Boot và PostgreSQL

Hoàn thành ngày 22/10/2026 trong `D:\Video OBS\QuanLyHocTap\backend` theo yêu cầu `go`.

## Đã triển khai

- Java 21 có sẵn trên máy, Spring Boot 4.1.1, Maven Wrapper 3.10.0.
- PostgreSQL portable 17.11 riêng trong `backend/.local`, chỉ lắng nghe localhost; không cài service hoặc thay cấu hình PostgreSQL khác.
- Script thiết lập/chạy/dừng database và chạy backend/test, dùng lại data đã tạo; checksum ghim cho gói PostgreSQL và driver JDBC tải từ Maven Central.
- Flyway V1 tạo `app_users`, `semesters`, `courses`; Hibernate chỉ validate mapping. Không có seed tài khoản/mật khẩu đăng nhập mẫu.
- API `GET /api/v1/health`, actuator health tối giản; response/meta, request ID, lỗi RFC 9457, Bean Validation và CORS. Endpoint nghiệp vụ đang khóa.
- Thiết kế quan hệ cốt lõi cho các đợt auth/bài/lịch/điểm/tự học/Pomodoro/thông báo/tệp-AI trong `backend/docs/SCHEMA.md`; chưa tạo trước các bảng chưa triển khai.

## Đã kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| `backend/scripts/Test-Local.ps1` từ đúng project | 17 tests, 0 failures/errors/skips; Maven verify và file jar thành công |
| PostgreSQL thật + Flyway + JPA | Tạo bảng trong schema thử, validate, migrate lại không tạo trùng; test tự dọn đúng schema `backend_it_<uuid>` |
| Ràng buộc | Chặn email/kỳ/mã môn trùng, kỳ ngoài 1–3, tín chỉ sai và gắn môn sang kỳ khác chủ; cùng mã ở hai kỳ hợp lệ |
| API | Health/UTC/request ID, lỗi 400/405/409/500/503, 401 trước auth, CORS origin cho phép/bị chặn, không lộ SQL/stack/rejected value |
| Chạy app trên database app thật | Flyway áp dụng V1 ở `focus_study/public`, HTTP 8080 khởi động thành công |
| Dừng/bật PostgreSQL khi app đang chạy | 200 → 503 `DATABASE_UNAVAILABLE` → 200, không cần khởi động lại backend |
| Frontend | `npm run typecheck` qua; chưa thay mã React Native để nối API |
| Git | `.local`/data/password/log và `target` được bỏ qua; chỉ source, wrapper, config mẫu và tài liệu được đưa vào Git |

Kết quả test ở `backend/target/surefire-reports`; log chạy/test và kết quả health ở `backend/.local`, đều không commit.

## Chạy và xem

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Mở `http://localhost:8080/api/v1/health`. Nếu app đã chạy, chỉ mở đường dẫn, không cần chạy thêm bản thứ hai. Hướng dẫn đầy đủ và cách dùng PostgreSQL/CI ngoài máy này: `backend/README.md`. Quy ước endpoint/lỗi: `backend/docs/API.md`. Ví dụ request: `backend/api/foundation.http`.

Lưu ý khi đọc phản hồi lỗi bằng PowerShell: `application/problem+json` có thể được `Invoke-WebRequest` trả ở dạng byte array; giải mã UTF-8 rồi `ConvertFrom-Json`, hoặc dùng client hiểu JSON. API vẫn trả đúng mã HTTP và JSON RFC 9457.

## Phạm vi tiếp theo

Frontend vẫn lưu trong bộ nhớ; dữ liệu tạo trên giao diện chưa được ghi vào PostgreSQL. Chưa có đăng ký/đăng nhập/phiên/token/email hoặc API CRUD học kỳ/môn. Ràng buộc chủ sở hữu ở database chưa thay thế kiểm tra đọc/ghi chéo hai tài khoản. Các phần này thuộc backend đợt 2–3, vẫn để mở trong checklist.

Tên commit: `Khởi tạo backend Spring Boot và kết nối PostgreSQL`.
