# GPA tích lũy trong app — 5B.2B.2

## Endpoint và phạm vi

`GET /api/v1/gpa/cumulative` trả `data/meta` của đúng tài khoản Bearer đang hoạt động, có `Cache-Control: no-store`. Không nhận userId, điểm hoặc GPA từ client; query userId không đổi phạm vi tài khoản. POST/PUT/DELETE không được phép. Không cần SemesterId vì báo cáo dùng tất cả kết quả đã nhập của tài khoản.

Đây là **chính sách trong app đã được người dùng chọn**, không phải kết luận đã xác minh đầy đủ GPA chính thức của IUH K19. `policy.id=APP_CUMULATIVE_HIGHEST_PASS_V1`, `authority=USER_CONFIRMED_APP_RULES`, `officialIuhCumulativeVerified=false`. Kết quả từng môn vẫn dùng `IUH_2023_REPORTED_V1`; endpoint này không đổi công thức thành phần, thang quy đổi hoặc trạng thái môn.

Phạm vi hiện có: môn số thuộc cấu hình THEORY/PRACTICAL đã lưu trong app. Không suy môn P/miễn/chuyển điểm từ tên môn. Những mô hình đó và nghiệp vụ hủy/phục hồi điểm vẫn để sau; chưa nghiệm thu bảng điểm toàn khóa chính thức. Môn có kết quả đã nhập được xét theo dữ liệu nguồn, không loại/chọn bằng trạng thái CURRENT/UPCOMING/COMPLETED hoặc ngày tạo.

## Quy tắc lựa chọn

Tái sử dụng nhóm và thứ tự của [history 5B.2A](COURSE-ATTEMPTS.md): mã chuẩn hóa + cùng tín chỉ, theo startYear/term, không theo tên.

1. Nhóm cần đối chiếu (`needsReview`) bị loại khỏi phép tính: CREDIT_VARIANTS, ASSESSMENT_VARIANTS hoặc AMBIGUOUS_PERIOD. Vẫn trả đủ lịch sử, issues và các biến thể tín chỉ; không ghép chéo hoặc chọn bằng UUID.
2. Một lần chỉ đủ điều kiện xét khi kết quả hoàn chỉnh, có total/gradePoint/passed và không còn incompleteReason. Thiếu cấu hình/nhóm/điểm, bị chặn thi hay mới biết trượt nhưng chưa đủ tổng kết đều chưa đủ điều kiện; không tạo F/0.
3. Nếu có lần đạt, chọn **total hệ 10 cao nhất**. So sánh BigDecimal trực tiếp; 8.4 thắng 8.0 dù cả hai hệ 4 đều 3.5. Không chọn theo điểm thành phần hay ngày tạo.
4. Total bằng nhau: chọn năm học/kỳ gần nhất, kể cả kỳ hè. UUID không quyết định lần học chính thức.
5. Nếu chưa có lần đạt nhưng có F hoàn chỉnh, chọn F hoàn chỉnh gần nhất. F hệ 4 bằng 0 vẫn giữ đầy đủ tín chỉ trong mẫu số; tín chỉ đạt của nhóm bằng 0.
6. Nếu không có kết quả đủ điều kiện: không chọn lần nào, không tính tín chỉ nhóm đó vào GPA.

Một nhóm chỉ đóng góp tín chỉ một lần. Mọi lần cũ, kể cả F hoặc lần đạt thấp hơn, vẫn nằm trong `groups[].history.attempts`; không hủy/xóa/phục hồi điểm hoặc đổi course.status. Theo chính sách app, một lần đạt đã biết vẫn có thể được chọn khi lần sau trượt/chưa đủ điểm. Nếu còn lần chưa đủ kết quả, báo cáo mang trạng thái PARTIAL để thể hiện dữ liệu chưa trọn vẹn.

## Phép tính

`weightedGradePoints = Σ(gradePoint của lần được chọn × tín chỉ nhóm)`.

`gpa = weightedGradePoints / calculatedCredits`, với `calculatedCredits = Σ(tín chỉ các nhóm có lựa chọn)`.

Dùng BigDecimal, chỉ chia cuối và làm tròn 2 chữ số HALF_UP. Đây là quy ước triển khai của app. Điểm hệ 4 lấy nguyên từ kết quả môn đã tính, không tính lại từ trung bình hệ 10 toàn bộ môn.

