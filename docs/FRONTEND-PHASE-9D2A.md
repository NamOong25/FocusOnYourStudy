# 9D.2A — Lưu tùy chọn nhắc học trên giao diện

Màn **Hồ sơ → Tùy chọn nhắc học** đọc và lưu vào tài khoản qua API 9D.1. Đóng form khi còn thay đổi sẽ hỏi giữ lại hay bỏ bản đang chỉnh.

## Chạy để kiểm tra

Khởi động backend trong một terminal và giữ terminal đó chạy.

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
powershell.exe -NoProfile -File .\scripts\Run-Local.ps1
```

Mở terminal thứ hai để chạy frontend.

```powershell
cd 'D:\Video OBS\QuanLyHocTap\frontend'
npx expo start --web --port 8092
```

Mở [ứng dụng web](http://localhost:8092/), đăng nhập tài khoản thử rồi làm theo các bước sau.

1. Vào **Hồ sơ → Tùy chọn nhắc học**. Chọn mốc 30 phút, tắt **Nhắc lịch học**, chọn khung giờ yên lặng qua đêm. Bấm **Lưu tùy chọn nhắc học**. Màn hình báo đã lưu và nút Lưu mờ đi.
2. Bấm **Xong**, F5 rồi mở lại phần tùy chọn. Mốc 30 phút, trạng thái tắt nhắc lịch học và giờ yên lặng phải còn đúng.
3. Thay đổi một lựa chọn rồi bấm nút đóng. Chọn **Tiếp tục chỉnh sửa** để giữ lựa chọn. Đóng lần nữa, chọn **Bỏ thay đổi**, rồi mở lại để xem cấu hình đã lưu.
4. Mở hai tab cùng tài khoản. Mở form ở cả hai tab. Tab A chọn 60 phút và lưu. Tab B chọn 5 phút và lưu. Tab B phải báo tùy chọn đã thay đổi và khóa lưu cho đến khi đối chiếu.
5. Ở tab B, bấm **Đọc tùy chọn hiện tại**. Bên dưới phải hiện cấu hình 60 phút. Chọn **Dùng cấu hình hiện tại** để dùng bản của A, hoặc **Giữ lựa chọn đang chỉnh** rồi bấm Lưu để dùng bản của B.
6. Đăng nhập tài khoản thử khác và mở tùy chọn. Cấu hình thuộc tài khoản đang đăng nhập. Đăng nhập lại tài khoản đầu để kiểm tra lựa chọn của tài khoản đầu.

Nếu mất phản hồi khi lưu, lựa chọn đang chỉnh được giữ và màn hình yêu cầu đọc lại. Đọc được đúng nội dung vừa gửi sẽ xác nhận cấu hình đã có trên tài khoản. Nếu cấu hình khác, form hiển thị bản hiện tại để bạn quyết định cách tiếp tục.

## Phạm vi đợt này

9D.2A lưu và khôi phục tùy chọn. Áp dụng vào chuông thông báo thuộc 9D.2B. Kiểm tra trên điện thoại thật được ghi riêng.

## Kết quả kiểm tra

TypeScript, bộ kiểm tra frontend và build web đã qua. Đã chạy mã frontend với API thật và PostgreSQL trong schema QA riêng để kiểm tra đọc/lưu/mở lại, hai tài khoản độc lập, xung đột giữa hai bản đang chỉnh, đối chiếu sau xung đột và mất phản hồi sau khi backend đã lưu. Kết quả đọc lại đúng và mỗi lần mất phản hồi chỉ gửi một yêu cầu lưu.

Trình duyệt tự động bị tắt trong Work settings ở lượt kiểm tra này. Thao tác trực tiếp trên form, đồng hồ, cảnh báo đóng và F5 cần kiểm tra theo các bước trên.
