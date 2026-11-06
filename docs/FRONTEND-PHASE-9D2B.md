# 9D.2B — Áp dụng tùy chọn nhắc học

Loại nhắc và giờ yên lặng đã lưu được áp dụng vào chuông trong app. Mốc mặc định được gợi ý khi tạo lịch học hoặc lịch thi mới. Các lịch hiện có dùng mốc riêng đã lưu cùng lịch đó.

## Kiểm tra trên web

Chạy backend và frontend theo [hướng dẫn 9D.2A](FRONTEND-PHASE-9D2A.md#chạy-để-kiểm-tra). Đăng nhập bằng tài khoản thử.

1. Vào **Hồ sơ → Tùy chọn nhắc học**, tắt **Giờ yên lặng**, bật cả ba loại nhắc và lưu. Mở chuông để xem các mục đang có.
2. Tắt một loại đang có mục, ví dụ **Nhắc bài tập**, rồi lưu. Mở chuông, các mục bài tập được ẩn. Vào **Lịch học → Bài tập** vẫn thấy bài trong danh sách. Bật lại loại đó để các mục cần nhắc xuất hiện trở lại.
3. Đánh dấu đã đọc một mục. Tắt rồi bật lại loại tương ứng. Nếu nội dung và mốc nhắc của mục vẫn như cũ, trạng thái đã đọc được giữ.
4. Bật **Giờ yên lặng** và chọn một khoảng bao gồm giờ hiện tại, rồi lưu. Số trên chuông được ẩn. Mở chuông vẫn xem được danh sách và thấy lời nhắn đang trong giờ yên lặng. Tắt giờ yên lặng để số chưa đọc xuất hiện trở lại.
5. Chọn mốc mặc định **60 phút** và lưu. Mở form tạo **Chuỗi lịch học mới**, ô **Nhắc trước (phút)** được điền 60. Mở form tạo lịch thi mới, mốc **Trước 60 phút** được chọn sẵn. Bạn có thể đổi mốc riêng trước khi lưu từng lịch.
6. Mở một lịch đã có mốc riêng, ví dụ 15 phút hoặc nhiều mốc của lịch thi. Mốc riêng vẫn hiện đúng. Khi đang chỉnh một form, thay mốc mặc định ở tab khác sẽ giữ các lựa chọn đang chỉnh trong form.
7. F5 rồi mở lại app để kiểm tra tùy chọn vẫn được áp dụng. Với hai tab cùng tài khoản, lưu tùy chọn ở tab A rồi quay lại tab B. Tab B đọc lại khi được đưa ra trước. Khi cả hai tab đang hiển thị, tín hiệu lưu và lượt đọc định kỳ 30 giây cập nhật cấu hình.

Muốn thử loại nhắc lịch học hoặc lịch thi, tạo lịch sắp bắt đầu và có mốc nhắc đủ sớm, ví dụ bắt đầu sau 10 phút, nhắc trước 30 phút. Lịch học/lịch thi xuất hiện từ mốc riêng đó đến trước lúc kết thúc. Bài chưa hoàn thành quá hạn hoặc đến hạn trong 7 ngày được đưa vào danh sách khi bật nhắc bài tập.

## Giờ yên lặng

Giờ yên lặng tính theo múi giờ trong hồ sơ tài khoản, ví dụ `Asia/Ho_Chi_Minh`. Khung 22:00 → 07:00 bao gồm 22:00 và kết thúc lúc 07:00. Danh sách nhắc và thao tác đánh dấu đã đọc vẫn dùng được trong khoảng này.

## Kết quả kiểm tra

TypeScript, bộ kiểm tra frontend và build web đã qua. Các bài kiểm tra bao gồm lọc loại nhắc, khung qua đêm, ranh giới phút, múi giờ, giờ mùa, dữ liệu đọc về chậm sau lần lưu và cách ly tài khoản.

Đã chạy mã frontend với API thật và PostgreSQL bằng các tài khoản/schema QA riêng. Đã đối chiếu mốc mặc định cho lịch mới, mốc riêng của lịch thi, lọc loại, giờ yên lặng và giữ biên nhận đã đọc khi tắt/bật loại nhắc. Tiến trình và schema QA được dọn sau lượt thử.

Trình duyệt tự động vẫn bị tắt trong Work settings. Các bước bấm trên giao diện cần thử theo hướng dẫn phía trên. Thông báo hệ điều hành và kiểm thử trên điện thoại thật được nghiệm thu riêng.
