# Kết quả môn — 5A.2B

`GET /api/v1/grade-configurations/{configurationId}/result` tính kết quả từ cấu hình/điểm 5A.1–5A.2A đã lưu. Cần Bearer token của phiên đang hoạt động; quyền theo tài khoản, thiếu/khác chủ trả 404 `GRADE_CONFIGURATION_NOT_FOUND`. Không tạo bản ghi khi đọc, không đổi version/trạng thái môn, không lưu bảng kết quả riêng. Vẫn migration V9, không seed hay thêm dependency.

Response dùng `{data,meta}`, `Cache-Control: no-store`. Chỉ mở GET; việc nhập điểm vẫn qua `/scores`. Client không được gửi tổng kết/điểm chữ/trạng thái để ghi đè kết quả.

## Snapshot và cấu trúc

`data` gồm:

- `scores`: nguyên cấu hình và điểm theo contract 5A.2A, gồm `configurationId, courseId, version, updatedAt, parts`.
- `credits`, `courseVersion`: thông tin môn thực sự được dùng trong lần tính; không đánh đồng version môn với version cấu hình/điểm.
- `policy`: profile `IUH_2023_REPORTED_V1`, nguồn, trang PDF và cách làm tròn.
- `result`: trạng thái, lý do, mức đầy đủ, điểm tổng kết/điểm chữ/hệ 4 khi có đủ căn cứ, cùng diễn giải từng cột.

Các phần này đọc trong một transaction PostgreSQL REPEATABLE_READ. Không ghép điểm phiên bản mới với kết quả phiên bản cũ khi có ghi đồng thời. GET không tăng version; lần sửa điểm/cấu hình tiếp theo phải dùng cơ chế version của 5A.1/5A.2A.

## Căn cứ và phạm vi chính sách

