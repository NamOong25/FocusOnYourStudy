# Lịch sử các lần học cùng môn — 5B.2A

> Đã có báo cáo lựa chọn/GPA app riêng ở 5B.2B.2: `GET /api/v1/gpa/cumulative`, xem [hợp đồng](CUMULATIVE-GPA.md). Endpoint history này vẫn giữ nguyên dữ liệu nguồn và không tự chọn điểm. Quy tắc chính thức/khôi phục điểm đã hoãn vẫn chưa được xác nhận.

## API chỉ đọc

| Yêu cầu | Phạm vi |
| --- | --- |
| `GET /api/v1/course-attempts` | Mọi môn của tài khoản, kể cả nhóm chỉ có một bản ghi. |
| `GET /api/v1/courses/{id}/attempts` | Các bản ghi có cùng mã với môn được chọn; khác tín chỉ vẫn ở nhóm riêng. |

Bearer bắt buộc; `data/meta`, `Cache-Control: no-store`. Môn không tồn tại hoặc của người khác cùng trả 404 `COURSE_NOT_FOUND`; UUID sai trả 400. Không có API ghi liên kết các lần học. Không migration, seed hoặc trường GPA lưu sẵn; vẫn V9.

`focusCourseId` null ở danh sách toàn tài khoản, bằng id được chọn ở API chi tiết. `summary` chỉ đếm `groups`, `attempts`, `repeatedGroups` và `reviewGroups`; không cộng tín chỉ đạt hoặc GPA tích lũy.

## Ghép nhóm và thứ tự

- Khóa nhóm là cặp **mã môn đã chuẩn hóa khi lưu + số tín chỉ**. Không ghép bằng tên, giảng viên, trạng thái môn hoặc ngày tạo. Không tự bỏ dấu/khoảng trắng ở giữa mã hoặc suy luận mã tương đương.
- `attempts` tăng dần theo `semester.startYear`, rồi `term`: 1 → 2 → 3 (hè) → kỳ 1 năm học tiếp theo. CURRENT/UPCOMING/COMPLETED không quyết định thứ tự.
- Mỗi dòng có `semester` gồm id/version/năm/kỳ, `course` gồm id/version/mã/tên/tín chỉ/trạng thái, configurationId/gradeVersion và kết quả từ bộ tính 5A.2B. `policy.resultPolicyId` chỉ rõ profile đang dùng; không âm thầm đổi công thức kết quả môn trong đợt này.
- `recordedAttemptNumber` chỉ là số thứ tự **ghi nhận trong app**, không chứng minh đây là toàn bộ lịch sử học tại trường. Có cả môn PLANNED/UPCOMING, nếu đã được tạo trong app.
- `previousCourseId` trỏ bản ghi ngay trước trong cùng nhóm. Không bỏ qua bản ghi chưa đủ điểm để tìm một lần cũ hơn đã đạt/trượt. `previousCandidates` ghi các ứng viên thuộc kỳ ngay trước.

| `relation` | Ý nghĩa quan sát trong dữ liệu |
| --- | --- |
| `FIRST_RECORDED` | Chưa có bản ghi nào trước đó trong cùng nhóm. |
| `RETAKE_AFTER_FAILED_RESULT` | Bản ghi ngay trước đã đủ kết quả và trượt, kể cả F hệ 4 bằng 0. |
| `FOLLOWUP_AFTER_PASSED_RESULT` | Bản ghi ngay trước đã đủ kết quả và đạt; ngữ cảnh có thể là học cải thiện. |
| `FOLLOWUP_PREVIOUS_UNRESOLVED` | Bản ghi trước thiếu cấu hình/nhóm/điểm hoặc bị chặn thi; không tự xác nhận là học lại. |
| `AMBIGUOUS_PERIOD` | Nhiều bản ghi trong cùng một kỳ; không đặt số thứ tự/predecessor bằng UUID. |
| `AMBIGUOUS_PREDECESSOR` | Kỳ ngay trước có nhiều ứng viên; không chọn một id tùy ý. |

Đây là ngữ cảnh suy từ dữ liệu đã nhập, **không xác nhận loại đăng ký hoặc điều kiện đăng ký hợp lệ trên cổng trường**. Môn đã đánh dấu COMPLETED thủ công nhưng thiếu điểm vẫn chưa đủ kết quả. Trượt đã biết do CK thấp nhưng chưa đủ điểm tổng kết vẫn không thành một lần F hoàn chỉnh để suy diễn.

`needsReview` và `issues`:

