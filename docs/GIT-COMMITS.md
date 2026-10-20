# Tên commit cho từng đợt giao diện

Theo yêu cầu: mỗi đợt làm xong đều kèm tên commit tiếng Việt và lệnh push. Đây là hướng dẫn để bạn tự chạy; Codex chưa tự commit hoặc push.

## Đợt vừa hoàn thành: UI 4A — Điều hướng Lịch học và Bài tập riêng

Tách Bài tập ra màn riêng, một hàng lối vào Lịch học/Bài tập/Lịch thi/Tự học và nút Môn & học kỳ. Giữ ngữ cảnh/bộ lọc khi quay lại, nút thêm bài ở phía trên. Ghi đợt 2 (giờ deadline/tìm kiếm/lọc thời hạn) và các đề xuất còn lại vào `UI-BACKLOG.md` để làm sau. Xem `UI-POLISH-4A.md`.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Đơn giản hóa điều hướng lịch học và tách màn bài tập"
git push
```

`git push` dùng nhánh/upstream bạn đã thiết lập khi push các đợt trước. Nếu chưa có upstream, dùng `git push -u origin TEN_NHANH_HIEN_TAI`, thay tên nhánh lấy từ `git branch --show-current`.

## Các đợt trước

| Đợt | Tên commit |
| --- | --- |
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
| UI 4B — Bài tập và deadline | Chọn giờ hạn nộp, tìm kiếm và bộ lọc thời hạn | `Bổ sung giờ deadline tìm kiếm và lọc bài tập` |
| Backend — cần chốt phạm vi riêng | Thiết kế dữ liệu, tài khoản và nối API theo từng giai đoạn | Chốt tên khi triển khai thực tế |

Mỗi mục hoàn thiện làm riêng một đợt để người dùng xem và push. Chưa tự chuyển sang backend Spring Boot ở các đợt này.
