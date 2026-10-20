# UI 2D — Điểm số & GPA

> Cập nhật: giao diện hiện dùng bộ chọn loại điểm/học phần và tự nhận diện học lại. Các mô tả nhập tên thành phần/liên kết thủ công bên dưới là bản đầu; xem [IUH-GRADING.md](./IUH-GRADING.md) cho hành vi hiện tại.

## Mở giao diện

- **Thống kê → Điểm & GPA**: chọn học kỳ, xem điểm/GPA, tìm môn và lọc môn đủ/chưa đủ điểm.
- Bấm một thẻ môn → **Nhập / chỉnh sửa điểm** để sửa tên thành phần, điểm, trọng số; thêm/xóa tối đa 10 thành phần.
- **Lịch học → Môn & học kỳ → Chi tiết môn → Điểm số** dùng cùng bảng điểm và form sửa.
- Nút tùy chọn cạnh tiêu đề mở **Quy tắc điểm mẫu**. **Thử mục tiêu GPA tích lũy** mở mô phỏng số tín chỉ mới.

Giữ nền xanh nhạt, tím, gradient, font Jakarta, thẻ bo tròn và dock của template đã chọn. Đợt này không đổi thư viện hay làm backend.

## Dữ liệu và quy tắc prototype

- Điểm nằm trong Context, tải lại ứng dụng trở về mẫu. Ba thành phần mặc định: thường xuyên 20%, giữa kỳ 30%, cuối kỳ 50%.
- Cho nhập điểm 0–10, chấp nhận dấu phẩy hoặc dấu chấm thập phân. Ô trống là chưa nhập; **0 là điểm thật**. Trọng số từng phần phải lớn hơn 0, tổng bằng 100%. Môn chỉ có tổng kết khi đã nhập đủ mọi thành phần hợp lệ.
- Tổng kết thang 10 = tổng của `điểm thành phần × trọng số / 100`. Làm tròn 1 hoặc 2 chữ số trước quy đổi điểm chữ/thang 4. Màn quy tắc hiển thị toàn bộ các ngưỡng đang áp dụng.
- Mặc định dùng thang mẫu A/B+/B/C+/C/D+/D/F. Có lựa chọn thang A/B/C/D/F. Đây chưa phải quy chế trường; chưa có điều kiện điểm liệt, miễn môn, đạt/không đạt, tín chỉ không tham gia GPA hoặc ngưỡng riêng từng thành phần.
- GPA = tổng `điểm thang 4 × tín chỉ` chia tổng tín chỉ có kết quả. Môn chưa đủ điểm bị loại khỏi cả tử và mẫu số. Môn trượt đủ điểm vẫn tham gia GPA, nhưng chưa được cộng tín chỉ đạt. Chưa có môn đủ điểm thì hiện `—`, không tạo GPA 0 giả.
- GPA học kỳ xét kết quả từng môn trong kỳ đó. GPA tích lũy chỉ bao gồm những môn được nhập trong app; chưa đại diện toàn bộ bảng điểm của trường.
- Học lại phải **liên kết rõ với lần học trước**, khác học kỳ và cùng số tín chỉ. Không tự gộp môn vì trùng tên/mã. Chặn vòng lặp và hai lần học cùng nối trực tiếp vào một lần trước.
- Tích lũy chọn điểm thang 4 cao nhất hoặc lần học sau cùng trong chuỗi đã liên kết; bằng điểm chọn lần sau. Lần học sau chưa đủ điểm giữ kết quả cũ. Tín chỉ của một chuỗi chỉ tính một lần. Prototype chưa có lịch ngày học kỳ để tự xác định thứ tự thời gian, nên thứ tự do liên kết này quyết định.
- Môn có điểm hoặc liên kết học lại không được xóa/chuyển học kỳ. Số tín chỉ trong chuỗi học lại không được sửa để làm lệch các lần. Trạng thái hoàn thành môn vẫn do người dùng quản lý riêng với kết quả điểm.

## Mục tiêu và thống kê

- Với môn chưa đủ điểm, form tính trung bình có trọng số cần đạt ở phần còn thiếu dựa trên tổng **chưa làm tròn**. Ví dụ 8 × 20% + 7,5 × 30%, muốn tổng 8 thì phần cuối 50% cần 8,30. Đây là giả định toán học, chưa xét điểm liệt.
- Mô phỏng GPA tích lũy dùng `(mục tiêu × (tín chỉ đã có + tín chỉ mới) − GPA hiện tại × tín chỉ đã có) / tín chỉ mới`. Có cảnh báo nếu cần hơn 4,0; giới hạn tín chỉ mới là số nguyên 1–100. Giả định tín chỉ mới là môn khác, không học lại; kết quả chưa khẳng định tổ hợp điểm thực tế có thể đạt.
- Có so sánh GPA các học kỳ và nhãn bao nhiêu môn đã đủ điểm. Thống kê tổng quan, chip GPA trang chủ và chi tiết môn dùng chung dữ liệu vừa nhập. Thay thế các hằng GPA 3,82 / 68 tín chỉ ở những phần này; biểu đồ thời gian học cũ vẫn là dữ liệu mẫu.

## Kiểm tra

```powershell
npm run typecheck
node docs/qa-grades-unit.cjs
node docs/qa-grades.cjs
npm run build:web
npx expo export --platform android --output-dir .expo/native-check
```

Script trình duyệt cần Playwright và Chromium/Chrome; có thể trỏ `PLAYWRIGHT_MODULE` vào thư viện đã cài và `CHROME_PATH` vào trình duyệt. Không dùng hồ sơ trình duyệt cá nhân. Kết quả và ảnh nằm trong `.expo/qa-grades`, không đưa lên Git.

- 35 kiểm tra công thức: điểm trống/0, điểm và trọng số sai, làm tròn ở ngưỡng 8,45, hai thang quy đổi, GPA theo tín chỉ, học lại và dự báo điểm còn thiếu.
- Thử giao diện 320/390/430/1280px; nhập/sửa/thêm thành phần, lọc môn, kỳ rỗng, đổi quy tắc, mục tiêu vượt khả năng, học lại cao nhất/lần sau và xóa điểm của lần sau.
- Kiểm tra hồi quy `qa-academics.cjs`, `qa-learning.cjs`, `qa-calendar-unit.cjs`, `qa-calendar.cjs`, `qa-smoke.cjs`.
- Typecheck và xuất bundle web/Android không thay thế kiểm tra trên điện thoại thật. Chưa nghiệm thu nhập liệu bằng bàn phím native, chạy nền, lưu dữ liệu hoặc đồng bộ backend.

## Làm sau

Đợt kế tiếp: **UI 2E — Tài khoản, hồ sơ và cài đặt**, tiếp đó là các luồng con AI. Chưa triển khai auth/API thật. Bốn nhóm cải thiện người dùng đã hoãn vẫn để ở `UI-BACKLOG.md`. Quy chế trường và nghiệm thu nghiệp vụ thật vẫn chưa đánh dấu hoàn thành.

Tên commit và lệnh push được ghi ở `GIT-COMMITS.md`.
