# 6B.2 — Lịch sử, mục tiêu và tiến độ Pomodoro

Đã triển khai phần tài khoản thật trên màn **Tập trung**. Backend vẫn dùng hợp đồng 6A.2/V11; không thêm bảng, migration, dependency hoặc tài khoản mẫu vào dữ liệu chính. Bản mẫu khách giữ riêng.

## Những phần đã nối

- **Mục tiêu hôm nay:** số phiên hoàn tất/mục tiêu, phút học được công nhận, tiến độ tối đa 100%, còn bao nhiêu phiên. Đổi mục tiêu không sửa lịch sử hoặc số phút.
- **Sửa mục tiêu:** chọn 1–12 phiên, mặc định server là 4 khi chưa lưu; lưu version và đọc lại khi mở. Mặc định không tự tạo bản ghi chỉ vì xem màn hình.
- **Lịch sử tập trung:** hoàn tất/hủy, nhóm theo ngày kết thúc, tên môn và bài/buổi học đã lưu khi bắt đầu; chi tiết bắt đầu/kết thúc, tạm dừng đã loại trừ, thời điểm ghi nhận. Tên nguồn được giữ cả khi đổi tên hoặc xóa môn/bài/buổi học.
- **Bộ lọc:** mọi ngày/hôm nay/7 ngày gần đây/khoảng ngày bằng lịch, trạng thái và môn. Phân trang 10 phiên; nút tải lại đưa về trang đầu. Với môn đã xóa, có thể mở chi tiết phiên ở chế độ mọi môn rồi chọn **Lọc lịch sử môn ...**.
- **Loading/lỗi/trống:** lỗi đọc không được biến thành số 0 hoặc danh sách trống giả. Request cũ khi đổi bộ lọc/tài khoản bị hủy và không cập nhật màn hình mới.

Số liệu ngày do `/pomodoro-sessions/daily` tính trong một snapshot nhất quán. Chỉ COMPLETED được cộng; CANCELLED vẫn có trong lịch sử nhưng credit bằng 0. Ngày tính theo `endedAt`, không theo lúc người dùng xác nhận `finalizedAt`; các màn hiển thị cùng múi giờ tài khoản. Khi xem khoảng ngày, frontend lấy ranh giới ngày từ server (kể cả ngày DST 23/25 giờ), chỉ cache ranh giới lịch, không cache số phiên/mục tiêu.

Đọc lại khi trở về màn Tập trung/foreground, có tín hiệu tab khác, thay đổi phiên đã lưu hoặc đổi mục tiêu; khi đang hiển thị, đọc lại mỗi 30 giây. Qua nửa đêm, ngày đang xem được cập nhật theo múi giờ tài khoản. Lịch sử phân trang theo offset; nếu dữ liệu thay đổi trong lúc xem các trang, tải lại từ trang đầu để xem danh sách mới.

## Lưu mục tiêu chưa rõ kết quả

Goal PUT dùng đúng version đã đọc. Không tự lấy version mới rồi ghi đè lựa chọn của thiết bị khác. Xung đột giữ draft; **Nạp mục tiêu mới và chọn lại** là thao tác rõ ràng để bỏ lựa chọn cũ và bắt đầu từ mục tiêu vừa đọc.

Mất mạng/timeout/5xx hoặc phản hồi không hợp lệ giữ lựa chọn và yêu cầu đang chờ trong bộ nhớ của màn hình. Đóng bảng khi đang gửi/chưa rõ kết quả giữ thông tin để mở lại đối chiếu. GET xác nhận giá trị hiện tại bằng lựa chọn đang chờ thì hoàn tất đối chiếu; nếu có version mới với giá trị khác, giữ draft và yêu cầu người dùng chọn lại. Nếu GET vẫn thấy version cũ/giá trị cũ, có nút gửi lại thủ công **đúng yêu cầu cũ**, không tự gửi lại.

Yêu cầu chỉnh mục tiêu chưa xác nhận không có journal bền vững qua F5. Sau F5, app đọc mục tiêu hiện tại từ server và không tự gửi lại draft đã mất; việc ghi vẫn được backend bảo vệ bằng version. Đây là cấu hình một giá trị, khác journal Start/Complete của đồng hồ trong 6B.1. Không lưu goal hoặc lịch sử vào dữ liệu RAM mẫu để làm nguồn tính thống kê.

