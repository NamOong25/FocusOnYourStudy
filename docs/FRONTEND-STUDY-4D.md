# 4D — Giao diện tự học lưu vào tài khoản

## Phạm vi

Đăng nhập → **Lịch học → Tự học** dùng API 4C, lưu vào PostgreSQL: danh sách ngày/tuần, tạo/sửa/xóa, trạng thái, môn và bài liên kết. Dashboard, chi tiết bài/môn và danh sách chọn cho Pomodoro đọc cùng nguồn. Chế độ khách vẫn dùng dữ liệu thử, không tự đưa mẫu vào tài khoản.

Ngày giờ hiển thị theo thiết bị. API giữ thời điểm UTC và múi giờ của buổi; sửa nội dung/trạng thái không tự đổi giờ đã lưu. Đổi ngày/giờ dùng múi giờ thiết bị hiện tại. Thời lượng 1–240 phút, kết thúc trước 24:00 theo múi giờ của buổi; hai buổi sát nhau được phép, trùng giờ bị chặn kể cả buổi đã hoàn thành. Buổi liên kết phải đúng môn và kết thúc không sau hạn bài.

Chỉ cập nhật danh sách khi server xác nhận. Lỗi tải giữ dữ liệu lần gần nhất; lần đầu tải lỗi có màn thử lại riêng. Lỗi lưu giữ bản nháp. Request mất phản hồi không tự gửi lại: cần kiểm tra danh sách để tránh tạo trùng. Lỗi phiên bản yêu cầu **Nạp bản buổi học mới nhất**; thao tác này thay bản nháp bằng bản đã lưu. Đóng form có bản nháp vẫn hỏi bỏ thay đổi.

Xóa bài **giữ buổi tự học và gỡ liên kết**, tải lại phiên bản buổi từ server. Chặn đổi môn/rút deadline bài nếu làm sai liên kết. Môn còn buổi tự học không xóa/chuyển kỳ được. Hai tài khoản và phản hồi về muộn được tách theo phiên đăng nhập.

## Chạy và kiểm tra nhanh

Terminal backend (VS Code hoặc IntelliJ):

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Terminal frontend:

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npx expo start --web --port 8092
```

Mở `http://localhost:8092`. Không cần tạo lại database. Nếu backend đang chạy bản cũ, khởi động lại để dùng API 4C/V4.

1. Đăng nhập, tạo học kỳ/môn nếu chưa có. Tạo một bài hạn **ngày mai 20:00**.
2. **Tự học → Lên kế hoạch mới**: nhập tên, chọn môn và bài vừa tạo; ngày mai **19:00**, **45 phút** → lưu. Tạo thêm một buổi **18:00**, cùng bài để thử quan hệ nhiều buổi.
3. Bấm **Đổi ngày xem tự học**, mở lịch chọn ngày mai → **Xem ngày đã chọn**. Chuyển **Theo ngày/Theo tuần**, mở chi tiết, kiểm tra ghi chú/giờ. F5 rồi chọn lại ngày: các buổi vẫn còn. Ngày đang xem và bộ lọc chưa lưu qua F5.
4. Trong chi tiết bài → **Buổi học**, kiểm tra hai buổi vừa tạo. Đánh dấu một buổi đã xong: trạng thái bài giữ riêng, số phút và số phiên Pomodoro không tự tăng. Mở lại buổi hoặc sửa trạng thái **Đang học** trong form.
5. Tạo buổi **19:30**, 45 phút, không liên kết: bị chặn trùng. Chuyển **20:00**, 45 phút và liên kết bài: bị chặn vượt hạn. Đổi sang thời gian còn trống trước hạn để lưu được.
6. Sửa hạn bài xuống trước cuối buổi hoặc đổi môn: bị chặn, giữ bản nháp. Xóa bài có xác nhận: buổi vẫn còn và trở thành độc lập. Mở sửa buổi ngay sau đó và lưu ghi chú để kiểm tra phiên bản đã được tải lại.
7. Xóa một buổi: bấm Xóa → Giữ để thử hủy; sau đó Xóa → Xác nhận. F5: buổi đã xóa không trở lại; buổi khác vẫn còn.
8. Đổi sang tài khoản B: không có buổi của A. Đăng nhập lại A: buổi đã lưu được khôi phục; đồng hồ/bản nháp của phiên trước được dọn.

