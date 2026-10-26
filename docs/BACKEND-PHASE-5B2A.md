# Backend 5B.2A — Lịch sử các lần học cùng môn

Đã có API đọc lịch sử theo tài khoản/môn. Cùng mã và tín chỉ được xếp theo năm học/kỳ; giữ cả lần đạt, trượt và chưa đủ điểm. Khác tín chỉ hoặc khác cấu hình LT/TH có dấu cần đối chiếu. Không tự ghép theo tên hoặc chọn điểm tích lũy.

Giao diện Điểm/Dashboard chưa đổi: nối API ở 5C. Đợt này kiểm tra qua PowerShell/IntelliJ; **không cần tạo lại database**, vẫn V9. Đọc [hợp đồng và nguồn IUH](../backend/docs/COURSE-ATTEMPTS.md) để xem ý nghĩa các nhãn và việc còn phải xác minh trước 5B.2B.

## Chạy và xem dữ liệu

1. Khởi động lại backend bằng `scripts/Run-Local.ps1`, hoặc Run trong IntelliJ như trước. Giữ backend chạy.
2. Trong terminal thứ hai mở ở thư mục `D:\Video OBS\QuanLyHocTap\backend`, chạy:

```powershell
.\scripts\Try-CourseAttempts.ps1 -Mode List
```

Nhập email/mật khẩu tài khoản đã đăng ký. Script chỉ đọc dữ liệu đang có; không tự tạo mẫu. Tài khoản rỗng hiện 0 nhóm/0 lần học.

Muốn xem một mã môn, lấy **id môn** bằng `Try-Courses.ps1 -Mode List`, rồi chạy (thay id thật):

```powershell
.\scripts\Try-CourseAttempts.ps1 -Mode Get -CourseId 'ID_MON_HOC'
```

Nếu backend chạy cổng khác, thêm `-BaseUrl 'http://localhost:CONG_BACKEND'`. Không dùng cổng Expo 8093 cho API. Mẫu IntelliJ ở `backend/api/course-attempts.http`; sao chép vào `.local` trước khi nhập tài khoản/token thật.

## Một vòng kiểm tra dễ thấy

Dùng tài khoản thử riêng nếu muốn tạo dữ liệu; không cần xóa dữ liệu hiện có.

| Thao tác trên app/API đã có | Khi đọc lịch sử phải thấy |
| --- | --- |
| Tạo HK1 năm 2026–2027 và môn WEB101, 3 tín chỉ; nhập LT TK=8/GK=8/CK=0 qua script điểm. | Một nhóm, một lần ghi nhận; kết quả F, hệ 4 bằng 0. |
| Tạo HK2 cùng năm, thêm WEB101 cũng 3 tín chỉ; chưa nhập điểm. | Hai lần trong một nhóm; lần sau `RETAKE_AFTER_FAILED_RESULT`, previousCourseId là môn HK1. |
| Sửa CK lần HK1 từ 0 thành 8 bằng script điểm. | Lần HK1 đạt; ngữ cảnh lần HK2 đổi `FOLLOWUP_AFTER_PASSED_RESULT`. |
| Xóa giá trị CK lần HK1 (để trống/null). | Lần HK2 thành `FOLLOWUP_PREVIOUS_UNRESOLVED`, không tự nhận F. |
| Thêm WEB101 ở kỳ hè, 4 tín chỉ. | Nhóm riêng 4 tín chỉ; cả hai nhóm có `CREDIT_VARIANTS`, không nối chéo. |
| Thêm môn tên giống nhưng mã khác. | Nhóm riêng; không đoán là cùng môn. |
| Thoát/chạy lại backend rồi đọc lại. | Dữ liệu nguồn và lịch sử giữ nguyên; không phải khôi phục từ RAM frontend. |
| Đăng nhập tài khoản B. | Không thấy lịch sử của A; dùng CourseId của A nhận 404. |

Màn Điểm app hiện vẫn RAM, nên ở bước nhập/sửa điểm cho bài test này dùng `Try-GradeConfigurations.ps1`, `Try-GradeScores.ps1` theo [5A.1](BACKEND-PHASE-5A1.md)/[5A.2A](BACKEND-PHASE-5A2A.md). Không suy ra kết quả backend từ điểm chỉ nhập trên UI chưa nối API.

## Kiểm tra tự động

**504 tests/Maven verify qua (27 mới), không lỗi/bỏ qua; TypeScript qua. Gồm 8 test timeline và 19 test HTTP/PowerShell mới; mở rộng restart qua ba lần khởi động, snapshot đồng thời, quyền tài khoản và dữ liệu thiếu/F0. Schema test riêng tự dọn; không seed dữ liệu app, vẫn V9.** Test mới bao gồm mã/tín chỉ/thứ tự kỳ hè, thiếu điểm/F0, ngữ cảnh trước đó, variant cần đối chiếu, quyền tài khoản, thay đổi dữ liệu, snapshot đồng thời, PowerShell 5.1/Unicode/đóng phiên thử và restart. Các tài khoản/schemas kiểm thử riêng tự dọn, không seed vào tài khoản app.

## Git

Tên commit: **Nhận diện lịch sử các lần học cùng môn theo học kỳ**.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Nhận diện lịch sử các lần học cùng môn theo học kỳ"
git push
```
