# Tên commit cho từng đợt giao diện

Theo yêu cầu: mỗi đợt làm xong đều kèm tên commit tiếng Việt và lệnh push. Đây là hướng dẫn để bạn tự chạy; Codex chưa tự commit hoặc push.

## Đợt vừa hoàn thành: UI 2E — Tài khoản, hồ sơ và cài đặt

Chạy tại thư mục project, xem `git status` để kiểm tra các file trước khi thêm:

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Thêm giao diện tài khoản, hồ sơ và cài đặt"
git push
```

`git push` dùng nhánh/upstream bạn đã thiết lập khi push các đợt trước. Nếu chưa có upstream, dùng `git push -u origin TEN_NHANH_HIEN_TAI`, thay tên nhánh lấy từ `git branch --show-current`.

## Các đợt trước

| Đợt | Tên commit |
| --- | --- |
| UI 2D — Điểm số & GPA | `Thêm giao diện điểm số, GPA và mục tiêu học tập` |

## Tên dự kiến cho các đợt tiếp theo

Các đợt này **chưa làm**, chỉ chuẩn bị tên. Khi hoàn thành sẽ điều chỉnh tên theo đúng phạm vi thực tế rồi mới commit/push.

| Đợt dự kiến | Phạm vi | Tên commit tiếng Việt |
| --- | --- | --- |
| UI 2F | Đầu vào, xem trước/sửa/duyệt kế hoạch AI; tài liệu và trắc nghiệm minh họa | `Hoàn thiện giao diện trợ lý AI và duyệt kế hoạch học` |
| Hoàn thiện UI | Rà lại các cải thiện đang hoãn sau khi các màn chính được duyệt | `Hoàn thiện điều hướng, chọn ngày giờ và trạng thái giao diện` |

Đợt hoàn thiện UI chỉ bắt đầu khi quay lại checklist đã hoãn theo yêu cầu. Chưa tự chuyển sang backend Spring Boot ở các đợt này.
