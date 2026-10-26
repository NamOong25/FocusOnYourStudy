# 5C.1 — Đọc bảng điểm thật trong tài khoản

Ngày hoàn thành: 26/10/2026. Chỉ đọc; chưa triển khai nhập/lưu điểm trên giao diện tài khoản.

## Đã kết nối

- Thống kê → Điểm & GPA: chọn học kỳ, tìm tên/mã môn, lọc đủ điểm/chưa đủ/không đạt. GPA học kỳ và danh sách môn dùng chung snapshot `GET /api/v1/semesters/{id}/gpa`.
- Bảng điểm môn trong danh sách, chi tiết môn và các lối mở bảng điểm đều dùng cùng giao diện đọc dữ liệu tài khoản. Mở môn đọc cấu hình, sau đó đọc một snapshot cấu hình/điểm/kết quả từ `GET /api/v1/grade-configurations/{id}/result`.
- Cột tùy chỉnh, Lý thuyết/Thực hành, trọng số, BTL quy vào thực hành/cuối kỳ, điểm BTL và phần còn lại. Điểm cột và tổng kết lấy từ backend; không gọi phép tính bản mẫu. Giữ độ chính xác điểm thành phần, ví dụ 8.125.
- Chưa có cấu hình, cấu hình thiếu nhóm, điểm thiếu, môn bị chặn thi và môn không đạt có trạng thái riêng. Điểm chưa nhập khác 0; GPA chưa có dữ liệu khác GPA 0.00 thật.
- Môn đủ điểm và đạt với tổng kết ≤ 5/10 màu cam; môn trượt/chặn thi đỏ. Môn trượt vẫn hiện trong danh sách.
- Tải/lỗi/thử lại, kiểm tra phiên bản danh mục, hủy và bỏ phản hồi muộn khi đổi học kỳ/môn/tài khoản. Giao diện che snapshot cũ ngay khi owner/query thay đổi, trước cả cleanup effect. Lỗi đọc điểm xóa kết quả trước đó; không chuyển sang dữ liệu mẫu.
- Làm mới snapshot học kỳ khi đóng chi tiết môn. Nút tải lại cập nhật cả danh mục nếu metadata vừa thay đổi.
- Tài khoản thật chỉ xem; chặn đường ghi `saveGrades` vào bộ nhớ. Chế độ dữ liệu mẫu vẫn có trình nhập điểm để thử giao diện.

GPA học kỳ cơ bản đã có trong snapshot nên được hiển thị cùng bảng điểm. **5C.2** sẽ nối ghi cột/điểm/version; **5C.3** sẽ nối GPA tích lũy, so sánh học kỳ và số liệu điểm trên Dashboard. Tab so sánh dùng phép tính mẫu được ẩn trong tài khoản thật cho đến khi kết nối API.

Không thay backend/schema/migration hay quy tắc IUH ở đợt này; vẫn V9. Chính sách app về chọn điểm đạt cao nhất vẫn thuộc backend 5B.2B.2; học cải thiện/phục hồi điểm và các điểm đặc thù tiếp tục để sau.

## Cách kiểm tra trên máy

1. Giữ backend đang chạy bằng `backend/scripts/Run-Local.ps1`; chạy frontend như bình thường và tải lại trang để nhận code mới.
2. Đăng nhập → Thống kê → Điểm & GPA. Danh sách học kỳ/môn phải đúng tài khoản. Nếu Hồ sơ đang mở, đóng Hồ sơ trước.
3. Nếu môn chưa từng được tạo bảng điểm ở backend: thấy **Chưa có bảng điểm**, tổng kết `—`; không có nút nhập điểm tài khoản trong đợt này. Đây là trạng thái đúng, chưa phải lỗi.
4. Chọn học kỳ chưa có môn: thấy **Học kỳ chưa có môn học**, GPA `—`. Chuyển về kỳ có môn phải tải đúng danh sách mới.
5. Với môn đã có điểm từ API 5A: mở bảng điểm, đối chiếu tổng kết, điểm chữ/hệ 4, các cột, trọng số và BTL. Có thể dùng các script `Try-GradeConfigurations.ps1`, `Try-GradeScores.ps1` theo hướng dẫn 5A để chuẩn bị dữ liệu; đợt này không tự seed tài khoản của bạn.
6. Tìm mã/tên môn, thử bốn bộ lọc. Môn F vẫn xuất hiện ở Tất cả/Không đạt. Môn chưa đủ dữ liệu không được tạo tổng kết 0.
7. F5 rồi quay lại Điểm & GPA: vẫn đăng nhập và đọc lại dữ liệu đã lưu. Đăng nhập tài khoản khác không được thấy điểm của tài khoản trước.
8. Tạm dừng backend của bạn, bấm Tải lại: phải báo lỗi và có Thử lại, không hiện điểm mẫu. Khởi động lại backend, bấm Thử lại để đọc lại dữ liệu.

## Kiểm tra thực hiện

- TypeScript, build web và toàn bộ **302 kiểm thử frontend** đạt; trong đó **23 kiểm thử mới** cho đọc điểm. Bộ mới kiểm tra scope/version, null/0, BTL/độ chính xác, snapshot nguyên tử, lỗi, dedupe, hủy/phản hồi muộn và che dữ liệu tài khoản cũ.
- Backend QA chạy ở địa chỉ/cổng riêng, dùng schema `backend_it_<UUID>` và tài khoản giả. Client frontend đọc được cả 5 chi tiết môn, snapshot kỳ có dữ liệu và kỳ trống.
- Bộ dữ liệu QA có tổng kết 7.4/B/3.0, 5.0/D+/1.5, 0.0/F/0.0; mỗi môn 3 tín chỉ. Hai môn khác thiếu cấu hình/điểm bị loại khỏi mẫu số. GPA backend và giao diện cùng **1.50 = (3×3 + 1.5×3 + 0×3)/9**.
- Trình duyệt: đăng nhập, đổi học kỳ, mở BTL (điểm nhập 5; phần còn lại 8; tỷ lệ 40%; điểm cột 6.8), giữ điểm thành phần 8.125, môn chưa có cấu hình, F5, màu cam/đỏ, lỗi kết nối/thử lại và đổi tài khoản.
- Không chạy lại bộ backend 537 tests vì không đổi code backend; đây là baseline đã đạt ở 5B.2B.2.
- Schema và tiến trình QA được dọn sau kiểm tra; không thêm dữ liệu thử vào tài khoản thật.

```powershell
npm run typecheck
npm run test:grades
node --test tests/*.test.cjs
npm run build:web
```

Ảnh kiểm tra: [GPA học kỳ](images/frontend5c1-semester.png), [chi tiết môn](images/frontend5c1-detail.png), [lỗi kết nối](images/frontend5c1-error.png).

## Tên commit

`Kết nối bảng điểm và GPA học kỳ với backend`
