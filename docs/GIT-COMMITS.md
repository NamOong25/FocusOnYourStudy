# Tên commit cho từng đợt giao diện

Theo yêu cầu: mỗi đợt làm xong đều kèm tên commit tiếng Việt và lệnh push. Đây là hướng dẫn để bạn tự chạy; Codex chưa tự commit hoặc push.

## Đợt vừa hoàn thành: Điểm IUH và tự nhận diện học lại

Đã thêm bộ chọn loại điểm/học phần, xét đạt/không đạt, cảnh báo đỏ, bảng quy đổi IUH và tự ghép các lần học theo mã môn/tín chỉ/học kỳ. Nguồn và giới hạn: `IUH-GRADING.md`. Chạy tại thư mục project, xem `git status` để kiểm tra các file trước khi thêm:

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Bổ sung quy tắc điểm IUH và tự xác định môn cần học lại"
git push
```

`git push` dùng nhánh/upstream bạn đã thiết lập khi push các đợt trước. Nếu chưa có upstream, dùng `git push -u origin TEN_NHANH_HIEN_TAI`, thay tên nhánh lấy từ `git branch --show-current`.

## Các đợt trước

| Đợt | Tên commit |
| --- | --- |
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
| UI 3D | Dashboard, học kỳ và kỳ thi gần nhất | `Hoàn thiện Dashboard và bộ chọn học kỳ` |

Mỗi mục hoàn thiện làm riêng một đợt để người dùng xem và push. Chưa tự chuyển sang backend Spring Boot ở các đợt này.
