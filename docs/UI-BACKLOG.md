# Checklist giao diện và chức năng để bổ sung sau

Theo yêu cầu ngày 20/10/2026: dựng các giao diện còn thiếu trước, sau đó hoàn thiện từng đợt. Ban đầu hoãn bốn nhóm dưới đây; sau UI 2F đã làm bộ chọn ngày/giờ (3A) và điều hướng (3B) theo yêu cầu. Đã hoàn thành các đợt trạng thái (3C) và Dashboard theo học kỳ (3D). Đây là checklist trong project, không phải lịch nhắc tự động.

## Hoàn thiện giao diện sau đợt rà soát — làm từng đợt

Theo yêu cầu ngày 20/10/2026: ưu tiên hai phần điều hướng và bài tập trước; các đề xuất còn lại ghi dưới đây để làm khi có thời gian. Chưa chuyển sang backend trong đợt này.

### Đợt 1 — Điều hướng Lịch học và lối vào Bài tập

- [x] Tách Bài tập thành màn riêng, mở trực tiếp từ khu vực Lịch học; nút thêm bài nằm trên danh sách, không phải cuộn qua lịch.
- [x] Một hàng bốn lối vào Lịch học/Bài tập/Lịch thi/Tự học và nút Môn & học kỳ; lịch giữ bộ chọn ngày/tuần/tháng, bỏ tầng tab Lịch & bài tập → Thời khóa biểu/Kỳ thi.
- [x] Giữ trang, bộ lọc và ngữ cảnh khi đổi mục/quay lại. Bài tập mặc định hiển thị Tất cả; vẫn lọc được trạng thái và môn, bộ chọn môn có mã môn/học kỳ/năm.
- [x] Hướng dẫn bắt đầu và nút đến danh sách bài tập trên Dashboard dẫn tới màn Bài tập riêng. Xem `UI-POLISH-4A.md` để kiểm tra bản mẫu/trống và phạm vi đã làm.

### Đợt 2 — Giờ deadline, tìm kiếm và lọc bài tập

- [x] Chọn cả ngày và giờ hạn nộp bằng lịch/đồng hồ 24 giờ; hiển thị trên danh sách, chi tiết, Dashboard, nhắc bài, môn học và các nơi liên kết. Bài cũ chưa có giờ dùng 23:59.
- [x] Tìm theo tên bài, tên môn hoặc mã môn; hỗ trợ gõ không dấu/hoa thường, có xóa tìm kiếm và trạng thái không có kết quả.
- [x] Lọc Tất cả/Hôm nay/Quá hạn/Sắp hạn, kết hợp trạng thái và môn. Sắp hạn là bài chưa hoàn thành từ hiện tại đến cùng giờ sau 7 ngày; Quá hạn không tính bài đã hoàn thành.
- [x] Xét hạn bằng ngày và giờ; cập nhật đầu mỗi phút và khi trở lại màn/ứng dụng. Sửa deadline kiểm tra giờ kết thúc các buổi tự học đã liên kết; tạo/sửa buổi học và duyệt kế hoạch AI dùng cùng mốc hạn. Xem `UI-POLISH-4B.md` để kiểm tra và xem giới hạn frontend.

### Đợt 3 — Pomodoro, lịch sử và nhịp học mỗi ngày

- [x] UI 4C: Lịch sử nhóm theo ngày kết thúc, có môn/bài/buổi tự học, giờ bắt đầu/kết thúc, phút học và thời gian tạm dừng được loại trừ. Lọc Hôm nay/7 ngày/Tất cả; trạng thái trống và nhãn phiên mẫu rõ ràng.
- [x] Mục tiêu ngày chọn 1–12 phiên, mặc định 4; có lưu/hủy. Số phiên, số phút hôm nay/7 ngày và tiến độ tính từ các phiên hoàn tất; đổi mục tiêu không xóa lịch sử.
- [x] Chuỗi ngày học và lịch 7 ngày: tối thiểu một phiên/ngày; chưa học hôm nay giữ chuỗi đến hết ngày, bỏ lỡ một ngày sẽ đặt lại. Phiên qua nửa đêm tính vào ngày kết thúc.
- [x] Timer giữ mã phiên và ngữ cảnh ban đầu qua tạm dừng/đổi tab; loại trừ giờ nghỉ và phiên bỏ dở, không ghi trùng khi nhận callback muộn. Chỉ cộng phút cho buổi tự học đã chọn, không tự hoàn thành bài tập. Xem `UI-POLISH-4C.md`.
- [ ] Lưu/khôi phục khi tắt ứng dụng, đồng bộ và nghiệm thu chạy nền/khóa màn hình trên điện thoại thật: vẫn thuộc đợt nghiệp vụ Pomodoro, chưa hoàn thành trong giao diện này.

### Đợt 4 — Thống kê từ phiên học và bài tập

- [x] UI 4D: Dựng Tổng quan theo ảnh đã duyệt: chọn học kỳ, 7 ngày/30 ngày/khoảng ngày tùy chọn, thẻ thời gian và chuỗi ngày, biểu đồ, phân bổ môn và tiến độ bài tập.
- [x] Biểu đồ và phân bổ môn cộng từ bản ghi Pomodoro hoàn tất; cùng tổng phút, không dùng dãy giờ/tỷ lệ cố định. Có nhãn phiên mẫu, ngày không học, xem chi tiết cột, khoảng dài gộp tối đa 7 cột.
- [x] Lọc phiên theo học kỳ đã lưu lúc bắt đầu; giữ lịch sử khi môn bị đổi học kỳ/xóa. Bản ghi cũ chưa có mã học kỳ tra theo mã môn trong danh sách hiện tại.
- [x] Bài tập tính toàn bộ học kỳ, tách hoàn thành/chưa xong còn hạn/chưa xong quá hạn; cập nhật theo trạng thái và hạn ngày/giờ. Chú thích rõ khoảng ngày chỉ lọc thời gian học/phân bổ môn; chuỗi học kỳ tính đến hôm nay.
- [x] Có lịch chọn ngày, báo lỗi khoảng đảo ngược, áp dụng/hủy, trạng thái chưa có học kỳ/phiên/bài tập. Workspace trống có thể thêm dữ liệu rồi xem thống kê. Giữ tab Điểm & GPA. Xem `UI-POLISH-4D.md` để test và xem giới hạn frontend.

### Đợt 5 — So sánh GPA giữa các học kỳ

- [x] UI 4E: Mục So sánh GPA trong Thống kê; chọn hai học kỳ A/B kèm năm học, không cho chọn trùng; có đổi chiều và mặc định kỳ trước/kỳ đang học.
- [x] GPA, tín chỉ GPA đạt/tính GPA và số môn đủ kết quả lấy cùng `summarizeGrades` với bảng điểm; GPA tạm tính có nhãn và số môn còn thiếu kết quả. GPA học kỳ giữ lần học của kỳ đó, không dùng quy tắc chọn lần học lại của GPA tích lũy.
- [x] Chênh lệch B − A tăng/giảm/không đổi theo hai giá trị GPA hiển thị 2 chữ số; thiếu GPA ở một kỳ thì không tự tính chênh lệch. Điểm thiếu và GPA 0.00 thật được hiển thị khác nhau, kỳ chưa có GPA không vẽ thanh 0.
- [x] Chạm thẻ/thanh học kỳ mở đúng bảng điểm, dùng lại editor môn hiện có; lưu cập nhật GPA/thẻ/biểu đồ/chênh lệch, hủy bản nháp giữ dữ liệu cũ. Back quay lại từng bước; X đóng luồng, giữ lựa chọn so sánh.
- [x] Trạng thái chưa có/chỉ có một học kỳ, kỳ chưa có môn, môn đạt/không đạt; kiểm tra 320/390/430/1280px. Giữ mục Điểm & GPA và thêm lối sang so sánh từ bảng điểm. Xem `UI-POLISH-4E.md`.

### Đợt 6 — Thông báo trong app và trạng thái đã đọc

- [x] UI 4F: Góc nhắc nhở có Tất cả/Chưa đọc, đánh dấu từng mục/tất cả, trạng thái chưa có nhắc việc/đã đọc hết. Mở chuông không tự đánh dấu tất cả; huy hiệu là số mục chưa đọc thật, quá 99 hiện 99+.
- [x] Tổng hợp bài chưa xong quá hạn/đến hạn trong 7 ngày, buổi học/lịch thi đang diễn ra hoặc bắt đầu trong 7 ngày. Buổi lặp có mã riêng theo ngày; áp dụng đổi giờ/phòng, bỏ buổi hủy và lịch đã kết thúc.
- [x] Đổi deadline/tên/giờ/phòng tạo trạng thái chưa đọc mới cho đúng mục; đồng hồ đổi phút không tự làm mục đã đọc thành chưa đọc. Bài hoàn thành hoặc nguồn xóa/hủy được bỏ; dữ liệu mới được thêm mà không dùng số mục cố định.
- [x] Mở đúng bài, đúng ngày của buổi học hoặc đúng lịch thi; Back/Escape/Back trình duyệt quay lại danh sách và giữ bộ lọc, X đóng luồng. Trạng thái đọc giữ qua các tab trong phiên.
- [x] Tách `features/notifications/`, kiểm tra 320/390/430/1280px, trạng thái trống và hồi quy điều hướng. Xem `UI-POLISH-4F.md`. Đây là danh sách nhắc việc trong app; lưu bền/đồng bộ và thông báo thiết bị vẫn làm sau.

### Đợt 7 — Cảnh báo thay đổi chưa lưu

- [x] UI 4G: Học kỳ, môn học, bài tập, lịch học lặp/ngoại lệ, lịch thi, điểm và buổi tự học có cảnh báo khi rời form đã thay đổi. Có Tiếp tục chỉnh sửa/Bỏ thay đổi; Back bỏ bản nháp về màn trước, X bỏ bản nháp đóng luồng.
- [x] Form mới so với giá trị mặc định khi mở; form sửa so với dữ liệu lúc mở. Sửa rồi trả lại đúng nội dung ban đầu không hỏi; lỗi/xác nhận xóa/bộ chọn đang mở không tự tính là thay đổi dữ liệu.
- [x] Bộ chọn ngày/giờ nhận Back trước form; đang chờ lưu thì hủy chờ trước khi hỏi; lưu thành công/xóa đã xác nhận không hỏi thêm. Có bảo vệ tải lại/đóng tab bằng hộp thoại mặc định của trình duyệt khi có bản nháp.
- [x] Kiểm tra bản nháp, lưu/lỗi/thử lại, điều hướng và kích thước màn hình. Xem `UI-POLISH-4G.md`. Dữ liệu vẫn trong phiên; chưa lưu nháp bền hoặc nghiệm thu Back/bàn phím trên máy thật.

