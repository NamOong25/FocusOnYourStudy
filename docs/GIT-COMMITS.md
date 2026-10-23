# Tên commit cho từng đợt

Theo yêu cầu: mỗi đợt làm xong đều kèm tên commit tiếng Việt và lệnh push. Đây là hướng dẫn để bạn tự chạy; Codex chưa tự commit hoặc push.

Điều chỉnh lộ trình: người dùng chọn để **2C.3B kiểm tra thiết bị thật làm sau**, ưu tiên 3A → 3B → 3C. Tên commit riêng cho thay đổi tài liệu này nếu cần: **Cập nhật lộ trình backend và hoãn kiểm tra điện thoại**.

## Đợt vừa hoàn thành: 3C.1 — Nối giao diện học kỳ

Giao diện tải/tạo/sửa/xóa học kỳ bằng API, giữ dữ liệu sau F5/đăng nhập lại; Trang chủ và bộ chọn dùng chung nguồn. Có tải/lỗi/thử lại, chống gửi trùng và xung đột version. Môn và dữ liệu học tập khác trên UI vẫn là thử; 3C.2 nối môn làm tiếp. Không thay schema hoặc tự seed dữ liệu. Xem `FRONTEND-SEMESTERS-3C1.md`.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Kết nối giao diện học kỳ với API và lưu dữ liệu thật"
git push
```

`git push` dùng nhánh/upstream bạn đã thiết lập khi push các đợt trước. Nếu chưa có upstream, dùng `git push -u origin TEN_NHANH_HIEN_TAI`, thay tên nhánh lấy từ `git branch --show-current`.

## Các đợt trước

| Đợt | Tên commit |
| --- | --- |
| Backend 3B — API môn học | `Triển khai API quản lý môn học theo học kỳ` |
| Backend 3A — API học kỳ | `Triển khai API quản lý học kỳ theo tài khoản` |
| Frontend 2C.3A — Kiểm tra tài khoản web | `Kiểm tra tách dữ liệu tài khoản và xử lý phiên trên web` |
| Frontend 2C.2 — Giữ phiên | `Bổ sung giữ phiên làm mới token và đăng xuất trên ứng dụng` |
| Frontend 2C.1 — Nối tài khoản | `Kết nối giao diện đăng ký đăng nhập và hồ sơ với backend` |
| Backend 2B — Phiên và đăng xuất | `Bổ sung làm mới phiên đăng nhập và đăng xuất` |
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
| 3C.2 — Nối giao diện môn học | Gọi API môn, chuyển kỳ, tải lại vẫn còn, mã trùng/version và đổi tài khoản | Kết nối giao diện môn học với dữ liệu backend |
| 2C.3B — Để làm sau | Kết nối native, mở lại app, kho bảo mật trên máy thật | Hoàn thiện kiểm tra tài khoản và kết nối trên thiết bị |

Mỗi mục làm riêng để người dùng xem và push. Đã xong backend 1/2A/2B/3A/3B, UI tài khoản 2C.1/2C.2/2C.3A và UI học kỳ 3C.1; tiếp theo theo `next`/`go`.
