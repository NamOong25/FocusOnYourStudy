# 5A.1 — Lưu cấu hình bảng điểm theo môn

Đã thêm API và migration V8 để lưu Lý thuyết/Thực hành, bộ cột tùy chỉnh, thứ tự/tên/vai trò, cách quy BTL và phân bổ trọng số từ cấu hình. Có bản DRAFT thiếu cột, version, quyền theo tài khoản và bảo vệ liên kết môn. **Chưa nối màn Điểm của app, chưa lưu giá trị điểm và chưa tính tổng kết/GPA ở backend.** Những việc đó lần lượt thuộc 5A.2, 5B và 5C.

**Đã nghiệm thu:** 357 tests/Maven verify qua (32 mới), không lỗi/bỏ qua; `npm run typecheck` qua. Gồm 31 test tích hợp cấu hình, một test V7 → V8 giữ dữ liệu; test restart hiện có được mở rộng để kiểm tra cấu hình trước/sau khởi động lại. Có thử script Windows PowerShell 5.1 thật (CRUD, UTF-8, lỗi và đóng đúng phiên), ghi đồng thời/snapshot, constraint DB và hồi quy các module trước. Không thay đổi frontend hoặc dependency.

## 1. Khởi động backend

Mở terminal trong VS Code hoặc IntelliJ:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Giữ terminal này chạy. Flyway tự thêm hai bảng `grade_configurations`, `grade_columns`; không cần tạo lại database, không xóa bảng cũ và không thêm dữ liệu vào tài khoản. Nếu chạy bằng IntelliJ, giữ cấu hình DB/khóa đăng nhập như các đợt trước. Dừng backend cũ trước khi chạy lại để cổng 8080 không bị chiếm. Chỉ kiểm thử API đợt này nên chưa cần mở terminal frontend.

## 2. Thử với PowerShell

Mở terminal thứ hai tại thư mục backend. Mỗi lệnh script sẽ hỏi email/mật khẩu và đóng đúng phiên thử mà nó mở, không đăng xuất phiên app của bạn.

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Try-Courses.ps1 -Mode List
```

Chọn một môn thử đã tạo bằng tài khoản thật. Nếu chưa có môn, tạo học kỳ/môn từ app trước. Sao chép `data[].id` của môn, rồi chạy:

```powershell
$mon = Read-Host 'Dán id môn thử của bạn'
.\scripts\Try-GradeConfigurations.ps1 -Mode List -CourseId $mon

