# 6B.1 — Đồng hồ Pomodoro dùng phiên học thật

Ngày 28/10/2026. Project `D:\Video OBS\QuanLyHocTap`.

## Phạm vi đã nối

Tài khoản đăng nhập có đồng hồ tập trung 25 phút đọc/bắt đầu/tạm dừng/tiếp tục/hoàn tất/hủy qua API 6A.1/6A.2. Phiên hiện tại được đọc lại khi tải trang, trở lại app/cửa sổ, có tín hiệu từ tab khác và định kỳ 15 giây khi app ở foreground. Provider giữ phiên khi đổi màn hình; ngữ cảnh môn/bài/buổi dùng snapshot server, không bị lựa chọn mới tự thay thế.

Đếm ngược dùng thời lượng còn lại từ server và đồng hồ monotonic trên thiết bị. Hiển thị được neo tại lúc nhận response nên có thể chậm một khoảng nhỏ theo độ trễ mạng, không phụ thuộc vào đồng hồ ngày giờ máy để tự công nhận phiên. Khi đếm tới 0, frontend đọc lại server trước; chỉ gửi Complete nếu server báo timeUp=true. Chỉ hiển thị đã lưu hoàn tất sau xác nhận POST hoặc đối chiếu GET được trạng thái COMPLETED.

Có xác nhận hủy gắn với đúng id/version đang xem. Tab cũ gửi thao tác bị backend chặn bằng version; reload để lấy trạng thái mới. Một thao tác tại một thời điểm, không tự đổi version để gửi lại khi xung đột.

Lịch sử/mục tiêu/chuỗi ngày và phần thống kê thời gian chưa nối trong 6B.1: lịch sử/mục tiêu ở **6B.2**, thống kê ở **6C**. Màn Tập trung tài khoản không dùng thẻ số liệu RAM của bản mẫu. Bản mẫu khách giữ đồng hồ và chế độ nghỉ cũ riêng; tài khoản hiện chỉ dùng phiên 25 phút theo hợp đồng backend. Nghiệm thu thiết bị thật và chạy nền vẫn ở **2C.3B**.

## Yêu cầu chưa rõ kết quả

Trước khi gửi lệnh, lưu thông tin đối chiếu nhỏ theo tài khoản và API: Start giữ clientRequestId cùng các ID nguồn/zone; thao tác khác giữ id/version/hành động. Không lưu mật khẩu, token, hồ sơ hoặc toàn bộ bản ghi học tập.

Web dùng sessionStorage riêng mỗi tab: giữ qua F5 trong cùng tab; đóng tab thì journal này hết. Phiên đã lưu trên server vẫn đọc được qua Active khi mở lại. Adapter native dùng SecureStore và tuần tự hóa thao tác kho lưu trữ; mới kiểm tra mô phỏng adapter/logic, chưa nghiệm thu thiết bị thật.

Timeout/mạng/5xx hoặc phản hồi không hợp lệ không làm tự gửi lại lệnh. Giữ yêu cầu, khóa thao tác mới và cho **Đối chiếu phiên đã lưu**. Nếu GET xác nhận trạng thái/version mới hoặc terminal thì xóa journal; nếu chưa rõ thì giữ nguyên và chỉ gửi lại đúng lệnh khi người dùng bấm. Start gửi lại đúng UUID/nội dung cũ. GET Active null sau mất phản hồi Complete được đối chiếu thêm theo id để nhận kết quả terminal, không suy từ null rằng chưa có gì được lưu.

Khi tài khoản đổi/đăng xuất, hủy request client và chặn phản hồi cũ cập nhật màn hình; không tự hủy phiên đang lưu ở server. Journal theo chủ tài khoản, tài khoản khác không đọc nhầm. Tín hiệu liên tab chỉ chứa một nonce, không chứa dữ liệu phiên hoặc thông tin đăng nhập. Mất quyền lưu trữ thì thao tác ghi bị chặn trước khi gửi để giữ khả năng đối chiếu.

## Hướng dẫn test trên web

### 1. Chạy backend và frontend

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

Dùng cùng hostname như trước, đăng nhập tài khoản test có học kỳ và môn. Backend cần bản 6A.2/V11. Đợt 6B.1 không có migration hoặc dependency mới.

### 2. Bắt đầu → tạm dừng → F5 → tiếp tục

1. Mở **Tập trung**, chọn môn. Có thể vào từ chi tiết bài hoặc buổi tự học để giữ liên kết.
2. Bấm **Bắt đầu tập trung**: đồng hồ chạy, hiện tên môn/nội dung đã lưu. Bấm liên tục không tạo hai phiên.
3. Sau một lúc bấm **Tạm dừng**, ghi nhớ thời gian còn lại. Chờ rồi F5: vẫn PAUSED, giữ đúng phiên và thời gian còn lại; không quay về 25 phút.
4. Bấm **Tiếp tục**, đồng hồ giảm tiếp; chuyển Trang chủ rồi quay lại Tập trung vẫn cùng phiên.
5. Khi đang học, mở bài khác và chọn tập trung: phiên đang lưu vẫn giữ nội dung ban đầu; hoàn tất/hủy trước khi bắt đầu nội dung mới.

### 3. Hủy có xác nhận

