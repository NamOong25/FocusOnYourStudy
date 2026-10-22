# Backend 3A — Học kỳ lưu PostgreSQL

Đã có API tạo/xem/sửa/xóa học kỳ theo tài khoản. Dùng lại bảng V1, không sửa migration V1/V2, không xóa dữ liệu cũ và không tự tạo học kỳ mẫu. Frontend chưa gọi API học kỳ; tạo học kỳ trên giao diện lúc này vẫn chỉ là dữ liệu thử. API môn ở 3B; nối giao diện ở 3C. 2C.3B điện thoại thật vẫn để làm sau.

## Test nhanh bằng terminal

Không cần chạy frontend để thử 3A. PowerShell trong VS Code hoặc IntelliJ đều được. Giữ terminal backend chạy:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Mở terminal thứ hai, đứng cùng folder backend. Dùng tài khoản đã đăng ký; mỗi lệnh hỏi email/mật khẩu nhập ẩn, không in/lưu token và đóng riêng phiên thử khi kết thúc.

1. Xem học kỳ hiện có:

```powershell
.\scripts\Try-Semesters.ps1 -Mode List
```

Nếu chưa có dữ liệu thì `data: []` là đúng. Tạo học kỳ thử (nếu kỳ/năm này đã có sẽ nhận SEMESTER_ALREADY_EXISTS, không cần xóa database):

```powershell
.\scripts\Try-Semesters.ps1 -Mode Create -Term 1 -StartYear 2026 -Status UPCOMING -Note 'Học kỳ thử API'
```

2. Chạy List lại: phải thấy cùng `id`, `startYear`, `term`, `note`, `version`. Dừng backend bằng Ctrl+C rồi chạy lại Run-Local; List lần nữa vẫn còn bản ghi. Đây là dữ liệu thật trong PostgreSQL.

3. Sửa: thay ID bên dưới bằng `id` thật từ List và thay `0` bằng version hiện tại. PUT nhận đủ kỳ/năm/trạng thái/ghi chú. Chọn CURRENT sẽ chuyển kỳ CURRENT cũ của tài khoản thành COMPLETED.

```powershell
.\scripts\Try-Semesters.ps1 -Mode Update -SemesterId 'THAY_ID_HOC_KY' -Version 0 -Term 1 -StartYear 2026 -Status CURRENT -Note 'Đã sửa qua API'
```

Chạy List: phải thấy nội dung mới và version mới nếu dữ liệu có thay đổi. Cố dùng version cũ để sửa/xóa: phải nhận SEMESTER_VERSION_CONFLICT; dữ liệu mới được giữ nguyên.

4. Xóa kỳ thử trống: dùng ID/version mới nhất từ List. Ví dụ version hiện tại là 1:

```powershell
.\scripts\Try-Semesters.ps1 -Mode Delete -SemesterId 'THAY_ID_HOC_KY' -Version 1
.\scripts\Try-Semesters.ps1 -Mode List
```

Kỳ đó không còn trong danh sách. Kỳ có môn sẽ nhận SEMESTER_HAS_COURSES, không xóa cả môn. Xóa CURRENT không tự chuyển một kỳ khác thành CURRENT.

5. Thử tài khoản B: chạy List và nhập thông tin B. B không thấy các kỳ của A, nhưng được tạo cùng kỳ/năm trong tài khoản B. Kiểm tra GET/PUT/DELETE ID của A bằng token B đã có trong test tích hợp, đều nhận 404.

Nếu backend dùng cổng khác, thêm `-BaseUrl 'http://localhost:CONG_BACKEND'`. Nếu chưa có tài khoản, chạy `Try-Auth.ps1 -Mode Register` trước. Khi token hết hạn trong một lần chạy rất lâu, chạy lại lệnh để đăng nhập phiên mới; không cần chép token thủ công.

## Mã nguồn và hợp đồng

- `backend/src/main/java/com/focusstudy/academics/semesters/`: DTO request/response, repository, service, controller và lỗi nghiệp vụ.
- `SemesterEntity` dùng lại bảng cũ; `BaseEntity` cung cấp version/timestamps. `UserRepository` có khóa ghi theo chủ tài khoản để các request đồng thời không tạo nhiều CURRENT hoặc ghi đè phiên bản cũ.
- Chỉ mở các method GET/POST/PUT/DELETE học kỳ có Bearer và phiên hợp lệ. Cookie đơn lẻ không cấp quyền. CSRF cookie vẫn áp dụng ở auth; nghiệp vụ chỉ nhận Bearer. Không mở API courses sớm.
- Cấu hình JSON không tự cắt số thập phân thành số nguyên khi nhập term/startYear/version.
- Chi tiết payload, response và mã lỗi: [hợp đồng học kỳ](../backend/docs/SEMESTERS.md). File request mẫu: `backend/api/semesters.http` (cú pháp biến phản hồi VS Code REST Client; IntelliJ có thể dùng terminal script ở trên).

## Kiểm tra

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Test-Local.ps1
```

Test tạo schema `backend_it_<uuid>` riêng, dùng PostgreSQL thật và dọn đúng schema đó khi xong. Có kiểm tra CRUD, hè tùy chọn, trùng kỳ/năm, hai chủ sở hữu, dữ liệu đầu vào, chuyển CURRENT/rollback, version, kỳ còn môn, yêu cầu đồng thời và script PowerShell 5.1. Test restart đóng/mở toàn bộ Spring Boot ba lần và đọc lại kỳ đã lưu; không chỉ kiểm tra lại trong cùng bộ nhớ ứng dụng. Không seed tài khoản/học kỳ vào schema đang dùng.

Ngày 22/10/2026: **72 tests qua, 0 lỗi/0 bỏ qua**, Maven verify/đóng gói JAR thành công. Trong đó 21 test học kỳ mới; giữ các test nền tảng/auth/phiên cũ và mở rộng test restart để đọc học kỳ qua các lần khởi động. Script PowerShell 5.1 chạy đủ Create → List → Update → Delete với API thật, không in token/mật khẩu. Kết quả ở `backend/target/surefire-reports`, không commit.

Tên commit: **Triển khai API quản lý học kỳ theo tài khoản**. Tiếp theo 3B — API môn học, rồi 3C nối giao diện từng phần.
