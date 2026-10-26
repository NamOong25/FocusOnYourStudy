# 5B.1 — GPA học kỳ ở backend

Đã có API tính GPA theo tín chỉ từ kết quả môn 5A.2B, tính cả F đã đủ điểm, tách môn chưa đủ dữ liệu, phân biệt tín chỉ tính GPA/đã đạt/trượt/chưa được tính. Học kỳ còn thiếu kết quả có nhãn PARTIAL; chưa có kết quả thì gpa=null, khác GPA 0 của toàn môn F. Chưa tính GPA tích lũy/học lại (5B.2), chưa nối màn Điểm/Dashboard (5C).

Không thêm migration, vẫn V9; không seed dữ liệu vào tài khoản. Chỉ đọc và tính, không tự cập nhật trạng thái học kỳ/môn hoặc tạo số GPA lưu sẵn.

**Đã nghiệm thu:** 477 tests/Maven verify qua (29 mới), không lỗi/bỏ qua; `npm run typecheck` qua. Gồm 8 test phép tính và 21 test HTTP/PowerShell mới; test restart hiện có mở rộng cho GPA. Có ví dụ tính tay, F/thiếu điểm/0-null, khác tín chỉ, hai tài khoản/học kỳ, kỳ hè, cập nhật điểm/tín chỉ, đọc chỉ định không đổi version và snapshot đồng thời. Windows PowerShell 5.1 thật hiển thị đúng tiếng Việt, phân biệt GPA 0/trống và đóng đúng phiên thử.

## 1. Khởi động và chọn học kỳ