### Đợt 8 — Rà soát luồng giao diện và trình diễn trực tiếp

- [x] UI 4H: Từ dữ liệu trống tạo học kỳ/môn/lịch/bài/điểm rồi đối chiếu Dashboard; sửa phòng thi, hạn quá hạn, hoàn thành bài và cảnh báo điểm. Cùng mã môn ở kỳ khác không trộn dữ liệu.
- [x] Đối chiếu một phiên Pomodoro hoàn tất với buổi tự học, lịch sử và Thống kê; kiểm tra nhắc việc đã đọc và bỏ bài hoàn thành; kiểm tra bản nháp chưa lưu.
- [x] Có runner `qa-frontend-review.cjs --live` mở Chrome riêng để xem thao tác; giữ cửa sổ ở Dashboard sau khi xong. Cập nhật bài test GPA cũ theo hộp xác nhận bỏ thay đổi.
- [x] Rà soát các màn lịch, điểm, focus, thống kê, nhắc việc, tài khoản/AI mẫu, điều hướng và trạng thái; đối chiếu bộ kiểm tra logic và viewport 320/390/430/1280px. Xem `FRONTEND-REVIEW.md`.
- [ ] Nghiệm thu trên điện thoại thật, bàn phím, chạy nền, thông báo hệ điều hành và dữ liệu backend; đợt này mới kiểm tra frontend web trong phiên.

### Các đề xuất lưu để làm sau

- [ ] Thông báo: giao diện quyền bị từ chối/thu hồi và hướng dẫn bật lại; phần xin quyền/lên lịch nhắc thật triển khai cùng thông báo trên thiết bị.
- [ ] Mở rộng cảnh báo chưa lưu sang hồ sơ/tài khoản, form AI và các tùy chọn khác; đợt UI 4G ưu tiên các biểu mẫu dữ liệu học tập đã thống nhất.
- [ ] Biểu mẫu dài: nút lưu dễ tiếp cận, đặc biệt bảng điểm nhiều cột; thử với bàn phím điện thoại để tránh che ô/nút.
- [ ] Giao diện: áp dụng sáng/tối xuyên suốt app, không chỉ thẻ xem trước trong cài đặt.
- [ ] Ngôn ngữ: áp dụng tiếng Việt/English xuyên suốt app, gồm thông báo lỗi, lịch, ngày giờ và trạng thái trống.

Các mục chưa đánh dấu là phần để làm sau, không coi đã hoàn thành chỉ vì có bản xem trước. Mỗi đợt hoàn thành sẽ cập nhật tiêu chí kiểm tra và tên commit tiếng Việt.

## Lộ trình backend — 5 đợt lõi

Frontend React Native + backend Spring Boot/PostgreSQL. Ngày 23/10/2026 đã xong nền tảng 1, tài khoản 2A/2B/2C.1/2C.2/2C.3A, học kỳ/môn 3A/3B/3C.1/3C.2, **4A/4B API + UI bài tập và 4C/4D API + UI tự học**. 2C.3B để sau. Đã có API chuỗi lịch 4E.1, ngoại lệ 4E.2A và trùng giờ 4E.2B; 4F.1 đã đọc lịch thật trên Thời khóa biểu, 4F.2 đã ghi cả chuỗi, còn ghi từng buổi 4F.3 và lịch thi. Điểm/Pomodoro, checklist/tài liệu mẫu vẫn RAM.

| Đợt | Làm gì | Kết quả cần kiểm tra được |
| --- | --- | --- |
| 1. Nền tảng backend | Spring Boot + PostgreSQL; thiết kế bảng, quan hệ dữ liệu và API; chuẩn hóa lỗi | Chạy được backend và kết nối database. |
| 2. Tài khoản thật | Đăng ký, đăng nhập, phiên đăng nhập; nối frontend React Native với API | Hai tài khoản có dữ liệu riêng, không đọc/ghi chéo dữ liệu; lỗi mạng không làm app treo. |
| 3. Học kỳ và môn học | API thêm/sửa/xóa học kỳ, môn học; chọn học kỳ | Tạo môn rồi tải lại app vẫn còn; chuyển học kỳ hiển thị đúng môn. |
| 4. Bài tập và lịch | Deadline, kế hoạch tự học, lịch học lặp, ngoại lệ và lịch thi | Dữ liệu được lưu và liên kết đúng môn/học kỳ; sửa một buổi không làm thay đổi cả chuỗi. |
| 5. Điểm và Dashboard | Lưu cột điểm tùy chỉnh, cấu hình BTL; tính tổng kết/GPA ở backend; nối dữ liệu Dashboard | Kết quả thống nhất giữa bảng điểm và Dashboard; xử lý đúng điểm thiếu và cách quy BTL, không tính trùng. |

### Checklist nghiệm thu

