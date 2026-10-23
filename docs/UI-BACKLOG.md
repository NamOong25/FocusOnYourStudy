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

Frontend React Native + backend Spring Boot/PostgreSQL. Đã hoàn thành nền tảng 1, API tài khoản 2A, phiên 2B, UI tài khoản 2C.1/2C.2 và kiểm tra web 2C.3A. Ngày 23/10/2026 đã xong backend 3A/3B, **3C.1/3C.2 nối UI học kỳ/môn** và **4A/4B API + UI bài tập**. 2C.3B để làm sau; đợt 4 còn kế hoạch tự học, lịch học và lịch thi. UI lịch/điểm/Pomodoro, checklist/tài liệu mẫu và buổi tự học vẫn thử trong RAM.

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
- [ ] Tiếp theo của Backend 4 — API kế hoạch tự học, lưu buổi học/liên kết bài; kiểm tra thời gian, trùng lịch, quyền và các thay đổi deadline/môn/xóa bài phía server. Sau đó mới nối UI tự học và tiếp tục lịch học/lịch thi.
- [ ] Backend 5 — Cột điểm tùy chỉnh/BTL được lưu và mở lại đúng; tổng kết/GPA khớp ví dụ tính tay và số liệu Dashboard.

Đây là 5 đợt backend lõi được tách để dễ triển khai từng phần. Đợt 2 tiếp tục chia 2A → 2B → 2C; không làm hết trong một lần. 2A cần access token ngắn hạn để thử hồ sơ có bảo vệ; giữ phiên/refresh/đăng xuất vẫn thuộc 2B. Lộ trình đầy đủ phía dưới giữ Pomodoro, thống kê, tài liệu/AI và hoàn thiện. Chỉ đánh dấu toàn đợt khi đã kiểm tra đầy đủ chức năng thật.

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
