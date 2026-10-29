# Backend — FocusYourStudy

**Kiểm tra 6C.1:** 639 tests/Maven verify đạt (33 mới), không lỗi/bỏ qua; TypeScript và 505 tests frontend hồi quy đạt. HTTP/PostgreSQL và script Windows PowerShell 5.1 đã đối chiếu tổng tuần/tháng, từng ngày, lịch sử, tài khoản riêng, nguồn đổi/xóa và hoàn tất đồng thời. Schema test biệt lập tự dọn.

**Mới nhất 6C.1 — API thống kê Pomodoro:** GET `/api/v1/pomodoro-statistics` trả tổng phiên/phút theo tuần/tháng, từng ngày và từng môn/học kỳ từ các phiên COMPLETED. Theo tài khoản, giờ kết thúc thực tế và múi giờ; không cộng phiên hủy/đang học. Một truy vấn dữ liệu lịch sử dùng chung cho mọi tổng; giữ snapshot khi nguồn đổi/xóa. Dùng V11 hiện có, không migration/dependency mới. Chạy lại backend để nạp API rồi xem [hướng dẫn](../docs/BACKEND-PHASE-6C1.md), [hợp đồng](docs/POMODORO.md#thống-kê-tuầntháng--6c1), `scripts/Try-Pomodoro.ps1 -Mode Statistics -Period WEEK` hoặc `api/pomodoro-statistics.http`. Nối biểu đồ ở 6C.2, chuỗi ngày/Dashboard ở 6C.3.

**6A.2 — Hoàn tất/hủy, lịch sử và mục tiêu:** V11 giữ dữ liệu V10, bổ sung COMPLETED/CANCELLED và mục tiêu ngày. Complete khi đủ 25 phút, endedAt đúng deadline; hủy giữ phần học dở nhưng công nhận 0 phút. Lệnh kết thúc gửi lặp không ghi/cộng lại; phiên kết thúc giữ nguyên. GET lịch sử phân trang/lọc theo snapshot; GET/PUT mục tiêu 1–12 có version, mặc định 4 không tạo row; tiến độ ngày theo múi giờ chỉ tính COMPLETED. Xem [hướng dẫn](../docs/BACKEND-PHASE-6A2.md), [hợp đồng](docs/POMODORO.md), `scripts/Try-Pomodoro.ps1`, `api/pomodoro.http`. Chạy lại backend để Flyway nâng V10 → V11; UI ở 6B, biểu đồ ở 6C. **606 tests/Maven verify đạt (38 test mới), không lỗi/bỏ qua; TypeScript và 403 tests frontend hồi quy đạt.** Đã kiểm tra gửi lặp/đồng thời, tài khoản/Bearer/cookie/CSRF auth, phân trang, DST/ranh giới ngày, PowerShell 5.1, nâng V10 → V11 và ba lần khởi động backend; schema QA riêng tự dọn, không seed tài khoản thật.

**6A.1 — Phiên Pomodoro thực tế:** V10 thêm `pomodoro_sessions`, tách với buổi tự học lên kế hoạch. API bắt đầu/tạm dừng/tiếp tục/đọc lại phiên 25 phút theo giờ server; một phiên chạy/tạm dừng mỗi tài khoản, Start chống trùng và version chống lệnh cũ. Snapshot ngữ cảnh giữ nguyên; khôi phục qua restart, GET không ghi. Chạy lại backend để Flyway nâng V9 → V10, không reset/seed dữ liệu cũ hoặc thêm dependency. Xem [hướng dẫn test](../docs/BACKEND-PHASE-6A1.md), [hợp đồng](docs/POMODORO.md), `scripts/Try-Pomodoro.ps1`, `api/pomodoro.http`. Hoàn tất/hủy/lịch sử/mục tiêu ở 6A.2; UI ở 6B. Hết giờ hiện giữ phiên với timeUp=true, chưa ghi nhận phiên hoàn tất. **568 tests/Maven verify đạt (31 test mới), không lỗi/bỏ qua; TypeScript và 403 test frontend hồi quy đạt.** Đã kiểm tra API/PostgreSQL, PowerShell 5.1, đồng thời, nâng V9 → V10 và đóng/mở toàn backend ba lần; schema test riêng tự dọn, không seed tài khoản thật.

**5B.2B.2 — GPA tích lũy trong app:** GET `/api/v1/gpa/cumulative`. Chọn tổng kết đạt cao nhất; bằng điểm lấy năm-kỳ gần nhất; chưa đạt giữ F hoàn chỉnh gần nhất với hệ 4 bằng 0. Mỗi nhóm mã/tín chỉ tính một lần; giữ lịch sử/decisions, tách thiếu dữ liệu và variant cần đối chiếu. Chính sách app do người dùng chọn, không xác nhận GPA chính thức IUH. Snapshot chỉ đọc theo tài khoản, không lưu lựa chọn hoặc tăng version, vẫn V9 trong đợt đó. Xem [hướng dẫn](../docs/BACKEND-PHASE-5B2B2.md), [hợp đồng](docs/CUMULATIVE-GPA.md), `scripts/Try-CumulativeGpa.ps1`, `api/cumulative-gpa.http`. 537 tests/Maven verify qua (33 mới), không lỗi/bỏ qua; TypeScript qua. Đã nối UI ở 5C.3.

**Ghi chú giao diện/GPA:** Đã thêm cảnh báo cam cho môn đạt tổng kết ≤ 5/10; môn rớt vẫn đỏ và vẫn được hiển thị. Nghiệp vụ hủy/phục hồi để sau; người dùng chọn lấy điểm đạt cao nhất cho 5B.2B.2 theo chính sách app. Đối chiếu nguồn và giới hạn trong [5B.2B.1](../docs/BACKEND-PHASE-5B2B1.md); API/công thức backend ở đợt này chưa đổi.

**5B.2A — Lịch sử các lần học cùng môn:** GET `/api/v1/course-attempts`, GET `/api/v1/courses/{id}/attempts`. Ghép mã/tín chỉ, sắp năm-kỳ, ngữ cảnh lần trước theo kết quả; variant tín chỉ/LT-TH cần đối chiếu. Chỉ đọc, snapshot theo tài khoản, không chọn điểm tích lũy hoặc đổi dữ liệu/version. Vẫn V9, không migration/seed/frontend/dependency. Xem [hướng dẫn](../docs/BACKEND-PHASE-5B2A.md), [hợp đồng và nguồn IUH](docs/COURSE-ATTEMPTS.md), `scripts/Try-CourseAttempts.ps1`, `api/course-attempts.http`. Xác minh quy tắc chọn điểm ở 5B.2B; nối UI 5C. 504 tests/Maven verify qua (27 mới), không lỗi/bỏ qua; TypeScript qua. Gồm 8 test timeline và 19 test HTTP/PowerShell mới; mở rộng restart qua ba lần khởi động, snapshot đồng thời, quyền tài khoản và dữ liệu thiếu/F0. Schema test riêng tự dọn; không seed dữ liệu app, vẫn V9.


**Nghiệm thu 5B.1 ngày 26/10/2026: 477 tests/Maven verify qua (29 mới), không lỗi/bỏ qua; TypeScript qua.** Có 8 test tính GPA và 21 test HTTP/PowerShell mới; mở rộng restart, kiểm tra F/thiếu điểm/0-null, khác tín chỉ, cập nhật và snapshot đồng thời. Không seed vào tài khoản app, schema test tự dọn; vẫn V9.

**5B.1 — GPA học kỳ:** GET `/api/v1/semesters/{id}/gpa`, dùng điểm hệ 4 từ 5A.2B nhân tín chỉ, tính cả F đã đủ kết quả và tách môn chưa đủ dữ liệu; null khác GPA 0. Có trạng thái EMPTY/NO_RESULTS/PARTIAL/COMPLETE, tử số/mẫu số, tín chỉ đạt/trượt/chưa tính và danh sách môn/lý do. Cùng snapshot và tải bảng điểm theo nhóm của đúng học kỳ/tài khoản; không ghi sẵn GPA hoặc tăng version. Vẫn V9, không migration/seed/dependency mới. Chạy lại backend, xem [hướng dẫn](../docs/BACKEND-PHASE-5B1.md), [hợp đồng](docs/SEMESTER-GPA.md), `scripts/Try-SemesterGpa.ps1`, `api/semester-gpa.http`. Tích lũy/học lại và nối UI ở 5B.2/5C.

**Nghiệm thu 5A.2B ngày 26/10/2026: 448 tests/Maven verify qua (58 mới), không lỗi/bỏ qua; TypeScript qua.** 42 test phép tính/ngưỡng và 16 test API/PowerShell mới; test restart hiện có mở rộng để so kết quả qua nhiều lần khởi động. Schema test riêng tự dọn, không seed vào tài khoản app; vẫn V9.

**5A.2B — Kết quả môn:** GET `/api/v1/grade-configurations/{id}/result`, tính BigDecimal từ snapshot cấu hình/điểm/tín chỉ, nguồn IUH 2023; BTL toàn phần/một phần, thiếu điểm, giữa kỳ 0, ngoại lệ CK lý thuyết dưới 3, tổng kết/điểm chữ/hệ 4 của môn và dấu cần xử lý học lại. Không ghi sẵn kết quả hoặc tự tạo điểm thiếu; GET không tăng version. Vẫn V9, không migration/seed/dependency mới. Chạy lại backend, xem [hướng dẫn](../docs/BACKEND-PHASE-5A2B.md), [hợp đồng](docs/GRADE-RESULTS.md), `scripts/Try-GradeResults.ps1`, `api/grade-results.http`. GPA học kỳ/tích lũy và nối UI còn ở 5B/5C.

**Nghiệm thu 5A.2A ngày 26/10/2026: 390 tests/Maven verify qua (33 mới), không lỗi/bỏ qua; TypeScript qua.** Gồm 32 test API điểm/guard/PowerShell mới, một test nâng V8 → V9; test restart hiện có được mở rộng để giữ điểm 0 và số thập phân qua nhiều lần khởi động. Không seed dữ liệu thử vào tài khoản app; các schema test tự dọn.

**5A.2A — Lưu điểm thành phần:** V9 thêm score/remainder_score nullable theo cột, GET/PUT điểm theo tài khoản; 0 khác chưa nhập, điểm BTL/phần còn lại, yêu cầu đủ bộ cột và trường điểm. Dùng chung version/khóa ghi với cấu hình; snapshot đọc, chặn xóa/đổi cột có điểm và cấu hình còn điểm, cho đổi tên/thứ tự giữ nguyên giá trị. Script `Try-GradeScores.ps1` Get/Export/Update giữ điểm hiện có, không tự đổi version/ghi đè file; HTTP `api/grade-scores.http`. Chạy lại backend để áp dụng V9, xem [hướng dẫn](../docs/BACKEND-PHASE-5A2A.md) và [hợp đồng](docs/GRADE-SCORES.md). Chưa tính kết quả môn/GPA và chưa nối UI Điểm; tiếp theo 5A.2B/5B/5C.

**Nghiệm thu 5A.1 ngày 26/10/2026: 357 tests/Maven verify qua (32 mới), không lỗi/bỏ qua; TypeScript qua.** Có kiểm tra migration V7 → V8 giữ dữ liệu, restart toàn backend, Windows PowerShell 5.1/UTF-8, ownership/version, BTL, snapshot và ghi đồng thời. Kiểm thử dùng schema riêng, không seed vào tài khoản app.

**5A.1 — Cấu hình bảng điểm:** V8 thêm `grade_configurations`/`grade_columns`, CRUD/lọc theo tài khoản/môn/kỳ; cột tùy chỉnh, thứ tự/tên/vai trò, BTL thay thực hành hoặc toàn phần/một phần cuối kỳ. Trọng số dựng từ cấu hình, bản thiếu nhóm là DRAFT; ownership/version/khóa tài khoản, snapshot đọc và guard xóa/chuyển môn. Chưa lưu điểm số/tổng kết/GPA và chưa nối màn Điểm. Chạy lại `scripts/Run-Local.ps1` để nâng V7 → V8, không xóa/tạo lại database. Xem [hướng dẫn 5A.1](../docs/BACKEND-PHASE-5A1.md), [hợp đồng](docs/GRADE-CONFIGURATIONS.md), `api/grade-configurations.http`, `api/samples/grade-configurations`, `scripts/Try-GradeConfigurations.ps1`. 5A.2/5B/5C còn trong checklist.

**Frontend 4H.2B đã thêm/sửa/xóa lịch thi qua API**, xử lý version/trùng/mất phản hồi và cấu hình nhắc. Xem [hướng dẫn 4H.2B](../docs/FRONTEND-EXAMS-4H2B.md). Không đổi backend/migration, vẫn V7; tổng hợp/nhắc việc 4H.2C còn trong checklist.

**Frontend 4H.2A đã đọc GET lịch thi:** danh sách theo tài khoản/học kỳ/môn và chi tiết mới nhất, trạng thái tải/lỗi/trống, F5 và đổi tài khoản. Tạo kỳ thi thử bằng `scripts/Try-Exams.ps1`; xem [hướng dẫn 4H.2A](../docs/FRONTEND-EXAMS-4H2A.md). Ghi từ UI nối 4H.2B, tổng hợp/nhắc việc 4H.2C; backend/migration đợt này giữ nguyên V7.

**Mới nhất 4H.1B.2 — Lịch học/tự học kiểm tra lịch thi:** tạo/sửa chuỗi, đổi/khôi phục từng buổi và POST/PUT tự học kiểm tra thi toàn tài khoản. Trùng giờ giữ ngoại lệ/toàn bộ dữ liệu/version; kiểm tra hai chiều dưới khóa tài khoản bảo vệ ghi đồng thời. **325 tests/Maven verify qua (31 mới), không bỏ qua**, gồm chuỗi dài, UTC/DST, rollback, race và PowerShell 5.1. TypeScript/140 test lịch frontend qua; không migration/seed, vẫn V7. Chạy lại backend, xem [hướng dẫn 4H.1B.2](../docs/BACKEND-PHASE-4H1B2.md), [contract](docs/SCHEDULE-CONFLICTS.md), `api/exam-reverse-conflicts.http`. **4H.1B đã hoàn thành, UI thi nối ở 4H.2**.

**4H.1B.1 — Chặn lịch thi trùng với lịch đã lưu:** khi POST/PUT thi kiểm tra kỳ thi khác, lịch học hiệu lực và tự học toàn tài khoản; so UTC, nghỉ/đổi buổi, chạm giờ, lỗi rõ môn/buổi và rollback toàn phần. **294 tests/Maven verify qua (26 mới), không bỏ qua**, có ghi đồng thời, UTC/DST/đường đổi ngày và PowerShell 5.1. TypeScript/140 test lịch frontend hồi quy qua. Không thêm migration/seed, vẫn V7. Chạy lại backend và xem [hướng dẫn 4H.1B.1](../docs/BACKEND-PHASE-4H1B1.md), [contract](docs/EXAMS.md), `api/exam-conflicts.http`. Chiều ngược đã có ở 4H.1B.2; UI thi ở 4H.2.

**4H.1A — API lịch thi cơ bản:** V7 + CRUD/lọc lịch thi theo tài khoản, môn/kỳ/loại/hình thức/khoảng UTC; zone, phòng, ghi chú và nhiều mốc nhắc, version cả PUT giống hệt, guard xóa/chuyển môn. **268 tests/Maven verify qua (30 mới), không bỏ qua**, có nâng V6 giữ dữ liệu, restart toàn backend và PowerShell 5.1. TypeScript/140 test lịch frontend hồi quy qua.

Chạy lại `scripts/Run-Local.ps1` để Flyway áp dụng V7, không tạo lại database. Thử `scripts/Try-Exams.ps1 -Mode List`; xem [hướng dẫn 4H.1A](../docs/BACKEND-PHASE-4H1A.md), [contract](docs/EXAMS.md), `api/exams.http`. Kiểm tra hai chiều đã có ở 4H.1B.1/4H.1B.2; UI 4H.2 còn làm sau.


**Nghiệm thu 4E.2B ngày 24/10/2026: 238 tests/Maven verify qua (30 mới), không lỗi/bỏ qua**; TypeScript và 6 tình huống smoke HTTP frontend qua. Có kiểm tra xung đột ở mọi luồng ghi, kế thừa ngoại lệ, rollback/version, ghi đồng thời, DST/khác ngày địa phương, lịch cả năm, script PowerShell 5.1 và hồi quy restart/migration.

**Mới nhất 4E.2B — Kiểm tra trùng giờ:** guard lịch–lịch/tự học khi thêm/sửa chuỗi, đổi/khôi phục từng buổi và thêm/sửa tự học. Áp dụng ngoại lệ trước, so UTC từng ngày, bỏ buổi nghỉ và cho phép nối tiếp; khóa hàng tài khoản bảo vệ ghi đồng thời. 409 `SCHEDULE_TIME_CONFLICT` có buổi/môn/ngày/giờ, thất bại giữ nguyên dữ liệu/version. Không thêm migration/seed; vẫn V6. Xem [hướng dẫn test](../docs/BACKEND-PHASE-4E2B.md), [contract](docs/SCHEDULE-CONFLICTS.md) và `api/schedule-conflicts.http`. Script PowerShell 5.1 đọc cả response body khi ErrorDetails trống; form tự học hiển thị lỗi cụ thể. UI thời khóa biểu nối ở 4F; lịch thi làm riêng.

**4E.2A — Ngoại lệ từng buổi:** V6 lưu nghỉ/đổi giờ/phòng/giảng viên và khôi phục theo ngày của chuỗi. Occurrences áp dụng ngoại lệ và trả cancelled/changed; version chuỗi bảo vệ mọi thao tác kể cả khôi phục/tạo lại. Sửa cả chuỗi không được làm mất/sai ngoại lệ; xóa cả chuỗi cascade đúng ngoại lệ của chuỗi. Không seed hoặc sửa migration cũ. Xem [hướng dẫn test](../docs/BACKEND-PHASE-4E2A.md), [contract](docs/CLASS-EXCEPTIONS.md), `scripts/Try-ClassExceptions.ps1` và `api/class-exceptions.http`. Trùng giờ đã có ở 4E.2B, UI ở 4F.

**Kết quả 4E.2A: 208 tests/Maven verify qua (26 mới), không bỏ qua**. Có nâng V5 giữ dữ liệu/version, nguyên tử khi khôi phục/tạo lại, đọc snapshot, ghi đồng thời, restart và script Windows PowerShell 5.1.

**Đợt 4E.1 — API lịch học lặp:** V5 tạo class_schedules, CRUD/lọc theo môn/kỳ/tài khoản và đọc các buổi phát sinh theo ngày/tuần. Lưu thứ, khoảng ngày, giờ/múi giờ, phòng/giảng viên, ghi chú và cấu hình mốc nhắc; ownership/version, guard chuyển/xóa môn và khóa ghi chung. UI thời khóa biểu nối 4F; ngoại lệ và kiểm tra trùng đã có ở 4E.2A/4E.2B. Không seed dữ liệu. Xem [hướng dẫn terminal VS Code/IntelliJ](../docs/BACKEND-PHASE-4E1.md), [hợp đồng](docs/CLASS-SCHEDULES.md), `api/class-schedules.http`, `scripts/Try-ClassSchedules.ps1`.

**Kết quả 4E.1: 182 tests/Maven verify qua (27 mới), không bỏ qua**, gồm ownership/version, migration V4 → V5, restart toàn backend, DST/giờ không rõ, giữ đúng giờ SQL qua ba múi giờ JVM và script Windows PowerShell 5.1.

**Đợt 4C — API kế hoạch tự học:** V4 thêm study_sessions, CRUD/lọc theo tài khoản/môn/kỳ/bài/trạng thái/khoảng giờ, lưu timeZone và startsAt/endsAt UTC. Chặn trùng buổi, sai môn và vượt deadline; xóa bài gỡ link giữ buổi, chống đua khi ghi với bài/môn. **155 tests/Maven verify qua**, gồm 37 test tự học/migration mới, nâng V3 giữ dữ liệu, restart và script PowerShell 5.1. Màn Tự học nối ở 4D. Xem [hướng dẫn test 4C](../docs/BACKEND-PHASE-4C.md), [hợp đồng](docs/STUDY-SESSIONS.md), `api/study-sessions.http` và `scripts/Try-StudySessions.ps1`.

**Đợt 4A — API bài tập:** V3 tạo bảng bài tập, CRUD/lọc theo tài khoản/môn/kỳ/trạng thái, deadline có múi giờ và version; chặn xóa/chuyển kỳ môn còn bài. UI bài tập đã nối API ở 4B. Xem [hướng dẫn test 4A](../docs/BACKEND-PHASE-4A.md), [hợp đồng bài tập](docs/ASSIGNMENTS.md) và `api/assignments.http`. Khởi động lại backend để Flyway thêm bảng; không xóa/tạo lại database.

**Kiểm tra tại đợt 4A:** 118 tests/Maven verify qua, 26 test bài tập/migration mới; có nâng V2 → V3 giữ dữ liệu cũ, UTC/offset, version, hai tài khoản, race ghi bài với xóa/chuyển môn, restart toàn backend và script Windows PowerShell 5.1. TypeScript và các bộ kiểm tra HTTP/môn frontend cũng qua. Kiểm thử dùng schema riêng, không seed dữ liệu vào schema ứng dụng.

**Đợt 3B đã xong:** API CRUD môn/lọc theo học kỳ, chuẩn hóa mã, version và quyền theo chủ tài khoản; dùng chung khóa với học kỳ. **92 tests/Maven verify qua tại đợt 3B**, có 20 test môn mới, script PowerShell 5.1 và đọc lại môn qua khởi động lại backend. UI học kỳ/môn đã nối ở 3C.1/3C.2; thiết bị thật 2C.3B để làm sau. Xem [hướng dẫn test 3B](../docs/BACKEND-PHASE-3B.md), [hợp đồng môn](docs/COURSES.md), [UI môn 3C.2](../docs/FRONTEND-COURSES-3C2.md).

**Đợt 3A đã xong:** API CRUD học kỳ theo chủ tài khoản, lưu PostgreSQL, tối đa một CURRENT, kiểm tra version và chặn xóa kỳ còn môn. **72 tests/Maven verify qua** tại đợt 3A, gồm 21 test học kỳ và đọc lại kỳ sau khi backend khởi động lại. UI học kỳ đã nối ở 3C.1; 2C.3B để làm sau. Xem [hướng dẫn test 3A](../docs/BACKEND-PHASE-3A.md) và [hợp đồng API](docs/SEMESTERS.md).

Java 21, Spring Boot **4.1.1**, Maven Wrapper **3.10.0**, PostgreSQL **17.11**, Flyway và Spring Data JPA. **Đợt 2B** bổ sung refresh token luân chuyển, phiên bền vững và đăng xuất thu hồi ngay cả access token của phiên. Native dùng JSON; web dùng cookie HttpOnly và CSRF. **Frontend đã nối tài khoản/phiên, học kỳ/môn và bài tập**; nghiệm thu thiết bị thật ở 2C.3B. Tự học đã nối API ở 4D; UI lịch học/thi, điểm và Pomodoro vẫn trong bộ nhớ. API chuỗi lịch có ở 4E.1, ngoại lệ/trùng giờ ở 4E.2 và UI lịch nối 4F. Xem `../docs/FRONTEND-AUTH-2C2.md`, `../docs/FRONTEND-COURSES-3C2.md`.

## Chạy trên máy Windows hiện tại

Máy cần JDK 21 có `java` trong PATH, PowerShell, `tar.exe` (Windows 10/11) và mạng cho lần tải dependency đầu. Không cần Maven/Docker/PostgreSQL cài sẵn.

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Script sẽ:

1. Tải PostgreSQL portable và driver JDBC từ Maven Central, đối chiếu SHA-256 đã ghim trong script.
2. Tạo cluster riêng ở `.local/data`, mật khẩu ngẫu nhiên trong `.local/database.json`, chỉ nghe `127.0.0.1:55432`.
3. Tạo database `focus_study` nếu chưa có; không xóa hoặc tạo lại data khi chạy lần tiếp theo.
4. Tạo cặp khóa RSA ở `.local/auth` nếu chưa có, giữ nguyên khóa ở các lần chạy sau; nạp biến kết nối và chạy Spring Boot. Maven Wrapper tự tải Maven nếu cần.
5. Flyway áp dụng V1 (tài khoản/học kỳ/môn), V2 (phiên/hash refresh token), V3 (bài tập), V4 (tự học), V5 (lịch lặp) và V6 (ngoại lệ từng buổi); Hibernate chỉ `validate`, không tự sửa schema. Không sửa migration cũ hoặc xóa data đã có.

Mở **http://localhost:8080/api/v1/health**. Kết quả đúng:

```json
{
  "data": { "status": "UP", "database": "UP" },
  "meta": { "timestamp": "2026-10-22T01:30:00Z", "requestId": "..." }
}
```

`timestamp` và `requestId` thay đổi mỗi yêu cầu. Có thể kiểm tra ở terminal khác:

```powershell
Invoke-RestMethod 'http://localhost:8080/api/v1/health' | ConvertTo-Json -Depth 5
```

Nếu PowerShell báo script bị chặn, có thể dùng `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Run-Local.ps1` cho riêng process này, không cần đổi chính sách của máy. Nếu cổng API đã bận, đặt `$env:SERVER_PORT='8085'` trước khi chạy.

Ctrl+C dừng backend, PostgreSQL vẫn chạy để lần mở sau nhanh hơn. Dừng database riêng của project bằng:

```powershell
.\scripts\Stop-LocalDatabase.ps1
```

Nếu cổng database 55432 đã bận ở lần thiết lập đầu, chạy `.\scripts\Setup-LocalDatabase.ps1 -Port 55433` rồi chạy `Run-Local.ps1`; các script sẽ dùng lại cổng đã lưu.

Lần chạy đầu có thể lâu vì tải dependency. Không xóa `.local/data` để xử lý lỗi khởi động. Gói portable này chỉ dành cho phát triển/thử cục bộ, không cài Windows service và không dùng cho triển khai production.

## Kiểm tra

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Test-Local.ps1
```

Chạy test API, Bean Validation và migration trên PostgreSQL thật. Test tích hợp tự tạo schema `backend_it_<uuid>` rồi chỉ xóa schema thử đó; không dùng H2 hoặc xóa dữ liệu trong schema app. Kết quả ở `target/surefire-reports`. File jar được đóng gói trong `target` sau khi `verify` qua.

Test xác nhận: Flyway chạy lại không tạo trùng; JPA khớp schema; term chỉ 1–3; kỳ/mã môn không trùng trong cùng phạm vi; chỉ một kỳ hiện tại/tài khoản; môn không thể tham chiếu học kỳ của tài khoản khác; số tín chỉ hợp lệ; API health/401/405/CORS/request ID và thông báo lỗi không lộ nội dung SQL/stack trace.

Đã chạy ngày 22/10/2026: **51 tests qua**, Maven verify/đóng gói thành công (17 nền tảng + 13 auth + 5 giới hạn tần suất + 15 phiên/script PowerShell 5.1 + 1 kiểm tra đóng/mở backend ba lần). Có token hết hạn/phát lại, refresh đồng thời, logout chỉ đúng phiên, cookie/CSRF/origin, hai hồ sơ và không nhận token ở query. Test tự sinh khóa thử trong `target/`. Xem `../docs/BACKEND-PHASE-2B.md`; kết quả các đợt cũ giữ trong tài liệu tương ứng.

Thử API thủ công khi backend đang chạy, tại terminal thứ hai:

```powershell
.\scripts\Try-Auth.ps1 -Mode Register
.\scripts\Try-Auth.ps1 -Mode Login
.\scripts\Try-Session.ps1
```

Try-Auth thử đăng ký/đăng nhập/hồ sơ và đóng phiên thử ở cuối. Try-Session thử đăng nhập → refresh → logout → hai loại token bị từ chối; thêm `-SimulateReplay` để thử dùng lại token cũ, hoặc `-PauseForRestart` để dừng giữa chừng và khởi động lại backend. Mật khẩu nhập ẩn, token chỉ giữ trong biến của lần chạy, không in/lưu file. Không cần mở Expo. REST Client có `api/auth.http` cho native/terminal và `api/auth-browser.http` cho cookie/CSRF.

## Dùng PostgreSQL đã cài hoặc môi trường CI

Tạo trước database và quyền tạo schema/migration cho role của môi trường phát triển. Đặt biến trực tiếp, không chỉ sửa `.env.example` vì Spring/Maven không tự đọc file đó:

```powershell
$env:DB_URL='jdbc:postgresql://127.0.0.1:5432/focus_study'
$env:DB_USER='your_database_role'
$env:DB_PASSWORD='your_local_password'
.\scripts\Setup-LocalAuth.ps1
.\mvnw.cmd spring-boot:run
```

Với test trên database riêng: đặt thêm `TEST_DB_URL`, `TEST_DB_USER`, `TEST_DB_PASSWORD`, rồi chạy `.\mvnw.cmd verify`. Role test cần tạo/drop schema thử. Các script `Run-Local`/`Test-Local` chủ động dùng bộ PostgreSQL portable; dùng lệnh Maven trực tiếp nếu muốn kết nối PostgreSQL bên ngoài.

Maven dùng `.mvn/settings.xml` riêng của project để tải các dependency công khai từ Maven Central, tránh repository thương mại/snapshot được khai báo gián tiếp trong dependency. Không sửa cấu hình Maven toàn máy. Chạy lệnh từ thư mục `backend` để đường dẫn settings được nhận đúng.

## Cấu trúc

```text
backend/
├── .mvn/                         Maven Wrapper và repository của project
├── scripts/                      Khởi tạo/chạy/dừng database, chạy app/test
├── api/                          foundation.http, auth.http, auth-browser.http
├── docs/SCHEMA.md                Quan hệ dữ liệu đã tạo và thiết kế đợt sau
├── docs/API.md                   Phản hồi thành công/lỗi và phạm vi API
├── src/main/java/com/focusstudy/
│   ├── config/                  Security/CORS
│   ├── common/api/              Response, ProblemDetail, request ID
│   ├── common/persistence/      UUID, timestamp và optimistic version
│   ├── health/                  API kiểm tra database
│   ├── auth/                    Đăng ký/đăng nhập, JWT, băm mật khẩu, giới hạn thử
│   │   ├── dto/                 Request/response; không log mật khẩu hoặc token
│   │   ├── validation/          Kiểm tra xác nhận mật khẩu
│   │   └── session/             Phiên, hash refresh token, transport và kiểm tra thu hồi
│   ├── users/                   Entity, repository, DTO hồ sơ và GET /users/me
│   ├── academics/               Entity, service, DTO/API học kỳ và môn theo tài khoản
│   └── assignments/             Bài tập, deadline, validation, API và quyền theo tài khoản
├── src/main/resources/
│   ├── application.yml
│   └── db/migration/             V1 nền tảng; V2 phiên; V3 bài tập; V4 tự học
└── src/test/java/com/focusstudy/ Kiểm thử API và PostgreSQL
```

GET/POST/PUT/DELETE học kỳ/môn/bài/tự học đã mở ở 3A/3B/4A/4C và cần Bearer/phiên hoạt động. POST đăng ký/đăng nhập/refresh/logout, GET CSRF và hai health endpoint không yêu cầu access token. Cookie auth bắt buộc CSRF và origin được phép. GET `/api/v1/users/me` cần Bearer token gắn phiên còn hiệu lực; các endpoint học tập khác vẫn khóa. CORS cho localhost 8092/8081 và cho credentials với origin cụ thể, không wildcard. API mặc định chỉ nghe localhost; cấu hình điện thoại sẽ làm ở 2C.

Mật khẩu PBKDF2-HMAC-SHA256 với salt 16 byte, 600.000 vòng, hash 256 bit; nhận 8–128 ký tự và giữ nguyên khoảng trắng. JWT RS256 chỉ nhận qua Authorization, có `sid`; mỗi request kiểm tra phiên chưa bị thu hồi/hết hạn trong DB. Refresh token là bí mật ngẫu nhiên 256 bit, chỉ lưu SHA-256, dùng một lần. Phiên tối đa 30 ngày; mỗi refresh token tối đa 7 ngày và không vượt hạn phiên. Dùng lại token đã tiêu thụ sẽ thu hồi cả phiên; client 2C cần gộp refresh đồng thời và không tự gửi lại token cũ sau lỗi mạng không rõ kết quả.

Web dùng `FOCUS_REFRESH` HttpOnly/SameSite=Strict/path `/api/v1/auth`; lấy CSRF qua GET `/api/v1/auth/csrf`, gửi mã trong `X-XSRF-TOKEN` và `X-Auth-Transport: cookie` cùng origin được phép. Native/terminal không có Origin dùng body token; không dùng cookie auth ở chế độ này. Không gửi Authorization cũ cho login/refresh/logout. Xem hợp đồng chi tiết trong `docs/API.md`.

Khóa `.local/auth`, thông tin DB và `target/` ngoài Git. Môi trường khác cấp khóa riêng bằng `JWT_PRIVATE_KEY_LOCATION`/`JWT_PUBLIC_KEY_LOCATION`. Production HTTPS phải đặt `AUTH_COOKIE_SECURE=true`, cùng cấu hình origin/host theo deployment; không trộn localhost và 127.0.0.1 khi thử cookie web. Xác minh email/khôi phục mật khẩu, giới hạn chia sẻ giữa các instance, danh sách/thu hồi mọi thiết bị và job dọn phiên hết hạn chưa triển khai.

## Nguồn phiên bản và quy ước

- [Spring Initializr metadata](https://start.spring.io/metadata/client)
- [Spring Boot 4.1 system requirements](https://docs.spring.io/spring-boot/4.1/system-requirements.html)
- [Spring Boot 4.1 database initialization/Flyway](https://docs.spring.io/spring-boot/4.1/how-to/data-initialization.html)
- [Spring Framework 7 ProblemDetail](https://docs.spring.io/spring-framework/reference/7.0/web/webmvc/mvc-ann-rest-exceptions.html)
- [Nguồn đóng gói PostgreSQL portable Zonky](https://github.com/zonkyio/embedded-postgres-binaries) và [artifact Maven Central](https://repo.maven.apache.org/maven2/io/zonky/test/postgres/embedded-postgres-binaries-windows-amd64/17.11.0/)

UI học kỳ/môn/bài đã nối ở **3C.1/3C.2/4B**; **API tự học 4C** đã có. Tiếp theo là **4D nối UI tự học**, rồi các phần lịch học/lịch thi theo từng đợt. 2C.3A đã kiểm tra web, 2C.3B thiết bị thật để làm sau. Token 2A cũ thiếu `sid` cần đăng nhập lại sau nâng cấp 2B. Phân quyền dữ liệu học tập phải kiểm tra khi mở từng API tương ứng.