- [x] Backend 1 — Spring Boot 4.1.1/Java 21, Maven Wrapper, PostgreSQL portable cục bộ; Flyway V1 tạo bảng tài khoản/học kỳ/môn, JPA validate schema. Có API health, ProblemDetail, request ID, CORS và khóa endpoint nghiệp vụ trước auth. Xem `../backend/README.md`, `../backend/docs/SCHEMA.md` và `../backend/docs/API.md`.
- [x] Backend 1 — Kiểm tra trên PostgreSQL thật: chạy lại migration không tạo trùng; chặn email/kỳ/mã môn trùng, kỳ ngoài 1–3, tín chỉ sai và liên kết môn khác chủ sở hữu; kiểm tra health/lỗi/401/405/CORS. Chưa coi đây là phân quyền hai tài khoản hoàn chỉnh.
- [x] Backend 1 — 17 tests qua; app chạy trên `focus_study/public`, health chuyển 200 → 503 khi dừng DB → 200 khi bật lại. Hướng dẫn tổng hợp ở `BACKEND-PHASE-1.md`; frontend chưa nối API.
- [ ] Backend 2 — Đăng ký/đăng nhập và phiên đăng nhập hoạt động trên frontend; dữ liệu hai tài khoản được tách riêng.
- [x] Backend 2A — POST đăng ký/đăng nhập, GET hồ sơ hiện tại; mật khẩu băm, email chuẩn hóa/duy nhất, lỗi validation/trùng/sai thông tin, giới hạn thử; access token ký RS256 15 phút để bảo vệ hồ sơ. 34 tests qua trên PostgreSQL thật (gồm 17 tests nền tảng). Hồ sơ hai tài khoản độc lập; không coi là đã kiểm tra phân quyền dữ liệu học tập. Xem `BACKEND-PHASE-2A.md`.
- [x] Backend 2B — V2 lưu phiên/hash refresh token, luân chuyển một lần, hạn refresh 7 ngày/phiên tối đa 30 ngày; replay thu hồi cả phiên, logout chặn ngay access token. Web có cookie HttpOnly/CSRF/origin, native dùng body; 51 tests qua, gồm đóng/mở backend ba lần và script PowerShell 5.1. Xem `BACKEND-PHASE-2B.md`.
- [ ] Backend 2C — Nối đăng ký/đăng nhập/hồ sơ React Native; lưu phiên phù hợp web/native, tự refresh, lỗi mạng có timeout/thử lại, đăng xuất dọn dữ liệu tài khoản; thử hai tài khoản không lẫn trạng thái frontend.
- [x] 2C.1 — Form đăng ký/đăng nhập gọi API thật; GET hồ sơ, tên trên Trang chủ, API/Provider riêng, loading/khóa gửi lặp, lỗi trường/409/401/mạng/timeout 10 giây, thử lại hồ sơ và hủy khi đóng. Web có cookie/CSRF; token frontend chỉ trong bộ nhớ. TypeScript/export web, 13 nhóm kiểm tra API client và kiểm tra web với PostgreSQL thật/schema riêng, hai tài khoản, 4 kích thước màn hình. Xem `FRONTEND-AUTH-2C1.md`.
- [x] 2C.2 — Khôi phục, tự refresh một lần, logout thật và dọn trạng thái. Web cookie HttpOnly/CSRF, Web Locks liên tab và dấu phiên không chứa token; native có adapter SecureStore đã thử mock, máy thật ở 2C.3. Qua 19 nhóm unit phiên, 15 nhóm API client và 9 nhóm browser/PostgreSQL schema riêng, TypeScript/export web. Xem `FRONTEND-AUTH-2C2.md`.
- [x] 2C.3A — Kiểm tra web: đổi hai tài khoản khi có dữ liệu thử/form nháp/Pomodoro, đăng xuất từ tab khác, hồ sơ/đăng nhập về muộn và mất mạng/kết nối lại. Sửa phạm vi FeedbackProvider và refresh khi tab đọc thấy danh tính mới trước storage event. Có runner `qa-account-isolation.cjs` và hướng dẫn `FRONTEND-AUTH-2C3A.md`; không coi dọn prototype là phân quyền dữ liệu học tập backend.
- [ ] 2C.3B — **Để làm sau theo yêu cầu người dùng**, tiếp tục ưu tiên web/backend. Kết nối/kiểm tra Android/iOS/điện thoại thật, mở lại process và SecureStore thật; không suy từ test web là đã kiểm tra native.
- [ ] Backend 2C — Web lấy CSRF/credentials cookie, native lưu refresh token bằng kho bảo mật; gộp refresh đồng thời, không gắn access token hết hạn vào auth request hoặc gửi lại token đã xoay khi không rõ kết quả; thử tải lại app và lỗi mạng.
- [ ] Vận hành auth sau bản lõi — job dọn phiên/hash token hết hạn, quản lý/thu hồi mọi thiết bị, giới hạn thử chia sẻ nhiều instance/proxy; production HTTPS bật Secure cookie và chốt origin/cùng site.
- [x] Backend 3 — API và UI thêm/sửa/xóa học kỳ/môn, chuyển môn sang kỳ khác, F5/đăng nhập lại giữ dữ liệu và chọn đúng kỳ. Hoàn tất trên web; thiết bị thật vẫn thuộc 2C.3B đã hoãn.
- [x] 3A — API tạo/xem/sửa/xóa học kỳ lưu PostgreSQL, kỳ 1/2/hè tùy chọn, chặn trùng kỳ/năm, tối đa một CURRENT theo tài khoản; kiểm tra quyền hai tài khoản, version và chặn xóa kỳ còn môn. Dùng bảng V1, không sửa migration; 72 tests/Maven verify qua, có request đồng thời, restart và script PowerShell 5.1. Chưa nối UI; xem `BACKEND-PHASE-3A.md`.
- [x] 3B — API CRUD môn/lọc học kỳ, lưu PostgreSQL theo tài khoản, chuẩn hóa mã/chặn trùng trong kỳ, cùng mã được ở kỳ khác; version chống ghi đè, kiểm tra kỳ đích và dùng chung khóa với học kỳ. 92 tests/Maven verify qua, có hai người, request đồng thời, restart và script PowerShell 5.1. Dùng bảng V1, không sửa migration; chưa nối UI. Xem `BACKEND-PHASE-3B.md`.
- [x] 3C — Nối giao diện học kỳ/môn với API; F5/đăng nhập lại giữ dữ liệu, đổi kỳ hiện đúng môn và các ô chọn dùng chung danh sách. Đã kiểm tra trên web; không coi bài/lịch/điểm/Pomodoro là dữ liệu thật.
- [x] 3C.1 — Danh sách/tạo/sửa/xóa học kỳ gọi API theo tài khoản; F5/đăng nhập lại vẫn còn, Trang chủ/bộ chọn dùng chung dữ liệu, CURRENT cập nhật theo server. Có loading/lỗi/thử lại, version, xác nhận xóa/chặn kỳ còn môn; giữ bản nháp và nạp bản mới khi xung đột, không tự gửi lại thao tác ghi mất phản hồi. Xem `FRONTEND-SEMESTERS-3C1.md`. Môn/bài/lịch/điểm trên UI vẫn là dữ liệu thử; chưa nghiệm thu máy thật.
- [x] 3C.2 — API/UI môn đã nối: tải/thêm/sửa/xóa/chuyển kỳ, mã trùng/version, F5 và đổi tài khoản, Dashboard/tín chỉ/bộ chọn chung nguồn. Giữ bản nháp khi xung đột, không gửi lại thao tác mất phản hồi; bảo vệ bài/lịch/điểm thử khi chuyển/xóa, cập nhật tên và dọn mục thử khi server xóa/chuyển môn từ nơi khác. 29 nhóm unit mới, 13 nhóm browser môn trên PostgreSQL/schema QA riêng; hồi quy học kỳ/tài khoản và smoke web 4 kích thước qua. Xem `FRONTEND-COURSES-3C2.md`. Không đổi công thức điểm hoặc backend/migration; 2C.3B vẫn để sau.
- [ ] Backend 4 — Bài tập, kế hoạch tự học, lịch lặp/ngoại lệ và lịch thi được lưu đúng liên kết; kiểm tra một buổi và cả chuỗi.
- [x] 4A — V3 thêm bảng bài tập, API CRUD/lọc theo tài khoản/môn/kỳ/trạng thái, deadline có ngày/giờ/offset và version. Chặn xóa/chuyển kỳ môn còn bài, dùng chung khóa để chống đua với ghi bài; FK ghép bảo vệ chủ sở hữu. 118 tests/Maven verify qua (26 mới), gồm nâng V2 giữ dữ liệu cũ, restart, hai tài khoản, UTC, request đồng thời và script PowerShell 5.1. UI bài tập được nối ở 4B; xem `BACKEND-PHASE-4A.md`.
- [x] 4B — Nối UI bài tập với API 4A: tải/thêm/sửa/xóa, bộ lọc/deadline ngày giờ, F5/đổi tài khoản, version/lỗi mạng và Dashboard dùng cùng nguồn. Giữ rõ giới hạn checklist/tài liệu/buổi tự học còn RAM, kiểm tra liên kết khi đổi môn/xóa bài. Đã có 32 nhóm unit mới và 16 nhóm browser trên PostgreSQL/schema QA riêng, 4 kích thước 320/390/430/1280; không thay backend/migration. Xem `FRONTEND-ASSIGNMENTS-4B.md`.
- [x] 4C — V4 + API tự học CRUD/lọc môn/kỳ/bài/trạng thái/khoảng giờ, timeZone + UTC, version/ownership; chặn trùng buổi/vượt deadline, giữ buổi khi xóa bài và guard chuyển/xóa môn. 155 tests/Maven verify qua (37 mới), gồm nâng V3 giữ dữ liệu, restart, DST/giáp ranh, ghi đồng thời và script PowerShell 5.1; không seed hoặc nối UI. Xem `BACKEND-PHASE-4C.md`.
- [x] 4D — Nối UI tự học với API 4C: ngày/tuần, tạo/sửa/xóa/đổi trạng thái, liên kết bài/môn, F5/đổi tài khoản, giữ bản nháp/version và lỗi mạng; xóa bài giữ buổi độc lập và nạp version mới. Tách phút Pomodoro trong phiên khỏi trạng thái/thời lượng dự kiến. 37 nhóm unit mới, 16 nhóm browser tự học, hồi quy bài tập và smoke web 4 kích thước qua. Xem `FRONTEND-STUDY-4D.md`; không đổi backend/migration, chưa nghiệm thu máy thật.
- [ ] Đợt AI — Lưu/điều chỉnh nhiều buổi qua API sau bước xem trước/duyệt; xử lý lỗi từng phần, trùng giờ, version và tránh tạo trùng khi mất phản hồi. Từ 4D tài khoản thật chỉ xem trước, có lối đến Tự học; khách vẫn thử local.
- [ ] Đợt Pomodoro — Lưu lịch sử phiên và mục tiêu ngày qua API, không suy thời gian học thật từ trạng thái hoàn thành thủ công hoặc thời lượng kế hoạch.
- [x] 4E.1 — V5 + API chuỗi lịch theo môn/tài khoản: các thứ, khoảng ngày, giờ địa phương/múi giờ, phòng/giảng viên, ghi chú và cấu hình nhắc; CRUD/lọc, đọc các buổi phát sinh, ownership/version và guard chuyển/xóa môn. 182 tests/Maven verify qua (27 mới), nâng V4 giữ dữ liệu, restart, DST/ba múi giờ JVM và script PowerShell 5.1. Xem `BACKEND-PHASE-4E1.md`; UI lịch còn RAM, chưa kiểm tra trùng/ngoại lệ hoặc gửi nhắc.
- [x] 4E.2A — V6 + API nghỉ/đổi giờ/phòng/giảng viên, khôi phục một ngày đúng chuỗi; occurrences có cờ nghỉ/đổi và giá trị sau ghi đè. Dùng version cả chuỗi chống bản cũ, khôi phục/tạo lại cùng ngày và ghi đồng thời; sửa chuỗi không làm mất/sai ngoại lệ. 208 tests/Maven verify qua (26 mới), nâng V5 giữ dữ liệu/version, snapshot đọc, restart và script PowerShell 5.1. Hướng dẫn `BACKEND-PHASE-4E2A.md`; chưa nối UI hoặc kiểm tra trùng.
- [x] 4E.2B — Chặn trùng lịch–lịch/tự học hai chiều theo UTC sau ngoại lệ; bỏ buổi nghỉ, cho phép nối tiếp, bảo vệ đổi/khôi phục buổi, sửa chuỗi và ghi đồng thời. Lỗi có buổi/môn/ngày/giờ, thất bại giữ dữ liệu/version. 238 tests/Maven verify qua (30 mới), TypeScript và 6 tình huống smoke HTTP qua. Script PowerShell 5.1 và form tự học hiện lỗi cụ thể; không thêm migration/seed. Xem `BACKEND-PHASE-4E2B.md`; UI thời khóa biểu ở 4F.
- [x] 4F — Nối UI thời khóa biểu với API: đã kiểm tra đọc/ghi web qua 4F.1 → 4F.2 → 4F.3. Kiểm tra thiết bị thật vẫn thuộc 2C.3B đang hoãn; tổng hợp Dashboard/nhắc việc tách bên dưới.
- [x] 4F.1 — Đọc lịch theo tài khoản/học kỳ/khoảng ngày; ngày/tuần/tháng, chi tiết chỉ xem, hiển thị nghỉ/đổi, tải/lỗi/thử lại và chặn phản hồi cũ khi đổi khoảng/tài khoản. 28 test đọc lịch, TypeScript, export web và browser API thật 320/390/430/1280px qua; F5, kỳ trống, mất mạng và hai tài khoản. Không đổi backend; chưa nối thao tác ghi hoặc nghiệm thu native. Xem `FRONTEND-SCHEDULE-4F1.md`.
- [x] 4F.2 — Thêm/sửa/xóa cả chuỗi bằng API, danh sách chuỗi ngoài khoảng đang xem, xác nhận xóa đúng chuỗi và ngoại lệ; giữ bản nháp khi trùng/lỗi, nạp lại rõ ràng khi version cũ, không tạo lại chuỗi đã xóa. Khóa gửi trùng, kiểm tra toàn tài khoản khi mất phản hồi, phân biệt ghi đã xác nhận và GET lỗi. 54 test đọc/ghi (26 mới), TypeScript, export web và browser API thật qua; không đổi backend/migration. Xem `FRONTEND-SCHEDULE-4F2.md`.
- [x] 4F.3 — Nghỉ/đổi/khôi phục đúng một ngày qua API; kế thừa riêng giờ/phòng/giảng viên, khác biệt bỏ chọn và để trống; version cả chuỗi, giữ bản nháp, chặn trùng khi đổi/khôi phục và không ảnh hưởng tuần khác. Mất phản hồi phải kiểm tra đúng buổi, không tự gửi lại. 81 test đọc/ghi (27 mới), TypeScript, export web, browser API thật và 4 kích thước lịch qua; không đổi backend/migration. Xem `FRONTEND-SCHEDULE-4F3.md`.
- [x] 4G — Tổng hợp lịch thật trên web: 4G.1 Trang chủ/chi tiết môn và 4G.2 nhắc việc trong app đã xong. Dùng nguồn đủ phạm vi/ngoại lệ; thông báo hệ điều hành và kiểm tra thiết bị thật vẫn tách riêng.
- [x] 4G.1 — Trang chủ có buổi gần nhất/hôm nay đúng kỳ; chi tiết môn có số buổi còn lại và tối đa 5 thẻ đúng môn, mở đúng ngày nguồn. Đọc đầy đủ các khoảng chuỗi bằng request tối đa 92 ngày, kiểm tra đủ buổi và version trước/sau; UTC/giờ thiết bị, buổi nghỉ/đổi, tải/lỗi và invalidation sau ghi. 111 test lịch (30 mới), TypeScript/export web và 19 nhóm browser API thật qua, ảnh Trang chủ 4 kích thước và chi tiết môn 320px. Không đổi backend/migration. Xem `FRONTEND-SCHEDULE-4G1.md`.
- [x] 4G.2 — Chuông dùng lịch/ngoại lệ toàn tài khoản, xuất hiện đúng mốc đã lưu (0 = giờ bắt đầu), cập nhật đổi/nghỉ/khôi phục/xóa/kết thúc; điều hướng đúng ngày/kỳ và đọc lại cả khi quay về cùng ngày. Giữ dấu đã đọc khi tải lại/lỗi và khi sửa ngày khác; báo chưa đủ dữ liệu thay vì số 0, không dùng lịch RAM. 140 test (29 mới), 62 kiểm tra nhắc việc cũ, TypeScript/export web và 15 nhóm browser API thật qua; ảnh 4 kích thước. Không đổi backend/migration. Xem `FRONTEND-SCHEDULE-4G2.md`.
- [x] 4H — Lịch thi dùng dữ liệu thật: API, trùng hai chiều và UI đọc/ghi/tổng hợp/nhắc trong app đã xong ở 4H.1A → 4H.1B → 4H.2. Push hệ điều hành/native vẫn nghiệm thu riêng.
- [x] 4H.1A — V7 + CRUD/lọc lịch thi theo tài khoản/môn/kỳ/loại/hình thức/khoảng UTC; giờ/zone, phòng/ghi chú, bật/tắt và nhiều mốc nhắc; owner/version cả PUT giống hệt, guard xóa/chuyển môn. 268 tests/Maven verify qua (30 mới), gồm migration giữ dữ liệu, restart toàn backend, DB constraints, ghi đồng thời và PowerShell 5.1. TypeScript/140 test lịch frontend hồi quy qua. Xem `BACKEND-PHASE-4H1A.md`; UI 4H.2, kiểm tra trùng tách ở 4H.1B.
- [x] 4H.1B — Chặn trùng thi–thi/thi–lịch học/thi–tự học theo thời điểm thực, cả khi sửa/khôi phục lịch hoặc tự học; hai chiều đã hoàn thành ở 4H.1B.1/4H.1B.2, khóa ghi đồng thời và lỗi rõ buổi bị trùng. UI 4H.2 còn làm sau.
- [x] 4H.1B.1 — Chiều POST/PUT lịch thi: so kỳ thi khác, lịch học hiệu lực sau nghỉ/đổi/kế thừa và tự học toàn tài khoản. UTC, chạm giờ, loại chính nó, ưu tiên quyền/version, rollback toàn cột, khóa ghi thi đồng thời; 294 tests/Maven verify qua (26 mới), không bỏ qua, có PowerShell 5.1. TypeScript/140 test lịch frontend qua. Không migration/seed, V7. Xem `BACKEND-PHASE-4H1B1.md`.
- [x] 4H.1B.2 — Chiều ngược: tạo/sửa chuỗi lịch học, đổi/khôi phục buổi và tạo/sửa tự học so với lịch thi; UTC, ngoại lệ/kế thừa, chạm giờ, quyền/version và ưu tiên lỗi cũ. Giữ toàn bộ dữ liệu/ngoại lệ/version khi bị chặn; khóa ghi bảo vệ tạo/sửa/khôi phục đồng thời với thi. 325 tests/Maven verify qua (31 mới), không bỏ qua, có PowerShell 5.1 cả ba script; TypeScript/140 test lịch frontend qua. Không migration/seed, V7. Xem `BACKEND-PHASE-4H1B2.md`.
- [x] 4H.2 — Đã nối UI đọc/ghi lịch thi, Trang chủ/chi tiết môn và nhắc việc với API; các đợt 4H.2A/B/C.1/C.2 có kiểm tra tài khoản, dữ liệu thay đổi và lỗi mạng.
- [x] 4H.2A — GET danh sách/chi tiết lịch thi theo tài khoản, học kỳ và môn; lọc Sắp tới/Đã qua/Tất cả theo UTC, ngày/giờ nguồn/zone, DST, nhắc 0 phút. Tải/lỗi/thử lại/trống/404; gộp/hủy request, bỏ phản hồi cũ và không ghi RAM trong tài khoản. 50 test mới + 140 test lịch hồi quy, TypeScript/export web và browser API/PostgreSQL thật qua (F5, đổi tài khoản, mất mạng/restart, cập nhật/xóa ở nơi khác); ảnh 4 kích thước. Không đổi backend/migration/dependency. Xem `FRONTEND-EXAMS-4H2A.md`.
- [x] 4H.2B — Nối thêm/sửa/xóa và cấu hình nhắc vào API; ngày/giờ/zone, nhiều mốc nhắc (0–10080), bản nháp khi trùng, version cũ/404 và mất phản hồi; khóa ghi chung tài khoản, đọc và đối chiếu trước khi ghi tiếp, cập nhật danh sách/chi tiết, không tự retry. 84 test lịch thi (34 mới) + 140 test lịch hồi quy, TypeScript/export web và browser API/PostgreSQL thật qua (F5, trùng/version, mất mạng/restart, đổi kỳ, xóa và đổi tài khoản); form 320px/cảnh báo 390px. Không backend/migration/dependency. Xem `FRONTEND-EXAMS-4H2B.md`.
- [x] 4H.2C — Tổng hợp lịch thi thật trên Dashboard/chi tiết môn và mục nhắc việc; đã hoàn thành ở C.1/C.2.
- [x] 4H.2C.1 — Dashboard: kỳ thi đang diễn ra/sắp tới gần nhất, đếm ngược và lối mở đúng kỳ. Chi tiết môn: lịch thi theo môn/kỳ, bộ lọc và mở/thêm/sửa/xóa qua API; giữ bộ lọc khi quay lại. Lỗi/trống/bản cũ/đổi phạm vi, zone/DST, 404 và cập nhật khi trở lại màn/tab. 104 test lịch thi (20 mới) + 140 test lịch hồi quy, TypeScript/export web và browser PostgreSQL thật qua (F5, hai tài khoản, đổi kỳ, sửa/xóa, mạng/restart); ảnh 320/390px. Không backend/migration/dependency. Xem `FRONTEND-EXAMS-4H2C1.md`.
- [x] 4H.2C.2 — Nhắc thi toàn tài khoản theo mốc đã lưu, 0 phút, một thẻ/mốc mới unread; mở chi tiết API, cập nhật sửa/tắt/xóa/kết thúc, receipt ổn định khi reload/đếm phút/version. Lịch học/thi lỗi độc lập, chuông chờ/khóa đọc tất cả/không báo trống giả và giữ dấu đọc qua retry. 139 test lịch thi (35 mới) + 140 test lịch hồi quy, TypeScript/export web và browser PostgreSQL thật qua (mốc 0/kết thúc theo đồng hồ, sửa/tắt/xóa, read/retry, bộ lọc và hai tài khoản); ảnh 320/390px. Không backend/migration/dependency. Xem `FRONTEND-EXAMS-4H2C2.md`.
- [x] Backend 5 — Hoàn thành phần lõi trên web trong phạm vi chính sách app: cột điểm/BTL lưu và mở lại; tổng kết, GPA kỳ/tích lũy, so sánh và Dashboard đã nối API qua 5A/5B/5C. GPA chính thức/đặc thù và nghiệm thu native vẫn là mục hoãn riêng.
- [x] 5A.1 — API/PostgreSQL lưu cấu hình Lý thuyết/Thực hành theo môn; thêm/sửa/xóa/đổi thứ tự cột, BTL thay thực hành hoặc toàn phần/một phần cuối kỳ, trọng số dựng từ cấu hình và bản DRAFT thiếu nhóm. V8 không seed; ownership/version/khóa tài khoản, snapshot đọc, giữ ID cột và guard xóa/chuyển môn. Có mẫu JSON, script PowerShell 5.1 và IntelliJ HTTP; kiểm tra migration V7 → V8, restart và ghi đồng thời. Xem `BACKEND-PHASE-5A1.md`. Chưa lưu điểm số và chưa nối UI Điểm.
- [x] 5A.2 — Đã lưu giá trị điểm/BTL ở 5A.2A và tính kết quả môn theo profile IUH 2023 ở 5A.2B; null khác 0, bảo vệ dữ liệu khi sửa/xóa cột. GPA và nối UI còn làm sau.
- [x] 5A.2A — V9 lưu điểm 0–10/null theo cột, điểm BTL và phần còn lại; GET/PUT đủ bộ cột và trường điểm, version/khóa ghi chung cấu hình, rollback/snapshot. Đổi tên/thứ tự giữ điểm; xóa/đổi mã/loại/cách quy BTL của cột có điểm, đổi học phần hoặc xóa cấu hình còn điểm bị chặn cho đến khi xóa điểm rõ ràng. Có PowerShell Get/Export/Update, IntelliJ HTTP; kiểm tra V8 → V9, restart và ghi đồng thời. Không tính tổng kết/GPA hoặc nối UI. Xem `BACKEND-PHASE-5A2A.md`.
- [x] 5A.2B — GET kết quả từ cấu hình/điểm/tín chỉ cùng snapshot, BigDecimal theo profile IUH_2023_REPORTED_V1 có nguồn/trang PDF; BTL, thiếu nhóm/điểm, chặn thi, CK dưới 3, tổng kết/điểm chữ/hệ 4 của môn và needsRetake. Không tự gán F/0 khi thiếu dữ liệu; cột tùy chỉnh có notice, TB nhiều cột TK làm tròn một chữ số trước nhân trọng số. Có PowerShell/IntelliJ, kiểm tra công thức/ngưỡng, quyền/version, ghi đồng thời và restart. Vẫn V9, không migration/seed/dependency/frontend. Xem `BACKEND-PHASE-5A2B.md`. GPA chưa bao gồm.
- [x] 5B — Backend GPA học kỳ/tích lũy trong phạm vi app đã chốt: kết quả môn, tín chỉ, lịch sử và chọn điểm đạt cao nhất, ví dụ tính tay/dữ liệu thiếu. Phần xác minh GPA chính thức, hủy/phục hồi và điểm đặc thù đã tách riêng để sau; nối UI ở 5C.
- [x] 5B.1 — GPA học kỳ theo tín chỉ và kết quả 5A.2B; tính F đã đủ điểm, tách thiếu cấu hình/nhóm/điểm/chặn thi, GPA null khác 0. Tín chỉ tính GPA/đạt/trượt/chưa tính, từng dòng môn/lý do, PARTIAL khi chưa đủ; snapshot học kỳ/môn/tín chỉ/điểm, quyền tài khoản, tải theo nhóm. Có PowerShell/IntelliJ, test tính tay/làm tròn/F/thiếu điểm/đồng thời/restart. Vẫn V9, không migration/seed/frontend/dependency. Xem `BACKEND-PHASE-5B1.md`.
- [x] 5B.2 — History và API GPA tích lũy theo chính sách app đã được người dùng chốt; ghép mã/tín chỉ, không ghép tên. Quy chế chính thức/điểm đặc thù và luồng phục hồi vẫn là các mục hoãn riêng, không coi là đã xác minh.
- [x] 5B.2A — API lịch sử các lần cùng mã/tín chỉ theo năm-kỳ/hè, ngữ cảnh theo kết quả ngay trước; không ghép bằng tên. Khác tín chỉ/LT-TH báo đối chiếu; giữ dữ liệu thiếu/F0, quyền tài khoản/snapshot/readonly. Có PowerShell 5.1/IntelliJ/test/restart, không migration/seed/UI; xem `BACKEND-PHASE-5B2A.md`.
- [x] 5B.2B — Phạm vi app: đã đối chiếu nguồn, ghi giới hạn xác minh và triển khai chính sách người dùng chọn ở 5B.2B.2. Không suy lựa chọn cao nhất của app thành quy chế IUH; mục 5B.2B.1b/chính thức/P/miễn/chuyển điểm bên dưới vẫn để sau.
- [x] UI cảnh báo điểm thấp — Tổng kết hệ 10 đã đạt và ≤ 5 hiển thị cam/nhãn điểm thấp; rớt hoặc chặn thi giữ đỏ, thiếu điểm để trống. Bảng điểm vẫn có môn rớt; không đổi công thức/ngưỡng đạt. Đồng nhất 5 vị trí hiển thị, TypeScript/build web và 7 tình huống trình duyệt qua. Xem `BACKEND-PHASE-5B2B1.md`.
- [x] 5B.2B.1a — Đối chiếu nguồn công khai: quy chế PDT/cẩm nang, hỏi đáp phục hồi 2018/2023 và quy trình sửa điểm 2026. Phân biệt sự kiện hành chính với quy tắc chọn điểm; ghi rõ giới hạn/ghi chú mẫu số, không tự kết luận quy chế K19.
- [ ] 5B.2B.1b — Học cải thiện, hủy/phục hồi điểm và xác minh quy tắc chính thức tương ứng: **để sau theo yêu cầu người dùng 26/10/2026**.
- [x] 5B.2B.2 — GET GPA tích lũy theo chính sách app đã chốt: tổng kết đạt cao nhất, tie theo năm-kỳ; chưa có lần đạt giữ F hoàn chỉnh gần nhất, hệ 4 bằng 0 và tín chỉ nằm trong mẫu số. Đếm tín chỉ mỗi nhóm một lần, giữ mọi lịch sử/decisions; thiếu điểm không thành 0, review loại khỏi phép tính. Có scope/policy app rõ, null/0/PARTIAL, snapshot/ownership/readonly, PowerShell 5.1/IntelliJ/test/restart. V9, không migration/seed/UI/dependency; xem `BACKEND-PHASE-5B2B2.md`.
- [ ] Nghiệm thu GPA chính thức/toàn khóa — Các phần đang hoàn thành dùng chính sách app do người dùng chọn; xác minh phần quy chế và điểm đặc thù đã hoãn trước khi gắn nhãn GPA chính thức.
- [ ] GPA đặc thù — Mô hình riêng cho môn P/không tính GPA, miễn/chuyển điểm và trường hợp đặc thù; đối chiếu quy chế trước nghiệm thu toàn khóa, không tự đoán từ tên môn hoặc đổi thành THEORY/PRACTICAL.
- [x] 5C — Hoàn thành trên web: màn Điểm, GPA học kỳ/tích lũy, so sánh và Dashboard dùng API 5A/5B; chính sách theo server, tải/lỗi/trống/version, lưu/F5 và tách tài khoản. Không dùng kết quả GPA RAM để hiển thị trong tài khoản thật. Thiết bị thật vẫn thuộc 2C.3B; GPA chính thức/đặc thù vẫn hoãn riêng.
- [x] 5C.1 — Đọc bảng điểm thật: snapshot học kỳ và chi tiết cấu hình/điểm/kết quả từ API; null/0/BTL, màu cảnh báo; chọn kỳ/tìm/lọc, tải/lỗi/trống/thử lại, chống phản hồi cũ khi đổi kỳ/môn/tài khoản. Tài khoản chỉ xem, chặn ghi RAM; mẫu giữ trình nhập riêng. TypeScript/build web/302 tests frontend (23 mới) và QA trình duyệt riêng đạt. Xem `FRONTEND-PHASE-5C1.md`.
- [x] 5C.2 — Nhập/lưu cấu hình và điểm thật: sửa/xóa/thêm cột, BTL/phần còn lại, null/0, validation; version/conflict và bảo vệ cột có điểm; đọc lại từ PostgreSQL sau lưu/F5. Đã nghiệm thu web qua 5C.2A/B/C; thiết bị thật vẫn để riêng ở 2C.3B.
- [x] 5C.2A — Cấu hình bộ cột thật: hai loại học phần, thêm/xóa/đổi tên/loại/thứ tự, BTL thực hành/cuối kỳ, lưu cả DRAFT; trọng số từ server, không gửi điểm số. Giữ mã cột/điểm 0, kiểm tra version và đối chiếu phản hồi thất lạc/xung đột, không tự gửi lại; xác nhận xóa cấu hình chưa có điểm. TypeScript/build web/340 tests frontend (38 mới), UI F5 và QA riêng đạt. Xem `FRONTEND-PHASE-5C2A.md`.
- [x] 5C.2B — Nhập/lưu điểm số thật: 0–10, tối đa 4 số thập phân/dấu phẩy; null khác 0, xóa điểm rõ ràng giữ bộ cột; BTL và phần còn lại. Cùng khóa/phiên bản với cấu hình, giữ bản nháp khi xung đột/mất phản hồi, kiểm tra và duyệt trước khi nhập tiếp; tổng kết/GPA học kỳ từ backend, F5 và tách tài khoản. TypeScript/build web/374 tests frontend (34 mới; 95 test phần điểm), UI và API/PostgreSQL QA riêng đạt. Xem `FRONTEND-PHASE-5C2B.md`.
- [x] 5C.2C — Nghiệm thu web từ tài khoản trống: tạo kỳ/môn → cấu hình → nhập điểm → GPA học kỳ, đổi tên/thứ tự giữ đúng mã/điểm, trống/0/BTL và xóa hợp lệ. Hai tab thật, đóng/mở đối chiếu, backend mất kết nối/khởi động lại, mất phản hồi sau commit và đổi tài khoản đều đã kiểm tra. Sửa cảnh báo bỏ thay đổi khi form đã giữ bản nháp trong đối chiếu; bản nháp chưa gửi vẫn được bảo vệ. TypeScript/build web/374 tests frontend và 14 nhóm API/PostgreSQL riêng đạt. Không backend/schema/dependency/seed thật; xem `FRONTEND-PHASE-5C2C.md`.
- [x] 5C.3 — GPA tích lũy có lịch sử/lý do chọn-bỏ; so sánh hai kỳ, đổi chỗ và mở bảng điểm; Dashboard GPA/cảnh báo theo kỳ dùng API thật. Sau lưu/F5 cập nhật cả ba màn, null khác 0, tải/lỗi/thử lại, phiên bản và tách tài khoản; mẫu giữ riêng. TypeScript/export web/403 tests frontend (29 mới; 124 test điểm) và QA web/API/PostgreSQL riêng đạt. Không backend/schema/dependency; xem `FRONTEND-PHASE-5C3.md`. Chính sách app lấy điểm đạt cao nhất, chưa xác nhận GPA chính thức; native 2C.3B và Pomodoro vẫn để sau.


