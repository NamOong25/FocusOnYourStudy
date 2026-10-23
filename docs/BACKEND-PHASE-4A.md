# 4A — API quản lý bài tập

Đã thêm bảng `assignments` và API thêm/xem/sửa/xóa theo tài khoản, lọc môn/học kỳ/trạng thái, deadline có ngày/giờ/múi giờ và version chống ghi đè. Môn còn bài bị chặn xóa/chuyển kỳ. **Giao diện bài tập chưa nối API**, sẽ làm ở 4B; bài bạn nhập trên UI hiện vẫn là dữ liệu thử trong bộ nhớ.

## Chạy để xem

Mở Terminal trong VS Code, IntelliJ hoặc PowerShell đều được. Terminal 1:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Giữ terminal này chạy. Lần đầu sau cập nhật, Flyway tự thêm bảng qua V3; không cần tự tạo bảng, xóa database hoặc sửa các migration cũ. Tài khoản/học kỳ/môn đã có vẫn giữ nguyên.

Trong **terminal thứ hai**, cũng tại thư mục backend, lấy ID một môn đã lưu:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Try-Courses.ps1 -Mode List
```

Nhập email/mật khẩu tài khoản bạn đã đăng ký. Nếu chưa có môn, tạo một môn bằng giao diện 3C.2 rồi chạy lại List. ID môn là trường `id` của môn, không phải `semesterId`.

## Một vòng test List → Create → Get → Update → Delete

Các lệnh dưới đây chạy tại terminal thứ hai. Mỗi lần chạy script sẽ hỏi email/mật khẩu; mật khẩu nhập ẩn, script dùng một phiên riêng và đăng xuất phiên đó khi xong. Phiên đang đăng nhập trên app vẫn giữ nguyên.

**1. Xem danh sách bài**

```powershell
.\scripts\Try-Assignments.ps1 -Mode List
```

`"data": []` nghĩa là tài khoản chưa có bài lưu trên backend; đây là kết quả bình thường.

**2. Tạo một bài gắn vào môn**

```powershell
$courseId = Read-Host 'Dán id môn học từ kết quả Try-Courses List'
.\scripts\Try-Assignments.ps1 -Mode Create -CourseId $courseId -Title 'Báo cáo Web Java' -DueAt '2026-10-30T23:59:00+07:00' -Priority HIGH -Status TODO -Notes 'Kiểm tra trước khi nộp'
```

Kết quả có `id` của bài, `courseId` và `version` ban đầu. `dueAt` trả `2026-10-30T16:59:00Z`, chính là **23:59 giờ Việt Nam**, không phải bị lệch. Không gửi lại Create chỉ vì muốn xem; dùng List/Get vì mỗi Create là một bài mới.

**3. Đọc lại bài vừa tạo**

```powershell
$assignmentId = Read-Host 'Dán id bài tập vừa tạo'
.\scripts\Try-Assignments.ps1 -Mode Get -AssignmentId $assignmentId
.\scripts\Try-Assignments.ps1 -Mode List -CourseId $courseId -FilterStatus TODO
```

Có thể lọc thêm `-SemesterId` bằng ID kỳ của bạn. Bài không nằm trong cả hai bộ lọc sẽ không xuất hiện.

**4. Sửa bài — dùng version mới nhất từ Get**

```powershell
$version = Read-Host 'Dán version mới nhất của bài từ Get'
.\scripts\Try-Assignments.ps1 -Mode Update -AssignmentId $assignmentId -Version $version -CourseId $courseId -Title 'Báo cáo Web Java' -DueAt '2026-10-30T23:59:00+07:00' -Priority HIGH -Status IN_PROGRESS -Notes 'Đã bắt đầu làm'
```

PUT là thay toàn bộ; cần gửi lại tên, môn, deadline và những trường muốn giữ. Trường tùy chọn bỏ đi trở về mặc định. Lấy Get sau khi sửa để xem version mới. Thử gửi lại Update với version cũ: phải báo `ASSIGNMENT_VERSION_CONFLICT`, dữ liệu mới vẫn còn. Lấy bản mới rồi quyết định sửa tiếp.

**5. Kiểm tra dữ liệu sau khởi động lại**

Trước khi xóa bài: Ctrl+C ở terminal backend → chạy lại `Run-Local.ps1` → chạy Get/List trong terminal thứ hai. Bài vẫn còn trong PostgreSQL. Không cần bật frontend để kiểm tra bước này.

**6. Xóa bài khi đã kiểm tra xong**

```powershell
.\scripts\Try-Assignments.ps1 -Mode Get -AssignmentId $assignmentId
$version = Read-Host 'Dán version mới nhất trước khi xóa'
.\scripts\Try-Assignments.ps1 -Mode Delete -AssignmentId $assignmentId -Version $version
.\scripts\Try-Assignments.ps1 -Mode List -CourseId $courseId
```

Bài đã xóa không xuất hiện lại; môn và học kỳ vẫn còn. Nếu gặp lỗi mạng khi ghi, chạy List/Get để kiểm tra trước khi gửi lại, vì server có thể đã lưu dù phản hồi bị mất.

## Kiểm tra quyền và liên kết

- Tạo bài bằng tài khoản A, chạy Get/Update/Delete với tài khoản B: phải trả `ASSIGNMENT_NOT_FOUND`, danh sách B không có bài A. Dùng courseId/semesterId của A làm bộ lọc từ B cũng trả 404.
- Tạo bài với môn của tài khoản khác hoặc ID môn không tồn tại: `COURSE_NOT_FOUND`, không ghi bài.
- Khi môn còn bài, xóa hoặc chuyển kỳ môn bằng API 3B sẽ báo `COURSE_HAS_ASSIGNMENTS`. Trên UI môn 3C.2 cũng hiển thị thông báo này khi backend từ chối. Đổi tên/giảng viên trong cùng kỳ vẫn được.
- Bài hoàn thành vẫn được giữ và bảo vệ môn. Xóa hoặc chuyển hết bài sang môn khác của chính mình thì môn cũ mới xóa/chuyển kỳ được.
- Truy cập trực tiếp URL `/api/v1/assignments` bằng trình duyệt thường không có Bearer nên trả 401. Script phía trên giúp đăng nhập và gửi token; trang health chỉ kiểm tra kết nối.

## Phạm vi và kỹ thuật

- V3 chỉ thêm bảng/index/constraint bài tập. FK ghép bảo vệ chủ sở hữu; không xóa dây chuyền. Ghi bài, môn và kỳ dùng cùng khóa hàng chủ tài khoản để tránh mất liên kết khi request chạy đồng thời.
- Chấp nhận deadline đã qua để nhập bài cũ; không tự đổi status thành hoàn thành. Priority MEDIUM/HIGH và status TODO/IN_PROGRESS/COMPLETED theo UI hiện tại.
- Hợp đồng và các giới hạn ngày giờ: `../backend/docs/ASSIGNMENTS.md`; mẫu request dùng với REST Client/IntelliJ HTTP Client: `../backend/api/assignments.http`.
- Chưa có checklist/tệp, buổi tự học backend, thông báo hệ thống hoặc tổng hợp Dashboard từ bài thật. Khi thêm các bảng con sẽ bổ sung guard cho đổi môn/xóa bài.
- Không seed tài khoản/dữ liệu demo vào database của bạn; test tự động dùng schema ngẫu nhiên riêng rồi dọn schema đó.

Chạy kiểm thử toàn bộ backend:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Test-Local.ps1
```

Kiểm tra không yêu cầu Docker hoặc Maven cài toàn máy. Kết quả JUnit ở `backend/target/surefire-reports`, ngoài Git. Các test bao gồm migration V2 → V3 trên dữ liệu cũ, CRUD/lọc, hai tài khoản, validation, offset UTC, version, request đồng thời, script Windows PowerShell 5.1 và đọc bài sau khi đóng/mở lại backend.

Kết quả ngày 23/10/2026: **118 tests qua, không lỗi/bỏ qua; Maven verify đóng gói JAR thành công**. Trong đó 26 test mới cho bài tập/migration; test restart đã mở/đóng toàn backend ba lần và đọc lại đúng bài, môn, học kỳ/phiên. TypeScript, 15 nhóm HTTP tài khoản và 29 nhóm API/trạng thái/liên kết môn frontend qua. Các test đã dọn schema riêng; không áp dụng dữ liệu QA vào tài khoản của bạn. Giao diện bài tập và thiết bị thật chưa nghiệm thu trong đợt này.

Tên commit: **Triển khai API quản lý bài tập theo môn học**. Giao diện bài tập sẽ nối ở **4B**; 2C.3B máy thật vẫn để sau theo lựa chọn trước.
