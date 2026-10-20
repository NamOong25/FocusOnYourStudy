# Điểm bài tập lớn — hai loại học phần

> Cập nhật tiếp: các cột ban đầu là đề xuất có thể thêm/xóa/sửa, không còn khóa số cột thực hành. Bản thiếu nhóm lý thuyết có thể lưu nhưng chưa tính tổng kết/GPA; bộ cột thực hành khác gợi ý được ghi rõ là tùy chỉnh. Xem [GRADE-COLUMNS.md](./GRADE-COLUMNS.md).

Đợt này sửa công thức và giao diện nhập điểm, không chỉ đổi nhãn. Tổng kết và GPA được tính từ điểm thực tế người dùng nhập, không gán số kết quả sẵn. App vẫn lưu trong bộ nhớ phiên, chưa kết nối bảng điểm IUH hoặc backend.

## Căn cứ và phạm vi

- [Tài liệu IUH năm 2023, mục 6](https://fce.iuh.edu.vn/wp-content/uploads/2023/10/2023_FCE_faculty_manual.pdf): trang in 49–52 / trang PDF 55–58. Môn lý thuyết: thường kỳ 20%, giữa kỳ 30%, cuối kỳ 50%. Môn thực hành: trung bình cộng 3 cột cho 1–2 tín chỉ, 5 cột khi từ 3 tín chỉ. Bài tập lớn/tiểu luận là phương thức đánh giá, không tự tạo một trọng số toàn môn riêng.
- Thông tin người dùng cung cấp: **World Wide Web Java dùng BTL làm điểm cuối kỳ**, **React dùng BTL làm một cột thực hành**. Đây là cấu hình vai trò theo thông báo của môn, không phải kết quả app tự tra cứu từ mã môn.
- [Thông báo IUH về bài kiểm tra kết thúc học phần toán](https://ffs.iuh.edu.vn/categorythongbao/ve-viec-to-chuc-lam-bai-kiem-tra-ket-thuc-hoc-phan/) có phần được công cụ tìm kiếm lập chỉ mục nêu cuối kỳ dưới hình thức BTL. Máy chủ nguồn hiện không truy cập được để đọc toàn văn; không dùng thông báo này làm căn cứ cho một tỷ lệ BTL áp dụng toàn trường.
- Không có cơ sở để mặc định mọi BTL đều là 50% hoặc mọi môn thực hành đều có cấu trúc 20/30/50. Nếu đề cương của một môn có công thức khác quy tắc chung dưới đây, cần đối chiếu đề cương đó trước khi nhập theo công thức này.

## Giao diện

Chỉ có hai ô chọn **Lý thuyết / Thực hành**. Chọn loại mới cần xác nhận tạo lại cột; dữ liệu đã lưu chỉ thay đổi khi bấm Lưu. Bản ghi cũ loại tích hợp/đạt-không đạt/khóa luận/tùy chỉnh vẫn được đọc theo cấu hình cũ; không âm thầm chuyển loại hoặc xóa điểm.

- Lý thuyết: không hiện loại điểm thực hành. Thường kỳ có thể nhập trung bình đã công bố hoặc tách thành 2/3 cột theo tín chỉ; app tự chia đều trọng số nhóm 20%. Giữa kỳ giữ 30%, cuối kỳ 50%.
- Thực hành: đề xuất 3/5 cột và chia đều trọng số; có thể thêm/xóa cột theo bảng điểm môn. Nếu số cột khác gợi ý, ghi rõ bộ cột tùy chỉnh và tính trung bình theo số cột thực tế. **Thực hành** trong tên loại điểm cũ đổi thành **Thường kỳ thực hành**. Có thể gắn nhãn kiểm tra thực hành/giữa kỳ/cuối kỳ cho một cột; tổng kết vẫn theo trung bình cộng các cột của loại học phần này.
- BTL là tùy chọn. Khi chưa có BTL, các cột tính bình thường. BTL trong lý thuyết quy vào cột cuối kỳ; BTL trong thực hành có thể thay một cột thực hành hoặc quy vào một cột cuối kỳ đã xác định trong bộ cột.

## Cách tính

### BTL thay một cột thực hành — ví dụ React

Đổi một trong N cột sang BTL. Điểm BTL **thay** điểm của cột đó, không thêm cột thứ N+1.

`Tổng kết = (điểm cột 1 + ... + điểm BTL + ... + điểm cột N) / N`

- 3 tín chỉ: N=5, mỗi cột 20%. Các điểm `6, 7, 8, 9, BTL 10` → **8,0**.
- 2 tín chỉ: N=3, mỗi cột 1/3. Các điểm `6, 7, BTL 10` → **7,7**.

### BTL làm điểm cuối kỳ — ví dụ World Wide Web Java

Chọn BTL tại cột cuối kỳ → **thay toàn bộ cuối kỳ**. Điểm cuối kỳ = điểm BTL. Không giữ thêm một cột cuối kỳ khác rồi cộng trùng.

Nếu học phần đang chọn **Lý thuyết**, `TK 8, GK 8, BTL/CK 9` → `8×20% + 8×30% + 9×50% = 8,5`.

Nếu học phần đang chọn **Thực hành theo trung bình cộng N cột**, cột cuối kỳ đó vẫn là một trong N cột, trọng số 1/N. Không lấy ví dụ lý thuyết 50% để gán cho môn thực hành. Cần chọn đúng loại theo học phần thực tế; tên môn không quyết định công thức.

### BTL chỉ góp một phần cuối kỳ

Nhập tỷ lệ BTL trong **cột cuối kỳ**, cùng điểm phần còn lại:

`CK = BTL × tỷ lệ + phần còn lại × (100% − tỷ lệ)`

Ví dụ thử toán, không phải tỷ lệ mặc định của IUH: BTL 8, tỷ lệ 40%, phần còn lại 6 → CK 6,8. Với TK=GK=8 của học phần lý thuyết → tổng kết **7,4**.

Điểm cột cuối kỳ sau gộp làm tròn 1 chữ số; sau đó xét ngưỡng cuối kỳ và tính tổng kết. Nếu tỷ lệ chưa xác định, không cho tính/lưu cấu hình chưa hợp lệ. Nếu tỷ lệ hợp lệ nhưng thiếu điểm BTL/phần còn lại, có thể lưu điểm đang có; tổng kết để trống và chưa đưa vào GPA. Không tự thay điểm còn thiếu thành 0.

Giữa kỳ 0 chặn thi và cuối kỳ dưới 3,0 áp dụng như phần điểm lý thuyết đã đối chiếu. Với BTL làm/góp cuối kỳ, xét điểm cuối kỳ sau quy đổi. Môn thực hành dùng quy tắc trung bình cộng đã nêu; không tự thêm điều kiện liệt riêng chưa có trong tài liệu đối chiếu.

## Dùng thử

1. Mở môn → Điểm số → Nhập/chỉnh sửa điểm.
2. **World Wide Web Java:** chọn đúng loại học phần → tại cột Cuối kỳ đổi loại sang Bài tập lớn (hoặc bấm Dùng bài tập lớn cho cuối kỳ) → chọn Thay toàn bộ cuối kỳ → nhập điểm BTL → lưu.
3. **React:** chọn Thực hành → xác nhận bộ cột → đổi đúng một cột sang Bài tập lớn → giữ Một cột thực hành → nhập các điểm → lưu. Tổng số cột không đổi.
4. Bấm GPA trên Dashboard hoặc mở lại bảng điểm để đối chiếu; sửa BTL thì tổng kết và GPA cập nhật từ cùng một hàm tính.

Tỷ lệ/điểm dùng đúng theo môn của bạn. Chức năng tính điểm đã nhập không phải công cụ thử mục tiêu GPA; màn dự báo mục tiêu vẫn là giả định tương lai và giữ nhãn mô phỏng.

## Kiểm tra

- `node docs/qa-grades-unit.cjs`: **149 kiểm tra** về công thức IUH, thiếu/0, BTL thay cuối kỳ hoặc một cột thực hành, tỷ lệ sai/thiếu, cuối kỳ trùng, bảo vệ điểm BTL, lịch sử học lại và bộ cột có thể chỉnh sửa.
- `node docs/qa-project-grades.cjs`: giao diện 2 loại, lọc loại điểm, BTL toàn bộ/một phần cuối kỳ, React 5 cột, lưu/mở lại, tránh tính trùng, đổi loại chưa lưu giữ dữ liệu, xóa điểm.
- `node docs/qa-iuh-grades.cjs`: điều kiện thi, biên qua môn, thang IUH và tách/gộp thường kỳ.
- `node docs/qa-dashboard.cjs`: luồng từ dữ liệu trống và số liệu chung trên Dashboard.
- `qa-grades.cjs` giữ làm điểm vào cho bài kiểm tra giao diện mới, thay bộ thử trọng số/thang mô phỏng cũ đã gỡ khỏi UI.

Ảnh/kết quả trình duyệt nằm trong `.expo/qa-project-grades/`, không đưa vào Git. Các ví dụ số trong test là dữ liệu kiểm tra phép tính, không khẳng định là điểm/đề cương chính thức của hai môn đã nêu.
