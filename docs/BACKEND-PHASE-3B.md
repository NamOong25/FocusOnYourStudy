# Backend 3B — Môn học theo học kỳ

Đã có API thêm/xem/sửa/xóa môn, lọc theo học kỳ và lưu PostgreSQL. Dùng bảng courses V1, không sửa migration cũ hoặc seed vào schema đang dùng. **Giao diện học kỳ/môn chưa gọi API**; dữ liệu tạo trên UI vẫn trong bộ nhớ. Nối UI ở 3C; kiểm tra điện thoại 2C.3B vẫn để làm sau.

## Test bằng PowerShell

Khởi động lại backend để nhận API mới, giữ terminal đó chạy:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Mở terminal thứ hai ở folder backend. Không cần frontend cho đợt test này. Mỗi lệnh hỏi email/mật khẩu nhập ẩn; không cần chép token. Script tự đóng riêng phiên thử, không đăng xuất các phiên khác.

### 1. Lấy ID học kỳ đã lưu

```powershell
.\scripts\Try-Semesters.ps1 -Mode List
```

Chép `id` của kỳ muốn thêm môn. Nếu `data: []`, tạo kỳ trước bằng hướng dẫn 3A. **ID phải từ API/database, không dùng ID trong dữ liệu thử frontend.** Các chuỗi `THAY_ID_...` bên dưới phải thay bằng UUID thật.

### 2. Thêm môn

```powershell
.\scripts\Try-Courses.ps1 -Mode Create -SemesterId 'THAY_ID_HOC_KY' -Code 'web101' -Name 'Lập trình Web' -Credits 3 -Teacher 'Giảng viên A' -Room 'A101'
```

Mong đợi có ID môn, code `WEB101`, đúng semesterId/tín chỉ/giảng viên/phòng, version ban đầu. Tạo lại cùng mã trong kỳ đó nhận COURSE_ALREADY_EXISTS. Cùng mã ở kỳ khác được phép.

### 3. Xem và thử mở lại backend

```powershell
.\scripts\Try-Courses.ps1 -Mode List
.\scripts\Try-Courses.ps1 -Mode List -SemesterId 'THAY_ID_HOC_KY'
.\scripts\Try-Courses.ps1 -Mode Get -CourseId 'THAY_ID_MON_HOC'
```

List không có SemesterId lấy toàn bộ môn của mình; có SemesterId chỉ lấy kỳ đó. Dừng backend bằng Ctrl+C, chạy lại Run-Local và List/Get lần nữa: môn phải vẫn còn, cùng ID và các trường đã lưu.

### 4. Sửa

Lấy version mới nhất từ List/Get, ví dụ đang là 0:

```powershell
.\scripts\Try-Courses.ps1 -Mode Update -CourseId 'THAY_ID_MON_HOC' -Version 0 -SemesterId 'THAY_ID_HOC_KY' -Code 'WEB101' -Name 'Lập trình Web' -Credits 3 -Teacher 'Giảng viên A' -Room 'B202' -Color mint -Description 'Đã cập nhật qua API'
```

PUT thay toàn bộ trường; gửi lại giá trị muốn giữ. Ví dụ quên Teacher thì giảng viên được đặt rỗng, không tự giữ giá trị cũ. Phòng chuyển B202, description thay đổi, version tăng nếu có thay đổi. Cố sửa/xóa bằng version cũ nhận COURSE_VERSION_CONFLICT, dữ liệu mới được giữ.

Muốn chuyển kỳ: thay SemesterId bằng kỳ khác của mình, giữ các trường khác. Kỳ đích có cùng mã thì bị chặn; không thay đổi môn gốc. Chưa có backend bài/lịch/điểm để kiểm tra liên kết khi chuyển/xóa, nên phải bổ sung các chặn tương ứng ở 4/5.

### 5. Xóa môn thử

Lấy version mới nhất, ví dụ 1:

```powershell
.\scripts\Try-Courses.ps1 -Mode Delete -CourseId 'THAY_ID_MON_HOC' -Version 1
.\scripts\Try-Courses.ps1 -Mode List
```

Môn đó không còn, học kỳ và các môn khác vẫn còn. Học kỳ còn bất kỳ môn nào vẫn bị Try-Semesters Delete chặn. Sau khi xóa hết môn của kỳ trống thì mới xóa được kỳ.

### 6. Hai tài khoản

Chạy List/Get bằng tài khoản B: B không thấy môn của A. Lọc SemesterId của A, tạo/chuyển vào kỳ A hoặc Get/Update/Delete CourseId của A đều bị chặn 404. B vẫn được tạo cùng mã trong kỳ của chính B.

Nếu cổng backend khác 8080, thêm `-BaseUrl 'http://localhost:CONG_BACKEND'`. Sai thông tin đăng nhập hoặc API lỗi có mã lỗi rõ; không cần xóa database.

## Kiểm tra tự động

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Test-Local.ps1
```

`CourseIntegrationTests` dùng PostgreSQL thật/schema `backend_it_<uuid>` riêng và HTTP thật: dữ liệu trống/CRUD/chuẩn hóa, validation, quyền hai người, cùng mã qua kỳ khác, version và chuyển kỳ, request đồng thời tạo/sửa/chuyển/xóa kỳ, CORS/Bearer/cookie và script PowerShell 5.1. Test restart đóng/mở toàn bộ backend ba lần rồi đọc lại cả kỳ và môn. Schema test được dọn đúng phạm vi, không seed vào schema người dùng.

Ngày 23/10/2026: **92 tests qua, 0 lỗi/0 bỏ qua**, Maven verify/đóng gói JAR thành công. Trong đó có 20 test môn học mới; giữ các test nền tảng/auth/phiên/học kỳ và mở rộng test restart để đọc môn. Script PowerShell 5.1 chạy Create → List có lọc kỳ → Get → Update → Delete với API thật, không in token/mật khẩu và đóng riêng phiên thử. Báo cáo ở `backend/target/surefire-reports`, không commit.

Hợp đồng: [COURSES.md](../backend/docs/COURSES.md). File mẫu REST Client: `backend/api/courses.http`; cú pháp biến phản hồi theo VS Code REST Client, còn IntelliJ có thể dùng terminal script phía trên.

Tên commit: **Triển khai API quản lý môn học theo học kỳ**. Tiếp theo 3C nối giao diện học kỳ trước rồi môn, theo từng đợt nhỏ; lúc đó mới nghiệm thu tải lại app vẫn có dữ liệu học tập đã lưu.
