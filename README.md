# QuanLyHocTap — FocusYourStudy

Frontend React Native + Expo SDK 56, dựng từ template bạn cung cấp; project độc lập với StudyPlanner cũ. Backend Spring Boot + PostgreSQL ở `backend/`. Tài khoản/phiên, học kỳ, môn học, bài tập, tự học và thời khóa biểu đã dùng dữ liệu thật. **Lịch thi đã đọc và thêm/sửa/xóa qua API ở 4H.2A/4H.2B**; Trang chủ/chi tiết môn đã dùng lịch thi thật ở 4H.2C.1; nhắc việc lịch thi đã nối API ở 4H.2C.2. Điểm môn và GPA học kỳ đã đọc dữ liệu thật ở 5C.1; cấu hình bộ cột lưu thật từ 5C.2A, nhập/lưu điểm số ở 5C.2B. GPA tích lũy, so sánh học kỳ và Dashboard đã nối API ở 5C.3. Đồng hồ Pomodoro tài khoản đã nối API ở 6B.1; lịch sử, mục tiêu và tiến độ ngày đã nối ở 6B.2; API thống kê tuần/tháng có ở 6C.1, giao diện biểu đồ đã nối ở 6C.2; chuỗi ngày và nhịp học trên Dashboard đã nối ở 6C.3B.

## Mới nhất — 7A.1: API thống kê tiến độ bài tập

`GET /api/v1/assignment-statistics?semesterId=<UUID>` tổng hợp bài theo học kỳ: chưa làm/đang làm/hoàn thành, phần trăm, quá hạn/còn hạn/sắp hạn 7 ngày lịch. Có lọc môn, zone hồ sơ hoặc IANA chọn riêng; thời điểm tính do server xác định. Đã kiểm tra 37 test mới qua HTTP/PostgreSQL và PowerShell 5.1, gồm dữ liệu trống, deadline chính xác, DST, cập nhật/xóa/chuyển môn và dữ liệu riêng A/B. GET chỉ đọc, cùng snapshot và một câu aggregate, không tải toàn bộ bài/ghi chú; không migration/dependency mới, vẫn V11.

**723 tests/Maven verify (37 mới), TypeScript và 557 tests frontend hồi quy đạt, không lỗi/bỏ qua.** Chạy lại backend, lấy ID bằng `backend/scripts/Try-Semesters.ps1 -Mode List`, rồi thử `backend/scripts/Try-AssignmentStatistics.ps1 -SemesterId '<ID>'`. Hướng dẫn [7A.1](docs/BACKEND-PHASE-7A1.md), [hợp đồng](backend/docs/ASSIGNMENT-STATISTICS.md), [IntelliJ HTTP](backend/api/assignment-statistics.http). Giao diện giữ nguyên; nối màn Thống kê ở 7A.2, nghiệm thu liên thông ở 7A.3.

## 6C.3B: Chuỗi ngày học và nhịp học trên Dashboard

Trang chủ hiển thị phút học hôm nay, số phiên/mục tiêu, tiến độ ngày, chuỗi hiện tại/dài nhất và lịch ngày đã học. Tập trung/Thống kê dùng cùng tiến độ tài khoản; đổi học kỳ hoặc bộ lọc môn không làm đổi chuỗi toàn tài khoản. Lịch tháng chọn được tháng/ngày, giữ lựa chọn qua lần tự cập nhật, có chi tiết phiên/phút và trạng thái trống/lỗi/thử lại. Dữ liệu đọc lại sau hoàn tất/F5/foreground/qua ngày/đồng bộ tab; ngày tham chiếu lấy từ server.

**TypeScript, 557 tests frontend (28 mới) và export web đạt, không lỗi/bỏ qua.** Đã kiểm tra UI/API/PostgreSQL QA riêng: mục tiêu 4 → 6, phiên đầu tăng 25 phút và chuỗi 2 → 3, phiên thứ hai tăng phút nhưng không tăng chuỗi; ba màn, lịch tháng, F5, backend ngắt/khôi phục và A → B → A. Bố cục 320/360/430px đạt; đã sửa lịch tự đóng khi refresh và luồng đóng lịch từ Trang chủ. Xem [hướng dẫn và ảnh 6C.3B](docs/FRONTEND-PHASE-6C3B.md). Không đổi backend/schema/dependency; máy thật/chạy nền vẫn giữ ở 2C.3B đã hoãn.

## 6C.3A: API chuỗi ngày học

Backend có `GET /api/v1/pomodoro-streak`: chuỗi hiện tại, chuỗi dài nhất, tổng ngày đã học và lịch đánh dấu từng ngày trong tháng. Một ngày có ít nhất một phiên COMPLETED được tính một lần; chưa học hôm nay vẫn giữ chuỗi đến hôm qua. Đổi tháng xem lịch không làm đổi chuỗi của toàn tài khoản. Tính theo ngày kết thúc thực tế và múi giờ hồ sơ hoặc múi giờ đã chọn; phiên hủy/đang học/tạm dừng không được cộng.

