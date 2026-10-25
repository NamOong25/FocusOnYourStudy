# 4G.2 — Nhắc lịch học đã lưu trong mục chuông

Đã nối **Góc nhắc nhở** với các chuỗi lịch và ngoại lệ trong tài khoản. Đợt này là nhắc việc bên trong app; không gửi push/thông báo màn hình khóa hoặc khi ứng dụng bị đóng. Không đổi backend/migration.

## Chạy ứng dụng

Giữ hai terminal chạy như trước. Backend, trong VS Code hoặc IntelliJ:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Frontend:

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npx expo start --web --port 8092
```

Mở http://localhost:8092, tải lại trang và đăng nhập. Không cần tạo lại database.

## Khi nào một buổi được nhắc?

`mốc xuất hiện = thời điểm bắt đầu thực tế − số phút nhắc trước của chuỗi`

- Buổi 14:00, nhắc trước 15 phút: trước 13:45 chưa có mục; từ 13:45 xuất hiện.
- **0 phút là nhắc đúng giờ bắt đầu**, theo hợp đồng API. Nhãn form/chi tiết đã được sửa lại để không gọi 0 là không nhắc.
- Mục tiếp tục hiển thị khi buổi đang diễn ra, và bị bỏ từ đúng giờ kết thúc.
- Buổi nghỉ hoặc đã xóa không được nhắc. Buổi đổi giờ dùng **giờ mới**, không dùng giờ cũ để tính mốc.
- Lịch được xét trên **toàn tài khoản**, kể cả học kỳ khác với học kỳ đang chọn trên Trang chủ/Thời khóa biểu.

Mốc từ 0 đến 10080 phút (7 ngày), lưu cho cả chuỗi. Các lựa chọn giờ yên lặng/thông báo trong phần cài đặt mẫu chưa được nối trong đợt này; không dùng chúng thay mốc đã lưu của chuỗi.

## Test nhanh không cần chờ lâu

1. Có sẵn học kỳ và môn học. Vào **Lịch học → Thời khóa biểu → Thêm chuỗi lịch học**.
2. Chọn hôm nay, giờ bắt đầu còn khoảng **5–10 phút nữa**, kết thúc sau đó khoảng một giờ; chọn khoảng chưa trùng lịch/tự học.
3. Nhập **Nhắc trước (phút) = 15**, lưu. Vì đã vào khoảng nhắc nên mở **chuông → Góc nhắc nhở** sẽ thấy mục ngay.
4. Đọc tên môn, mã môn/học kỳ, phòng, giảng viên và ngày/giờ. Có **Còn … phút** hoặc **Đang học**; không phải một bản thông báo đã gửi ra hệ điều hành.
5. Bấm thẻ: mục được đánh dấu đã đọc, app mở **đúng học kỳ và ngày gốc** trong Thời khóa biểu. Mở thẻ buổi học tại đó để xem/sửa.

Nếu muốn thử chưa đến mốc, tạo buổi còn hơn 15 phút nữa và đặt nhắc 15. Mục chưa xuất hiện là đúng; nó sẽ xuất hiện khi tới mốc. Trạng thái đồng hồ cập nhật theo phút và khi quay lại ứng dụng.

Ví dụ nếu đang là 14:00: tạo buổi 14:10–15:10, nhắc 15 phút. Mốc nhắc là 13:55 nên có thể thử ngay. Dùng ngày/giờ phù hợp lúc bạn kiểm tra, không cần chỉnh đồng hồ máy.

## Đọc, lọc và tải lại

- Mở chuông **không tự đánh dấu tất cả**.
- Bấm biểu tượng đánh dấu đã đọc ở từng mục: giữ nguyên danh sách Tất cả, giảm số chưa đọc.
- Chọn **Chưa đọc**: chỉ thấy mục chưa đọc. Chọn **Tất cả** để xem lại.
- **Đánh dấu tất cả đã đọc** chỉ áp dụng cho những mục đang đến hạn nhắc, không đánh dấu trước các buổi chưa tới mốc.
- **Tải lại nhắc việc** đọc lại lịch, môn và học kỳ. Mục không đổi vẫn giữ đã đọc.
- Sửa ngày khác trong cùng chuỗi không làm mục hiện tại thành chưa đọc chỉ vì version chuỗi tăng.
- Đổi giờ/phòng/giảng viên, tên môn hoặc mốc nhắc làm thay đổi nội dung tương ứng nên được xét lại là chưa đọc.
- Số phút đếm ngược hoặc chuyển từ Sắp học sang Đang học không tự làm mục đã đọc thành chưa đọc.

Trạng thái đọc giữ **trong phiên hiện tại**. F5/đăng nhập lại bắt đầu phiên đọc mới; lịch vẫn được đọc từ PostgreSQL. Chưa lưu dấu đã đọc vào database hoặc đồng bộ dấu đã đọc giữa các thiết bị/tab.

## Test sửa lịch

| Thao tác | Kết quả cần thấy trong chuông |
| --- | --- |
| Đổi phòng/giảng viên riêng buổi đang đến mốc | Nội dung mới, nhãn buổi đã đổi và trạng thái chưa đọc cho nội dung mới. |
| Chuyển giờ 14:00 sang 15:00, nhắc 15 phút, hiện đang 13:45 | Mục 14:00 bị bỏ; chỉ xuất hiện lại từ 14:45 với giờ 15:00. |
| Nghỉ đúng một ngày | Bỏ lời nhắc của đúng ngày đó; không xóa các buổi khác trong chuỗi. |
| Khôi phục buổi | Dùng lịch gốc hiện tại; nếu đang trong khoảng nhắc thì mục trở lại. Nếu backend chặn khôi phục do trùng giờ, vẫn giữ buổi nghỉ và không tự thêm lời nhắc. |
| Sửa cả chuỗi hoặc đổi mốc nhắc | Các buổi liên quan được xét lại từ dữ liệu đã lưu. |
| Xóa cả chuỗi | Bỏ các mục của chuỗi; giữ môn, bài tập và lịch khác. |
| Buổi kết thúc | Bỏ mục, không giữ như lịch sử thông báo đã giao. |
| Đang mở Thời khóa biểu rồi đi từ lời nhắc về cùng ngày | Bắt buộc đọc lại lịch, tránh mở chi tiết bằng version cũ. Không gỡ khóa một lần ghi chưa rõ kết quả. |

Sau thao tác ghi trong app, nguồn nhắc lịch được đọc lại kể cả khi chuông đang đóng. Thay đổi từ nơi khác được đọc khi quay lại cửa sổ/ứng dụng hoặc mở chuông/tải lại. Không có WebSocket hay cơ chế gửi push trong đợt này.

## Lỗi tải dữ liệu

- Chuông hiện **…** khi chưa xác nhận đủ lịch; đây không phải số 0 chưa đọc.
- Trong Góc nhắc nhở có trạng thái đang kiểm tra hoặc lỗi và nút tải lại. Không kết luận Chưa có nhắc việc/Đã đọc hết khi phần lịch chưa được xác nhận.
- Ẩn các thao tác trên lời nhắc lịch cũ khi lịch đang tải/lỗi; nhắc bài tập đã tải vẫn xem/đánh dấu đọc được.
- Khóa **Đánh dấu tất cả đã đọc** khi chưa biết đủ lời nhắc lịch, để tránh đánh dấu nhầm.
- Giữ dấu đã đọc qua trạng thái tải/lỗi tạm thời. Sau khi tải thành công, các mục thật sự không còn sẽ được dọn.
- Nếu danh mục môn/học kỳ không khớp với lịch, báo cần tải lại thay vì đoán môn hoặc điều hướng sang học kỳ sai.

Lịch học và bài tập dùng dữ liệu tài khoản. Nhắc lịch thi vẫn thuộc phần dữ liệu thử trong phiên, chưa phải backend lịch thi.

## Phạm vi dữ liệu và cấu trúc

- `overview` thêm truy vấn nhắc việc toàn tài khoản. Lấy các chuỗi và các ngày nguồn từ ngày thiết bị −2 đến +9, đủ cho mốc tối đa 7 ngày và chênh múi giờ. Không tải mọi năm học tương lai chỉ để xét mục đang đến mốc.
- Vẫn kiểm tra đủ các buổi, phạm vi, version và danh sách chuỗi trước/sau như 4G.1; thất bại không công bố kết quả một phần như thể đủ dữ liệu.
- `notifications/serverClassReminders.ts` tính mốc bằng UTC, tạo mục riêng theo `(scheduleId, ngày gốc)`, ghép nhắc việc và dọn dấu đọc theo dữ liệu đã biết.
- Revision của dấu đọc dựa trên nội dung/mốc nhắc, không dựa trên version cả chuỗi hoặc thời gian đếm ngược.
- `useInAppNotifications` ghép nguồn thật với nhắc bài tập/lịch thi hiện có. Khi đã đăng nhập, không tạo thêm nhắc lịch từ mảng lịch RAM.
- `NotificationsCenter` mở lịch thật qua `openSavedSchedule`, không gọi ClassDialog RAM với ID backend. Thẻ khác múi giờ ghi thêm giờ/ngày nguồn; điều hướng giữ ngày nguồn.
- `ScheduleManager.invalidate` bỏ bản đọc cũ khi đi đến lịch, nhưng giữ khóa/đích cần kiểm tra của thao tác ghi chưa rõ kết quả.

## Nghiệm thu

- **140 test lịch/nhắc việc qua, gồm 29 mới**: mốc chính xác, 0 phút/7 ngày, kết thúc, ngoại lệ, nhiều kỳ/ngày, múi giờ/ngày nguồn, dấu đọc khi đổi nội dung/đổi ngày khác/tải lỗi, account-wide bounded reads, snapshot thiếu/đổi và invalidation cùng ngày không xóa khóa ghi.
- **62 kiểm tra nhắc việc cũ** qua với `node docs/qa-notifications-unit.cjs`.
- TypeScript và export web qua. Không đổi backend/migration; không chạy lại 238 backend tests của các đợt trước.
- **15 nhóm browser với API/PostgreSQL thật** qua trong schema QA riêng, dùng đồng hồ kiểm thử: trước/đúng mốc, tự cập nhật phút, đã đọc/lọc/tải lại, mở ngày/sửa phòng, version do ngày khác, chuyển giờ và mốc, nghỉ/khôi phục, xóa/kết thúc/đọc tất cả, lỗi tải và nhắc bài vẫn mở, khôi phục dấu đọc, lỗi lần đầu/F5, request đang chờ, hai tài khoản/mốc 0, nhãn 0/F5, điều hướng sang học kỳ khác dù Trang chủ đang không có lịch.
- Ảnh Góc nhắc nhở 320/390/430/1280px đã được xem. Dữ liệu và dịch vụ QA riêng được dọn sau kiểm tra; không seed vào tài khoản hoặc schema chính của bạn.

Kiểm tra máy thật **2C.3B**, thông báo hệ điều hành, quyền thông báo, giờ yên lặng và lưu dấu đọc lâu dài vẫn ở các mục sau trong checklist. Tiếp theo là backend lịch thi, chia nhỏ như các đợt trước.