Ví dụ: A 3 tín chỉ đạt 8.0 → 3.5; B 2 tín chỉ đạt 8.5 → 3.8; C 1 tín chỉ F → 0. Tử số `3×3.5 + 2×3.8 + 1×0 = 18.1`; mẫu số 6; GPA 3.02. Tín chỉ đạt 5, chưa đạt 1. Nếu A có thêm một lần đạt 6.0 ở kỳ sau thì vẫn chọn 8.0 và mẫu số vẫn 6, không cộng lại tín chỉ A.

Chưa có nhóm nào được chọn: GPA null, không phải 0. Có toàn nhóm F hoàn chỉnh: GPA 0.00. Không cộng “tín chỉ loại trừ” thành một tổng duy nhất vì các biến thể cùng mã nhưng khác tín chỉ chưa chắc là những môn độc lập.

## Dữ liệu trả về

- `policy`: nguồn quy tắc app, scope, profile kết quả môn/history, cách chọn/tie-break/F và làm tròn.
- `summary`: state/complete/gpa/weightedGradePoints; calculatedCredits/earnedCredits/failedCredits; registeredGroups/recordedAttempts/repeatedGroups, calculatedGroups/passedGroups/failedGroups/excludedGroups/reviewGroups/pendingAttempts.
- `registeredGroups` là số nhóm ghép theo mã/tín chỉ trong app, không khẳng định số học phần duy nhất trong CTĐT khi có biến thể cần đối chiếu. `recordedAttempts` bao gồm mọi lần đã ghi nhận, kể cả chưa đủ điểm.
- `groups[].history`: nguyên snapshot nhóm nguồn 5B.2A, gồm học kỳ, courseVersion, gradeVersion và kết quả/lý do thiếu của từng lần.
- `included`, `selectedCourseId`, `reason`, `weightedGradePoints`, `pendingAttempts`: lựa chọn và đóng góp của nhóm. selectedCourseId null khi nhóm chưa được tính.
- `decisions[]`: courseId + use cho mọi lần; SELECTED, PENDING_RESULT, GROUP_REQUIRES_REVIEW, NOT_SELECTED_LOWER_PASS, NOT_SELECTED_OLDER_TIE, NOT_SELECTED_FAILED_ATTEMPT hoặc NOT_SELECTED_OLDER_F.

| `reason` | Ý nghĩa |
| --- | --- |
| HIGHEST_PASS | Đã chọn tổng kết đạt cao nhất. |
| LATEST_COMPLETE_F | Chưa có lần đạt; đã chọn F hoàn chỉnh gần nhất. |
| NO_COMPLETE_RESULT | Chưa có lần đủ kết quả để chọn. |
| REVIEW_REQUIRED | Nhóm ghép chưa chắc chắn; xem history.issues. |

| `summary.state` | Điều kiện |
| --- | --- |
| EMPTY | Không có nhóm nguồn nào. |
| NO_RESULTS | Có dữ liệu nhưng chưa nhóm nào được tính. |
| PARTIAL | Đã có nhóm được tính, còn nhóm loại trừ hoặc còn lần chưa đủ kết quả. |
| COMPLETE | Mọi nhóm được tính và không còn lần chưa đủ kết quả trong dữ liệu đã nhập. |

`complete` chỉ mô tả dữ liệu trong app, không chứng nhận đủ CTĐT/tốt nghiệp. Nhóm đã chọn một kết quả vẫn có thể có pendingAttempts > 0; khi đó GPA hiện có còn có thể thay đổi và summary là PARTIAL.

## Đọc nhất quán, quyền và lưu trữ

Service tích lũy gọi service history trong cùng transaction readOnly/REPEATABLE_READ. Catalog, học kỳ, cấu hình và cột điểm được đọc cùng snapshot; nguồn bảng điểm tải theo nhóm, không N+1 theo từng môn. GET không ghi lựa chọn/GPA, không tăng version và không thay các API cũ. Vẫn V9, không migration/seed/dependency mới.

`/api/v1/course-attempts` vẫn là endpoint lịch sử, không tự thực hiện việc chọn điểm. Marker `cumulativeSelection=NOT_IMPLEMENTED` trong policy của endpoint lịch sử được giữ để tương thích; lựa chọn thực tế nằm ở endpoint tích lũy riêng với policy APP_CUMULATIVE_HIGHEST_PASS_V1.

Sau khi sửa mã/tín chỉ/năm-kỳ/cấu hình/điểm, GET kế tiếp dựng lại nhóm và kết quả theo dữ liệu mới. Sau restart vẫn đọc cùng nguồn PostgreSQL, không phụ thuộc state frontend. Khi nối UI 5C phải dùng endpoint này cho tổng hợp, không tiếp tục dùng lựa chọn RAM của prototype.