Đây là 5 đợt backend lõi được tách để dễ triển khai từng phần. Đợt 2 tiếp tục chia 2A → 2B → 2C; không làm hết trong một lần. 2A cần access token ngắn hạn để thử hồ sơ có bảo vệ; giữ phiên/refresh/đăng xuất vẫn thuộc 2B. Lộ trình đầy đủ phía dưới giữ Pomodoro, thống kê, tài liệu/AI và hoàn thiện. Chỉ đánh dấu toàn đợt khi đã kiểm tra đầy đủ chức năng thật.

## Backend 6 — Pomodoro thực tế, triển khai từng phần

- [ ] 6 — Đã hoàn thiện và nghiệm thu Pomodoro trên web qua 6A/6B/6C: lưu/khôi phục, lịch sử, mục tiêu, thống kê/chuỗi ngày và Dashboard dùng API. Nghiệm thu toàn bộ còn điện thoại thật, khóa màn hình/chạy nền theo 2C.3B đã hoãn.
- [x] 6A.1 — V10 + API bắt đầu/tạm dừng/tiếp tục/đọc phiên 25 phút, thời gian server và giữ ms; một phiên RUNNING/PAUSED mỗi tài khoản, khóa/unique index, clientRequestId chống Start trùng và version chống lệnh cũ. Snapshot môn/kỳ/bài/buổi được giữ; GET không ghi, giữ phiên qua restart, quyền tài khoản và script PowerShell 5.1. 568 tests/Maven verify (31 mới), TypeScript và 403 tests frontend hồi quy đạt. Không seed/reset dữ liệu thật/dependency/frontend. Xem `BACKEND-PHASE-6A1.md`; hoàn tất/hủy/lịch sử/mục tiêu đã bổ sung ở 6A.2.
- [x] 6A.2 — V11 + hoàn tất đủ 25 phút/hủy; endedAt thực tế, dữ liệu kết thúc đóng băng, gửi lặp không ghi/cộng trùng. Lịch sử phân trang/lọc theo snapshot; mục tiêu 1–12 có version, mặc định 4 không tạo row; tiến độ ngày theo múi giờ/DST chỉ tính COMPLETED, không đổi trạng thái bài/kế hoạch. Giữ dữ liệu V10, không seed tài khoản thật/frontend/dependency. **606 tests/Maven verify đạt (38 test mới), không lỗi/bỏ qua; TypeScript và 403 tests frontend hồi quy đạt.** Đã kiểm tra gửi lặp/đồng thời, tài khoản/Bearer/cookie/CSRF auth, phân trang, DST/ranh giới ngày, PowerShell 5.1, nâng V10 → V11 và ba lần khởi động backend; schema QA riêng tự dọn, không seed tài khoản thật. Xem `BACKEND-PHASE-6A2.md`; UI ở 6B, biểu đồ/chuỗi ngày ở 6C.
- [x] 6B — Đã nối và nghiệm thu Pomodoro trên web: khôi phục sau tải lại, lỗi/đối chiếu/đồng thời/tách tài khoản; thời gian thực tế thống nhất với lịch sử. Native/chạy nền thật vẫn nghiệm thu riêng theo 2C.3B.
- [x] 6B.1 — Nối đồng hồ tài khoản 25 phút với API: Start/Pause/Resume/Complete/Cancel, khôi phục Active; Provider qua các màn, đếm ngược monotonic, xác nhận server trước công nhận, version/khóa gửi lặp/xác nhận hủy. Journal theo tài khoản (web sessionStorage qua F5, native SecureStore adapter), giữ yêu cầu chưa rõ kết quả và không tự gửi lại; dữ liệu mẫu riêng. **TypeScript, export web và 456 tests frontend đạt (53 mới), không lỗi/bỏ qua; 15 tình huống Manager/API/PostgreSQL QA thật đạt.** Bao gồm mất phản hồi sau commit, khôi phục manager, version cũ, tự hoàn tất/không trùng, tài khoản riêng và kho đối chiếu. Thao tác UI trình duyệt/điện thoại chưa nghiệm thu. Xem `FRONTEND-PHASE-6B1.md`; chưa nghiệm thu thao tác trình duyệt do lỗi khởi tạo công cụ.
- [x] 6B.2 — Đã nối lịch sử, mục tiêu 1–12 và tiến độ ngày vào API; loading/lỗi/trống/thử lại, lọc trạng thái/môn/ngày và phân trang 10 phiên. Phút/ngày chỉ từ COMPLETED theo endedAt và múi giờ; giữ snapshot môn/bài/buổi học đã xóa. Goal có version, giữ draft/yêu cầu chưa rõ kết quả, GET đối chiếu và chỉ gửi lại thủ công đúng version cũ; không tự ghi đè. **504 tests frontend (48 mới), TypeScript/export web và 19 tình huống frontend manager/API/PostgreSQL QA đạt.** Không backend/schema/dependency mới. **Đã bổ sung nghiệm thu UI ở 6B.3**; xem `FRONTEND-PHASE-6B2.md` và biên bản `FRONTEND-PHASE-6B3.md`.
- [x] 6B.3 — Đã nghiệm thu UI web thật: Start/Pause/Resume/Complete/Cancel, F5, hai tab/xác nhận hủy cũ, mục tiêu, lịch sử/phân trang/lọc ngày-môn-trạng thái, backend ngắt/khởi động lại và A/B riêng dữ liệu. Sửa tràn 360px, radio/progress trợ năng, nhãn cũ và hồ sơ tự mở sau F5. Giữ yêu cầu goal khi 409 sau mất phản hồi để GET đối chiếu. **505 tests frontend, TypeScript/export web đạt; có ảnh và biên bản FRONTEND-PHASE-6B3.md.** Đã bổ sung nghiệm thu UI 6B.1/6B.2; điện thoại/chạy nền vẫn hoãn 2C.3B, thống kê ở 6C.
- [ ] Nghỉ ngắn/dài cho tài khoản — Chốt lưu/khôi phục chế độ nghỉ và hành vi F5/chuyển tab, không cộng giờ nghỉ vào phút tập trung. Hiện API/tài khoản chỉ có phiên tập trung 25 phút; bản mẫu giữ chế độ nghỉ cũ.