## Kiểm tra nâng cao

- **Hai tab:** cùng tài khoản, mở sửa cùng buổi ở cả hai. Tab B lưu trước; tab A sửa tên rồi lưu sẽ báo bản cũ, giữ nội dung đang gõ. Bấm Nạp bản mới → đọc nội dung B rồi sửa/lưu tiếp. Nếu B đã xóa buổi, A không thể tạo lại từ bản sửa cũ.
- **Mất mạng:** sau khi tải danh sách, bật Offline ở DevTools rồi bấm Tải lại. Danh sách cũ vẫn hiện cùng lỗi. Trở lại Online → Tải lại. Lỗi khi đang lưu giữ form; kiểm tra danh sách trước khi tạo tiếp nếu không rõ server đã lưu chưa.
- **Timer:** mở Pomodoro từ một buổi, bắt đầu/tạm dừng. Buổi đã lưu không tự đổi trạng thái/version. Khi hoàn tất một phiên thật trong phiên ứng dụng, phút học hiển thị riêng; F5 chưa giữ lịch sử này.

## Giới hạn và việc sau

- **Thời lượng kế hoạch không phải thời gian đã học.** Hoàn thành thủ công không cộng Pomodoro. Lịch sử Pomodoro/mục tiêu ngày vẫn RAM; sẽ có API riêng sau.
- **AI ở tài khoản thật chỉ xem trước**; có nút đến Tự học để tạo buổi. Lưu nhiều buổi/điều chỉnh kế hoạch qua API cần xử lý xác nhận và thất bại từng phần ở đợt AI. Khách vẫn thử luồng duyệt local. Chưa gọi AI thật.
- Lịch học lặp/ngoại lệ, lịch thi, điểm, checklist, tài liệu và tùy chọn nhắc chưa lưu backend. Kiểm tra trùng với lịch/thi hiện chỉ xét dữ liệu trong phiên; backend hiện bảo vệ trùng giữa các buổi tự học.
- Đồng bộ khi mở app/F5, tải lại và sau ghi; chưa realtime/poll giữa các thiết bị. Chưa lưu bản nháp qua F5, chưa hỗ trợ ghi khi offline. Native/máy thật tiếp tục để sau theo 2C.3B.

## Kiểm tra tự động

Kết quả ngày 23/10/2026: **TypeScript và export web qua; 37 nhóm unit mới, 16 nhóm browser tự học, 16 nhóm hồi quy bài tập và 11 nhóm tài khoản/liên tab qua** trên PostgreSQL/schema riêng. Các unit bài tập/môn, lịch và Pomodoro cùng smoke khách 320/390/430/1280px qua. Đã xem ảnh form 320px/390px. Runner tài khoản được cập nhật phạm vi ghi tự học và chờ thông báo đổi danh tính khi test đăng xuất liên tab, tránh kiểm tra trước storage event. Không chạy lại Maven vì không sửa backend; 155 tests là kết quả đợt 4C, không phải số test mới của 4D.

- `node docs/qa-study-api-unit.cjs`: API mapping, timezone/DST, expected version, confirmed cache/lỗi mạng, chặn gửi lặp, phản hồi tài khoản cũ và tách phút Pomodoro khỏi trạng thái.
- `node docs/qa-study-api.cjs`: chạy trên frontend và backend **schema QA riêng**, tạo tài khoản `study-*@example.test`; không chạy vào database cá nhân. Dùng `QA_APP_URL`, `QA_API_URL`, `PLAYWRIGHT_MODULE`, `CHROME_PATH` như các runner trước. Có lỗi ban đầu/thử lại, CRUD/F5, liên kết, conflict, mất phản hồi, offline, hai tài khoản/hai tab và 320/390/430/1280px.
- Hồi quy bài tập/tài khoản được cập nhật: tự học giờ là dữ liệu đã lưu; backend chặn rút deadline sai liên kết. Không thay backend hoặc migration trong 4D.

Tên commit: **Kết nối giao diện tự học với dữ liệu backend**. Lệnh ở `GIT-COMMITS.md`; không tự commit/push.
