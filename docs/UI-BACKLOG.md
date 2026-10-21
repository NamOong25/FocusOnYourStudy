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

### Các đề xuất lưu để làm sau

- [ ] Thống kê: chọn khoảng ngày/học kỳ; so sánh GPA qua các học kỳ và xử lý kỳ chưa có điểm.
- [ ] Thống kê: biểu đồ thời gian/phân bổ môn lấy từ dữ liệu phiên học trong app, thay các dãy số và tỷ lệ mẫu đang cố định.
- [ ] Thông báo: trạng thái rỗng, đã đọc/chưa đọc từng mục; huy hiệu đúng số mục chưa đọc.
- [ ] Thông báo: giao diện quyền bị từ chối/thu hồi và hướng dẫn bật lại; phần xin quyền/lên lịch nhắc thật triển khai cùng thông báo trên thiết bị.
- [ ] Biểu mẫu: cảnh báo khi đóng/quay lại với nội dung đã thay đổi chưa lưu; có lựa chọn tiếp tục sửa hoặc bỏ thay đổi.
- [ ] Biểu mẫu dài: nút lưu dễ tiếp cận, đặc biệt bảng điểm nhiều cột; thử với bàn phím điện thoại để tránh che ô/nút.
- [ ] Giao diện: áp dụng sáng/tối xuyên suốt app, không chỉ thẻ xem trước trong cài đặt.
- [ ] Ngôn ngữ: áp dụng tiếng Việt/English xuyên suốt app, gồm thông báo lỗi, lịch, ngày giờ và trạng thái trống.

Các mục chưa đánh dấu là phần để làm sau, không coi đã hoàn thành chỉ vì có bản xem trước. Mỗi đợt hoàn thành sẽ cập nhật tiêu chí kiểm tra và tên commit tiếng Việt.

## Lộ trình backend — 5 đợt lõi

Theo yêu cầu lưu lại ngày 20/10/2026. Frontend dùng React Native; backend dự kiến Java Spring Boot + PostgreSQL. Các đợt dưới đây **chưa triển khai**, chỉ ghi kế hoạch và tiêu chí kiểm tra để theo dõi. Hoàn thiện giao diện theo từng đợt trước khi bắt đầu backend.

| Đợt | Làm gì | Kết quả cần kiểm tra được |
| --- | --- | --- |
| 1. Nền tảng backend | Spring Boot + PostgreSQL; thiết kế bảng, quan hệ dữ liệu và API; chuẩn hóa lỗi | Chạy được backend và kết nối database. |
| 2. Tài khoản thật | Đăng ký, đăng nhập, phiên đăng nhập; nối frontend React Native với API | Hai tài khoản có dữ liệu riêng, không đọc/ghi chéo dữ liệu; lỗi mạng không làm app treo. |
| 3. Học kỳ và môn học | API thêm/sửa/xóa học kỳ, môn học; chọn học kỳ | Tạo môn rồi tải lại app vẫn còn; chuyển học kỳ hiển thị đúng môn. |
| 4. Bài tập và lịch | Deadline, kế hoạch tự học, lịch học lặp, ngoại lệ và lịch thi | Dữ liệu được lưu và liên kết đúng môn/học kỳ; sửa một buổi không làm thay đổi cả chuỗi. |
| 5. Điểm và Dashboard | Lưu cột điểm tùy chỉnh, cấu hình BTL; tính tổng kết/GPA ở backend; nối dữ liệu Dashboard | Kết quả thống nhất giữa bảng điểm và Dashboard; xử lý đúng điểm thiếu và cách quy BTL, không tính trùng. |

### Checklist nghiệm thu

- [ ] Backend 1 — Nền tảng backend chạy được, kết nối PostgreSQL; có thiết kế bảng/API và định dạng lỗi.
- [ ] Backend 2 — Đăng ký/đăng nhập và phiên đăng nhập hoạt động trên frontend; dữ liệu hai tài khoản được tách riêng.
- [ ] Backend 3 — Thêm/sửa/xóa học kỳ và môn học; mở lại app vẫn có dữ liệu, chọn đúng học kỳ.
- [ ] Backend 4 — Bài tập, kế hoạch tự học, lịch lặp/ngoại lệ và lịch thi được lưu đúng liên kết; kiểm tra một buổi và cả chuỗi.
- [ ] Backend 5 — Cột điểm tùy chỉnh/BTL được lưu và mở lại đúng; tổng kết/GPA khớp ví dụ tính tay và số liệu Dashboard.

Đây là 5 đợt backend lõi được tách để dễ triển khai từng phần. Lộ trình chức năng thật đầy đủ ở cuối checklist vẫn giữ các giai đoạn Pomodoro, thống kê, tài liệu/AI và hoàn thiện để sử dụng; chưa coi các phần đó đã hoàn thành sau 5 đợt này. Chỉ đánh dấu từng đợt khi đã kiểm tra chức năng thật, không dựa vào giao diện mẫu.

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

- [ ] Auth Spring Boot, đăng ký/xác minh email, đăng nhập/đăng xuất, phiên/token và khôi phục/đổi mật khẩu.
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

Lộ trình dưới đây ghi lại thứ tự trong ảnh. Hiện vẫn ưu tiên hoàn thiện các giao diện theo đợt UI; chưa chuyển sang backend. Số giai đoạn ở đây khác với số nhóm chức năng và tên đợt UI (ví dụ UI 2A). Chưa đánh dấu nghiệm thu hoàn chỉnh giai đoạn nào chỉ dựa vào prototype.

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
