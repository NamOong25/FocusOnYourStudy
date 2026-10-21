# UI 4E — So sánh GPA giữa các học kỳ

Project: `D:\Video OBS\QuanLyHocTap`. Frontend bổ sung mục **Thống kê → So sánh GPA**, bên cạnh Tổng quan và Điểm & GPA. Không thay công thức điểm, đề xuất cột điểm hoặc quy tắc học lại đang có.

## Đã làm

- Hai ô A (học kỳ gốc) và B (học kỳ đối chiếu), ghi rõ tên và năm học. Mặc định B là kỳ đang học, A là kỳ trước theo năm/term; không có kỳ trước thì dùng một kỳ khác. Khi không có kỳ đang học, dùng kỳ mới nhất. Có đổi chiều A/B; hộp chọn khóa kỳ đã dùng ở ô còn lại.
- Thẻ từng kỳ hiện GPA hệ 4, tín chỉ GPA đạt, tín chỉ tính GPA và số môn đủ kết quả GPA. Dữ liệu gọi chung `summarizeGrades` như bảng điểm; tính theo tín chỉ, giữ các lần học trong học kỳ tương ứng.
- GPA học kỳ không thay điểm lịch sử bằng lần học lại của kỳ sau. Phần chọn lần học lại của GPA tích lũy tiếp tục dùng quy tắc đang có trong Điểm & GPA.
- Kỳ có một số môn đủ kết quả hiện GPA tạm tính; kỳ chưa có kết quả tính GPA hiện dấu — và “Chưa đủ dữ liệu”. Không dựng thanh GPA 0 cho kỳ thiếu dữ liệu. GPA 0.00 từ các môn có kết quả không đạt vẫn là số liệu hợp lệ.
- Môn đạt/không đạt tách khỏi GPA và tín chỉ GPA; số môn đủ kết quả so với số môn tham gia GPA. Kỳ chỉ có môn đạt/không đạt có lời giải thích riêng trong bảng điểm học kỳ.
- Chênh lệch = GPA B − GPA A, từ hai giá trị đã hiển thị đến 2 chữ số để người dùng đối chiếu. Bằng nhau ở độ chính xác này hiện “Không đổi · 0.00 điểm GPA”; không hiện âm 0. Tính toán GPA gốc vẫn giữ độ chính xác của hàm hiện có.
- Chạm thẻ/thanh học kỳ mở **Bảng điểm học kỳ**, đúng tên/năm/môn; chọn môn để mở lại `CourseGradeDialog`/`GradeEditor` đang dùng. Lưu cập nhật kết quả so sánh; Back rời bản nháp chưa lưu không thay điểm.
- Back: editor → chi tiết môn → bảng điểm học kỳ → so sánh. X đóng cả luồng; hai ô A/B được giữ. Chuyển tab rồi trở lại giữ lựa chọn trong phiên.
- Có trạng thái chưa có học kỳ và chỉ có một học kỳ, kèm đường sang quản lý học kỳ. Mục Điểm & GPA được giữ, có nút mở so sánh; phần Qua từng học kỳ cũng bỏ thanh 0 khi thiếu GPA.

## Kiểm tra nhanh bằng dữ liệu mẫu

