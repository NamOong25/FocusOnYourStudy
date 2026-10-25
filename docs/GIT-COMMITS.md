# Tên commit cho từng đợt

Theo yêu cầu: mỗi đợt làm xong đều kèm tên commit tiếng Việt và lệnh push. Đây là hướng dẫn để bạn tự chạy; Codex chưa tự commit hoặc push.

Điều chỉnh lộ trình: người dùng chọn để **2C.3B kiểm tra thiết bị thật làm sau**, ưu tiên 3A → 3B → 3C. Tên commit riêng cho thay đổi tài liệu này nếu cần: **Cập nhật lộ trình backend và hoãn kiểm tra điện thoại**.

## Đợt vừa hoàn thành: 4G.2 — Nhắc lịch đã lưu trong mục chuông

Nhắc đúng mốc của lịch/ngoại lệ toàn tài khoản; nghỉ/xóa/kết thúc bỏ mục, khôi phục/đổi giờ xét lại. Điều hướng đúng kỳ/ngày, giữ dấu đọc qua tải lại/lỗi và bảo vệ dữ liệu chưa xác nhận. 140 test (29 mới), 62 kiểm tra nhắc việc cũ, TypeScript/export web và 15 nhóm browser API thật qua; không đổi backend/migration. Hướng dẫn `FRONTEND-SCHEDULE-4G2.md`.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Kết nối nhắc lịch học với dữ liệu đã lưu"
git push
```

## 4G.1 — Lịch thật trên Trang chủ và chi tiết môn

Tổng hợp độc lập đủ phạm vi/version từ API: buổi gần nhất/hôm nay đúng học kỳ, số buổi và danh sách đúng môn, ngoại lệ và múi giờ, mở đúng ngày trong Thời khóa biểu. Tải lại sau ghi, xử lý lỗi/phản hồi cũ và không tính dữ liệu chưa biết thành 0. 111 test lịch (30 mới), TypeScript/export web và 19 nhóm browser API thật qua; không đổi backend/migration. Hướng dẫn `FRONTEND-SCHEDULE-4G1.md`; nhắc việc 4G.2 làm sau.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Hiển thị lịch học thật trên Trang chủ và chi tiết môn"
git push
```

## 4F.3 — Nghỉ đổi và khôi phục từng buổi

Nối giao diện ngoại lệ đúng ngày bằng API: kế thừa/ghi đè từng trường, nghỉ và khôi phục về chuỗi hiện tại, bảo vệ version, trùng giờ và bản nháp. Mất phản hồi kiểm tra đúng buổi; không tự gửi lại hoặc tạo lại chuỗi đã xóa. 81 test đọc/ghi (27 mới), TypeScript, export web và browser API thật qua. Hướng dẫn `FRONTEND-SCHEDULE-4F3.md`; không đổi backend/migration.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Kết nối nghỉ đổi và khôi phục từng buổi học"
git push
```

## 4F.2 — Thêm sửa xóa chuỗi lịch học

Nối POST/PUT/DELETE cả chuỗi; form và danh sách chuỗi trong học kỳ, giữ bản nháp/lỗi trùng, nạp rõ ràng khi version cũ, xác nhận xóa và không tự tạo lại chuỗi đã mất. Mất phản hồi kiểm tra toàn tài khoản trước khi tiếp tục; ghi đã xác nhận khác với GET lỗi. 54 test đọc/ghi (26 mới), TypeScript, export web và browser API thật qua, không đổi backend/migration. Hướng dẫn `FRONTEND-SCHEDULE-4F2.md`; ghi từng buổi đã có ở 4F.3.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Kết nối thêm sửa xóa chuỗi lịch học với backend"
git push
```

`git push` dùng nhánh/upstream bạn đã thiết lập khi push các đợt trước. Nếu chưa có upstream, dùng `git push -u origin TEN_NHANH_HIEN_TAI`, thay tên nhánh lấy từ `git branch --show-current`.

## Các đợt trước

| Đợt | Tên commit |
| --- | --- |
| Frontend 4F.1 — Đọc thời khóa biểu | `Kết nối thời khóa biểu với dữ liệu lịch học từ backend` |
| Backend 4E.2B — Kiểm tra trùng giờ | `Bổ sung kiểm tra trùng giờ lịch học và buổi tự học` |
| Backend 4E.2A — Ngoại lệ từng buổi | `Bổ sung API nghỉ đổi và khôi phục từng buổi học` |
| Backend 4E.1 — API lịch lặp | `Triển khai API quản lý lịch học lặp theo môn` |
| Frontend 4D — Nối tự học | `Kết nối giao diện tự học với dữ liệu backend` |
| Backend 4C — API tự học | `Triển khai API kế hoạch tự học và kiểm tra liên kết bài tập` |
| Frontend 4B — Nối bài tập | `Kết nối giao diện bài tập với dữ liệu backend` |
| Backend 4A — API bài tập | `Triển khai API quản lý bài tập theo môn học` |
| Frontend 3C.2 — Nối môn học | `Kết nối giao diện môn học với dữ liệu backend` |
| Frontend 3C.1 — Nối học kỳ | `Kết nối giao diện học kỳ với API và lưu dữ liệu thật` |
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
| 4F.3 — Ghi một buổi | Nghỉ/đổi/khôi phục, version cả chuỗi và kiểm tra trùng | Kết nối nghỉ đổi và khôi phục từng buổi học |
| 2C.3B — Để làm sau | Kết nối native, mở lại app, kho bảo mật trên máy thật | Hoàn thiện kiểm tra tài khoản và kết nối trên thiết bị |

Mỗi mục làm riêng để người dùng xem và push. Đã xong backend 1/2A/2B/3A/3B/4A/4C/4E.1/4E.2A/4E.2B, UI tài khoản 2C.1/2C.2/2C.3A và UI học kỳ/môn/bài/tự học/lịch 3C.1/3C.2/4B/4D/4F.1/4F.2; tiếp theo theo `next`/`go`.