- [x] 6C — Thời gian học, số phiên, mục tiêu ngày, chuỗi ngày và biểu đồ đọc dữ liệu thật trên web; đã đối chiếu Dashboard/Tập trung/lịch sử/Thống kê qua 6C.1/6C.2/6C.3A/6C.3B. Nghiệm thu native vẫn riêng ở 2C.3B đã hoãn.
- [x] 6C.1 — API thống kê tuần/tháng theo tài khoản và múi giờ: tổng phiên/phút, từng ngày và từng môn/học kỳ; chỉ COMPLETED, theo endedAt, ngày trống bằng 0 và giữ snapshot nguồn đã đổi/xóa. Có bộ lọc môn/kỳ, script PowerShell 5.1, request HTTP và đối chiếu lịch sử/Daily; GET không ghi. Xem `BACKEND-PHASE-6C1.md`. Dùng V11 hiện có, chưa đổi UI.
- Kiểm tra 6C.1: **639 tests backend/Maven verify đạt (33 mới), TypeScript và 505 tests frontend hồi quy đạt, không lỗi/bỏ qua.** Các test HTTP/PostgreSQL dùng schema biệt lập tự dọn, không seed tài khoản thật.
- [x] 6C.2 — Nối màn Thống kê với API: tuần/tháng, lùi/tiến/chọn ngày bằng lịch, lọc kỳ/môn, tổng phiên/phút, biểu đồ từng ngày (tháng cuộn ngang), phân bố theo snapshot kỳ/môn; tải/lỗi/trống/thử lại. Đọc lại sau hoàn tất/F5/foreground/đồng bộ tab; chặn phản hồi cũ khi đổi bộ lọc hoặc tài khoản. TypeScript, 529 tests frontend (24 mới), export web và UI/API/PostgreSQL QA riêng đạt; kiểm tra 320/360/430px, A → B → A và backend ngắt/khôi phục. Backend/schema/dependency không đổi. Xem `FRONTEND-PHASE-6C2.md`.
- [x] 6C.3 — Chuỗi ngày và Dashboard dùng số liệu thật, đã đối chiếu liên thông trên web ở 6C.3B. Điện thoại/chạy nền vẫn thuộc 2C.3B đã hoãn.
- [x] 6C.3A — API chuỗi ngày hiện tại/dài nhất và lịch tháng theo tài khoản/múi giờ: ít nhất một phiên COMPLETED mới đánh dấu ngày học, nhiều phiên/ngày tính một ngày; giữ chuỗi đến hôm qua. Đổi tháng lịch không đổi chuỗi toàn tài khoản; theo endedAt, không lệ thuộc nguồn môn/kỳ hiện tại. GET chỉ đọc, cursor đọc hai cột rồi gộp theo ngày bằng Java; dùng V11 hiện có, không migration/frontend/dependency. HTTP/PowerShell và hướng dẫn tại `BACKEND-PHASE-6C3A.md`.
- Kiểm tra 6C.3A: **686 tests backend/Maven verify đạt (47 mới), TypeScript và 529 tests frontend hồi quy đạt, không lỗi/bỏ qua.** HTTP/PostgreSQL, PowerShell 5.1, DST/ngày bị bỏ qua, snapshot đồng thời và dữ liệu tài khoản riêng; schema test tự dọn.
- [x] 6C.3B — Chuỗi hiện tại/dài nhất và lịch tháng đọc API; Dashboard có phút/số phiên/mục tiêu/tiến độ ngày, dùng chung snapshot với Tập trung/Thống kê. Đọc lại sau hoàn tất/F5/foreground/qua ngày, guard owner/query/cancel và đối chiếu hai lượt đọc nếu có phiên vừa thay đổi. Lịch có chọn ngày/tháng, chi tiết, tải/lỗi/trống/thử lại; giữ tháng qua refresh, đóng đúng luồng Trang chủ. TypeScript, 557 tests frontend (28 mới), export web và UI/API/PostgreSQL QA riêng đạt: mục tiêu, hai phiên cùng ngày, F5, backend ngắt/khôi phục, A → B → A và 320/360/430px. Xem `FRONTEND-PHASE-6C3B.md`. Backend/schema/dependency không đổi; native vẫn hoãn 2C.3B.