Đã đọc và kiểm tra trực quan [tài liệu IUH năm 2023](https://fce.iuh.edu.vn/wp-content/uploads/2023/10/2023_FCE_faculty_manual.pdf), mục 6: trang PDF 55–58 (in 49–52) và 68 (in 62). Đây là nguồn đang được project chọn để đối chiếu K19; profile ghi rõ năm/nguồn, không tự áp dụng bản năm 2025 hoặc suy chính sách riêng từ tên môn.

Chỉ hỗ trợ hai loại hiện có: THEORY/PRACTICAL. Không tự chuyển môn tích hợp, đạt/không đạt, khóa luận, miễn/chuyển điểm sang một trong hai loại. BTL dùng target/share đã được người dùng cấu hình theo môn; nguồn chung không ấn định một tỷ lệ BTL cho mọi lớp. Phần tính GPA học kỳ/tích lũy và các lần học lại ở 5B.

## Công thức

Backend dùng BigDecimal, không dùng phần trăm hiển thị đã làm tròn như 33.33% làm đầu vào phép tính.

### Lý thuyết

`TK = 20% × TB thường kỳ + 30% × giữa kỳ + 50% × cuối kỳ`.

- Một cột thường kỳ: dùng như **trung bình thường kỳ đã công bố**, giữ nguyên giá trị nhập; có notice `REPORTED_REGULAR_AVERAGE` để thể hiện cách hiểu này.
- Nhiều cột thường kỳ: trung bình cộng các cột, làm tròn một chữ số để tạo thành phần TB thường kỳ, rồi nhân 20%. Căn cứ là mục 6.1 yêu cầu thành phần ĐTBKTTK thể hiện một chữ số thập phân.
- Giữa kỳ đúng 0: báo EXAM_BLOCKED. Không tự tạo điểm cuối kỳ/tổng kết/F; `passed` và `needsRetake` còn null. Điểm giữa kỳ chưa nhập là UNKNOWN, không phải 0.
- Cuối kỳ đã xác định dưới 3: biết có vấn đề không đạt. Khi đủ điểm, tổng kết lấy điểm cuối kỳ, F; `weightedTotal` vẫn cho thấy phép cộng 20/30/50 để giải thích sự khác nhau. Khi thiếu điểm khác, có thể báo FAILED do ngưỡng cuối kỳ nhưng không tạo tổng kết/điểm chữ/hệ 4.
- Tổng kết làm tròn một chữ số, HALF_UP; sau đó phân loại. Ngưỡng đạt môn tính điểm chữ là 4,0.

Các điểm đầu vào được xem là điểm thành phần đã công bố. Không sửa giá trị lưu ở 5A.2A, không tự chấm lại/làm tròn nửa điểm các điểm do người dùng nhập. Bước làm tròn trung bình thường kỳ áp dụng khi backend phải tổng hợp nhiều cột; một điểm TB thường kỳ đã công bố được dùng trực tiếp.

### Thực hành

Tổng kết là trung bình cộng bộ cột đã cấu hình, làm tròn thẳng kết quả chia đến một chữ số. Gợi ý theo nguồn là 3 cột với 1–2 tín chỉ, 5 cột khi từ 3 tín chỉ; tiếp tục cho phép bộ cột tùy chỉnh theo yêu cầu người dùng. Khác số cột gợi ý có notice `CUSTOM_PRACTICAL_COLUMN_COUNT` để không ngầm coi bộ tùy chỉnh là mẫu chuẩn của mọi lớp.

Các nhãn MIDTERM/FINAL trong bộ cột thực hành vẫn là những cột trong trung bình này. Không tự gán điều kiện cuối kỳ dưới 3 hoặc điều kiện dự thi lý thuyết vào mọi cột thực hành; `examEligibility=NOT_EVALUATED`. Thông tin này không xác nhận đủ các điều kiện thi thực tế của từng lớp.

### BTL

PROJECT→PRACTICE/100 hoặc PROJECT→FINAL/100: giá trị hiệu lực bằng score BTL, không thêm một cột điểm mới.

PROJECT→FINAL với share<100: `CK = BTL × share/100 + remainderScore × (100-share)/100`, làm tròn một chữ số để tạo cột cuối kỳ rồi xét ngưỡng/tổng kết. Thiếu một trong hai điểm thì effectiveScore của cột này null; không thay phần thiếu bằng 0. Các trường bằng 0 đều là điểm đã nhập.

## Điểm chữ và hệ 4 của môn

Sau làm tròn tổng kết: A+ từ 9→4,0; A từ 8,5→3,8; B+ từ 8→3,5; B từ 7→3,0; C+ từ 6→2,5; C từ 5,5→2,0; D+ từ 5→1,5; D từ 4→1,0; F dưới 4→0. `gradePoint` là điểm hệ 4 **của môn**, chưa phải GPA.

## Các trường kết quả

| Trường | Ý nghĩa |
|---|---|
| status | INCOMPLETE_CONFIGURATION / INCOMPLETE_SCORES / EXAM_BLOCKED / FAILED / PASSED. |
| reason | MISSING_GROUPS / MISSING_SCORES / MIDTERM_ZERO / FINAL_BELOW_3 / TOTAL_BELOW_4 / TOTAL_AT_LEAST_4. |
| complete | Cấu hình đủ nhóm, các cột đã có điểm hiệu lực và không bị chặn thi. |
| allScoresEntered | Tất cả cột hiện có đã có điểm cần thiết; không thay thế kiểm tra đủ nhóm hoặc điều kiện thi. |
| passed, needsRetake | Nullable. PASSED→true/false; FAILED→false/true; thiếu dữ liệu/chặn thi→null/null. Không dùng falsey null để tự kết luận học lại. |
| examEligibility | UNKNOWN / ELIGIBLE_BY_MIDTERM / BLOCKED_BY_MIDTERM_ZERO / NOT_EVALUATED. Chỉ xét quy tắc điểm giữa kỳ thuộc phạm vi trên, không xác nhận chuyên cần/kỷ luật/quy định riêng. |
| regularAverage, finalExamScore | Các thành phần đã xác định được, kể cả khi tổng kết còn thiếu. |
| weightedTotal | Cộng theo công thức thông thường khi đủ dữ liệu, trước ngoại lệ cuối kỳ lý thuyết dưới 3. |
| rawTotal, total | Điểm sau áp dụng ngoại lệ và điểm làm tròn cuối; null nếu chưa đủ dữ liệu/chặn thi. rawTotal trung bình thực hành hiển thị 12 chữ số, total được làm tròn từ phép chia chính xác, không từ giá trị hiển thị này. |
| letter, gradePoint | Chỉ có khi complete; không tự gán F/0 cho bản thiếu điểm. |
| enteredColumns, columnCount | Số cột đã có điểm hiệu lực và số cột được cấu hình. |
| missingGroups, missingScores | Nhóm chưa cấu hình và các giá trị còn thiếu theo columnId + SCORE/REMAINDER_SCORE. |
| columns | id và effectiveScore của từng cột, cho biết điểm BTL đã quy đổi. |
| notices | Cách hiểu cột thường kỳ duy nhất hoặc số cột khác gợi ý; không chặn lưu điểm. |

Ưu tiên status: giữa kỳ 0 → cấu hình thiếu → cuối kỳ dưới 3 → thiếu điểm → xét tổng kết. Các danh sách thiếu vẫn đi kèm để không che phần chưa hoàn thiện.

## Ví dụ đối chiếu

| Dữ liệu | Kết quả |
|---|---|
| LT: TK/GK/CK = 10/10/2,9 | weightedTotal=6,45 nhưng total=2,9, F, cần học lại. |
| LT: 10/10/3 | total=6,5, C+, hệ 4=2,5. |
| LT: 8/0/8 | EXAM_BLOCKED; total/letter/gradePoint/passed/needsRetake đều null. |
| LT: TK trống, GK=8, CK=2,9 | FAILED vì CK dưới 3; chưa có total/letter/gradePoint. |
| LT: TK=8, GK=8, BTL=8 chiếm 40% CK, phần còn lại=6 | CK=6,8; total=7,4, B. |
| LT: hai cột TK 7,9 và 8; GK=7,5; CK=8 | TB thường kỳ 8,0; weightedTotal=7,85; total=7,9. |
| TH: 6/8/10 (BTL thay cột thứ ba) | total=8,0; không đếm BTL lần nữa. |
| TH: 10/10/0, cột cuối gắn nhãn FINAL | total=6,7, đạt theo trung bình bộ cột; không áp ngưỡng CK lý thuyết. |

Màn Điểm frontend chưa nối API, còn hàm tính cũ; riêng trường hợp nhiều cột TK ở ngưỡng làm tròn có thể khác cho đến khi nối backend ở 5C. Không dùng Dashboard RAM để nghiệm thu API đợt này.

Hướng dẫn thực hành: [BACKEND-PHASE-5A2B.md](../../docs/BACKEND-PHASE-5A2B.md). Script `Try-GradeResults.ps1` và IntelliJ `api/grade-results.http` chỉ đọc kết quả, không thay điểm.