Chạy lại backend rồi dùng `scripts/Try-Pomodoro.ps1 -Mode Streak` trong thư mục `backend`, tùy chọn `-Month '2026-10' -TimeZone 'Asia/Ho_Chi_Minh'`. Xem [hướng dẫn test 6C.3A](docs/BACKEND-PHASE-6C3A.md) và [hợp đồng](backend/docs/POMODORO.md#chuỗi-ngày-học--6c3a). Dùng các bảng/chỉ mục V11 hiện có; không thêm migration hoặc dependency. **Giao diện chuỗi ngày và Dashboard sẽ nối ở 6C.3B.**

**686 tests backend/Maven verify đạt (47 mới), TypeScript và 529 tests frontend hồi quy đạt, không lỗi/bỏ qua.** Gồm HTTP/PostgreSQL, PowerShell 5.1, giữ/mất chuỗi qua ngày, lịch khớp Daily/Statistics, tách tài khoản, DST/ngày bị bỏ qua, đọc nhiều batch và Complete đồng thời. Schema test riêng tự dọn; không seed/reset tài khoản đang dùng.

## 6C.2: Thống kê dùng dữ liệu tài khoản

**Thống kê → Tổng quan** đọc số phiên/phút thật từ backend: chọn tuần/tháng, lùi/tiến hoặc chọn ngày bằng lịch, lọc học kỳ và môn. Biểu đồ tháng giữ đủ từng ngày, cuộn ngang và chạm cột để xem chi tiết; phân bố môn giữ tên/học kỳ từ phiên học. Số liệu đọc lại sau hoàn tất Pomodoro, F5, quay lại màn hoặc đồng bộ tab. Có tải/lỗi/trống/thử lại; phản hồi của tài khoản/bộ lọc cũ không được hiển thị vào lựa chọn mới. Chế độ xem thử giữ luồng riêng.

**TypeScript, 529 tests frontend (24 mới) và export web đạt, không lỗi/bỏ qua.** Đã kiểm tra trực tiếp UI/API/PostgreSQL trong schema QA riêng: tuần/tháng, lọc, chọn lịch, F5, tự tăng một phiên/25 phút, backend tạm ngắt/khôi phục, A → B → A và bố cục 320/360/430px. Xem [hướng dẫn và ảnh nghiệm thu 6C.2](docs/FRONTEND-PHASE-6C2.md). Backend/schema/dependency giữ nguyên; chuỗi ngày/Dashboard tiếp tục ở 6C.3, máy thật ở 2C.3B đã hoãn.

## 6C.1: API thống kê thời gian học

Backend có `GET /api/v1/pomodoro-statistics`: số phiên/phút theo tuần hoặc tháng, dữ liệu từng ngày và phân bố theo môn/học kỳ. Chỉ công nhận phiên COMPLETED, tính ngày theo giờ kết thúc và múi giờ đã chọn; tổng khớp lịch sử và tiến độ ngày. Giữ thông tin lịch sử khi môn bị đổi tên, chuyển kỳ hoặc xóa. GET chỉ đọc và yêu cầu tài khoản đăng nhập.

Chạy lại backend rồi dùng `scripts/Try-Pomodoro.ps1 -Mode Statistics -Period WEEK` trong thư mục `backend`. Xem [hướng dẫn test 6C.1](docs/BACKEND-PHASE-6C1.md) và [hợp đồng thống kê](backend/docs/POMODORO.md#thống-kê-tuầntháng--6c1). **Giao diện biểu đồ sẽ nối API ở 6C.2; chuỗi ngày/Dashboard ở 6C.3.** Dùng các bảng hiện có, không thêm migration hoặc dependency.

**639 tests backend/Maven verify đạt (33 mới), TypeScript và 505 tests frontend hồi quy đạt, không lỗi/bỏ qua.** Bao gồm HTTP/PostgreSQL, PowerShell 5.1, DST, quyền tài khoản, snapshot nguồn và tổng thống nhất khi hoàn tất đồng thời. Schema kiểm thử biệt lập tự dọn, không seed dữ liệu tài khoản đang dùng.

## 6B.3: Nghiệm thu Pomodoro trên web

Đã kiểm tra trực tiếp Start/Pause/Resume/Complete/Cancel, F5, hai tab, mục tiêu, lịch sử/bộ lọc/phân trang, lỗi mạng, backend khởi động lại và đổi tài khoản A/B trên database QA riêng. Sửa thẻ mục tiêu tràn ở 360px, trạng thái chọn cho trợ năng, nhãn dữ liệu cũ và hồ sơ tự mở sau F5. Giữ yêu cầu mục tiêu qua lỗi 409 để đối chiếu khi trình duyệt tự gửi lại PUT sau mất phản hồi.

**TypeScript, 505 tests frontend và export web đạt.** Xem [biên bản nghiệm thu, ảnh và hướng dẫn test 6B.3](docs/FRONTEND-PHASE-6B3.md). Đã bổ sung phần nghiệm thu UI còn thiếu của 6B.1/6B.2. Điện thoại/chạy nền vẫn để 2C.3B; thống kê thời gian/chuỗi ngày làm tiếp ở 6C. Không backend/schema/dependency mới.

## 6B.2: Lịch sử, mục tiêu và tiến độ Pomodoro

Màn Tập trung tài khoản có mục tiêu 1–12 phiên/ngày, tiến độ và phút học lấy từ backend; lưu mục tiêu giữ qua lần mở lại. Lịch sử có phiên hoàn tất/hủy, chi tiết môn/bài/buổi học, lọc trạng thái/môn/khoảng ngày và phân trang 10 phiên. Phiên hủy không được cộng tiến độ; ngày tính theo giờ kết thúc thực tế và múi giờ tài khoản. Thay đổi mục tiêu giữ nguyên số phiên/phút đã hoàn tất. Lỗi lưu hoặc xung đột giữ lựa chọn để đối chiếu, không tự ghi đè.

**TypeScript, export web và 504 tests frontend đạt (48 mới), không lỗi/bỏ qua; 19 tình huống frontend manager/API/PostgreSQL biệt lập đạt.** Đã đối chiếu mục tiêu lưu thật, mất phản hồi sau commit, version cũ, 12 phiên/phân trang, ngày kết thúc khác ngày xác nhận, hai tài khoản và snapshot nguồn đã xóa. Không thay backend, schema hoặc dependency.

Xem [hướng dẫn kiểm tra 6B.2](docs/FRONTEND-PHASE-6B2.md). Công cụ điều khiển trình duyệt vẫn không khởi tạo được; chưa nghiệm thu thao tác UI/F5/hai tab/viewport thực tế. Các bước đó được giữ trong **6B.3**. Biểu đồ/chuỗi ngày dữ liệu thật ở **6C**; điện thoại/chạy nền vẫn hoãn theo **2C.3B**.

## 6B.1: Đồng hồ Pomodoro dùng API thật

Tài khoản có đồng hồ 25 phút bắt đầu/tạm dừng/tiếp tục/hoàn tất/hủy qua API, đọc lại phiên khi tải trang/trở về foreground và đồng bộ liên tab. Giữ snapshot ngữ cảnh; xác nhận hủy đúng id/version, khóa thao tác lặp, giữ yêu cầu chưa rõ kết quả theo tài khoản để đối chiếu sau F5. Mốc 0 chỉ là hết giờ trên đồng hồ; chỉ báo đã lưu sau xác nhận server. Dữ liệu mẫu giữ riêng.

**TypeScript, export web và 456 tests frontend đạt (53 mới), không lỗi/bỏ qua; 15 tình huống Manager/API/PostgreSQL QA thật đạt.** Bao gồm mất phản hồi sau commit, khôi phục manager, version cũ, tự hoàn tất/không trùng, tài khoản riêng và kho đối chiếu. Thao tác UI trình duyệt/điện thoại chưa nghiệm thu.

Xem [hướng dẫn test 6B.1 và giới hạn nghiệm thu UI](docs/FRONTEND-PHASE-6B1.md). Chưa kiểm tra thao tác trình duyệt vì công cụ điều khiển không khởi tạo được; cần thực hiện các bước UI trong hướng dẫn. Lịch sử/mục tiêu đã nối ở 6B.2, kiểm tra liên thông ở 6B.3, thống kê thời gian ở 6C; native vẫn hoãn theo 2C.3B. Backend/schema/dependency không đổi.

## 6A.2: Hoàn tất/hủy, lịch sử và mục tiêu Pomodoro

V11 giữ các phiên V10 và thêm trạng thái kết thúc/mục tiêu ngày. Hoàn tất chỉ khi đủ 25 phút học thật; gửi lặp không cộng trùng. Hủy lưu phần học dở để tra cứu, công nhận 0 phút; phiên đủ giờ cần Complete. endedAt giữ giờ kết thúc thực tế dù xác nhận muộn; kết quả đã kết thúc được giữ nguyên. Lịch sử phân trang/lọc theo snapshot và thời gian; mục tiêu 1–12, mặc định 4, có version, tiến độ ngày theo múi giờ chỉ tính COMPLETED.

Chạy lại backend để Flyway nâng V10 → V11, giữ dữ liệu cũ. Xem [hướng dẫn test 6A.2](docs/BACKEND-PHASE-6A2.md), [hợp đồng](backend/docs/POMODORO.md), `backend/scripts/Try-Pomodoro.ps1` hoặc `backend/api/pomodoro.http`. Giao diện Pomodoro nối ở 6B, biểu đồ/chuỗi ngày dữ liệu thật ở 6C; thiết bị thật 2C.3B vẫn để sau.

**606 tests/Maven verify đạt (38 test mới), không lỗi/bỏ qua; TypeScript và 403 tests frontend hồi quy đạt.** Đã kiểm tra gửi lặp/đồng thời, tài khoản/Bearer/cookie/CSRF auth, phân trang, DST/ranh giới ngày, PowerShell 5.1, nâng V10 → V11 và ba lần khởi động backend; schema QA riêng tự dọn, không seed tài khoản thật.

## 6A.1: Backend lưu phiên Pomodoro đang học

V10 thêm bảng phiên tập trung thực tế, riêng với kế hoạch tự học. API bắt đầu/tạm dừng/tiếp tục/đọc lại dùng giờ server, 25 phút, giữ phần lẻ ms; mỗi tài khoản chỉ một phiên chạy/tạm dừng. Mã yêu cầu bắt đầu chống tạo trùng, version chống lệnh cũ, snapshot giữ môn/kỳ/bài/buổi lúc bắt đầu. Chạy lại backend để Flyway tự nâng V9 → V10, không reset database.

Đọc [hướng dẫn test 6A.1](docs/BACKEND-PHASE-6A1.md), [hợp đồng Pomodoro](backend/docs/POMODORO.md), `backend/scripts/Try-Pomodoro.ps1` hoặc `backend/api/pomodoro.http`. Hoàn tất/hủy/lịch sử/mục tiêu ở 6A.2; nối UI ở 6B, thống kê ở 6C. Hết giờ hiện giữ phiên với timeUp=true, chưa cộng số phiên/phút hoàn tất. Giao diện Pomodoro hiện tại vẫn dùng dữ liệu trong phiên.

**568 tests/Maven verify đạt (31 test mới), không lỗi/bỏ qua; TypeScript và 403 test frontend hồi quy đạt.** Đã kiểm tra API/PostgreSQL, PowerShell 5.1, đồng thời, nâng V9 → V10 và đóng/mở toàn backend ba lần; schema test riêng tự dọn, không seed tài khoản thật.

## 5C.3: GPA tích lũy, so sánh học kỳ và Dashboard

Tài khoản thật đọc GPA tích lũy từ backend, xem lịch sử/lý do chọn từng lần học; so sánh hai học kỳ và mở đúng bảng điểm để sửa. Dashboard dùng GPA/cảnh báo môn từ API theo kỳ đang chọn. Sau lưu/F5 đọc lại số liệu; có tải/lỗi/trống/thử lại, null khác 0 và bảo vệ đổi tài khoản. Dữ liệu mẫu giữ luồng riêng.

**TypeScript, export web và 403 tests frontend đạt (29 mới; 124 test phần điểm)**; đã kiểm tra web/API/PostgreSQL bằng dữ liệu QA riêng, sửa điểm cập nhật cả ba màn, F5, lỗi/khởi động lại và tách tài khoản. Không đổi backend/schema/dependency. Chính sách tích lũy lấy điểm đạt cao nhất do người dùng chọn trong app, chưa coi là GPA chính thức toàn khóa. Xem [hướng dẫn test 5C.3](docs/FRONTEND-PHASE-5C3.md). Thiết bị thật 2C.3B vẫn để sau; Pomodoro chưa nối backend.

## 5C.2C: Nghiệm thu toàn luồng điểm trên web

Đã kiểm tra từ tài khoản trống: tạo học kỳ → thêm môn → thiết lập cột → nhập điểm → xem tổng kết/GPA học kỳ. Đổi tên/thứ tự giữ đúng điểm theo mã cột; điểm trống/0, BTL, xóa hợp lệ, hai tab, backend mất kết nối/khởi động lại và đổi tài khoản đã được kiểm tra bằng dữ liệu QA riêng.

Sửa cảnh báo khi đóng form đang chờ đối chiếu: không còn hỏi bỏ thay đổi trong khi bản nháp đã được giữ; mở lại vẫn xem và đối chiếu được. Form sửa thông thường vẫn hỏi trước khi bỏ thay đổi chưa gửi. **TypeScript, build web, 374 tests frontend và 14 nhóm tích hợp API/PostgreSQL đạt.** Không đổi backend/schema/dependency, không seed tài khoản thật. Xem [hướng dẫn nghiệm thu 5C.2C](docs/FRONTEND-PHASE-5C2C.md). Dashboard, GPA tích lũy/so sánh đã hoàn thành tiếp ở **5C.3**; thiết bị thật vẫn để sau theo 2C.3B.

## 5C.2B: Nhập và lưu điểm số thật

Thống kê → Điểm & GPA → mở môn → Nhập / chỉnh sửa điểm. Nhập điểm 0–10, tối đa 4 số thập phân, chấp nhận dấu phẩy; điểm trống khác điểm 0. BTL góp vào cuối kỳ có ô phần còn lại riêng, BTL thay một cột thực hành/toàn bộ cuối kỳ chỉ nhập một điểm. Tổng kết và GPA học kỳ đọc từ backend sau lưu; F5 vẫn giữ điểm.

Cấu hình và điểm dùng chung phiên bản/khóa lưu. Khi xung đột hoặc mất phản hồi, giữ bản nháp, kiểm tra điểm đã lưu và chỉ thay bản nháp sau lựa chọn của người dùng; không tự gửi lại. TypeScript, build web và **374 tests frontend (34 mới; 95 test phần điểm)** đạt. Đã kiểm tra trình duyệt và API/PostgreSQL bằng hai tài khoản/schema QA riêng. Xem [hướng dẫn kiểm tra 5C.2B](docs/FRONTEND-PHASE-5C2B.md). Tiếp theo: **5C.2C nghiệm thu toàn luồng**; GPA tích lũy/so sánh và Dashboard ở 5C.3.

## 5C.2A: Cấu hình cột điểm thật

Tạo/sửa bộ cột Lý thuyết/Thực hành, tên/thứ tự/loại cột và cách quy BTL qua API. Giữ mã cột và điểm đã có; điểm 0 cũng được bảo vệ. Có lưu bản đang thiết lập, xác nhận xóa cấu hình chưa có điểm và đối chiếu khi xung đột/mất phản hồi; không tự gửi lại hoặc âm thầm ghi đè. Lưu xong/F5 đọc lại từ PostgreSQL.

TypeScript, build web và **340 tests frontend (38 mới)** đạt; đã kiểm tra UI bằng tài khoản/schema QA riêng, giữ điểm 0 và xung đột; không seed tài khoản thật. Xem [hướng dẫn kiểm tra 5C.2A](docs/FRONTEND-PHASE-5C2A.md). Tiếp theo là **5C.2B nhập điểm số**; GPA tích lũy/so sánh và Dashboard ở 5C.3.

## 5C.1: Đọc bảng điểm thật

Thống kê → Điểm & GPA dùng snapshot GPA học kỳ và kết quả môn từ backend. Chi tiết hiển thị cột/trọng số/BTL và điểm đã lưu; phân biệt điểm thiếu/0, màu cam môn đạt ≤ 5, đỏ môn trượt. Có tải/lỗi/trống/thử lại, kiểm tra phiên bản danh mục và chống hiển thị nhầm dữ liệu khi đổi kỳ/tài khoản. Tài khoản chỉ xem trong đợt này; dữ liệu mẫu giữ trình nhập thử riêng.

TypeScript, build web và **302 tests frontend (23 mới)** đạt. Đã kiểm tra trình duyệt bằng schema/tài khoản QA riêng, F5 và lỗi/thử lại; không seed tài khoản thật. Xem [hướng dẫn kiểm tra 5C.1](docs/FRONTEND-PHASE-5C1.md). Tiếp theo: 5C.2 ghi điểm; 5C.3 GPA tích lũy/so sánh và Dashboard.

## Backend — 5B.2B.2: API GPA tích lũy trong app

GET `/api/v1/gpa/cumulative` chọn tổng kết đạt cao nhất theo mã/tín chỉ; bằng điểm chọn năm-kỳ gần nhất, chưa có lần đạt giữ F hoàn chỉnh gần nhất với điểm hệ 4 bằng 0. Tín chỉ mỗi nhóm tính một lần; giữ toàn bộ lịch sử, lý do chọn/bỏ và các nhóm thiếu dữ liệu/cần đối chiếu. Null khác GPA 0; PARTIAL khi dữ liệu còn chưa đủ. Chính sách người dùng chọn trong app, không khẳng định GPA chính thức của trường.

Chạy lại backend rồi dùng `backend/scripts/Try-CumulativeGpa.ps1 -Mode Get`. Xem [hướng dẫn 5B.2B.2](docs/BACKEND-PHASE-5B2B2.md), [hợp đồng](backend/docs/CUMULATIVE-GPA.md), `backend/api/cumulative-gpa.http`. Vẫn V9, không migration/seed/dependency/frontend mới. Nối màn Điểm/Dashboard ở 5C; hủy/phục hồi và điểm đặc thù vẫn để sau.

**537 tests/Maven verify qua (33 mới), không lỗi/bỏ qua; TypeScript qua. Gồm 15 test phép tính và 18 test HTTP/PowerShell mới, kiểm tra snapshot đồng thời và mở rộng restart qua ba lần khởi động. Schema test riêng tự dọn; không seed dữ liệu app, vẫn V9.**

## Cảnh báo môn đạt điểm thấp

Môn đã đủ kết quả, đã đạt nhưng tổng kết ≤ 5/10 có màu cam và nhãn “Đạt môn · Điểm thấp”. Môn không đạt/bị chặn thi vẫn đỏ; điểm thiếu vẫn trống. Cùng cách hiển thị trong bảng điểm, chi tiết, xem trước nhập điểm và bảng điểm từ so sánh học kỳ. Giữ môn rớt trong danh sách, không đổi công thức hoặc ngưỡng qua môn/GPA.

TypeScript và build web qua; đã thử trực tiếp 7 tình huống điểm trên trình duyệt bằng dữ liệu mẫu. Xem [hướng dẫn kiểm tra và phạm vi GPA](docs/BACKEND-PHASE-5B2B1.md). Quy tắc **lấy điểm đạt cao nhất** đã được người dùng chọn cho đợt GPA tích lũy sắp làm; luồng hủy/phục hồi điểm để sau. Đây là quy tắc app, không gắn nhãn đã xác minh toàn bộ quy chế K19.

## 5B.2A: Lịch sử các lần học cùng môn

API chỉ đọc lịch sử theo tài khoản/môn, ghép đúng mã và tín chỉ rồi xếp năm học/kỳ, kể cả hè. Giữ đủ các lần học và kết quả thiếu/F/đạt; khác tín chỉ hoặc cấu hình LT/TH có dấu cần đối chiếu. Nhãn theo kết quả trước không xác nhận đăng ký học lại/cải thiện tại trường; chưa chọn điểm hoặc tính GPA tích lũy.

Chạy lại backend, vẫn V9, không migration/seed/dependency/frontend mới. Xem [hướng dẫn 5B.2A](docs/BACKEND-PHASE-5B2A.md), [hợp đồng và nguồn IUH](backend/docs/COURSE-ATTEMPTS.md), `backend/scripts/Try-CourseAttempts.ps1`, `backend/api/course-attempts.http`. Quy tắc chọn điểm tích lũy còn phải xác minh ở 5B.2B; nối UI ở 5C.

**504 tests/Maven verify qua (27 mới), không lỗi/bỏ qua; TypeScript qua. Gồm 8 test timeline và 19 test HTTP/PowerShell mới; mở rộng restart qua ba lần khởi động, snapshot đồng thời, quyền tài khoản và dữ liệu thiếu/F0. Schema test riêng tự dọn; không seed dữ liệu app, vẫn V9.**

## 5B.1: GPA học kỳ theo tín chỉ

GET GPA học kỳ dùng điểm hệ 4 từ 5A.2B và tín chỉ từng môn, giữ môn F trong mẫu số; tách môn chưa cấu hình/thiếu điểm/chặn thi. Có GPA trống khác 0, trạng thái PARTIAL khi còn môn chưa tính, tín chỉ tính GPA/đã đạt/trượt/chưa tính và từng dòng môn để đối chiếu. Cùng snapshot học kỳ/môn/tín chỉ/điểm, đọc theo tài khoản và không tăng version.

Chạy lại backend, vẫn V9, không migration/seed/dependency/frontend mới. Xem [hướng dẫn 5B.1](docs/BACKEND-PHASE-5B1.md), [hợp đồng GPA](backend/docs/SEMESTER-GPA.md), `backend/scripts/Try-SemesterGpa.ps1`, `backend/api/semester-gpa.http`. **GPA tích lũy/học lại ở 5B.2; nối màn Điểm/Dashboard ở 5C.**

**477 tests/Maven verify qua (29 mới), không lỗi/bỏ qua; TypeScript qua.** Gồm 8 test phép tính và 21 test API/PowerShell mới; kiểm tra snapshot đồng thời, quyền tài khoản, cập nhật tín chỉ/điểm và GPA qua restart. Schema test riêng tự dọn, không seed dữ liệu app.

## 5A.2B: Kết quả môn từ điểm đã lưu

GET kết quả môn tính từ cùng snapshot cấu hình/điểm/tín chỉ, theo profile có nguồn `IUH_2023_REPORTED_V1`: BTL, thiếu dữ liệu, giữa kỳ 0/chặn thi, ngoại lệ cuối kỳ lý thuyết dưới 3, tổng kết/điểm chữ/hệ 4 của môn. BigDecimal, làm tròn theo bước thành phần/tổng kết và dấu cần xử lý học lại; không tự gán F/0 khi thiếu điểm. Kết quả chỉ đọc, không tăng version hoặc ghi sẵn vào database.

Chạy lại backend, vẫn V9, không migration/seed/dependency mới. Xem [hướng dẫn 5A.2B](docs/BACKEND-PHASE-5A2B.md), [hợp đồng kết quả](backend/docs/GRADE-RESULTS.md), `backend/scripts/Try-GradeResults.ps1`, `backend/api/grade-results.http`. **GPA học kỳ/tích lũy ở 5B và nối màn Điểm/Dashboard ở 5C**; chưa dùng số RAM của giao diện để nghiệm thu API. Nhiều cột TK được tổng hợp thành TB thường kỳ làm tròn một chữ số trước nhân 20%; một cột TK được hiểu là TB đã công bố.

**448 tests/Maven verify qua (58 mới), không lỗi/bỏ qua; TypeScript qua.** Có 42 test công thức/ngưỡng và 16 test API/PowerShell, snapshot đồng thời, quyền đọc và kết quả qua restart. Không thay frontend, schema hoặc dependency.

## 5A.2A: Lưu và đọc điểm thành phần

V9 thêm điểm nullable theo cột: chưa nhập khác 0, BTL và phần còn lại của cuối kỳ; có GET/PUT riêng với version dùng chung cấu hình. Đổi tên/thứ tự giữ điểm; xóa/đổi vai trò/cách quy BTL của cột đã có điểm hoặc xóa cả cấu hình còn điểm bị chặn, cần xóa điểm rõ ràng bằng null trước. Lưu nguyên tử, đọc cùng snapshot và kiểm tra quyền tài khoản.

Chạy lại backend để Flyway nâng V8 → V9, không tạo lại database. Dùng `backend/scripts/Try-GradeScores.ps1` Get → Export → sửa file → Update → Get; Export giữ điểm/version hiện tại và không ghi đè file. Xem [hướng dẫn 5A.2A](docs/BACKEND-PHASE-5A2A.md), [hợp đồng điểm](backend/docs/GRADE-SCORES.md), `backend/api/grade-scores.http`. **Màn Điểm vẫn chưa nối API; kết quả môn ở 5A.2B, GPA ở 5B, nối UI ở 5C.**

**390 tests/Maven verify qua (33 mới), không lỗi/bỏ qua; TypeScript qua.** Có V8 → V9 giữ ID/cấu hình và để điểm trống, restart toàn backend, PowerShell 5.1/UTF-8, bảo vệ điểm 0, snapshot và ghi đồng thời. Kiểm thử dùng schema riêng và tự dọn.

## 5A.1: Cấu hình bảng điểm được lưu ở backend

V8 thêm cấu hình Lý thuyết/Thực hành theo môn, bộ cột có thể thêm/sửa/xóa/đổi thứ tự, quy BTL vào một cột thực hành hoặc cuối kỳ (toàn phần/một phần). Backend dựng trọng số từ cấu hình và cho lưu DRAFT thiếu nhóm; không khóa cột đề xuất. Có ownership/version, ghi nguyên tử, snapshot đọc nhất quán và guard xóa/chuyển môn còn cấu hình.

**5A.1 chỉ lưu cấu trúc cột; màn Điểm chưa nối API, chưa lưu giá trị điểm/tổng kết/GPA.** Chạy lại backend để Flyway áp dụng V8, không tạo lại database. Xem [hướng dẫn 5A.1](docs/BACKEND-PHASE-5A1.md), [hợp đồng API](backend/docs/GRADE-CONFIGURATIONS.md), `backend/api/grade-configurations.http`, `backend/scripts/Try-GradeConfigurations.ps1`. Tiếp theo: 5A.2 lưu điểm/tính kết quả môn → 5B GPA → 5C nối UI.

**357 tests/Maven verify qua (32 mới), không lỗi/bỏ qua; TypeScript qua.** Có V7 → V8 giữ dữ liệu cũ, restart toàn backend, script Windows PowerShell 5.1 hiển thị đúng tiếng Việt, snapshot đọc, ghi đồng thời và guard liên kết môn. Kiểm thử dùng schema riêng và tự dọn.

## 4H.2C.2: Chuông nhắc lịch thi

Nhắc thi lấy từ toàn tài khoản theo các mốc đã lưu, gồm 0 phút. Mỗi kỳ thi một thẻ; mốc mới vừa tới thì hiện chưa đọc lại. Sửa giờ/phòng/mốc, tắt nhắc, xóa hoặc hết giờ thi cập nhật thẻ; reload/đếm phút/version không tự tạo chưa đọc giả. Mở đúng chi tiết API để sửa/xóa, giữ bộ lọc khi Back. Nguồn lịch học/thi lỗi được xử lý riêng, chuông hiện dấu chờ khi chưa đủ dữ liệu và giữ receipts qua retry.

**139 test lịch thi (35 mới), 140 test lịch hồi quy, TypeScript/export web và browser PostgreSQL thật qua.** Xem [hướng dẫn test 4H.2C.2](docs/FRONTEND-EXAMS-4H2C2.md). Không backend/migration/dependency. Đây là nhắc trong app; dấu đọc giữ trong phiên, chưa gửi thông báo hệ điều hành. Các đợt UI lịch thi 4H.2 đã hoàn thành; điểm/GPA và native vẫn theo checklist riêng.

## 4H.2C.1: Lịch thi trên Trang chủ và chi tiết môn

Trang chủ đọc kỳ thi đang diễn ra/sắp tới gần nhất của học kỳ đang chọn, đếm ngược và mở chi tiết thật; nút xem tất cả giữ đúng kỳ. Chi tiết môn có lịch thi riêng theo môn và kỳ, lọc Sắp tới/Đã qua/Tất cả, mở/thêm/sửa/xóa qua API và giữ bộ lọc khi quay lại. Tải/lỗi/thử lại/trống, bản cũ khi lỗi mạng, đổi phạm vi/tài khoản và lịch bị xóa được xử lý riêng; không dùng lịch mẫu trong tài khoản.

**104 test lịch thi (20 mới), 140 test lịch hồi quy, TypeScript/export web và browser API/PostgreSQL thật qua.** Xem [hướng dẫn test 4H.2C.1](docs/FRONTEND-EXAMS-4H2C1.md). Không đổi backend/migration/dependency. **Nhắc việc lịch thi trong chuông còn ở 4H.2C.2**, chưa gửi thông báo thiết bị.

## 4H.2B: Thêm, sửa và xóa lịch thi

Mục Lịch thi đã lưu qua API: chọn môn/ngày/giờ/zone, loại/hình thức, phòng/ghi chú, bật/tắt và nhiều mốc nhắc (gồm 0 phút và tùy chọn). Có xác nhận xóa, chống bấm đôi, giữ bản nháp khi trùng lịch, đối chiếu version cũ và kết quả chưa xác nhận khi mất mạng; không tự gửi lại thao tác ghi. Xem [hướng dẫn test 4H.2B](docs/FRONTEND-EXAMS-4H2B.md).

**84 test lịch thi (34 mới), 140 test lịch hồi quy, TypeScript/export web và browser API/PostgreSQL thật qua.** Không đổi backend/migration/dependency. Tổng hợp Dashboard/chi tiết môn/nhắc việc thuộc 4H.2C; chưa gửi thông báo thiết bị. Kiểm tra: `npm run test:exams`, `npm run test:schedule`, `npm run typecheck`.

## 4H.2A: Đọc danh sách và chi tiết lịch thi

Lịch học → Lịch thi dùng GET API theo tài khoản/học kỳ/môn, Sắp tới/Đã qua/Tất cả và đọc mới chi tiết. Có tải/lỗi/thử lại/trống, giữ bản cùng bộ lọc khi mạng lỗi, bỏ phản hồi cũ khi đổi kỳ/tài khoản; giờ nguồn/UTC/DST, nhắc 0 phút và 404 lịch đã xóa. Trong tài khoản thật không ghi vào RAM; chế độ mẫu riêng vẫn giữ. Dashboard có lối mở danh sách, phần tổng hợp/nhắc việc dành 4H.2C.

**TypeScript, 50 test đọc lịch thi mới, 140 test lịch hồi quy và export web qua.** Browser API/PostgreSQL thật qua với F5, đổi tài khoản, lỗi mạng/restart, cập nhật/xóa ở nơi khác và ảnh 320/390/430/1280px. Không đổi backend/migration/dependency.

Xem [hướng dẫn chạy và test 4H.2A](docs/FRONTEND-EXAMS-4H2A.md). Tạo dữ liệu thử bằng `backend/scripts/Try-Exams.ps1`; **thêm/sửa/xóa từ UI ở 4H.2B**, Dashboard/chi tiết môn/nhắc việc ở 4H.2C.

## 4H.1B.2: Lịch học và tự học kiểm tra lịch thi

Tạo/sửa chuỗi lịch học, đổi/khôi phục một buổi và thêm/sửa tự học kiểm tra kỳ thi đã lưu toàn tài khoản. Khôi phục bị chặn giữ nguyên ngoại lệ và version; cùng khóa ghi nên không thể lưu đồng thời hai bên vào một giờ. 4H.1B đã kiểm tra hai chiều; không thêm migration/seed, vẫn V7.

**325 tests/Maven verify qua (31 mới), không bỏ qua**, gồm toàn chuỗi dài hơn 92 ngày, ngoại lệ/kế thừa, UTC/DST/đường đổi ngày, rollback, ghi đồng thời và script Windows PowerShell 5.1. TypeScript/140 test lịch frontend hồi quy qua.

Chạy lại backend và xem [hướng dẫn 4H.1B.2](docs/BACKEND-PHASE-4H1B2.md), [contract](backend/docs/SCHEDULE-CONFLICTS.md), `backend/api/exam-reverse-conflicts.http`. UI lịch thi sẽ nối ở 4H.2; tạo kỳ thi thử bằng API/script để kiểm tra các form lịch học/tự học đã nối.

## 4H.1B.1: Chặn lịch thi trùng với lịch đã lưu

POST/PUT lịch thi kiểm tra thi khác, lịch học hiệu lực (nghỉ/đổi/kế thừa giờ) và tự học cùng tài khoản, cả khác môn/học kỳ. So UTC, cho phép chạm giờ; 409 nêu buổi/môn/ngày/giờ. Thất bại giữ toàn bộ dữ liệu/version; khóa tài khoản bảo vệ các thao tác lịch thi đồng thời. Không thêm migration/seed, vẫn V7.

**294 tests/Maven verify qua (26 mới), không bỏ qua**, gồm UTC/DST/đường đổi ngày, ngoại lệ, hai tài khoản, rollback, ghi đồng thời và PowerShell 5.1. TypeScript và 140 test lịch frontend hồi quy qua.

Chạy lại backend rồi thử theo [hướng dẫn 4H.1B.1](docs/BACKEND-PHASE-4H1B1.md), [contract](backend/docs/EXAMS.md) hoặc `backend/api/exam-conflicts.http`. Chiều ngược đã có ở 4H.1B.2; UI lịch thi nối ở 4H.2, chưa dùng màn thử để nghiệm thu API.

## 4H.1A: API lịch thi cơ bản

Backend đã có **V7 + API CRUD/lọc lịch thi** theo tài khoản, liên kết môn/học kỳ, loại/hình thức thi, bắt đầu/kết thúc UTC và zone, phòng, ghi chú và nhiều mốc nhắc. Kiểm tra version, kể cả PUT giống hệt; môn còn lịch thi không được xóa/chuyển kỳ. V7 thêm bảng, giữ V1–V6 và dữ liệu cũ, không seed/reset database.

**268 tests/Maven verify qua (30 mới), không bỏ qua**, gồm hai tài khoản, UTC/DST, mốc nhắc, DB constraints, nâng V6 → V7, đóng/mở toàn backend và PowerShell 5.1. TypeScript và 140 kiểm tra lịch/nhắc việc frontend hồi quy qua.

Khởi động lại backend bằng `backend/scripts/Run-Local.ps1`, rồi thử `backend/scripts/Try-Exams.ps1 -Mode List`. Xem [hướng dẫn 4H.1A](docs/BACKEND-PHASE-4H1A.md), [hợp đồng](backend/docs/EXAMS.md) và `backend/api/exams.http`. **UI lịch thi vẫn thử trong phiên** đến 4H.2; kiểm tra trùng thi/lịch học/tự học làm ở **4H.1B**.

## 4G.2: Nhắc lịch đã lưu trong mục chuông

**Chuông → Góc nhắc nhở** xét lịch toàn tài khoản, xuất hiện từ `giờ bắt đầu thực tế − mốc nhắc` đến trước giờ kết thúc. 0 phút là nhắc đúng giờ bắt đầu. Dùng giờ/phòng/giảng viên sau ngoại lệ, bỏ buổi nghỉ/xóa và xét lại khi khôi phục; bấm thẻ mở đúng học kỳ/ngày trong Thời khóa biểu, đọc lại cả khi ngày đó đang mở.

Mục không đổi giữ đã đọc qua tải lại; sửa ngày khác không tạo chưa đọc giả. Khi lịch tải/lỗi, chuông hiện **…**, khóa đọc tất cả và không báo trống như thể đã biết đủ dữ liệu; nhắc bài tập đã tải vẫn mở được. Dấu đọc giữ trong phiên, F5/đăng nhập lại bắt đầu phiên đọc mới. Chưa gửi thông báo thiết bị; lịch thi vẫn thử trong phiên.

**140 test (29 mới), 62 kiểm tra nhắc việc cũ, TypeScript/export web và 15 nhóm browser API/PostgreSQL thật qua**, gồm đồng hồ đúng mốc, lỗi/mất mạng, hai tài khoản và điều hướng sang kỳ khác. Ảnh 320/390/430/1280px đã xem. Xem [hướng dẫn test 4G.2](docs/FRONTEND-SCHEDULE-4G2.md); không đổi backend/migration. Backend lịch thi là phần tiếp theo, thông báo hệ điều hành/2C.3B vẫn nghiệm thu riêng.

## 4G.1: Lịch thật trên Trang chủ và chi tiết môn

Trang chủ có **Buổi học gần nhất** và **Lịch học hôm nay** đúng học kỳ đang chọn; chi tiết môn có số buổi đang học/sắp tới và danh sách tối đa 5 buổi đúng môn. Bỏ buổi nghỉ, dùng giờ/phòng/giảng viên sau điều chỉnh, mở đúng ngày nguồn trong Thời khóa biểu. Tạo/sửa/xóa/khôi phục lịch làm phần tổng hợp đọc lại; có tải/lỗi/thử lại, F5 và tách tài khoản.

Nguồn đọc độc lập lấy đủ phạm vi chuỗi, chia request tối đa 92 ngày và kiểm tra các buổi/version trước khi công bố kết quả. Không coi trang lịch đang mở hoặc request đầu tiên là toàn bộ dữ liệu. Giờ chính theo thiết bị; khi khác giờ lịch thì thẻ có thêm ngày/giờ nguồn. Lỗi không tự trở thành số 0 hoặc không có lịch.

**111 test lịch qua (30 mới), TypeScript, export web và 19 nhóm browser với API/PostgreSQL thật qua**, gồm ngày nguồn khác ngày thiết bị, học kỳ xa, lỗi/mất mạng, đổi kỳ đang tải và thêm/sửa/xóa chuỗi. Đã xem ảnh Trang chủ 320/390/430/1280px và chi tiết môn 320px. Xem [hướng dẫn test 4G.1](docs/FRONTEND-SCHEDULE-4G1.md).

Không đổi backend/migration. **4G.2 nhắc việc dùng lịch thật** đã hoàn thành, xem hướng dẫn đợt này; kiểm tra điện thoại thật 2C.3B đang hoãn.

## 4F.3: Nghỉ, đổi và khôi phục từng buổi

Đăng nhập → Lịch học → Thời khóa biểu → chọn ngày → mở thẻ buổi học: **Đổi buổi này**, **Nghỉ buổi này**, **Khôi phục buổi này** hoặc **Bỏ thay đổi buổi này**. Chỉ bật giờ/phòng/giảng viên muốn đổi; phần còn lại theo chuỗi. Khôi phục dùng lịch gốc hiện tại và chặn nếu giờ đã có lịch/tự học. Các tuần khác giữ nguyên, F5 vẫn còn.

Giữ bản nháp khi trùng hoặc version cũ; chủ động đọc lại trước khi tiếp tục. Nếu mất phản hồi sau ghi, app không tự gửi lại và yêu cầu kiểm tra đúng buổi/ngày. **81 test đọc/ghi qua (27 mới), TypeScript, export web và browser API thật qua**, gồm F5, kế thừa, xung đột, khôi phục, mất phản hồi PUT/DELETE, hai tài khoản và ảnh lịch 320/390/430/1280px.

Xem [hướng dẫn test 4F.3](docs/FRONTEND-SCHEDULE-4F3.md). Không đổi backend/migration. Dashboard/chi tiết môn đã dùng lịch thật ở 4G.1; nhắc việc 4G.2 và API lịch thi còn trong checklist; kiểm tra điện thoại thật 2C.3B vẫn đang hoãn.

## 4F.2: Thêm, sửa và xóa chuỗi lịch

Đăng nhập → Lịch học → Thời khóa biểu: **Thêm chuỗi lịch học**, hoặc mở chi tiết → **Chỉnh sửa cả chuỗi lịch**. Có **Quản lý chuỗi lịch** để xử lý lịch chưa bắt đầu/đã kết thúc. Chọn môn/thứ/khoảng ngày/giờ, múi giờ, phòng, giảng viên, mốc nhắc và ghi chú; lưu thật, F5 vẫn còn. Xóa có xác nhận rõ chuỗi đã lưu, giữ môn/bài/tự học và chuỗi khác.

Lỗi trùng giữ bản nháp; lỗi version yêu cầu chủ động nạp lại. Không gửi lại tự động khi mất phản hồi; có bước kiểm tra toàn tài khoản. Ghi đã xác nhận nhưng GET lỗi chỉ cần tải lại. **54 test đọc/ghi qua (26 mới), TypeScript, export web và browser API thật qua**, gồm tạo/sửa/F5/xóa, version/ngoại lệ, trùng, mất phản hồi sau commit, GET lỗi sau ghi và 4 kích thước.

Xem [hướng dẫn test 4F.2](docs/FRONTEND-SCHEDULE-4F2.md). Không đổi backend/migration. **Nghỉ/đổi/khôi phục riêng một buổi đã có ở 4F.3**; lịch thi và tổng hợp lịch thật vào Dashboard/nhắc việc theo checklist.

## 4F.1: Xem thời khóa biểu đã lưu

Đăng nhập → Lịch học → Thời khóa biểu: chọn học kỳ, xem ngày/tuần/tháng, tải lại và mở chi tiết từ backend. Buổi nghỉ/đổi hiển thị đúng giờ/phòng/giảng viên hiệu lực, có múi giờ; không trộn dữ liệu mẫu hoặc phản hồi cũ khi đổi tài khoản/khoảng ngày. Có tải/lỗi/thử lại, giữ lịch cùng khoảng khi mất mạng và phát hiện chi tiết đã đổi version.

Đợt 4F.1 ban đầu chỉ đọc; 4F.2 đã thêm/sửa/xóa cả chuỗi, ngoại lệ từng buổi đã có ở 4F.3. Trang chủ/chi tiết môn ban đầu dẫn đến Thời khóa biểu; 4G.1 đã bổ sung thẻ tổng hợp lịch thật tại hai vị trí này. Không tự nhập lịch RAM cũ vào tài khoản. **28 test đọc lịch, TypeScript, export web và browser với API thật qua**, gồm hai tài khoản, F5, kỳ trống, mất mạng và 320/390/430/1280px. Backend không đổi.

Xem [hướng dẫn kiểm tra 4F.1](docs/FRONTEND-SCHEDULE-4F1.md). Chạy backend và frontend như trước; tài khoản chưa có lịch server dùng script 4E để tạo dữ liệu thử chủ động. Chế độ khách vẫn giữ lịch mẫu/local.

## 4E.2B: Kiểm tra trùng lịch học và tự học

Backend kiểm tra trước khi tạo/sửa chuỗi, đổi/khôi phục từng buổi và tạo/sửa tự học. So sánh UTC từng ngày sau ngoại lệ; buổi nghỉ không chiếm giờ, hai buổi nối tiếp được phép. Lỗi 409 báo rõ buổi/môn/ngày/giờ cản; thao tác bị chặn giữ nguyên dữ liệu/version. Hai nơi cùng ghi dùng chung khóa tài khoản. Không thêm migration hoặc sửa dữ liệu cũ.

**238 tests/Maven verify qua (30 mới), không lỗi/bỏ qua**; TypeScript và 6 tình huống smoke HTTP qua. Có kiểm tra ghi đồng thời, version/rollback, lịch cả năm/DST/khác ngày địa phương, script PowerShell 5.1 và hồi quy restart/migration.

Xem [hướng dẫn test bằng terminal VS Code/IntelliJ](docs/BACKEND-PHASE-4E2B.md), [contract trùng giờ](backend/docs/SCHEDULE-CONFLICTS.md), `backend/api/schedule-conflicts.http`. Script PowerShell 5.1 đọc đúng lỗi HTTP; form Tự học hiển thị thông báo cụ thể. Thời khóa biểu đã đọc API ở 4F.1; thao tác chuỗi đã có ở 4F.2 và ngoại lệ ở 4F.3; lịch thi làm riêng.

## 4E.2A: Ngoại lệ từng buổi học

API đã lưu nghỉ/đổi giờ/phòng/giảng viên cho đúng một ngày của chuỗi và khôi phục về lịch gốc hiện tại. Các tuần/ngày khác giữ nguyên. Occurrences trả cờ nghỉ/đổi và giờ thực tế sau ghi đè; mọi thay đổi kiểm tra version của cả chuỗi để bảo vệ sửa từ hai nơi và khôi phục/tạo lại cùng ngày. V6 giữ dữ liệu/version cũ, không seed; chạy lại backend để thêm bảng, không tạo lại database.

**208 tests/Maven verify qua (26 mới)**, gồm migration V5 → V6, snapshot/ghi đồng thời, restart và script Windows PowerShell 5.1.

Test terminal VS Code/IntelliJ theo [hướng dẫn 4E.2A](docs/BACKEND-PHASE-4E2A.md), [hợp đồng API](backend/docs/CLASS-EXCEPTIONS.md), `backend/scripts/Try-ClassExceptions.ps1` và `backend/api/class-exceptions.http`. Kiểm tra trùng giờ đã có ở 4E.2B; UI thời khóa biểu đã đọc API ở 4F.1, ghi cả chuỗi đã có ở 4F.2, ghi từng buổi đã có ở 4F.3.

## 4E.1: API lịch học lặp

Backend có V5 và API chuỗi lịch theo môn/tài khoản: thứ trong tuần, khoảng ngày, giờ/múi giờ, phòng/giảng viên, ghi chú và cấu hình mốc nhắc. Có tải/thêm/sửa/xóa, version và đọc các buổi phát sinh theo ngày/tuần. Môn còn chuỗi bị chặn xóa/chuyển kỳ. Không seed hoặc thay dữ liệu cũ; chạy lại backend để Flyway thêm bảng, không tạo lại database.

**182 tests/Maven verify qua, gồm 27 test mới**, kiểm tra migration giữ dữ liệu cũ, đóng/mở backend, DST/ba múi giờ JVM và script PowerShell 5.1. TypeScript và unit API môn/tự học qua; không coi là đã nối UI lịch.

Thời khóa biểu đã đọc API ở 4F.1, ghi cả chuỗi đã có ở 4F.2, ghi từng buổi đã có ở 4F.3. Ngoại lệ/nghỉ/đổi từng buổi và kiểm tra trùng giờ đã có ở 4E.2A/4E.2B; mốc nhắc được lưu nhưng chưa gửi thông báo. Test bằng terminal VS Code/IntelliJ theo [hướng dẫn 4E.1](docs/BACKEND-PHASE-4E1.md), [hợp đồng API](backend/docs/CLASS-SCHEDULES.md), `backend/scripts/Try-ClassSchedules.ps1` và `backend/api/class-schedules.http`.

## 4D: Giao diện tự học lưu vào tài khoản

Đăng nhập → **Lịch học → Tự học**: tạo/sửa/xóa và trạng thái gọi API 4C. Xem ngày/tuần, chọn ngày cần xem, liên kết một bài với nhiều buổi. F5/đăng nhập lại giữ dữ liệu; hai tài khoản có danh sách riêng. Có tải/lỗi/thử lại, giữ bản nháp khi lỗi hoặc xung đột version, không tự gửi lại thao tác mất phản hồi. Xóa bài giữ buổi độc lập và tải lại version; Dashboard/chi tiết bài/môn dùng chung nguồn.

**Thời lượng dự kiến không tự cộng phút Pomodoro**; lịch sử timer còn RAM. AI trong tài khoản thật giữ bước xem trước, lưu hàng loạt qua API để đợt AI sau; chế độ khách vẫn thử local. Lịch/thi/điểm/checklist/tài liệu tiếp tục làm sau. Không thay backend/migration hoặc seed vào tài khoản người dùng.

Xem [hướng dẫn test 4D](docs/FRONTEND-STUDY-4D.md), [checklist](docs/UI-BACKLOG.md), [tên commit và lệnh push](docs/GIT-COMMITS.md).

## 4C: API kế hoạch tự học

Backend có V4 và API CRUD/lọc buổi tự học theo tài khoản/môn/kỳ/bài/trạng thái/khoảng giờ. Kiểm tra trùng buổi, kết thúc trước 24:00, đúng môn và không sau deadline; bảo vệ ghi đồng thời. Xóa bài giữ buổi học độc lập và tăng version; môn còn buổi bị chặn xóa/chuyển kỳ. **Giao diện tự học đã nối ở 4D.** Học kỳ/môn/bài trên UI vẫn dùng dữ liệu thật.

**155 tests/Maven verify qua**, gồm 37 test tự học/migration mới, nâng V3 giữ dữ liệu cũ, restart toàn backend và script PowerShell 5.1. Khởi động lại backend để Flyway áp dụng V4; không tạo lại database.

Xem [hướng dẫn test terminal VS Code/IntelliJ 4C](docs/BACKEND-PHASE-4C.md), [hợp đồng API tự học](backend/docs/STUDY-SESSIONS.md), mẫu request `backend/api/study-sessions.http` và script `backend/scripts/Try-StudySessions.ps1`.

## 4B: Giao diện bài tập lưu vào tài khoản

Đăng nhập → Lịch học → Bài tập: tải/thêm/sửa/xóa, deadline ngày giờ, độ ưu tiên, trạng thái và ghi chú được lưu vào PostgreSQL. F5/đăng nhập lại giữ bài; hai tài khoản có danh sách riêng. Có bộ chọn học kỳ/lọc môn/tìm kiếm/hạn nộp, chờ xác nhận khi lưu, giữ bản nháp khi lỗi mạng hoặc xung đột version và không tự gửi lại thao tác mất phản hồi. Dashboard, chi tiết môn, thống kê và các ô chọn bài dùng chung dữ liệu thật.

Xem [hướng dẫn test từng bước 4B](docs/FRONTEND-ASSIGNMENTS-4B.md). Checklist/tài liệu mẫu chỉ giữ trong phiên. Từ 4D, tự học đã lưu backend: xóa bài gỡ liên kết và giữ buổi; đổi môn/rút deadline sai liên kết bị chặn.

## 4A: API quản lý bài tập

Backend có bảng bài tập V3 và API CRUD/lọc theo môn, kỳ và trạng thái; deadline kèm múi giờ, version và quyền theo tài khoản. Môn còn bài bị chặn xóa/chuyển kỳ. Flyway tự thêm bảng khi khởi động lại backend; không cần tạo lại database. UI bài tập đã nối ở **4B**.

Xem [hướng dẫn test bằng terminal VS Code/IntelliJ](docs/BACKEND-PHASE-4A.md), [hợp đồng API](backend/docs/ASSIGNMENTS.md), mẫu request `backend/api/assignments.http`. Script mới: `backend/scripts/Try-Assignments.ps1`. Không seed dữ liệu demo vào tài khoản của bạn.

## 3C.2: Môn học trên giao diện đã lưu vào PostgreSQL

Đăng nhập → **Lịch học → Môn & học kỳ** → thêm/sửa/xóa môn hoặc chuyển kỳ. F5/đăng nhập lại giữ nguyên môn và thông tin. Dashboard, số tín chỉ và các ô chọn môn dùng cùng danh sách. Có mã trùng/version, tải/lỗi/thử lại, bảo vệ liên kết dữ liệu thử và tách tài khoản.

Xem [hướng dẫn test 3C.2](docs/FRONTEND-COURSES-3C2.md). Không cần tạo lại database. Bài tập đã nối ở 4B; lịch/điểm còn làm tiếp. Thiết bị thật 2C.3B tiếp tục để sau.

## 3C.1: Học kỳ trên giao diện đã lưu vào PostgreSQL

Đăng nhập → **Lịch học → Môn & học kỳ** → tạo/sửa/xóa học kỳ. F5 hoặc đăng xuất rồi đăng nhập lại cùng tài khoản vẫn giữ học kỳ. Trang chủ và các bộ chọn dùng chung danh sách; kỳ đang học trước được kết thúc khi chọn kỳ khác làm Đang học. Có tải/lỗi/thử lại, chống gửi trùng và xử lý xung đột phiên bản.

Xem [hướng dẫn học kỳ 3C.1](docs/FRONTEND-SEMESTERS-3C1.md). UI môn đã nối ở 3C.2; dữ liệu xem trước không tự đưa vào tài khoản.

## Tài khoản trên giao diện — 2C.2 và kiểm tra web 2C.3A

Chạy hai terminal (PowerShell trong IntelliJ/VS Code đều được):

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npx expo start --web --port 8092
```

Mở `http://localhost:8092` → chọn dữ liệu trống hoặc mẫu → **Hồ sơ** góc phải → **Tạo tài khoản** → nhập thông tin → đăng nhập. Hồ sơ lấy từ `/users/me`; tên Trang chủ dùng cùng hồ sơ nếu màn có học kỳ. Có chờ/khóa nút, lỗi theo trường, email trùng/sai mật khẩu, mất mạng, timeout 10 giây mỗi request, hủy khi đóng form và thử tải lại hồ sơ.

**F5 khôi phục phiên khi còn hiệu lực.** Hồ sơ → Đăng xuất → Xác nhận đăng xuất thu hồi phiên và dọn nội dung thử; các tab cùng origin cũng thoát. Mất mạng khi đăng xuất có nút Hoàn tất đăng xuất, không tự khôi phục phiên đã thoát. Sau nâng cấp từ 2C.1 cần đăng nhập một lần. Từ 3C.1, học kỳ đã lưu theo tài khoản; chưa có API sửa hồ sơ/quên mật khẩu.

**2C.3A** kiểm tra A/B với dữ liệu thử, bản nháp và đồng hồ đang chạy; không giữ thông báo hoặc chế độ thử lỗi từ tài khoản cũ. Có kiểm tra liên tab, phản hồi về muộn, offline/kết nối lại. Xem [hướng dẫn tự test](docs/FRONTEND-AUTH-2C3A.md). Từ 4B, runner giữ học kỳ/môn/bài thật của A khi trở lại A, nhưng dọn lịch/điểm/timer thử. Thiết bị thật còn ở 2C.3B.

URL API mặc định dùng cùng hostname với web và cổng 8080. Cần cổng khác thì tạo `.env.local` ở gốc theo `.env.example`, đặt `EXPO_PUBLIC_API_URL`, rồi tải lại app; không đặt thông tin DB/khóa ký ở frontend. Dùng `localhost` ở cả frontend/backend khi thử cookie. Hướng dẫn test và giới hạn native tại [FRONTEND-AUTH-2C2.md](docs/FRONTEND-AUTH-2C2.md); phần nối API ban đầu tại [FRONTEND-AUTH-2C1.md](docs/FRONTEND-AUTH-2C1.md).

## Backend hiện tại — đợt 4C

Java 21 + Spring Boot 4.1.1; PostgreSQL cục bộ, Flyway và API health. Đã có đăng ký/đăng nhập/hồ sơ, access token 15 phút, refresh token luân chuyển và đăng xuất thu hồi phiên. Phiên lưu trong PostgreSQL; web có cookie HttpOnly + CSRF, native nhận token qua JSON. Frontend đã nối khôi phục/refresh/logout ở 2C.2; nghiệm thu thiết bị thật ở 2C.3.

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Kiểm tra tại `http://localhost:8080/api/v1/health`. Hướng dẫn chạy/test, biến môi trường và cấu trúc nằm trong [backend/README.md](backend/README.md); quan hệ dữ liệu trong [backend/docs/SCHEMA.md](backend/docs/SCHEMA.md).

Các script API cũ vẫn dùng được: `./backend/scripts/Try-Auth.ps1 -Mode Register` và `./backend/scripts/Try-Session.ps1`. Xem [hướng dẫn 2B](docs/BACKEND-PHASE-2B.md). Theo lựa chọn người dùng, **2C.3B kiểm tra thiết bị thật để làm sau**; **3A/3B API và 3C.1/3C.2 UI học kỳ/môn đã hoàn thành**. Hướng dẫn test API học kỳ ở [BACKEND-PHASE-3A.md](docs/BACKEND-PHASE-3A.md).

API học kỳ hiện có GET/POST/PUT/DELETE theo tài khoản, lưu PostgreSQL, chặn trùng và xóa kỳ còn môn, dùng version chống ghi đè. 72 tests/Maven verify qua. Xem [hướng dẫn 3A](docs/BACKEND-PHASE-3A.md).

API môn đã mở ở 3B: CRUD/lọc học kỳ, kiểm tra chủ sở hữu, mã trùng/version và xử lý ghi đồng thời với học kỳ. 92 tests/Maven verify qua tại đợt 3B. Xem [hướng dẫn test API môn học](docs/BACKEND-PHASE-3B.md), [hợp đồng API](backend/docs/COURSES.md) và [UI môn 3C.2](docs/FRONTEND-COURSES-3C2.md).

## Chạy ứng dụng

Yêu cầu Node.js 20.19 trở lên (khuyên dùng Node 22 LTS).

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npm install
npx expo start
```

Khi mở app chưa đăng nhập, chọn **Bắt đầu với dữ liệu trống** để thử thiết lập học kỳ/môn/bài đầu tiên, hoặc **Khám phá dữ liệu mẫu** để xem các màn có sẵn. Khi có phiên hợp lệ, app khôi phục hồ sơ và tải học kỳ/môn/bài tập từ backend; lịch/điểm/buổi tự học thử bắt đầu trống.

Nhấn `w` để mở web. Có thể mở địa chỉ Metro trong Mobile View của VS Code. Muốn thử trên điện thoại, dùng Expo Go tương thích SDK 56 hoặc development build. Xem địa chỉ và cổng thực tế trong terminal; không dùng terminal đang đứng ở StudyPlanner cũ.

```powershell
npm run typecheck
npm run check:dependencies
npm run build:web
```

## Đợt giao diện đầu tiên

- Trang chủ: người dùng, thẻ tập trung, tổng quan bài tập, ca học hôm nay, bài sắp đến hạn và gợi ý.
- Lịch học: ngày/tuần/tháng, chuyển khoảng thời gian, thêm/sửa/xóa ca học lặp hằng tuần; kiểm tra khung giờ và trùng ca học.
- Bài tập: thêm/sửa/xóa, môn học, deadline, ưu tiên, ghi chú; 3 trạng thái, lọc môn. Trang chủ và thống kê cập nhật cùng dữ liệu.
- Pomodoro: tập trung 25 phút, nghỉ 5/15 phút, đổi môn, bắt đầu/tạm dừng/đặt lại, lịch sử các phiên mới. Dùng mốc kết thúc để thời gian cập nhật khi quay về ứng dụng, không đếm trừ dựa trên số lần interval chạy.
- Thống kê: bộ lọc tuần/tháng/học kỳ và biểu đồ có thể chạm; dữ liệu giờ học là mẫu. Tỷ lệ hoàn thành/trễ hạn lấy từ bài tập hiện tại. Từ đợt 2D, GPA/tín chỉ tính từ bảng điểm trong bộ nhớ; mô phỏng dùng kết quả đó với giả định được ghi rõ.
- Lịch thi: danh sách, thêm lịch, bật/tắt tùy chọn nhắc mẫu.
- Trợ lý AI: 5 công cụ với form đầu vào; sửa/bỏ chọn/duyệt kế hoạch mẫu thành buổi tự học dùng chung sau khi kiểm tra lịch/deadline; điều chỉnh buổi chưa học; tóm tắt và quiz 3/5 câu có trang nguồn minh họa đọc được (bổ sung ở 2F).
- Hồ sơ/cài đặt với các luồng tài khoản minh họa (bổ sung ở 2E), hộp nhắc nhở, trạng thái rỗng và thông báo sau thao tác.

**Học kỳ và môn học khi đã đăng nhập được lưu trong PostgreSQL.** Các dữ liệu học tập khác trên giao diện nằm trong bộ nhớ; tải lại sẽ xóa các thay đổi thử này. Tài khoản đăng ký/đăng nhập/hồ sơ nối API từ 2C.1, khôi phục/refresh/logout từ 2C.2. Chưa có thông báo hệ thống, đồng bộ bài/lịch/điểm, upload PDF hoặc gọi AI thật. Pomodoro chưa phát chuông khi app đóng/lưu phiên khi process bị hủy; chưa nghiệm thu chạy nền trên điện thoại thật.

## Cấu trúc

`App.tsx` chứa khung ứng dụng, header và dock. Mã nguồn được chia theo chức năng:

```text
src/
├── features/     # Màn hình, form và xử lý của từng chức năng
├── navigation/   # Điều hướng, quay lại và giữ vị trí cuộn
├── shared/       # Thành phần giao diện, theme, tiện ích dùng chung
└── store/        # Provider và trạng thái mẫu dùng chung toàn app
```

Ví dụ: `src/features/assignments/TaskForm.tsx` là form bài tập; `src/features/grades/GradesScreen.tsx` là màn điểm; `src/shared/components/` chứa các file riêng như `Button.tsx`, `Card.tsx`, `Sheet.tsx` và `Typography.tsx`; `index.ts` chỉ xuất các component để import gọn. Xem **[sơ đồ đầy đủ và quy tắc đặt file](docs/FRONTEND-STRUCTURE.md)**.

Không dùng HTML trong WebView, Tailwind CDN hoặc SQLite cho bản UI này. Điều hướng nằm trong `src/navigation/`; URL deep link, Forward replay và gesture iOS chưa được triển khai. State mẫu/timer vẫn ở `src/store/model.tsx`; HTTP dùng chung ở `src/shared/api/`, API tài khoản/học kỳ nằm trong thư mục chức năng tương ứng.

## Tài liệu tiếp theo

- `docs/UI-AUDIT.md`: đối chiếu yêu cầu, điểm đã sửa, phần còn thiếu và thứ tự phát triển.
- `docs/references/`: 5 screenshot gốc và DESIGN.md gốc để đối chiếu.
- `docs/DECISIONS.md`: quy ước thiết kế và phạm vi kỹ thuật.

Ảnh avatar, sách và trợ lý trong `assets/` lấy từ URL có sẵn trong HTML template bạn gửi. Cần xác nhận quyền sử dụng tài nguyên trước khi phát hành thương mại. Font Plus Jakarta Sans qua gói `@expo-google-fonts/plus-jakarta-sans`; icon từ Ionicons. Các tài nguyên giao diện đã có sẵn cục bộ sau khi cài dependency, không cần tải từ CDN mỗi lần mở màn.

## Cập nhật đợt 2A: Môn học & học kỳ

Mở **Lịch học → Môn & học kỳ** để quản lý học kỳ, môn học và xem lịch/bài/điểm của từng môn. Có tìm kiếm, lọc trạng thái, thêm/sửa và màu nhận diện. Các môn mới dùng chung trong lựa chọn môn của bài tập, ca học, lịch thi và Pomodoro.

Phạm vi nay gồm 9 nhóm chức năng; AI là mục 9 (mục 10 cũ). Xem `docs/UI-PHASE-2.md` và `docs/UI-BACKLOG.md` để biết phần đã làm và các cải thiện người dùng muốn để sau.

## Cập nhật đợt 2B: Bài tập & tự học

Bấm một bài tập để mở màn chi tiết với checklist việc nhỏ, tài liệu mẫu và các buổi học liên quan. Mở **Lịch học → Tự học** để tạo/sửa/xóa buổi học, xem lịch ngày/tuần và bắt đầu Pomodoro cho đúng buổi. Mỗi bài có thể có nhiều buổi; trạng thái hai loại độc lập.

Tài liệu chỉ dùng thư viện minh họa có nội dung đọc được, chưa tải tệp thật. Thời gian buổi học được cộng từ các phiên Pomodoro 25 phút đã hoàn tất; đánh dấu buổi xong thủ công không tự cộng thời gian và không hoàn tất bài tập. Dữ liệu vẫn đặt lại khi tải lại ứng dụng.

Xem `docs/UI-PHASE-2B.md` để biết phạm vi và kiểm tra. `docs/qa-learning.cjs` là smoke test tùy chọn với Playwright/Chromium; hỗ trợ biến `PLAYWRIGHT_MODULE` và `CHROME_PATH` như các script QA trước.

## Cập nhật đợt 2C: Lịch thi & ngoại lệ lịch học

Mở **Lịch học → Lịch & bài tập → Kỳ thi** để quản lý lịch thi, loại/hình thức, giờ kết thúc và các mốc nhắc mẫu. Thống kê và Chi tiết môn cũng mở được cùng lịch thi đó.

Trong **Thời khóa biểu**, bấm một buổi để nghỉ, đổi giờ/phòng riêng ngày đó, khôi phục hoặc sửa/xóa cả chuỗi. Form chuỗi chọn nhiều thứ và khoảng ngày áp dụng. Cảnh báo trùng giờ dùng chung cho ca học, thi và tự học, chỉ rõ lịch liên quan. Các màn đọc cùng ngoại lệ; không coi buổi đã nghỉ là giờ bận.

Xem `docs/UI-PHASE-2C.md` để biết quy tắc và giới hạn. Dữ liệu/tùy chọn nhắc vẫn là mẫu trong bộ nhớ. Từ UI 3A, ngày giờ được chọn bằng lịch/đồng hồ.

## Cập nhật đợt 2D: Điểm số & GPA

Mở **Thống kê → Điểm & GPA** để chọn học kỳ, tìm/lọc môn, xem bảng điểm và so sánh GPA. Bấm môn để nhập điểm thành phần, sửa trọng số, thêm phần điểm và xem trước tổng kết. Trong **Chi tiết môn → Điểm số** cũng sửa cùng dữ liệu này.

Có quy tắc mẫu về thang quy đổi, làm tròn và học lại, dự báo điểm còn thiếu và mô phỏng mục tiêu GPA tích lũy. Ô chưa nhập hiển thị chưa đủ dữ liệu; điểm 0 vẫn tính là điểm đã có. Trang chủ và thống kê lấy GPA cùng nguồn với bảng điểm. Quy tắc hiện tại cần đối chiếu quy chế trường trước khi dùng thật; dữ liệu vẫn đặt lại khi tải lại app.

Xem `docs/UI-PHASE-2D.md` để biết phạm vi và kiểm tra. **Tên commit tiếng Việt và lệnh push mỗi đợt** được ghi trong `docs/GIT-COMMITS.md`, kèm tên dự kiến cho các đợt giao diện tiếp theo. Checklist phần hoãn vẫn ở `docs/UI-BACKLOG.md`.

## Cập nhật đợt 2E: Tài khoản, hồ sơ & cài đặt

Bấm **Hồ sơ** góc phải trên cùng hoặc avatar trang chủ để mở khu vực mới. Có sửa hồ sơ/ảnh mẫu (đồng bộ với trang chủ trong phiên), đăng nhập/đăng ký, quên/đặt lại/đổi mật khẩu và xác nhận đăng xuất minh họa. Có tùy chọn nhắc bài tập/lịch học/lịch thi, mốc nhắc và giờ yên lặng, cùng thẻ xem trước sáng/tối và tiếng Việt/English.

Đây là phạm vi tại thời điểm UI 2E. **Từ 2C.1, đăng ký/đăng nhập/hồ sơ đã dùng API thật**, form mật khẩu được gửi đến backend để xác thực. Chưa gửi email/khôi phục/đổi mật khẩu; hồ sơ mẫu và dữ liệu học tập vẫn là bản thử trong bộ nhớ. Theme/ngôn ngữ/nhắc thiết bị vẫn theo giới hạn của bản xem trước.

Xem `docs/UI-PHASE-2E.md` và `docs/qa-account.cjs` để biết phạm vi/kiểm tra. Tên commit: **Thêm giao diện tài khoản, hồ sơ và cài đặt**; lệnh push được cập nhật trong `docs/GIT-COMMITS.md`. Tiếp theo là UI 2F — các luồng con AI.

## Cập nhật đợt 2F: Trợ lý AI & duyệt kế hoạch

Mở **Trợ lý AI**. **Tạo lộ trình/Tìm lịch trống** cho chọn mục tiêu, bài/kỳ thi, ngày/giờ rảnh, số buổi và thời lượng → xem trước → sửa hoặc bỏ chọn từng buổi → duyệt. Các buổi được kiểm tra trùng lịch/deadline và lưu vào cùng **Lịch học → Tự học**, mở được chi tiết/Pomodoro. **Xem đề xuất** cho điều chỉnh một buổi chưa bắt đầu và duyệt thay thế, giữ liên kết/ghi chú, không tạo bản sao.

**Xem bản mẫu** có hai tài liệu minh họa, tóm tắt ngắn/chi tiết và đọc từng trang nguồn. **Luyện thử** có 3/5 câu, quay lại sửa đáp án, nộp bài, kết quả/giải thích, đọc nguồn và làm lại. Đây là nội dung có sẵn, chưa upload/đọc PDF hoặc gọi AI thật. Kế hoạch được sinh local để thử luồng; ô hỏi chỉ làm mục tiêu, chưa được AI phân tích. Dữ liệu vẫn đặt lại khi tải lại.

Xem `docs/UI-PHASE-2F.md`, `docs/qa-ai-unit.cjs`, `docs/qa-ai.cjs`. Tên commit và lệnh push mới nhất ở `docs/GIT-COMMITS.md`. Sau đợt này nên rà soát tổng thể và quay lại bốn nhóm hoàn thiện đang hoãn trong `docs/UI-BACKLOG.md`.

## Cập nhật đợt 3A: Bộ chọn ngày & giờ

Bấm các ô lịch/đồng hồ trong form để chọn, thay cho gõ chuỗi. Lịch có chọn tháng/năm, ngày nhuận và Hôm nay; đồng hồ có hai cột giờ/phút theo hệ 24 giờ, chọn đến từng phút và mốc nhanh 00/15/30/45. Bấm Xác nhận để áp dụng hoặc Hủy để giữ nguyên. Hiển thị ngày `dd/mm/yyyy`; dữ liệu nội bộ giữ nguyên định dạng cũ.

Đã áp dụng cho bài tập, chuỗi lịch học/ngoại lệ một buổi, lịch thi, tự học, form/preview AI và giờ yên lặng. Nội dung đang sửa được giữ khi mở bộ chọn. Kiểm tra trùng lịch, giờ kết thúc và deadline vẫn thực hiện khi lưu. Không thêm dependency; dữ liệu vẫn là mẫu trong bộ nhớ.

Xem `docs/UI-POLISH-3A.md`, `docs/qa-picker-unit.cjs` và `docs/qa-picker.cjs`. Tên commit: **Thêm bộ chọn ngày giờ cho các biểu mẫu**; lệnh push ở `docs/GIT-COMMITS.md`. Ba mục tiếp theo còn trong checklist: điều hướng, trạng thái giao diện và Dashboard.

## Cập nhật đợt 3B: Điều hướng & quay lại

Mũi tên trong chi tiết quay lại một bước; X đóng cả luồng. Màn đã mở được giữ khi đổi tab, gồm học kỳ, tìm kiếm/bộ lọc, tab chi tiết và vị trí cuộn. Từ bài/buổi học mở Pomodoro rồi **Quay lại màn trước** sẽ về đúng nguồn; từ AI đã duyệt sang lịch tự học cũng quay lại đúng bước trước đó. Thông báo mở bài/kỳ thi rồi trở lại hộp nhắc ban đầu.

Browser Back/Escape và Back Android dùng cùng nguyên tắc (picker → chi tiết → màn chính). Web ở gốc vẫn Back ra trang trước bình thường. Chưa có deep link/Forward replay hoặc gesture iOS; chưa thử Back/cảm ứng trên thiết bị thật. Dữ liệu/navigation vẫn chỉ giữ trong phiên.

Xem `docs/UI-POLISH-3B.md`, `docs/qa-navigation-unit.cjs`, `docs/qa-navigation.cjs`. Tên commit: **Hoàn thiện điều hướng và luồng quay lại**; lệnh push ở `docs/GIT-COMMITS.md`. Tiếp theo là 3C — trạng thái giao diện, rồi 3D — Dashboard.


## Cập nhật đợt 3C: Trạng thái giao diện

Đã có màn bắt đầu, chế độ học tập trống và hướng dẫn thiết lập. Các form chính có chờ/khóa nút, lỗi giữ nội dung, thử lại và hủy; thông báo kết quả hiển thị trong hộp thoại đang mở. Bấm **Bản xem trước · Thử trạng thái** dưới header để xem tải/lỗi và bật lỗi cho lần xử lý kế tiếp. Đây là mô phỏng UI, chưa gọi backend.

Xem `docs/UI-POLISH-3C.md`, `docs/qa-ui-states.cjs` và `docs/GIT-COMMITS.md`. Tiếp theo là UI 3D — Dashboard theo học kỳ và kỳ thi gần nhất.


## Chọn học kỳ theo năm học

Học kỳ dùng lựa chọn cố định: **Học kỳ 1**, **Học kỳ 2**, **Học kỳ 3 (Hè)**. Kỳ hè tùy chọn, không tự thêm. Năm học chọn bằng nút trước/sau; không nhập tên kỳ tự do. Cùng kỳ ở hai năm khác nhau được quản lý riêng; không lưu trùng kỳ trong một năm. Xem `docs/SEMESTERS.md`.