## Backend 7 — Dashboard, thống kê và thông báo

- [ ] 7 — Hoàn thiện tổng hợp Dashboard/Thống kê và thông báo bằng dữ liệu thật; các phần GPA, lịch thi, lịch học và Pomodoro đã nối trước vẫn giữ biên bản riêng. Không đánh dấu cả đợt chỉ vì có một API thống kê.
- [x] 7A — Hoàn tất thống kê tiến độ bài tập trên web qua API 7A.1 → UI 7A.2 → nghiệm thu/sửa lỗi liên thông 7A.3. Không đồng nghĩa toàn bộ giai đoạn 7 hoặc native đã hoàn tất.
- [x] 7A.1 — API thống kê bài tập theo học kỳ, môn tùy chọn: tổng/TODO/IN_PROGRESS/COMPLETED, pending, overdue/notDue/dueSoon, phần trăm HALF_UP. Server asOf/zone hồ sơ/IANA, 7 ngày lịch và ranh giới microsecond; COMPLETED không quá hạn, kỳ trống 0/0%. Ownership, readOnly/REPEATABLE_READ và một aggregate PostgreSQL, không N+1/entity/notes, không migration/dependency/UI. **723 tests/Maven verify (37 mới), TypeScript và 557 tests frontend hồi quy qua, không lỗi/bỏ qua**; HTTP/PostgreSQL/PowerShell 5.1, DST/đồng thời/A-B/GET không ghi. Hướng dẫn `BACKEND-PHASE-7A1.md`, contract và IntelliJ HTTP; UI và liên thông đã hoàn thành theo các mục bên dưới.
- [x] 7A.2 — Thẻ tiến độ bài tập đọc API trên Thống kê, chọn kỳ/môn hiện có riêng với tuần/tháng Pomodoro; phần trăm/số bài và năm nhóm mở danh sách đúng bộ lọc. Lượt mở mới bỏ tìm kiếm cũ, đọc lại bài/danh mục; giữ mốc/zone/microsecond từ API để đối chiếu, quay lại giữ lựa chọn và cập nhật. Loading/lỗi/trống/thử lại, owner/query/revision/abort, phản hồi cũ không lẫn kỳ/tài khoản. **581 tests frontend (24 mới), TypeScript/export web và UI/API/PostgreSQL QA riêng qua**, gồm 2/5 → 3/5, năm nhóm, chọn môn/kỳ, F5, offline/restart, A → B → A và 320/360/430px; QA tự dọn. Không backend/schema/dependency. Xem `FRONTEND-PHASE-7A2.md`; liên thông đã nghiệm thu ở 7A.3.
- [x] 7A.3 — Nghiệm thu deadline/trạng thái/xóa/chuyển môn-kỳ, F5 và Dashboard/danh sách/Thống kê; 16 mốc Manager/API/PostgreSQL QA, trong đó có version conflict/rebase, mất phản hồi sau commit, guard buổi tự học, owner A/B và 29/200. UI hai tab xác nhận tự cập nhật, giữ draft/version, chặn lưu cũ, chọn lịch/chuyển kỳ/xóa từ API; Dashboard và Thống kê khớp 15%,75%,0/1. Sửa HALF_UP dùng số nguyên và đồng bộ GET danh mục theo endpoint/owner/foreground/polling, không tự ghi lại hoặc bỏ khóa đối chiếu. **594 tests frontend (13 mới), TypeScript/export web qua**, không lỗi/bỏ qua; 320/360/430px/desktop, QA tự dọn. Không backend/schema/dependency; 7A hoàn tất trên web, native 2C.3B vẫn hoãn. Xem `FRONTEND-PHASE-7A3.md` và số liệu QA kèm theo.

