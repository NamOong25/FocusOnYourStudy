# Cột điểm đề xuất có thể chỉnh sửa

## Thao tác

- Môn mới vẫn có bộ cột gợi ý theo loại học phần. Từng cột có nút sửa tên, xóa, bộ chọn loại điểm và ô điểm. Nút **Thêm cột điểm** nằm dưới danh sách, tối đa 10 cột.
- Tên hiển thị độc lập với loại dùng tính điểm: “Kiểm tra tuần 3” có thể thuộc nhóm thường kỳ. Đổi tên không đổi công thức.
- Xóa cột có điểm BTL/phần còn lại hoặc điểm thường đã nhập cần xác nhận trong bản nháp; cột chưa có điểm xóa ngay. Đóng/quay lại trước khi lưu giữ bảng điểm đã lưu.
- **Khôi phục bộ cột đề xuất** cần xác nhận, tạo lại các cột trống trong bản nháp. Không tự ghi đè bảng điểm đã lưu.
- Có thể xóa hết cột và lưu bản trống, hoặc lưu bản đang thiếu một nhóm. Điểm sai định dạng/ngoài 0–10, tên trống, nhóm giữa kỳ/cuối kỳ bị trùng hoặc cách quy BTL chưa hợp lệ vẫn cần sửa trước khi lưu.

## Công thức và trạng thái

**Lý thuyết:** thường kỳ chia đều nhóm 20%, giữa kỳ 30%, cuối kỳ 50%. Thêm hoặc xóa một cột thường kỳ chỉ chia lại nhóm 20%; không chuyển trọng số giữa các nhóm. Cho phép chọn lại Giữa kỳ/Cuối kỳ tại cột mới để phục hồi cột đã xóa. Lý thuyết không có loại điểm thực hành. BTL quy vào cuối kỳ như đợt trước.

Nếu thiếu thường kỳ/giữa kỳ/cuối kỳ, vẫn lưu được bản đang nhập. Tổng kết và GPA để trống, trạng thái **Chưa đủ cột điểm**; không tự gán điểm 0 hoặc kết luận học lại. Thêm đủ nhóm và nhập đủ điểm thì kết quả tính lại từ dữ liệu chung.

**Thực hành:** số cột 3 (1–2 tín chỉ) hoặc 5 (từ 3 tín chỉ) trong tài liệu IUH vẫn là gợi ý ban đầu. Người dùng có thể chỉnh số cột theo bảng điểm/đề cương của môn. Trọng số mỗi cột bằng `100 / N`; tổng kết là trung bình cộng **N cột hiện có**, chỉ tính khi tất cả cột đã có điểm hợp lệ. Không ép tăng/giảm số cột sau khi lưu.

Khi N khác gợi ý theo tín chỉ, editor và trang xem điểm đều ghi **Bộ cột tùy chỉnh**, nêu số cột hiện tại, số gợi ý và yêu cầu đối chiếu với bảng điểm/đề cương. App không khẳng định mọi số cột do người dùng thiết lập đều là cấu trúc chính thức của IUH. Nếu môn có công thức ngoài trung bình cộng, cần bổ sung đúng đề cương trước khi cấu hình công thức đó.

BTL tiếp tục thay một cột hoặc quy vào một cột cuối kỳ; không tự cộng thêm trọng số. Đổi vai trò một cột sang BTL giữ số cột; bấm Thêm cột là tạo thêm một thành phần thật và làm đổi mẫu số N. Ví dụ 5 cột `6, 7, 8, 9, BTL 10` → 8,0; xóa cột 6 → 4 cột trung bình 8,5 và hiện ghi chú tùy chỉnh.

## Mã nguồn

- `GradeColumnCard.tsx`: giao diện một cột, sửa tên, xác nhận xóa, loại/điểm và quy đổi BTL.
- `GradeEditor.tsx`: bản nháp, thêm/khôi phục/tách/gộp và lưu.
- `grades.ts`: tính trọng số theo nhóm, kiểm tra bản nháp riêng với kiểm tra điều kiện tính tổng kết. Dashboard/GPA/bảng điểm dùng chung kết quả.

## Kiểm tra

- `node docs/qa-grades-unit.cjs`: 149 kiểm tra công thức, BTL, cột tùy chỉnh, bản nháp thiếu nhóm và loại khỏi GPA.
- `node docs/qa-grade-columns.cjs`: thêm/xóa/sửa tên, xác nhận/hủy, lưu/mở lại, khôi phục cột cuối kỳ, xóa hết/khôi phục gợi ý, số cột thực hành tùy chỉnh, bảo toàn BTL, giới hạn 10 cột và Back bỏ thay đổi chưa lưu. Kiểm tra không tràn ngang tại 320/390/430/1280 px.
- `node docs/qa-project-grades.cjs`: giữ hành vi BTL thay toàn bộ/một phần cuối kỳ hoặc một cột thực hành và tránh tính trùng.

Dữ liệu vẫn lưu trong bộ nhớ phiên frontend, chưa có lưu lâu dài/backend. Nguồn quy tắc và phạm vi đối chiếu ở `GRADES-PROJECTS.md` và `IUH-GRADING.md`.
