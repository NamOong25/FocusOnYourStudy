# Checklist giao diện và chức năng để bổ sung sau

Theo yêu cầu ngày 20/10/2026: dựng các giao diện còn thiếu trước, sau đó hoàn thiện từng đợt. Ban đầu hoãn bốn nhóm dưới đây; sau UI 2F đã làm bộ chọn ngày/giờ (3A) và điều hướng (3B) theo yêu cầu. Hai nhóm trạng thái và Dashboard còn để sau. Đây là checklist trong project, không phải lịch nhắc tự động.

- [x] UI 3A: Thay nhập chuỗi ngày/giờ bằng lịch và đồng hồ 24 giờ trên bài tập, lịch học/ngoại lệ, lịch thi, tự học, AI và giờ yên lặng. Có xác nhận/hủy, hiển thị dd/mm/yyyy và phút chính xác. Xem `UI-POLISH-3A.md`; chưa nghiệm thu cảm ứng/Back/screen reader trên điện thoại thật.
- [x] UI 3B: Mũi tên quay lại một bước/X đóng cả luồng; giữ các màn đã mở, học kỳ/bộ lọc/tab chi tiết và cuộn; quay về nguồn từ Pomodoro/lịch tự học; Back/Escape trên web và handler Android. Xem `UI-POLISH-3B.md`. Chưa có deep link, Forward replay, gesture iOS hoặc nghiệm thu Back trên điện thoại thật.
- [ ] Bổ sung đồng bộ các trạng thái lần đầu sử dụng, đang tải, lỗi, lưu thành công và chưa có dữ liệu. Giữ các phản hồi/validation cơ bản cần thiết cho prototype, chưa làm cả hệ thống trạng thái.
- [ ] Dashboard: thẻ lịch thi gần nhất đầy đủ hơn và bộ chọn học kỳ rõ ràng. Bộ chọn học kỳ trong màn quản lý môn chỉ thay danh sách của màn đó, không đổi ngữ cảnh Dashboard.

## Số thứ tự chức năng đã thống nhất

Không có nhóm thứ 9 riêng. Chuyển nhóm 10 cũ (AI Study Assistant) thành **nhóm 9**. Phạm vi hiện gồm 9 nhóm: Dashboard; Thời khóa biểu; Bài tập; Điểm/GPA; Môn học/học kỳ; Lịch thi; Pomodoro; Thống kê; Trợ lý AI. Không có nhóm còn thiếu cần người dùng bổ sung.

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

Sau 2F, các nhóm màn chính đã có prototype. Hiện đã hoàn thành **3A Bộ chọn** và **3B Điều hướng**. Còn **3C Trạng thái**, **3D Dashboard**; chưa triển khai hai đợt đó hoặc chuyển sang backend trong 3B.

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