- [ ] 7B — Lưu và đồng bộ trạng thái đã đọc thông báo trong app; backend 7B.1 → UI 7B.2 → nghiệm thu 7B.3. Push/thông báo hệ điều hành và thiết bị thật giữ riêng.
- [x] 7B.1 — Query trạng thái theo lô chỉ đọc, PUT đúng revision đã quan sát; biên nhận PostgreSQL theo tài khoản/loại nguồn/ngày buổi học. V12 thêm bảng/FK owner/CHECK/cascade; giữ dữ liệu học tập cũ. Chặn stale/foreign/unavailable, lô nguyên tử, retry idempotent/giữ readAt, khóa chung owner và basis để đối chiếu nội dung UI. 38 tests mới HTTP/PostgreSQL/migration/PowerShell 5.1; mở rộng restart toàn backend. Báo cáo cuối 761 tests backend/594 frontend và TypeScript đạt; full có một timeout tạo tài khoản, chạy lại 51 tests liên quan/Maven verify đạt; chi tiết biên bản 7B.1. Hướng dẫn `BACKEND-PHASE-7B1.md`, hợp đồng và IntelliJ HTTP. Giao diện đã nối ở 7B.2 bên dưới; 7B.3 vẫn mở, chưa đánh dấu cả 7B hoàn tất.
- [x] 7B.2 — Chuông/trung tâm thông báo nối query/PUT, đối chiếu basis với nguồn đã hiển thị, đọc một/tất cả đúng tập mục; F5, tách owner, đồng bộ tab, tải/lỗi/retry và đối chiếu sau lost response. Bổ sung milestone lịch thi vào revision API (vẫn V12). TypeScript, 626 tests frontend (32 mới), 42 tests backend liên quan/Maven verify/export web đạt. UI/API/PostgreSQL QA: 4→3→0, F5, deadline, hai tab, offline/restart, A→B→A, 320/360/430px. Xem FRONTEND-PHASE-7B2.md; 7B.3 vẫn mở, native chưa nghiệm thu.
- [ ] 7B.3 — Nghiệm thu UI lời nhắc thay đổi/hoàn thành/hủy/xóa; stale version, hai tab/tài khoản, restart và số chưa đọc khớp. Không coi test API 7B.1 là nghiệm thu UI.

## Các đợt giao diện đã hoàn thành

- [x] UI 3A: Thay nhập chuỗi ngày/giờ bằng lịch và đồng hồ 24 giờ trên bài tập, lịch học/ngoại lệ, lịch thi, tự học, AI và giờ yên lặng. Có xác nhận/hủy, hiển thị dd/mm/yyyy và phút chính xác. Xem `UI-POLISH-3A.md`; chưa nghiệm thu cảm ứng/Back/screen reader trên điện thoại thật.
- [x] UI 3B: Mũi tên quay lại một bước/X đóng cả luồng; giữ các màn đã mở, học kỳ/bộ lọc/tab chi tiết và cuộn; quay về nguồn từ Pomodoro/lịch tự học; Back/Escape trên web và handler Android. Xem `UI-POLISH-3B.md`. Chưa có deep link, Forward replay, gesture iOS hoặc nghiệm thu Back trên điện thoại thật.
- [x] UI 3C: Màn bắt đầu mẫu/trống; hướng dẫn tạo học kỳ/môn/bài; trạng thái tải/lỗi/thử lại giữ dữ liệu và bộ lọc; form có chờ, khóa thao tác lặp, lỗi giữ bản nháp, retry và hủy; thông báo kết quả dùng chung trong Modal. Xem `UI-POLISH-3C.md`. Chờ/lỗi là mô phỏng; chưa nghiệm thu API hoặc máy thật.
- [x] UI 3D Dashboard: chọn kỳ/năm, GPA và tiến độ theo dữ liệu trong phiên, thẻ thi gần nhất, lịch hôm nay/ngoại lệ, việc quá hạn/sắp hạn, tự học và cảnh báo điểm; mở đúng chi tiết. Xem `UI-POLISH-3D.md` và `DASHBOARD-TEST.md`. Chưa nghiệm thu backend, lưu/đồng bộ hoặc thiết bị thật.

## Số thứ tự chức năng đã thống nhất

Không có nhóm thứ 9 riêng. Chuyển nhóm 10 cũ (AI Study Assistant) thành **nhóm 9**. Phạm vi hiện gồm 9 nhóm: Dashboard; Thời khóa biểu; Bài tập; Điểm/GPA; Môn học/học kỳ; Lịch thi; Pomodoro; Thống kê; Trợ lý AI. Không có nhóm còn thiếu cần người dùng bổ sung.

## Điểm bài tập lớn

- [x] Cột điểm đề xuất có thể thêm/xóa/sửa tên/đổi loại, có xác nhận xóa khi đã nhập điểm và khôi phục gợi ý. Tự chia trọng số theo nhóm; thiếu nhóm lý thuyết được lưu bản đang nhập, chưa tính tổng kết/GPA. Số cột thực hành tùy chỉnh có ghi chú đối chiếu đề cương, BTL không cộng trùng. Xem `GRADE-COLUMNS.md`.

- [x] Hai lựa chọn Lý thuyết/Thực hành; lọc loại điểm; đổi tên Thường kỳ thực hành; BTL thay một cột thực hành hoặc toàn bộ/một phần cuối kỳ theo cấu hình môn. Trọng số theo công thức IUH đối chiếu; chặn cấu hình thiếu và tránh tính trùng. Xem `GRADES-PROJECTS.md`. Chưa đồng bộ bảng điểm trường/lưu backend.

## Quy ước học kỳ

- [x] Giao diện điểm theo tài liệu IUH năm 2023: chọn loại điểm/học phần, tự xét đạt và cảnh báo đỏ khi không đạt/chặn thi; tự nhận diện lần học trước. Xem `IUH-GRADING.md` về nguồn, công thức, kiểm tra và giới hạn. Chưa nghiệm thu quy chế toàn chương trình, GPA chính thức hay backend lưu điểm.

- [x] Chọn học kỳ 1/2 là kỳ chính; kỳ 3 (hè) tùy chọn trong từng năm học, không đếm kỳ 4/5/6. Chọn năm bằng nút, chặn trùng kỳ/năm và hiển thị năm khi chọn môn/bảng điểm. Xem `SEMESTERS.md`.

## Tổ chức mã nguồn

- [x] Tách UI dùng chung thành 15 file component theo tên, giữ bộ chọn ngày giờ riêng, thêm `index.ts` chỉ để export và cập nhật các màn sử dụng.
- [x] Chia `src` theo chức năng trong `features/`; tách `shared/`, `navigation/` và `store/`. Cập nhật import, đường dẫn tài nguyên và script kiểm tra. Xem `FRONTEND-STRUCTURE.md`. Đợt này giữ nguyên giao diện, chưa triển khai UI 3C/3D hoặc backend.

## Tiến độ các đợt giao diện

- [x] UI 2A: Môn học & học kỳ, chi tiết môn và liên kết dữ liệu mẫu.
- [x] UI 2B: Chi tiết bài tập, checklist, tài liệu mẫu; kế hoạch tự học ngày/tuần, nhiều buổi cho một bài và liên kết Pomodoro. Xem `UI-PHASE-2B.md`.
- [x] UI 2C: Chi tiết/tạo/sửa/xóa lịch thi, tùy chọn nhắc mẫu; chuỗi lịch học nhiều thứ/có phạm vi, nghỉ/đổi/khôi phục một buổi và cảnh báo lịch bị trùng. Xem `UI-PHASE-2C.md`.
- [x] UI 2D: Bảng điểm theo học kỳ; nhập/sửa điểm thành phần và trọng số; GPA kỳ/tích lũy, liên kết học lại, quy tắc mẫu và dự báo mục tiêu. Chi tiết môn, trang chủ và thống kê dùng chung điểm. Xem `UI-PHASE-2D.md`.
- [x] UI 2E: Hồ sơ chỉnh sửa/ảnh mẫu dùng chung trang chủ; đăng nhập/đăng ký/khôi phục/đổi mật khẩu và đăng xuất minh họa; tùy chọn nhắc, giờ yên lặng; thẻ xem trước sáng/tối và ngôn ngữ. Xem `UI-PHASE-2E.md`. Chưa có auth/email/thông báo thật hoặc theme/i18n toàn app.
- [x] UI 2F: Form mục tiêu/giờ rảnh; preview, sửa/bỏ chọn/duyệt vào buổi tự học dùng chung; điều chỉnh một buổi chưa bắt đầu; tóm tắt và quiz 3/5 câu từ hai bộ nguồn theo trang có sẵn. Xem `UI-PHASE-2F.md`. Chưa gọi AI, upload/đọc PDF thật hoặc lưu lịch sử quiz.
- [x] Sau UI 2F đã nhắc lại bốn nhóm đã hoãn; người dùng yêu cầu làm bộ chọn ngày/giờ trước và đã thực hiện ở 3A.