Terminal thứ nhất, VS Code hoặc IntelliJ:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Khởi động lại backend cũ để nạp code mới, giữ terminal chạy. Chưa cần frontend để nghiệm thu đợt này. Terminal thứ hai:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Try-Semesters.ps1 -Mode List
$hocKy = Read-Host 'Dán data[].id của học kỳ muốn kiểm tra'
.\scripts\Try-SemesterGpa.ps1 -SemesterId $hocKy
```

Dùng **ID học kỳ**, khác ID môn và cấu hình điểm. Mỗi script hỏi email/mật khẩu, chỉ đóng phiên thử nó mở, không đăng xuất phiên app.

Trong response, xem `data.summary` và `data.courses`. `data.semester` phải đúng học kỳ đã chọn. Nếu kỳ chưa có môn: EMPTY, gpa=null. Có môn nhưng chưa có kết quả hoàn chỉnh: NO_RESULTS, gpa=null.

## 2. Chuẩn bị một ví dụ tính tay

Dùng ba môn thử trong **cùng học kỳ**, nhập qua API môn/cấu hình/điểm như các đợt 3B, 5A.1, 5A.2A. Dùng đúng mã cột từ file Export; nếu dùng nhiều cột thường kỳ thì nhập cùng điểm TK cho các cột đó.

| Môn thử | Tín chỉ | TK / GK / CK lý thuyết | Kết quả môn |
|---|---:|---|---|
| A | 3 | 8 / 8 / 8 | 8,0 → B+ → hệ 4 = 3,5 |
| B | 2 | 8,5 / 8,5 / 8,5 | 8,5 → A → hệ 4 = 3,8 |
| C | 1 | 8 / 8 / 0 | F, tổng kết 0, hệ 4 = 0 |

Ở môn C giữ GK=8; không đặt tất cả thành 0 vì GK=0 sẽ thuộc trường hợp chặn thi/chưa có tổng kết của 5A.2B.

Đọc lại:

```powershell
.\scripts\Try-SemesterGpa.ps1 -SemesterId $hocKy
```

Mong đợi:

- gpa=**3.02**, weightedGradePoints=18.1.
- calculatedCredits=6, earnedCredits=5, failedCredits=1, excludedCredits=0.
- calculatedCourses=3, passedCourses=2, failedCourses=1, state=COMPLETE.
- Môn C included=true, gradePoint=0, weightedGradePoints=0.

Phép tính: `(3×3.5 + 2×3.8 + 1×0)/6 = 3.01666… → 3.02`. Không bỏ tín chỉ môn F hoặc lấy trung bình ba điểm hệ 4 đơn giản.

## 3. Kiểm tra môn chưa đủ dữ liệu

Thêm môn D 3 tín chỉ vào cùng kỳ nhưng chưa tạo cấu hình điểm rồi đọc lại:

- registeredCredits=9, calculatedCredits vẫn 6, excludedCredits=3.
- gpa vẫn 3.02 nhưng **state=PARTIAL, complete=false**.
- Môn D included=false, exclusionReason=NO_CONFIGURATION.

Tạo cấu hình rồi để điểm trống: lý do đổi thành INCOMPLETE_SCORES. Thiếu nhóm thường kỳ/giữa kỳ/cuối kỳ: INCOMPLETE_CONFIGURATION. GK=0: EXAM_BLOCKED. BTL cần phần còn lại mà remainderScore=null cũng chưa được tính.

Trường hợp CK=2,9 đã biết không đạt nhưng TK còn trống: môn có thể resultStatus=FAILED, song chưa có điểm hệ 4 đầy đủ nên vẫn excluded; không cộng vào failedCourses của GPA.

Muốn học kỳ chỉ có một số kết quả để thử, có thể giữ các môn khác trống; API nêu rõ GPA đang dựa trên phần đã đủ dữ liệu.

## 4. Kiểm tra GPA 0 khác chưa có GPA

Trong học kỳ thử riêng, tạo một môn hoặc nhiều môn F hoàn chỉnh (TK/GK=8, CK=0). Mong đợi gpa=0.00, state=COMPLETE, calculatedCredits lớn hơn 0, earnedCredits=0.

Đổi điểm về null qua script 5A.2A: nếu không còn môn đủ kết quả, gpa=null, state=NO_RESULTS. Không dùng 0 để xóa điểm. Script in được “GPA học kỳ: 0.00 / 4” khi là điểm 0 thật.

## 5. Tín chỉ và thay đổi dữ liệu

1. Sửa tín chỉ một môn bằng API môn trong cùng kỳ, rồi đọc GPA: mẫu số/tử số đổi theo tín chỉ mới. `courseVersion` tăng; `gradeVersion` không nhất thiết tăng.
2. Sửa điểm môn từ đạt sang F: môn vẫn vào mẫu số, earnedCredits giảm, failedCredits tăng.
3. Xóa điểm về null: môn chuyển excluded, không giữ đóng góp GPA cũ.
4. Đổi tên/đổi thứ tự cột: không gắn nhầm điểm hoặc đếm môn hai lần. Guard cột có điểm từ 5A.2A vẫn áp dụng.
5. Đổi trạng thái môn thành COMPLETED không tự tạo điểm. Môn PLANNED nhưng đã nhập đủ kết quả vẫn được tính theo dữ liệu điểm.
6. Tạo môn cùng mã ở kỳ khác hoặc tài khoản khác: không ảnh hưởng GPA kỳ đang chọn. Hai môn cùng tên nhưng khác ID/code vẫn được tính riêng.
7. Học kỳ 3 (Hè) tính như kỳ được chọn khác; không tự tạo hay bắt buộc có kỳ hè.

## 6. Tải lại, phân quyền và dữ liệu đồng thời

Dừng/chạy lại backend rồi Get GPA: cùng dữ liệu cho cùng kết quả. GET nhiều lần không tăng version học kỳ/môn/điểm. Dùng tài khoản khác với cùng SemesterId: 404 SEMESTER_NOT_FOUND, giống ID không tồn tại.

Thông tin học kỳ/môn/tín chỉ/điểm được đọc cùng snapshot. `semester.version` không phải version của GPA; điểm hoặc tín chỉ đổi có thể làm GPA đổi trong khi semester.version giữ nguyên. Dùng các courseVersion/gradeVersion trong từng dòng để đối chiếu nguồn.

## 7. IntelliJ

```powershell
Copy-Item .\api\semester-gpa.http .\.local\semester-gpa.http
```

Mở bản sao: đăng nhập → lấy accessToken → danh sách học kỳ → chọn semesterId → GET GPA. Kết thúc bằng logout refreshToken của phiên thử. Không commit thông tin đăng nhập thật. Nếu IDE chưa có HTTP Client, dùng PowerShell.

Hợp đồng: [SEMESTER-GPA.md](../backend/docs/SEMESTER-GPA.md). Thang điểm hệ 4 và làm tròn hai chữ số tham chiếu [nguồn IUH 2023, trang PDF 68](https://fce.iuh.edu.vn/wp-content/uploads/2023/10/2023_FCE_faculty_manual.pdf#page=68). Phạm vi hiện là môn THEORY/PRACTICAL đã nhập; chưa tự suy các môn P/miễn/chuyển điểm hoặc trường hợp đặc thù từ tên môn. GPA tích lũy/học lại và nối UI vẫn ở 5B.2/5C.

Kiểm thử dùng schema riêng và tự dọn, không seed vào tài khoản app. Chạy toàn bộ qua `backend/scripts/Test-Local.ps1`.

## Commit

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Tính GPA học kỳ theo tín chỉ và tách môn chưa đủ điểm"
git push
```
