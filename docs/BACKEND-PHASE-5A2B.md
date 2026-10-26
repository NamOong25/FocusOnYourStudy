# 5A.2B — Tính kết quả môn từ điểm đã lưu

Đã thêm GET kết quả môn, tính bằng BigDecimal theo profile có nguồn IUH 2023: BTL, thiếu điểm, chặn thi theo giữa kỳ, tổng kết, điểm chữ/hệ 4 của môn và dấu cần xử lý học lại. Đọc cấu hình/điểm/tín chỉ cùng snapshot, kết quả tự đổi khi sửa điểm. Không lưu số kết quả sẵn, không thêm migration (vẫn V9), không seed dữ liệu hoặc đổi giao diện. GPA học kỳ/tích lũy ở 5B, nối màn Điểm/Dashboard ở 5C.

**Đã nghiệm thu:** 448 tests/Maven verify qua (58 mới), không lỗi/bỏ qua; `npm run typecheck` qua. Gồm 42 test BigDecimal/công thức/ngưỡng/BTL và 16 test HTTP/PowerShell mới; mở rộng test restart, kiểm tra snapshot/ownership/GET chỉ đọc, giữ dữ liệu/version và hồi quy các module trước. Script Windows PowerShell 5.1 hiển thị đúng tiếng Việt và đóng đúng phiên thử.

## 1. Chạy backend và chọn môn thử