## Hướng dẫn kiểm tra trên web

### 1. Chạy project

Terminal backend:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Terminal frontend:

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npx expo start --web --port 8092
```

Nếu terminal frontend cũ vẫn chạy, chỉ cần tải lại trang đang dùng; giữ nguyên hostname/port và tài khoản test. Có thể tiếp tục dùng port 8093 nếu trước đó đã chọn port này. Không mở luân phiên `localhost` và `127.0.0.1` khi đang kiểm tra cùng phiên đăng nhập.

### 2. Mục tiêu và dữ liệu trống

1. Đăng nhập tài khoản test, vào **Tập trung**, cuộn xuống **Mục tiêu hôm nay**.
2. Nếu tài khoản chưa từng hoàn tất phiên, sau khi tải xong phải thấy `0/4`, `0 phút` và lời mời bắt đầu; tài khoản đã đổi mục tiêu sẽ hiện giá trị đã lưu.
3. Bấm **Sửa mục tiêu**, chọn **6**, bấm **Lưu mục tiêu ngày**. Bảng đóng, có thông báo thành công, thẻ đổi sang `0/6` nếu chưa có phiên hoàn tất.
4. F5, đăng nhập/khôi phục phiên nếu cần, mở lại Tập trung: mục tiêu vẫn là **6**. Đổi mục tiêu không tự tạo phiên học.
5. Bấm **Xem lịch sử tập trung**: tài khoản mới có trạng thái chưa có phiên, không hiển thị phiên mẫu.

### 3. Hủy và hoàn tất

1. Có môn học thật, bắt đầu một phiên, chờ một chút rồi **Hủy phiên → Xác nhận hủy phiên**.
2. Vào lịch sử, chọn **Đã hủy**: thấy phiên vừa hủy, phần học dở và nhãn không cộng tiến độ. Thẻ hôm nay giữ nguyên số phiên/phút trước đó.
3. Bắt đầu phiên khác, tạm dừng rồi tiếp tục; chờ đủ **25 phút học thực tế** (không tính thời gian tạm dừng).
4. Khi server xác nhận hoàn tất, lịch sử **Đã hoàn tất** có đúng một phiên mới và 25 phút. Nếu trước đó chưa có phiên hoàn tất hôm nay, thẻ thành `1/6`, `25 phút`.
5. Tải lại trang, số phiên/phút không được tăng thêm. Đổi mục tiêu sang **8** thì thành `1/8`, vẫn **25 phút**.

Không sửa đồng hồ máy để ép hoàn tất. Kiểm thử tự động đã rút ngắn thời gian bằng cách sửa timestamp chỉ trong schema QA tạm; API và database chính không có lối tắt này.

### 4. Bộ lọc, chi tiết và phân trang

1. Thử **Tất cả trạng thái / Đã hoàn tất / Đã hủy**; các phiên và tổng số phải khớp bộ lọc.
2. Thử **Hôm nay**, **7 ngày gần đây**, **Chọn khoảng ngày**. Chọn từ/đến bằng lịch rồi bấm **Áp dụng khoảng ngày**; ngày cuối được tính đến hết ngày theo múi giờ đang hiển thị.
3. Chọn từ ngày sau đến ngày: báo lỗi, không áp dụng bộ lọc sai. Khi còn sửa ngày nhưng chưa bấm áp dụng, dòng **Đang lọc** vẫn chỉ khoảng đã áp dụng trước đó.
4. Chọn môn; các môn trùng tên được phân biệt bằng mã/học kỳ. **Xem chi tiết phiên học** hiện đúng bài/buổi học và giờ bắt đầu/kết thúc; phần tạm dừng được loại trừ.
5. Khi có trên 10 phiên phù hợp, bấm **Trang sau / Trang trước**. Đổi bộ lọc hoặc **Tải lại lịch sử từ trang đầu** đưa về trang 1. Tổng số là số phiên toàn bộ kết quả lọc, không phải tổng phút của trang đang xem.
6. Phiên bắt đầu trước nửa đêm/kết thúc hôm sau thuộc ngày kết thúc. Nếu hôm nay mới xác nhận phiên đã kết thúc từ hôm trước, phiên vẫn thuộc ngày cũ.

### 5. Xung đột mục tiêu ở hai tab

1. Mở hai tab cùng địa chỉ ứng dụng, đăng nhập cùng tài khoản; cả hai mở **Sửa mục tiêu** từ cùng một phiên bản.
2. Tab A chọn **5** nhưng chưa lưu. Tab B chọn **8** rồi lưu.
3. Tab A bấm lưu: báo mục tiêu đã thay đổi, giữ lựa chọn **5**; không ghi đè mục tiêu **8**.
4. Bấm **Nạp mục tiêu mới và chọn lại**: hiện **8**; sau khi xem, có thể chọn giá trị khác và lưu theo phiên bản mới.
5. Tab không đang mở biểu mẫu đọc lại tiến độ sau tín hiệu cập nhật hoặc khi quay lại foreground. Không yêu cầu hai tab cập nhật ngay trong cùng một mili giây.

### 6. Lỗi mạng và tài khoản riêng

1. Tắt backend, vào hoặc tải lại tiến độ/lịch sử: hiện lỗi và nút thử lại, không hiển thị lỗi như `0 phiên`.
2. Bật lại backend, bấm thử lại hoặc quay lại app: dữ liệu thật được đọc lại.
3. Nếu lưu mục tiêu gặp thông báo chưa rõ kết quả, giữ lựa chọn và bấm **Đối chiếu mục tiêu đã lưu**. Chỉ khi GET vẫn thấy version cũ mới có thể bấm **Gửi lại đúng yêu cầu cũ**. Không bấm lưu một lựa chọn khác trong lúc yêu cầu cũ chưa rõ kết quả.
4. Đăng xuất A, đăng nhập B: mục tiêu, tiến độ và lịch sử của B độc lập. Dữ liệu/response muộn của A không được hiện trong B.

## Kết quả đã kiểm tra và phần còn lại

**TypeScript, export web và toàn bộ 504 tests frontend đạt, gồm 48 tests mới; không lỗi/bỏ qua.** Các test mới kiểm tra hợp đồng/credit, metadata phân trang, filter/ranh giới ngày và DST, timestamp có microsecond, abort/phản hồi cũ, khóa gửi lặp, xung đột và đối chiếu goal, không mất draft, không tự retry, tách owner và dispose.

**19 tình huống frontend manager/API/PostgreSQL thật đạt trong schema QA biệt lập:** mục tiêu lưu/đọc lại, default không ghi, version cũ, mất phản hồi giả lập sau một commit thật, retry thủ công, no-op; phiên hủy không cộng phút, hoàn tất 1/6–25 phút và 10 phiên–250 phút; endedAt khác finalizedAt; 12 phiên/phân trang và bộ lọc, múi giờ UTC/tài khoản, đổi mục tiêu không sửa minutes; hai tài khoản, tên nguồn đổi/xóa và trang vượt giới hạn. Tất cả tài khoản/phiên test nằm trong schema tạm; đã dọn schema sau kiểm tra.

**Chưa nghiệm thu thao tác UI bằng browser:** cả công cụ điều khiển trình duyệt và runtime dự phòng vẫn lỗi khởi tạo `failed to write kernel assets ... os error 3`. Kiểm thử API/manager không được coi là bằng chứng F5/hai tab/click/scroll/viewport trên trình duyệt. Các bước UI ở trên được giữ cho **6B.3**; điện thoại thật/chạy nền vẫn hoãn theo **2C.3B**.

Biểu đồ tuần/tháng, chuỗi ngày và thời gian học trên các màn tổng hợp sẽ nối ở **6C**. Chưa dùng thẻ tuần/chuỗi ngày RAM của bản mẫu trong màn Tập trung tài khoản; tài khoản hiện vẫn chỉ có phiên tập trung 25 phút, chưa thêm chế độ nghỉ ngắn/dài thật.