1. Bấm **Hủy phiên** rồi **Giữ phiên học**: đồng hồ/phiên tiếp tục như trước.
2. Mở lại, bấm **Xác nhận hủy phiên**: hiện kết quả đã lưu hủy; có thể bắt đầu phiên mới. Phần học dở không được cộng thành phiên hoàn tất.
3. Kiểm tra PostgreSQL qua script:

```powershell
# Chạy tại thư mục backend, dùng đúng tài khoản test.
.\scripts\Try-Pomodoro.ps1 -Mode History -Status CANCELLED
```

### 4. Hết giờ và xác nhận server

Cho phiên chạy đủ 25 phút (thời gian tạm dừng không tính). Có thể dùng phiên hết giờ còn lại từ 6A.2. Frontend đối chiếu rồi gửi Complete; đang xử lý hiện chờ xác nhận, sau thành công hiện **ĐÃ LƯU HOÀN TẤT**. Reload không tạo thêm phiên hoặc cộng lại.

```powershell
.\scripts\Try-Pomodoro.ps1 -Mode History -Status COMPLETED
.\scripts\Try-Pomodoro.ps1 -Mode Daily
```

Phiên được công nhận đúng 1500 giây. Lịch sử UI ở 6B.2 nên dùng các script này để kiểm tra dữ liệu đã lưu. Không sửa giờ máy/database hoặc thêm API bỏ qua thời lượng để test tài khoản thật.

### 5. Hai tab và mất kết nối

1. Mở thêm tab cùng URL, cùng tài khoản; cả hai đọc cùng phiên.
2. Tạm dừng ở tab 1; tab 2 cập nhật khi nhận tín hiệu/định kỳ hoặc khi quay lại. Nếu bấm trên trạng thái cũ, phải đối chiếu chứ không âm thầm ghi đè.
3. Mở bảng xác nhận hủy rồi thay đổi phiên ở tab khác: bảng cũ không được hủy một phiên mới hoặc tự lấy version mới để gửi.
4. Dừng backend trong terminal thử nghiệm. Khi đối chiếu thất bại, hiện lỗi/chưa đồng bộ và khóa ghi; mốc 0 trên đồng hồ không tự trở thành đã hoàn tất.
5. Chạy lại backend, bấm **Đối chiếu phiên đã lưu**. Nếu có yêu cầu chưa rõ kết quả, giữ yêu cầu đó; chỉ bấm **Gửi lại yêu cầu…** sau đối chiếu và khi cần. Không bấm liên tục để tạo yêu cầu thay thế.

Mất phản hồi đúng sau commit khó tái hiện thủ công: đã có kiểm tra tự động giả lập lỗi trả về sau khi API thật lưu vào PostgreSQL. Điều này không được coi là đã mô phỏng thao tác tắt mạng của trình duyệt.

### 6. Đổi tài khoản và bản mẫu

Đăng xuất khi đang có phiên rồi đăng nhập tài khoản B: không hiện môn/phiên/thông báo của A. A đăng nhập lại đọc được phiên của A. Đăng xuất và mở **Khám phá dữ liệu mẫu**: đồng hồ mẫu/chế độ nghỉ vẫn là luồng riêng, không gửi dữ liệu mẫu vào API.

## Kết quả kiểm tra và giới hạn

**TypeScript, export web và 456 tests frontend đạt (53 mới), không lỗi/bỏ qua; 15 tình huống Manager/API/PostgreSQL QA thật đạt.** Bao gồm mất phản hồi sau commit, khôi phục manager, version cũ, tự hoàn tất/không trùng, tài khoản riêng và kho đối chiếu. Thao tác UI trình duyệt/điện thoại chưa nghiệm thu.

**Chưa nghiệm thu thao tác/hiển thị thực tế trên trình duyệt:** cả công cụ điều khiển trình duyệt và kênh điều khiển Windows đều lỗi khởi tạo (`failed to write kernel assets`, path not found). Đã thử reset và khởi tạo lại; không dùng cách điều khiển trình duyệt ngoài các API được hỗ trợ để thay thế. Cần thực hiện các bước UI phía trên trong 6B.3; không suy từ test manager/API rằng đã kiểm tra thao tác F5, hai tab hay viewport trên trình duyệt thật.

Kiểm tra tích hợp dùng tài khoản/schema PostgreSQL QA riêng, các trường hợp: Start có liên kết; tạo lại manager giữ PAUSED/id/thời gian; Resume; client khác làm version cũ bị chặn; mô phỏng mất phản hồi Pause/Start/Complete sau commit thật; server timeUp và auto-complete một lần; replay Start cũ khi đang có phiên mới; hai tài khoản; trạng thái kế hoạch/bài giữ riêng. Kết quả cuối hai phiên COMPLETED, một CANCELLED, đúng 3.000.000 ms được công nhận. Tăng tốc thời lượng chỉ bằng helper trong schema QA, không sửa API production hoặc dữ liệu người dùng.

Backend không đổi trong đợt này; mốc 606 tests backend là kết quả 6A.2 đã có, không chạy lại toàn bộ ở 6B.1. Các schema/tiến trình QA riêng được dọn sau kiểm tra; PostgreSQL dùng chung giữ chạy.

## Tên commit và push

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git add .
git commit -m "Kết nối đồng hồ Pomodoro với phiên học thật"
git push origin main
```

Chưa tự commit/push.