1. Mở app → **Khám phá dữ liệu mẫu → Thống kê → So sánh GPA**. A: Học kỳ 2, 2025–2026 = **3.15**; B: Học kỳ 1, 2026–2027 = **3.25**, tạm tính từ 2/5 môn. Chênh lệch **Tăng 0.10 điểm GPA**, có nhãn tạm tính.
2. Bấm **Đổi chiều so sánh GPA**: thành Giảm 0.10; bấm lại để về thứ tự ban đầu. Mở Chọn học kỳ B: kỳ của A bị khóa; chọn Học kỳ 2, 2026–2027 chưa có môn: hiện Chưa đủ dữ liệu, không có chênh lệch và không dựng thanh GPA 0. Chọn lại B là Học kỳ 1, 2026–2027.
3. Chạm thẻ A: bảng điểm có Nhập môn lập trình/Đại số tuyến tính, đúng năm 2025–2026. Back về so sánh. Chạm thẻ B: bảng điểm của học kỳ 1 năm 2026–2027.
4. Trong B chọn **Cấu trúc dữ liệu & Giải thuật → Nhập / chỉnh sửa điểm**, nhập 8 cho ba cột hiện có rồi **Lưu điểm môn học**. Back về bảng điểm kỳ: **3.35**, **10 tín chỉ tính GPA**, **3/5 môn đủ kết quả**. Back về so sánh: **Tăng 0.20**; thanh B/thẻ B cùng là 3.35.
5. Mở lại editor, sửa một điểm trong nháp rồi Back không lưu: GPA vẫn 3.35. Kiểm tra X đóng cả luồng và về so sánh. Sang Điểm & GPA chọn đúng kỳ B: cũng 3.35. Nút So sánh GPA giữa các học kỳ quay về mục mới.
6. Để thử GPA 0.00 thật bằng dữ liệu thử: ở Lịch học → Môn & học kỳ chọn kỳ trống Học kỳ 2, 2026–2027, thêm một môn 3 tín chỉ. Về so sánh, chọn B là kỳ đó, mở môn và editor → Thực hành → Áp dụng bộ cột mới; nhập 0 cho cả 5 cột rồi lưu. B hiện **0.00**, có **3 tín chỉ tính GPA**, **0 tín chỉ GPA đạt**; nếu A vẫn là 3.15 thì chênh lệch Giảm 3.15. Đây là kiểm tra cách trình bày kết quả từ công thức trong app, không phải thao tác nhập điểm cho môn thật.
7. Tải lại → Bắt đầu với dữ liệu trống → Thống kê → So sánh GPA: có hướng dẫn tạo học kỳ. Tạo một kỳ rồi quay lại: có hướng dẫn thêm kỳ thứ hai, vẫn xem được bảng điểm kỳ đầu. Chưa tạo ra phép so sánh giữa cùng một kỳ.

Các số ở bước 1–5 giả định chưa sửa bộ điểm mẫu ở các lượt khác. Tải lại và chọn lại dữ liệu mẫu để bắt đầu một lượt sạch; thao tác này khởi tạo lại workspace thử.

## Kiểm tra kỹ thuật

- `npm run typecheck`: qua.
- `node docs/qa-gpa-comparison-unit.cjs`: 67 kiểm tra qua, gồm sắp thứ tự/chọn cặp khác nhau, dữ liệu mẫu, cùng hàm với bảng điểm, tạm tính/thiếu/GPA 0, đạt/không đạt, chặn thi, trọng số tín chỉ, học lại theo kỳ và làm tròn chênh lệch.
- `node docs/qa-grades-unit.cjs`: 149 kiểm tra công thức điểm hiện có qua. `qa-statistics-unit.cjs`: 71; `qa-navigation-unit.cjs`: 30 kiểm tra qua.
- `node docs/qa-gpa-comparison.cjs`: qua luồng chọn/đổi chiều, kỳ trống, đúng môn/kỳ, lưu/hủy điểm, khớp màn Điểm & GPA, chuyển tab giữ lựa chọn, GPA 0 thật, Back/X, trạng thái 0/1 học kỳ và console.
- `node docs/qa-statistics.cjs`: hồi quy Tổng quan Thống kê qua, gồm bộ lọc ngày/học kỳ, phiên Pomodoro, deadline, trạng thái bài tập, lối vào Điểm & GPA và dữ liệu trống phát triển thành thống kê.
- Ảnh/layout được xem ở 320/390/430/1280px: trang so sánh, hai thẻ, biểu đồ, hộp chọn kỳ và bảng điểm. Không tràn cuộn ngang; không có lỗi runtime/console trong lượt test. Kết quả và ảnh tại `.expo/qa-gpa-comparison/`, Git bỏ qua.
- Build web và export bundle Android qua. Chưa chạy trên điện thoại thật.

Script trình duyệt dùng profile headless riêng, không dùng session cá nhân. Cần Metro tại localhost:8092 (hoặc truyền URL) và Playwright/Chromium; đặt `PLAYWRIGHT_MODULE`/`CHROME_PATH` nếu dùng bộ công cụ ngoài project.

## Phạm vi còn lại

Thay đổi hiện chỉ giữ trong phiên RAM; backend/lưu bền/đồng bộ và nghiệm thu điện thoại thật chưa nằm trong đợt này. GPA phản ánh các môn đã nhập vào app; dữ liệu thiếu được ghi rõ, chưa có đồng bộ bảng điểm trường.

Tên commit: `Hoàn thiện giao diện so sánh GPA giữa các học kỳ`. Lệnh push ở `GIT-COMMITS.md`.