Terminal thứ nhất, VS Code hoặc IntelliJ:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Giữ terminal chạy. Khởi động lại backend cũ để nạp code mới. Đợt này không cần chạy frontend. Terminal thứ hai:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Try-GradeConfigurations.ps1 -Mode List
$cauHinh = Read-Host 'Dán data[].id của cấu hình môn thử'
.\scripts\Try-GradeResults.ps1 -ConfigurationId $cauHinh
```

Nếu chưa có cấu hình/điểm, làm theo [5A.1](BACKEND-PHASE-5A1.md) và [5A.2A](BACKEND-PHASE-5A2A.md). Mỗi script hỏi email/mật khẩu và chỉ đóng phiên thử nó mở, không đăng xuất phiên app.

Trong response xem `data.scores` là dữ liệu gốc, `data.result` là kết quả và `data.policy` là nguồn/cách tính. `scores.version` thuộc điểm/cấu hình; `courseVersion` thuộc thông tin môn. Điểm mới trống phải cho `INCOMPLETE_SCORES` hoặc cấu hình chưa đủ cho `INCOMPLETE_CONFIGURATION`, total/letter/gradePoint null.

## 2. Nhập điểm và đọc kết quả

Lấy file mới theo 5A.2A:

```powershell
.\scripts\Try-GradeScores.ps1 -Mode Export -ConfigurationId $cauHinh -OutputFile .\.local\diem-test-ket-qua-01.json
```

Mở file trong editor, giữ version/mã cột, sửa score của **đủ bộ cột** rồi:

```powershell
.\scripts\Try-GradeScores.ps1 -Mode Update -ConfigurationId $cauHinh -InputFile .\.local\diem-test-ket-qua-01.json
.\scripts\Try-GradeResults.ps1 -ConfigurationId $cauHinh
```

Mỗi lần thử tiếp, Export sang tên file mới vì version đã tăng. Không gửi lại bản cũ hoặc chỉ sửa version để đè lên dữ liệu chưa đối chiếu. Get kết quả không tăng version.

## 3. Một vòng kiểm tra lý thuyết

Dùng bộ cột lý thuyết đầy đủ: thường kỳ, giữa kỳ, cuối kỳ. Nếu có nhiều cột thường kỳ, nhập cùng một giá trị TK cho tất cả cột trong các ví dụ dưới. Các cột thường không dùng remainderScore, giữ null.

| Thử | Điểm TK / GK / CK | Mong đợi trong data.result |
|---|---|---|
| Bình thường | 8 / 8 / 8,5 | total=8,3; letter=B+; gradePoint=3,5; passed=true. |
| Cuối kỳ dưới ngưỡng | 10 / 10 / 2,9 | weightedTotal=6,45 nhưng total=2,9; F; needsRetake=true. |
| Cuối kỳ vừa đủ 3 | 10 / 10 / 3 | total=6,5; C+; passed=true. |
| Chặn thi | 8 / 0 / 8 | EXAM_BLOCKED; total/letter/gradePoint/passed/needsRetake null. |
| Chưa có giữa kỳ | 8 / null / 8 | INCOMPLETE_SCORES, examEligibility=UNKNOWN, không tự gán F. |
| Biết CK thấp, còn thiếu TK | null / 8 / 2,9 | FAILED do FINAL_BELOW_3; needsRetake=true nhưng total/letter/gradePoint null. |
| Qua môn tại biên | 4 / 4 / 4 | total=4,0; D; hệ 4=1,0. |
| Chưa qua môn | 3,9 / 3,9 / 3,9 | total=3,9; F; needsRetake=true. |

JSON dùng dấu chấm (8.5), null không có dấu ngoặc kép. `needsRetake` null lúc chặn thi nói rằng chưa có kết luận tổng kết; backend báo rõ điều kiện thi, không tự tạo điểm chính thức hoặc đăng ký học lại.

## 4. Bài tập lớn

Chọn đúng cấu hình đã lập ở 5A.1; nhập qua file Export của đúng môn:

- **BTL làm toàn bộ cuối kỳ:** score là điểm BTL, remainderScore=null. Ví dụ TK=8/GK=8/BTL=9 → tổng 8,5, A, hệ 4=3,8.
- **BTL góp 40% cuối kỳ:** score=8, remainderScore=6 → effectiveScore cuối kỳ 6,8. TK=GK=8 → tổng 7,4. BTL được quy vào một cột, không cộng lại lần hai.
- Bỏ remainderScore về null khi BTL cần phần còn lại: tổng kết trống, missingScores chỉ rõ REMAINDER_SCORE của cột BTL. Dùng 0 thì đó là điểm thật.
- **Thực hành:** 6/8/10, trong đó BTL thay cột thứ ba → trung bình 8,0. Nếu bộ 3 cột của môn từ 3 tín chỉ thì hiện notice khác gợi ý 5 cột; vẫn tính bộ người dùng đã chọn.

Giá trị/BTL dùng đúng đề cương lớp. Công thức thông thường không mặc định BTL luôn chiếm 50% toàn môn. Khi BTL góp một phần cuối kỳ, backend làm tròn điểm cột cuối kỳ đến một chữ số trước xét ngưỡng và tổng kết.

## 5. Thử trung bình thường kỳ và làm tròn

Với hai cột thường kỳ 7,9 và 8, GK=7,5, CK=8: backend tạo TB thường kỳ 8,0; tổng chưa làm tròn là 7,85; tổng kết 7,9. Đây là bước tổng hợp thành phần TK theo nguồn mục 6.1. Một cột TK duy nhất được hiểu là trung bình đã công bố và dùng trực tiếp, có notice để nêu rõ.

Nguồn [IUH năm 2023](https://fce.iuh.edu.vn/wp-content/uploads/2023/10/2023_FCE_faculty_manual.pdf), trang PDF 55–58/68, đã đọc cả nội dung và bảng gốc. Profile ghi rõ năm; không tự áp bản năm 2025 cho K19. Điểm người dùng nhập được xem là điểm đã công bố, không bị chấm/làm tròn nửa điểm lại trong database.

**Màn Điểm/Dashboard hiện chưa đọc API kết quả này.** Hàm frontend cũ có thể khác ở biên làm tròn trung bình nhiều cột; 5C sẽ lấy backend làm nguồn. Thử đợt này bằng script/HTTP, chưa dùng số trên Dashboard RAM để nghiệm thu.

## 6. Dữ liệu thay đổi, tải lại và quyền truy cập

1. Get kết quả, đổi điểm bằng /scores rồi Get lại: kết quả mới đi cùng `scores.version` mới.
2. Xóa điểm bằng null: trạng thái chuyển chưa đủ dữ liệu, không giữ số kết quả cũ.
3. Đổi tên/thứ tự cột: điểm và kết quả không gắn nhầm cột. Cột có điểm vẫn chịu guard của 5A.2A.
4. Dừng/chạy lại backend: điểm và kết quả tính lại giống trước.
5. Dùng tài khoản khác với cùng ID hoặc cấu hình đã xóa: 404.
6. GET nhiều lần: không thay version/cấu hình/trạng thái môn. Kết quả là phép tính, không phải thao tác ghi.

`gradePoint` là hệ 4 của một môn. Chưa có GPA học kỳ/tích lũy hoặc chính sách chọn lần học lại trong đợt này.

## 7. IntelliJ HTTP Client

```powershell
Copy-Item .\api\grade-results.http .\.local\grade-results.http
```

Mở bản sao: đăng nhập → lấy accessToken → danh sách cấu hình → Get result. Nhập điểm bằng `grade-scores.http` hoặc script 5A.2A, rồi Get result lại. Cuối buổi logout refreshToken của phiên thử. Nếu IDE chưa hỗ trợ HTTP Client, dùng PowerShell.

Hợp đồng chi tiết: [GRADE-RESULTS.md](../backend/docs/GRADE-RESULTS.md). Chạy lại kiểm thử toàn backend bằng `backend/scripts/Test-Local.ps1`; các test dùng schema riêng và tự dọn, không seed vào tài khoản app.

## Commit

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Tính kết quả môn theo điểm đã lưu và quy tắc IUH"
git push
```