Copy-Item .\api\samples\grade-configurations\theory.json .\.local\grade-config-test.json
.\scripts\Try-GradeConfigurations.ps1 -Mode Create -CourseId $mon -InputFile .\.local\grade-config-test.json
```

Kết quả mong đợi: `assessment=THEORY`, `state=READY`, 4 cột với trọng số **10, 10, 30, 50** và `version=0`. Không có `score` hay GPA. Lưu `data.id` của cấu hình (khác ID môn):

```powershell
$cauHinh = Read-Host 'Dán data.id của cấu hình vừa tạo'
.\scripts\Try-GradeConfigurations.ps1 -Mode Get -ConfigurationId $cauHinh
.\scripts\Try-GradeConfigurations.ps1 -Mode Get -CourseId $mon
```

Hai cách đọc trả cùng cấu hình. Nếu gọi Get trước khi tạo, 404 `GRADE_CONFIGURATION_NOT_FOUND` là đúng, backend không tự tạo các cột đề xuất.

## 3. Sửa/xóa/thêm và đổi thứ tự cột

Mở `.local/grade-config-test.json` trong editor. Đổi tên cột, đổi thứ tự mảng `parts`, xóa một cột thường kỳ hoặc thêm một cột có `id` riêng. Giữ nguyên ID khi chỉ sửa cột hiện có. File chỉ có `assessment` và `parts`, không chép nguyên GET response vào file.

```powershell
.\scripts\Try-GradeConfigurations.ps1 -Mode Update -ConfigurationId $cauHinh -Version 0 -InputFile .\.local\grade-config-test.json
.\scripts\Try-GradeConfigurations.ps1 -Mode Get -ConfigurationId $cauHinh
```

Version tăng lên 1; thứ tự/tên/cột đã bỏ/thêm được giữ đúng. Nếu đã sửa nhiều lần, dùng version mới nhất từ Get thay cho 0. Thử gửi lại với version cũ: nhận `GRADE_CONFIGURATION_VERSION_CONFLICT`, dữ liệu mới không bị ghi đè.

Xóa cả nhóm giữa kỳ hoặc cuối kỳ trong file rồi lưu: nhận `state=DRAFT`, `missingGroups` chỉ rõ nhóm thiếu. Trọng số thường kỳ vẫn tổng 20%, không tự tăng lên 100%. Có thể gửi `parts: []`; đó là cấu hình trống, chưa phải bảng điểm hoàn chỉnh.

## 4. Kiểm tra bài tập lớn

Các file mẫu có sẵn (sao chép/sửa bản riêng nếu muốn):

| File trong `api/samples/grade-configurations` | Minh họa |
|---|---|
| `react-project-practice.json` | PRACTICAL: 2 cột thực hành + BTL thay 1 cột; tổng 3 cột, mỗi cột `100/3` %. |
| `www-java-project-final.json` | THEORY: BTL làm toàn bộ cột cuối kỳ; trọng số cuối kỳ toàn môn 50%. |
| `theory-project-partial-final.json` | THEORY: BTL góp 40% vào cột cuối kỳ; không thêm cột FINAL riêng. |
| `draft-empty.json` | Lưu bản cấu hình lý thuyết trống đang thiết lập. |

Ví dụ chuyển cấu hình thử sang React (lấy version mới nhất):

```powershell
$phienBan = Read-Host 'Dán version mới nhất từ Get'
.\scripts\Try-GradeConfigurations.ps1 -Mode Update -ConfigurationId $cauHinh -Version $phienBan -InputFile .\api\samples\grade-configurations\react-project-practice.json
```

BTL ở đây **thay một cột**, không cộng thêm một điểm BTL nữa. Nếu BTL góp vào cuối kỳ, tỷ lệ nằm trong cột cuối kỳ; giá trị điểm BTL và điểm phần còn lại sẽ nhập ở 5A.2. Các mẫu minh họa cách cấu hình, không khẳng định đề cương mọi lớp. Với WWW Java, chọn đúng loại học phần của lớp; nếu là thực hành phải đổi assessment và các cột tương ứng. Không suy cách tính từ tên môn.

## 5. Kiểm tra lưu thật và phân quyền

1. Get cấu hình, ghi nhớ cột/tỷ lệ/version. Dừng backend bằng Ctrl+C, chạy lại `Run-Local.ps1`, Get lại: dữ liệu vẫn giống trước.
2. Dùng tài khoản thứ hai với cùng ID: Get/Update/Delete trả 404; List không có cấu hình của tài khoản thứ nhất.
3. Tạo cấu hình lần nữa cho cùng môn: 409 `GRADE_CONFIGURATION_ALREADY_EXISTS`, bản cũ còn nguyên.
4. Gửi cột thực hành vào THEORY hoặc cột thường kỳ lý thuyết vào PRACTICAL: 400. BTL→PRACTICE chỉ nhận PRACTICAL và share=100.
5. Có cả FINAL và BTL→FINAL, hoặc hai cột giữa kỳ trong THEORY: 400. Bộ cột trước đó và version vẫn nguyên.
6. Khi môn còn cấu hình, thử xóa/chuyển môn sang kỳ khác: 409 `COURSE_HAS_GRADE_CONFIGURATION`. Đổi tên môn trong cùng kỳ vẫn được.

`READY` chỉ nói cấu trúc đủ nhóm. Nó không có nghĩa qua môn hay đã tính GPA. Màn Điểm và Dashboard chưa được nối dữ liệu này trong đợt 5A.1.

Muốn dọn cấu hình thử, lấy version mới nhất và chủ động chạy:

```powershell
.\scripts\Try-GradeConfigurations.ps1 -Mode Get -ConfigurationId $cauHinh
$phienBan = Read-Host 'Dán version mới nhất từ Get'
.\scripts\Try-GradeConfigurations.ps1 -Mode Delete -ConfigurationId $cauHinh -Version $phienBan
```

Chỉ cấu hình/cột của cấu hình bị xóa; môn, bài tập và lịch giữ nguyên. Có thể tạo lại cho môn đó với ID cấu hình mới. Khi request ghi mất phản hồi mạng, dùng List/Get kiểm tra trước khi tự gửi lại.

## 6. Thử bằng IntelliJ

Mở project backend như trước và chạy ứng dụng. Sao chép file HTTP vào `.local` trước khi điền thông tin thật:

```powershell
Copy-Item .\api\grade-configurations.http .\.local\grade-configurations.http
```

Mở bản sao trong IntelliJ HTTP Client, chạy từng request: đăng nhập → lấy `data.accessToken` → danh sách môn → tạo cấu hình → lấy `data.id`/`data.version` → Get → Put → Get lại. Cập nhật biến `@version` sau mỗi lần lưu. Cuối buổi dùng request logout với `data.refreshToken` của chính phiên thử. Nếu IDE chưa hỗ trợ HTTP Client, dùng script PowerShell ở trên.

Hợp đồng API: [GRADE-CONFIGURATIONS.md](../backend/docs/GRADE-CONFIGURATIONS.md). Bộ kiểm thử dùng schema riêng và tự dọn, không ghi dữ liệu thử vào tài khoản app. Chạy lại toàn bộ:

```powershell
.\scripts\Test-Local.ps1
```

## Commit

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Lưu cấu hình bảng điểm và cách quy bài tập lớn theo môn"
git push
```