- `CREDIT_VARIANTS`: cùng mã nhưng khác tín chỉ; trả `otherCreditVariants` với tín chỉ/id liên quan để đối chiếu. Không nối chéo các nhóm đó.
- `ASSESSMENT_VARIANTS`: cùng nhóm nhưng các cấu hình đã có khác THEORY/PRACTICAL; vẫn giữ mọi bản ghi, cần đối chiếu.
- `AMBIGUOUS_PERIOD`: bảo vệ khi dữ liệu đầu vào bị trùng kỳ; API ghi hiện tại đã có ràng buộc duy nhất kỳ và mã môn trong kỳ.

Sửa mã/tín chỉ/năm-kỳ/điểm sẽ dựng lại lịch sử ở GET kế tiếp; không có liên kết cũ lưu lại để thành vòng lặp hoặc trỏ sai. Tên đổi vẫn cùng nhóm nếu mã/tín chỉ giữ nguyên.

## Snapshot và kết quả điểm

Một transaction `readOnly/REPEATABLE_READ` bao trùm quyền môn được chọn, catalog, học kỳ và bảng điểm. Bảng điểm/cột được tải theo nhóm; không N+1 theo từng môn. Danh sách rỗng không chạy truy vấn IN rỗng. Số truy vấn không tăng theo số môn; đường chi tiết thêm một lần tra quyền môn.

`course.complete`, `passed`, `total`, `letter`, `gradePoint`, `incompleteReason`, missingGroups/missingScores/notices tái sử dụng cùng bộ tính với GPA học kỳ. Điểm null khác 0. GET không ghi điểm, đổi course.status, tăng version hoặc chọn một lần để thay điểm cũ.

`policy.cumulativeSelection=NOT_IMPLEMENTED`: không có `gpa`, `selectedCourseId`, hoặc cờ đưa lần học vào GPA tích lũy. Không coi bản mới nhất/cao nhất là kết quả chính thức chỉ vì nhóm đã ghép được.

## Đối chiếu nguồn IUH ngày 26/10/2026

- [Cẩm nang IUH — Quy chế đào tạo tín chỉ](https://camnang.iuh.edu.vn/quy-che-dao-tao-theo-he-thong-tin-chi.php), Điều 6 khoản 5: phân biệt học lại môn bắt buộc/tự chọn, lựa chọn trong nhóm tự chọn và đăng ký cải thiện. Cuối trang ghi áp dụng cho khóa tuyển sinh 2025 trở về trước, bao gồm K19/2023. Không loại nguồn này chỉ vì tiêu đề có năm 2025.
- [Phòng Đào tạo — trích Điều 9–12](https://pdt.iuh.edu.vn/Uploads/690fa1d7-f23e-47a1-ac7f-dd401cabc031_3Dang-ky-va-rut-bot-hoc-phan.pdf), trang PDF 2, Điều 11: cũng tách đăng ký học lại/cải thiện và lựa chọn môn trong nhóm tự chọn. Bản trích không thể hiện rõ ngày/quyết định; chỉ dùng bổ trợ, không tự khẳng định đó là toàn bộ quy chế K19.

Hai nguồn nêu chọn điểm cao trong phạm vi nhóm môn tự chọn. Đoạn đã đọc **chưa xác nhận quy tắc chọn điểm giữa nhiều lần của đúng cùng một môn**, đặc biệt khi cải thiện thấp hơn lần trước hoặc có trạng thái hủy điểm. Vì vậy `ruleVerification=SAME_COURSE_IMPROVEMENT_SELECTION_NOT_CONFIRMED`.

Cập nhật 5B.2B.1: người dùng chọn chính sách app lấy điểm đạt cao nhất cho API tích lũy sắp làm; nghiệp vụ hủy/phục hồi để sau. Điều này không xác nhận quy tắc K19 hay đổi endpoint history; xem [phạm vi mới](../../docs/BACKEND-PHASE-5B2B1.md). Cần đọc cùng ghi chú chèn điểm 0 sau Điều 21 để làm rõ mẫu số trong từng chỉ số, không chỉ suy từ định nghĩa.

Trang cẩm nang còn phân biệt trung bình tích lũy của các học phần đã đạt với trung bình học lực có cả kết quả không đạt; Điều 21 tách công thức học kỳ và tích lũy. Không lấy kết quả GPA học kỳ 5B.1 rồi cộng mọi tín chỉ/lần học để gọi là tích lũy chính thức.

Trước 5B.2B: xác minh quy tắc chọn/thay điểm cùng môn từ quy chế đầy đủ áp dụng K19; phân biệt trung bình học lực với trung bình tích lũy; xác định môn bắt buộc/tự chọn/nhóm tương đương và dữ liệu hủy/bảo lưu điểm nếu quy chế yêu cầu. Rà lại phạm vi profile kết quả môn 2023 với nguồn hiện hành, không coi nhãn history là căn cứ tự hủy điểm. P/miễn/chuyển điểm vẫn là mục riêng trong checklist. Chưa nghiệm thu GPA toàn khóa.
