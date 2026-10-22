# Tên commit cho từng đợt

Theo yêu cầu: mỗi đợt làm xong đều kèm tên commit tiếng Việt và lệnh push. Đây là hướng dẫn để bạn tự chạy; Codex chưa tự commit hoặc push.

## Đợt vừa hoàn thành: Backend 2B — Phiên và đăng xuất

Thêm V2 lưu phiên/hash refresh token, refresh luân chuyển, phát hiện replay, logout thu hồi cả access token của phiên. Web có cookie HttpOnly và CSRF, native dùng body. Có script thử phiên; 51 tests qua trên PostgreSQL thật, gồm restart và Windows PowerShell 5.1. Nối frontend ở 2C. Xem `BACKEND-PHASE-2B.md`.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Bổ sung làm mới phiên đăng nhập và đăng xuất"
git push
```

`git push` dùng nhánh/upstream bạn đã thiết lập khi push các đợt trước. Nếu chưa có upstream, dùng `git push -u origin TEN_NHANH_HIEN_TAI`, thay tên nhánh lấy từ `git branch --show-current`.

## Các đợt trước

| Đợt | Tên commit |
| --- | --- |
| Backend 2A — API tài khoản | `Triển khai API đăng ký đăng nhập và hồ sơ tài khoản` |
| Backend 1 — Nền tảng | `Khởi tạo backend Spring Boot và kết nối PostgreSQL` |
| UI 4H — Rà soát và trình diễn giao diện | `Bổ sung kiểm thử tổng thể giao diện và trình diễn trực tiếp` |
| UI 4G — Cảnh báo biểu mẫu chưa lưu | `Cảnh báo khi rời biểu mẫu có thay đổi chưa lưu` |
| UI 4F — Thông báo trong app và trạng thái đã đọc | `Hoàn thiện giao diện thông báo và trạng thái đã đọc` |
| UI 4E — So sánh GPA giữa các học kỳ | `Hoàn thiện giao diện so sánh GPA giữa các học kỳ` |
| UI 4D — Thống kê từ phiên học và bài tập | `Hoàn thiện thống kê từ phiên học và bài tập` |
| UI 4C — Pomodoro và mục tiêu ngày | `Hoàn thiện Pomodoro lịch sử phiên học và mục tiêu ngày` |
| UI 4B — Giờ deadline và lọc bài tập | `Bổ sung giờ deadline tìm kiếm và lọc bài tập` |
| UI 4A — Điều hướng và Bài tập riêng | `Đơn giản hóa điều hướng lịch học và tách màn bài tập` |
| Checklist backend | `Bổ sung lộ trình backend 5 đợt vào checklist` |
| Cột điểm đề xuất và BTL | `Cho phép thêm xóa sửa cột điểm và quy đổi bài tập lớn` |
| UI 3D — Dashboard | `Hoàn thiện Dashboard theo học kỳ và lịch thi gần nhất` |
| Điểm IUH và tự nhận diện học lại | `Bổ sung quy tắc điểm IUH và tự xác định môn cần học lại` |
| UI 3C và bộ chọn học kỳ | `Hoàn thiện trạng thái giao diện và bộ chọn học kỳ` |
| UI 2D — Điểm số & GPA | `Thêm giao diện điểm số, GPA và mục tiêu học tập` |
| UI 2E — Tài khoản, hồ sơ và cài đặt | `Thêm giao diện tài khoản, hồ sơ và cài đặt` |
| UI 2F — Trợ lý AI và duyệt kế hoạch học | `Hoàn thiện giao diện trợ lý AI và duyệt kế hoạch học` |
| UI 3A — Bộ chọn ngày giờ | `Thêm bộ chọn ngày giờ cho các biểu mẫu` |
| UI 3B — Điều hướng và quay lại | `Hoàn thiện điều hướng và luồng quay lại` |
| Cấu trúc frontend và component | `Tổ chức thư mục frontend và tách component dùng chung` |

## Tên dự kiến cho các đợt tiếp theo

Các đợt này **chưa làm**, chỉ chuẩn bị tên. Khi hoàn thành sẽ điều chỉnh tên theo đúng phạm vi thực tế rồi mới commit/push.

| Đợt dự kiến | Phạm vi | Tên commit tiếng Việt |
| --- | --- | --- |
| Backend 2C — Nối frontend | Gọi API tài khoản từ React Native, giữ phiên và xử lý lỗi mạng | Kết nối giao diện tài khoản với backend |

Mỗi mục hoàn thiện làm riêng một đợt để người dùng xem và push. Backend 1/2A/2B đã hoàn thành; đợt tiếp theo theo `next`/`go`.