Sau 2F, các nhóm màn chính đã có prototype. Hiện đã hoàn thành **3A Bộ chọn**, **3B Điều hướng**, **3C Trạng thái** và **3D Dashboard** ở mức frontend. Kiểm tra một vòng theo `DASHBOARD-TEST.md` trước khi chốt phạm vi backend.

Các mục UI đánh dấu x chỉ nghiệm thu prototype với dữ liệu trong bộ nhớ. Các yêu cầu nghiệp vụ thật, lưu/đồng bộ, tệp và chạy nền bên dưới vẫn để mở.

### Phần nền tảng vẫn cần triển khai thật

- [x] Auth Spring Boot 2A: API đăng ký/đăng nhập/hồ sơ, băm mật khẩu và access token ngắn hạn (chưa nối UI).
- [x] Auth Spring Boot 2B: refresh/đăng xuất, hash token trong DB, phiên bền vững, cookie web/CSRF và thu hồi access token.
- [x] Auth UI 2C.1: đăng ký/đăng nhập/hồ sơ thật trên web; đọc hồ sơ, chưa cập nhật hồ sơ.
- [x] Auth UI 2C.2: giữ phiên/refresh/logout trên web, dọn trạng thái và phối hợp nhiều tab; native SecureStore mới thử mock.
- [ ] Auth tiếp theo: nghiệm thu native/máy thật, xác minh email/khôi phục/đổi mật khẩu. Hồ sơ mẫu chỉ sửa dữ liệu thử; không thay hồ sơ tài khoản đã lưu.
- [ ] Mỗi tài khoản chỉ đọc/ghi dữ liệu của mình; không dùng trạng thái tài khoản minh họa để phân quyền.
- [ ] Lưu/đồng bộ hồ sơ và tùy chọn; chọn/tải avatar thật và xử lý quyền truy cập ảnh.
- [ ] Áp dụng sáng/tối và bản dịch xuyên suốt app; hiện tại UI 2E chỉ có thẻ xem trước.
- [ ] Nối tùy chọn nhắc/giờ yên lặng với lời nhắc từng sự kiện, quyền hệ điều hành và lịch thông báo thật.

Tên commit tiếng Việt và lệnh push cho đợt vừa hoàn thành, cùng tên dự kiến cho các đợt sau, nằm trong `GIT-COMMITS.md`. Sau mỗi đợt sẽ cập nhật tên theo phạm vi thực tế.

## Các yêu cầu cần bổ sung hoặc làm rõ

Bổ sung từ hai ảnh người dùng gửi ngày 20/10/2026. Lưu để triển khai theo từng đợt, không bắt đầu backend hoặc làm toàn bộ các mục này ngay. Các ô chưa đánh dấu là yêu cầu cần nghiệm thu đầy đủ; việc có giao diện mẫu chưa được coi là hoàn thành nghiệp vụ.

### Bài tập và kế hoạch tự học

- [ ] Tách bài tập có deadline khỏi công việc/phiên tự học. Ví dụ: “Nộp báo cáo trước thứ Sáu” là bài tập; “Học báo cáo 45 phút tối nay” là kế hoạch tự học.
- [ ] Cho phép một bài tập liên kết nhiều buổi tự học; theo dõi hạn nộp riêng với thời điểm, thời lượng và tiến độ từng buổi.

### Thời khóa biểu lặp và ngoại lệ

- [ ] Lịch lặp có phạm vi ngày/học kỳ, không sinh ca ngoài phạm vi.
- [ ] Xử lý nghỉ một buổi, đổi phòng hoặc đổi giờ; phân biệt sửa một buổi và sửa cả chuỗi.
- [ ] Phát hiện trùng giữa ca học, lịch thi và khung giờ dự kiến thay đổi; ngoại lệ không làm sai các buổi còn lại.

### Điểm và GPA theo quy chế

- [ ] Làm rõ trọng số điểm thành phần, tín chỉ, thang điểm/quy đổi và quy tắc làm tròn.
- [ ] Làm rõ cách tính môn học lại và ảnh hưởng đến GPA học kỳ/tích lũy.
- [ ] Điểm chưa nhập hiển thị “Chưa đủ dữ liệu”, không mặc định bằng 0.
- [ ] Đối chiếu điểm môn, GPA và dự báo mục tiêu bằng bộ ví dụ tính tay theo quy chế đã chọn.

### Pomodoro khi ứng dụng ra nền

- [ ] Lưu mốc bắt đầu, mốc kết thúc, các lần tạm dừng và thời gian học thực tế; khôi phục phiên khi mở lại ứng dụng.
- [ ] Quy định rõ khi nào phiên được hoàn thành; không ghi trùng phiên khi quay lại hoặc khôi phục.
- [ ] Kiểm tra trên điện thoại thật khi ra nền, khóa màn hình và quay lại. Mobile View trên máy tính không đủ để nghiệm thu chạy nền.

### Thông báo tùy chỉnh

- [ ] Chọn nhắc trước bao lâu và giờ yên lặng.
- [ ] Cập nhật/hủy lời nhắc cũ khi đổi deadline, lịch học hoặc lịch thi; tránh gửi trùng.
- [ ] Có giao diện và cách xử lý khi người dùng từ chối hoặc thu hồi quyền thông báo.

### AI có xem trước và duyệt

- [ ] AI chỉ đề xuất lịch/kế hoạch; người dùng được xem, sửa, chấp nhận hoặc hủy trước khi áp dụng.
- [ ] Ứng dụng kiểm tra trùng lịch, thời gian rảnh và deadline trước khi chấp nhận kế hoạch.
- [ ] Tóm tắt PDF và câu hỏi từ tài liệu có tham chiếu nguồn/trang để kiểm tra lại.
- [ ] Tệp có kiểm soát quyền truy cập; khi dịch vụ AI lỗi hoặc không trả lời được, hiển thị rõ và không tự áp dụng kết quả dở dang.

## Lộ trình triển khai chức năng thật — lưu để làm sau

Lộ trình dưới đây ghi lại thứ tự trong ảnh. Đã chuyển sang backend sau UI 4H, hiện xong nền tảng và tài khoản 2A theo checklist 5 đợt ở trên. Số giai đoạn ở đây khác số nhóm chức năng và tên đợt UI (ví dụ UI 2A). Chưa đánh dấu nghiệm thu hoàn chỉnh giai đoạn nào chỉ dựa vào prototype.

| Giai đoạn | Phạm vi | Kết quả cần kiểm tra được |
| --- | --- | --- |
| 0. Chốt thiết kế | Phạm vi ban đầu, database/quan hệ dữ liệu, quy tắc điểm và ngày giờ, điều hướng giao diện | Thiết kế đủ rõ để bắt đầu triển khai, hạn chế sửa nền tảng liên tục. |
| 1. Backend và tài khoản | Spring Boot, đăng ký/đăng nhập, phiên đăng nhập, hồ sơ; nối React Native với API | Hai tài khoản hoạt động độc lập, không truy cập chéo dữ liệu; lỗi mạng không làm app treo. |
| 2. Học kỳ và môn học | Học kỳ, môn, tín chỉ, giảng viên | Chuyển học kỳ thay đúng danh sách môn; cùng một môn có thể xuất hiện ở nhiều kỳ mà không trộn dữ liệu. |
| 3. Bài tập và kế hoạch tự học | Deadline, ưu tiên, trạng thái, ghi chú; chuyển kế hoạch hiện có sang backend | Tạo/sửa được trên app, mở lại vẫn còn; lọc được việc hôm nay và quá hạn. |
| 4. Lịch học và lịch thi | Lịch lặp, ngoại lệ, phòng học, lịch thi, phát hiện trùng và nhắc cơ bản | Sinh lịch đúng trong học kỳ; đổi một buổi không ảnh hưởng cả chuỗi. |
| 5. Điểm và GPA | Điểm thành phần, điểm môn, GPA, tín chỉ, dự đoán mục tiêu | Kết quả khớp bộ ví dụ tính tay; xử lý đúng điểm thiếu và học lại. |
| 6. Pomodoro | Đồng hồ, tạm dừng, liên kết môn/bài tập, lưu phiên | Đưa app ra nền rồi quay lại vẫn tính đúng; không ghi trùng phiên học. |
| 7. Dashboard và thống kê | Tổng hợp deadline, lịch thi, GPA, thời gian học; hoàn thiện thông báo | Số liệu và biểu đồ lấy từ dữ liệu thật, khớp các màn chi tiết. |
| 8. Tài liệu và AI | Làm lần lượt: đính kèm tài liệu → AI lập kế hoạch → tóm tắt PDF/trắc nghiệm | Tệp có quyền truy cập; đề xuất AI được duyệt/hủy; lỗi dịch vụ có cách xử lý rõ. |
| 9. Hoàn thiện để sử dụng | Khôi phục mật khẩu, cài đặt, xuất dữ liệu, triển khai và kiểm thử liên thông | Có bản cài/chạy được và hướng dẫn sử dụng; xác định rõ phạm vi hoạt động offline. |

- [ ] Nghiệm thu bản lõi sau giai đoạn 4: tài khoản, học kỳ/môn, bài tập/kế hoạch và lịch dùng được liền mạch, dữ liệu được lưu thật.
- [ ] Dashboard có thể làm sơ bộ từ giai đoạn 3; chỉ nghiệm thu tổng hợp đầy đủ sau khi có dữ liệu điểm và phiên học.
- [ ] Trước khi coi app dùng được, rà soát lại cả checklist giao diện đã hoãn và các yêu cầu nghiệp vụ ở trên.

Ghi chú về ảnh cũ: dòng “chưa có nội dung mục 9” đã được thay thế bằng xác nhận mới của người dùng: AI là nhóm chức năng 9. Nhóm học tập không được tự thêm vào phạm vi hiện tại.
