# GPA học kỳ — 5B.1

`GET /api/v1/semesters/{semesterId}/gpa` tổng hợp kết quả của các môn trong đúng học kỳ và tài khoản. Cần Bearer token của phiên đang hoạt động. Học kỳ thiếu/đã xóa/khác chủ đều trả 404 `SEMESTER_NOT_FOUND`; ID sai định dạng trả 400. Chỉ cho GET, không nhận GPA/tín chỉ tính sẵn từ client.

Vẫn schema V9, không migration/seed/dependency mới. GPA được tính khi đọc, không lưu bảng số tổng hợp riêng hoặc tăng version của học kỳ/môn/điểm. Màn Điểm/Dashboard nối ở 5C; GPA tích lũy và quy tắc học lại/cải thiện ở 5B.2.

## Công thức và phạm vi

`GPA học kỳ = Σ(điểm hệ 4 của môn × số tín chỉ) / Σ(tín chỉ các môn đã đủ kết quả)`.

Tính BigDecimal và chỉ làm tròn phép chia cuối đến **2 chữ số, HALF_UP**. Dùng nguyên bộ tính môn `IUH_2023_REPORTED_V1` của 5A.2B, không sao chép một công thức điểm môn khác. Thang hệ 4 và mức làm tròn tham chiếu [tài liệu IUH 2023, mục 6.5, PDF trang 68](https://fce.iuh.edu.vn/wp-content/uploads/2023/10/2023_FCE_faculty_manual.pdf#page=68).

- Môn **đã đủ kết quả F** vẫn tham gia mẫu số với đầy đủ tín chỉ; đóng góp tử số bằng 0.
- Môn chưa cấu hình/thiếu nhóm/thiếu điểm/bị chặn thi chưa có tổng kết hoàn chỉnh bị loại khỏi phép tính và liệt kê riêng. Không biến điểm thiếu thành F/0.
- Cuối kỳ thấp đã biết không đạt nhưng còn thiếu điểm khác: vẫn chưa có hệ 4 đầy đủ để tính GPA.
- Không lọc chỉ các môn đạt. Không lấy trung bình đơn giản giữa các môn khác tín chỉ.
- Không gộp theo tên môn, không lấy điểm của kỳ khác, không chọn lần học cao nhất/mới nhất trong đợt này.
- Trạng thái môn STUDYING/PLANNED/COMPLETED do người dùng đặt không tạo ra điểm và không thay thế kiểm tra kết quả đầy đủ.

Phạm vi là các môn đã nhập trong app với hai loại THEORY/PRACTICAL đang hỗ trợ. Chưa tự suy môn P/đạt-không đạt, miễn/chuyển điểm hoặc trường hợp đặc thù từ tên môn; không gán các môn đó sang loại tính điểm chữ để thay thế quy chế. Đây là tổng hợp dữ liệu hiện có, không đồng bộ bảng điểm hoặc kết luận học bổng chính thức.

## Snapshot

Học kỳ, danh mục môn, tín chỉ và cấu hình/điểm được đọc trong một transaction PostgreSQL REPEATABLE_READ. Cấu hình cùng các cột được tải theo nhóm ID môn của chính tài khoản/học kỳ, tránh tải lần lượt từng bảng điểm hoặc đọc nhầm học kỳ khác.

Thành công dùng `{data,meta}` và `Cache-Control: no-store`. `data` gồm `semester`, `policy`, `summary`, `courses`. Không có version để ghi GPA: `semester.version` chỉ thuộc thông tin học kỳ; GPA có thể đổi khi courseVersion/gradeVersion đổi dù semester.version giữ nguyên.

Policy là `IUH_2023_SEMESTER_V1`, tham chiếu coursePolicyId `IUH_2023_REPORTED_V1`; có nguồn, trang PDF, công thức, decimals và rounding.

## Summary

| Trường | Ý nghĩa |
|---|---|
| state | EMPTY / NO_RESULTS / PARTIAL / COMPLETE. |
| complete | Chỉ true khi học kỳ có môn và tất cả môn hiện có được tính GPA. Không có nghĩa đã đồng bộ đầy đủ danh sách môn từ trường. |
| gpa | Số 0–4, làm tròn hai chữ số; null khi chưa có tín chỉ đủ kết quả để tính. |
| weightedGradePoints | Tử số: tổng điểm hệ 4 nhân tín chỉ, chưa chia/làm tròn trung gian. |
| registeredCredits | Tổng tín chỉ các môn đang có trong học kỳ của app. |
| calculatedCredits | Mẫu số: tín chỉ các môn đủ kết quả, gồm F. |
| earnedCredits | Tín chỉ môn đủ kết quả và đạt trong học kỳ này; chưa phải tín chỉ tích lũy toàn khóa đã loại trùng học lại. |
| failedCredits | Tín chỉ môn đủ kết quả nhưng không đạt. |
| excludedCredits | Tín chỉ các môn chưa được tính. |
| registeredCourses/calculatedCourses/passedCourses/failedCourses/excludedCourses | Số môn tương ứng. |

`registeredCredits = calculatedCredits + excludedCredits`;
`calculatedCredits = earnedCredits + failedCredits`. Các số môn cũng phân chia tương tự.

| state | GPA |
|---|---|
| EMPTY | Học kỳ chưa có môn; gpa=null. |
| NO_RESULTS | Có môn nhưng chưa môn nào đủ kết quả; gpa=null. |
| PARTIAL | Có môn đã tính và môn chưa tính; gpa dựa trên phần đã đủ kết quả, complete=false. |
| COMPLETE | Tất cả môn hiện có được tính, có thể gpa=0.00 nếu đều F. |

GPA bằng 0 là dữ liệu thật, khác gpa=null. Không trình bày PARTIAL như điểm trung bình cuối kỳ đã đầy đủ.

## Danh sách môn

`courses[]` theo thứ tự code/id ổn định, mỗi môn một dòng, gồm id/code/name/credits/courseStatus/courseVersion, configurationId/gradeVersion/assessment, included/exclusionReason, resultStatus/resultReason/complete/passed, total/letter/gradePoint/weightedGradePoints và danh sách thiếu/notice.

`gradeVersion` là version dùng chung cấu hình/điểm; null nếu chưa có cấu hình. Các ID/versions là dữ liệu chỉ đọc cho lần chụp này. Mở chi tiết môn bằng endpoint `/grade-configurations/{configurationId}/result` của 5A.2B.

`exclusionReason`:

- NO_CONFIGURATION: môn chưa có cấu hình điểm.
- INCOMPLETE_CONFIGURATION: thiếu nhóm cột cần thiết.
- EXAM_BLOCKED: giữa kỳ 0 theo profile đang dùng.
- INCOMPLETE_SCORES: chưa đủ giá trị điểm/tổng kết, kể cả trường hợp đã biết CK thấp.

Môn được tính có included=true, exclusionReason=null và weightedGradePoints có số, gồm số 0 cho F. Môn chưa tính có weightedGradePoints=null. `resultStatus=FAILED` nhưng complete=false vẫn có thể excluded; failedCourses chỉ đếm môn F hoàn chỉnh đã vào GPA.

## Ví dụ

A: 3 tín chỉ, tổng kết 8,0 → B+ → 3,5; B: 2 tín chỉ, tổng kết 8,5 → A → 3,8; C: 1 tín chỉ, F → 0.

`(3×3.5 + 2×3.8 + 1×0) / 6 = 18.1/6 → 3.02`.

calculatedCredits=6, earnedCredits=5, failedCredits=1, COMPLETE. Thêm môn D 3 tín chỉ chưa có cấu hình: registeredCredits=9, excludedCredits=3, state=PARTIAL; GPA phần đã có kết quả vẫn 3,02. Hai môn F hoàn chỉnh 3 và 2 tín chỉ: GPA 0,00, calculatedCredits=5, earnedCredits=0.

## Thực hành

`scripts/Try-SemesterGpa.ps1 -SemesterId ...` hỏi tài khoản và đọc GPA; in rõ null/0 và trạng thái PARTIAL, đóng đúng phiên nó mở. Windows PowerShell 5.1 đọc UTF-8, không in mật khẩu/token.

IntelliJ: `api/semester-gpa.http`. Hướng dẫn từng bước: [BACKEND-PHASE-5B1.md](../../docs/BACKEND-PHASE-5B1.md). Kiểm thử dùng schema riêng và tự dọn; có ví dụ tính tay, ranh giới làm tròn, F/thiếu điểm, ownership, kỳ hè, cập nhật tín chỉ/điểm, snapshot đồng thời, script và restart.
