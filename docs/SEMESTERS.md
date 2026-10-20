# Quy ước học kỳ theo năm học

Theo yêu cầu ngày 20/10/2026:

- Mỗi năm học có **Học kỳ 1**, **Học kỳ 2** là hai kỳ chính.
- **Học kỳ 3 (Hè)** là kỳ tùy chọn; chỉ thêm khi có học, không tự tạo hoặc yêu cầu phải có kỳ hè.
- Số kỳ bắt đầu lại trong từng năm, không đếm xuyên khóa học thành kỳ 4/5/6.

## Giao diện

Form thêm/sửa học kỳ dùng ba thẻ chọn kỳ, thay cho ô nhập tên tự do. Năm học chọn bằng nút trước/sau, luôn là hai năm liên tiếp. Trạng thái và ghi chú vẫn chỉnh riêng.

Lưu kỳ + năm đã có sẽ báo trùng và giữ nội dung form. Khi sửa chính học kỳ đó, việc giữ nguyên kỳ/năm vẫn được phép; không tạo bản sao. Kỳ 1 của hai năm khác nhau là hai mục độc lập.

Danh sách học kỳ, chọn học kỳ cho môn và bảng điểm đều có năm để phân biệt. Trang chủ và tiêu đề thống kê lấy tên/năm từ dữ liệu, bỏ nhãn học kỳ 5 cố định. Các phần tổng hợp theo bộ chọn học kỳ toàn app vẫn để UI 3D.

## Dữ liệu

`Semester.term` có giá trị 1/2/3; `name` sinh từ danh sách lựa chọn và `academicYear` luôn dùng dạng `2026 – 2027`. Kiểm tra trùng theo `term + academicYear`, không theo tên do người dùng gõ.

Dữ liệu mẫu: kỳ 1 năm 2026–2027 đang học, kỳ 2 năm 2025–2026 đã kết thúc và kỳ 2 năm 2026–2027 sắp tới. Không có kỳ hè mặc định. Giữ ID sẵn có của các kỳ để các môn/điểm không mất liên kết khi đổi nhãn; ID là định danh nội bộ, không phải số kỳ hiển thị.

Các component riêng ở `src/features/academics/components/SemesterPicker.tsx` và `AcademicYearPicker.tsx`. Tải lại bản xem trước để khởi tạo bộ dữ liệu mẫu mới. Dữ liệu vẫn chỉ giữ trong phiên.

## Kiểm tra

`docs/qa-semesters.cjs` kiểm tra chọn kỳ/năm, bỏ ô nhập tự do, tạo hai kỳ chính mà không cần kỳ hè, thêm hè chủ động, chặn trùng khi thêm/sửa, cùng kỳ khác năm, giữ liên kết môn và bố cục 320/390/430/1280px. Ảnh/kết quả ở `.expo/qa-semesters/`, không đưa lên Git.

Các kiểm tra UI 3C, môn/học kỳ, bảng điểm và quay lại đã đổi sang nhận diện kỳ cùng năm học. Lệnh commit/push hiện tại ở `GIT-COMMITS.md`.

Kết quả kiểm tra đợt sửa học kỳ: TypeScript, web export, Android Hermes export đều qua. `qa-semesters`, `qa-ui-states`, `qa-academics`, `qa-grades`, `qa-navigation` và `qa-smoke` đều qua; không ghi nhận lỗi runtime/console hoặc tràn ngang. Đã xem ảnh form ở 320/390px; chưa kiểm tra trên điện thoại thật.
