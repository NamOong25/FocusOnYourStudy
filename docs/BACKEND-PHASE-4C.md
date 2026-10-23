# Đợt 4C — API kế hoạch tự học

Đã có API lưu buổi tự học theo tài khoản vào PostgreSQL: danh sách/chi tiết/thêm/sửa/xóa, liên kết bài tập tùy chọn, môn, thời điểm, thời lượng, trạng thái và ghi chú.

**Đợt này test bằng terminal hoặc HTTP client. Màn Tự học vẫn dùng bộ nhớ; 4D sẽ nối giao diện.** Tạo một buổi trên giao diện rồi F5 mất buổi vẫn là giới hạn hiện tại; không có lỗi nếu List từ API khác danh sách RAM trên màn hình. Học kỳ, môn và bài tập trên giao diện đã lưu thật từ các đợt trước.

## 1. Chạy backend

PowerShell trong VS Code hoặc IntelliJ đều được. Terminal 1:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Nếu backend đã chạy từ bản cũ, Ctrl+C rồi chạy lại. Flyway tự áp dụng **V4**, thêm bảng study_sessions và ràng buộc liên kết bài tập. **Không xóa/tạo lại database, không sửa migration V1–V3.** Tài khoản, phiên, môn/kỳ/bài đã có được giữ lại; không tự thêm dữ liệu mẫu vào tài khoản.

Giữ terminal này chạy. Mở `http://localhost:8080/api/v1/health` thấy status/database UP là backend sẵn sàng; đây không phải trang giao diện tự học.

## 2. Xem danh sách và lấy ID môn

Mở **terminal PowerShell thứ 2**, vẫn trong thư mục backend:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Try-StudySessions.ps1 -Mode List
```

Nhập email tài khoản đã đăng ký và mật khẩu nhập ẩn. Thấy `data: []` là bình thường nếu chưa có buổi lưu bằng API. Script tự đăng nhập cho lần thử, gọi API rồi đóng riêng phiên vừa mở; không làm tài khoản trên app đăng xuất. Mỗi lần chạy sẽ hỏi lại email/mật khẩu.

```powershell
.\scripts\Try-Courses.ps1 -Mode List
$courseId = Read-Host 'Dán id của môn muốn học từ danh sách vừa xem'
```

Nếu chưa có môn, tạo học kỳ/môn bằng giao diện app (chạy frontend như trước ở terminal khác nếu cần) hoặc script học kỳ/môn đã có. Dùng cùng tài khoản ở tất cả bước.

## 3. Tạo buổi tự học độc lập

```powershell
.\scripts\Try-StudySessions.ps1 -Mode Create `
  -CourseId $courseId `
  -Title 'Ôn tập Java' `
  -StartsAt '2026-10-30T19:00:00+07:00' `
  -DurationMinutes 45 `
  -Notes 'Đọc chương 3 và ghi lại câu hỏi'
```

`+07:00` là múi giờ Việt Nam; script mặc định `-TimeZone 'Asia/Ho_Chi_Minh'`. Thời điểm trả về **startsAt 12:00Z, endsAt 12:45Z** tương ứng 19:00–19:45 tại Việt Nam. `Z` là UTC, không phải giờ bị mất 7 tiếng. Bạn có thể thay ngày/giờ mẫu bằng lịch của mình, có cả offset; giây để 00.

Trong phản hồi, giữ lại `id` và `version`:

```powershell
$studyId = Read-Host 'Dán id buổi tự học vừa tạo'
.\scripts\Try-StudySessions.ps1 -Mode Get -StudySessionId $studyId
```

Buổi độc lập có assignmentId null, status PLANNED. Thời lượng 1–240 phút, kết thúc trước 24:00 cùng ngày. Không tự ghi nhận thời gian Pomodoro từ việc tạo buổi học.

## 4. Sửa và kiểm tra phiên bản

Lấy version mới nhất từ Get rồi chạy:

```powershell
$studyVersion = Read-Host 'Nhập version mới nhất từ Get'
.\scripts\Try-StudySessions.ps1 -Mode Update `
  -StudySessionId $studyId -Version $studyVersion `
  -CourseId $courseId -Title 'Ôn Java — cập nhật' `
  -StartsAt '2026-10-30T19:00:00+07:00' `
  -DurationMinutes 60 -Status IN_PROGRESS `
  -Notes 'Dành thêm thời gian cho bài thực hành'
```

Get lại sẽ thấy kết thúc 20:00 giờ Việt Nam, nội dung mới và version do backend trả. PUT thay toàn bộ thông tin, không chỉ riêng trường bạn vừa đổi; muốn giữ liên kết bài thì tiếp tục truyền AssignmentId. Nếu không truyền AssignmentId, buổi sẽ thành tự học độc lập. Không tự đoán version tăng bao nhiêu; đọc lại trước khi sửa/xóa.

Chạy lại bản Update có version cũ sau khi dữ liệu đã đổi sẽ nhận **409 STUDY_SESSION_VERSION_CONFLICT**, không ghi đè. Get lại rồi quyết định nội dung muốn lưu.

## 5. Buổi học gắn bài tập

Lấy ID bài cùng môn, có deadline không sớm hơn giờ kết thúc buổi học. Có thể tạo/sửa bài bằng giao diện đã nối ở 4B:

```powershell
.\scripts\Try-Assignments.ps1 -Mode List -CourseId $courseId
$assignmentId = Read-Host 'Dán id bài tập cùng môn, có hạn phù hợp'
.\scripts\Try-StudySessions.ps1 -Mode Create `
  -CourseId $courseId -AssignmentId $assignmentId `
  -Title 'Hoàn thiện báo cáo Java' `
  -StartsAt '2026-10-30T20:00:00+07:00' `
  -DurationMinutes 45
```

Ví dụ nếu hạn bài là 30/10/2026 lúc 23:59 thì 20:00–20:45 hợp lệ. Nếu bài của bạn đến hạn ngày khác, đổi StartsAt cho phù hợp. Buổi 19:00–20:00 và 20:00–20:45 được nối tiếp nhau; không tạo trùng slot 19:00 của bước trước.

Một bài có nhiều buổi học. Trạng thái buổi và trạng thái bài độc lập; hoàn thành buổi không tự hoàn thành bài, giữ nguyên deadline.

## 6. Các tình huống nên thử

| Thử | Kết quả cần thấy |
| --- | --- |
| Tạo buổi thứ hai trong giờ buổi đang có, kể cả khác môn | 409 STUDY_TIME_CONFLICT; danh sách không thêm buổi trùng. |
| Tạo buổi bắt đầu đúng lúc buổi trước kết thúc | Được lưu nếu không trùng buổi khác. |
| Gắn bài của môn khác | 409 STUDY_ASSIGNMENT_COURSE_MISMATCH. |
| Buổi gắn bài kết thúc sau hạn | 409 STUDY_AFTER_DEADLINE; chọn giờ khác hoặc bỏ AssignmentId. |
| Tạo 23:59, thời lượng 1 phút | 400: phải kết thúc trước 24:00 cùng ngày. |
| Bài đang có buổi đã lưu, đổi môn của bài | 409 ASSIGNMENT_HAS_STUDY_SESSIONS; xử lý liên kết trước. |
| Kéo deadline bài về trước giờ kết thúc buổi đã lưu | 409 ASSIGNMENT_DEADLINE_CONFLICT; dữ liệu cũ giữ nguyên. |
| Đổi trạng thái bài hoặc kéo deadline ra sau | Được lưu; không tự đổi trạng thái buổi. |
| Xóa bài đang có buổi liên kết | Buổi còn nguyên, assignmentId chuyển null và version buổi tăng; Get lại để dùng phiên bản mới. |
| Xóa/chuyển học kỳ môn còn buổi độc lập hoặc đã hoàn thành | 409 COURSE_HAS_STUDY_SESSIONS. Cần xử lý buổi trước; xóa bài không đồng nghĩa xóa buổi. |
| Đăng nhập B, dùng ID buổi/môn/bài của A | Không đọc/ghi được; trả 404 không phân biệt mục không có với mục người khác. |

Buổi đã COMPLETED vẫn được giữ trong kế hoạch và vẫn chiếm khung giờ; không tự bỏ qua khi kiểm tra trùng. Múi giờ lưu cùng buổi để kiểm tra ngày và độ dài thật khi có DST, không phụ thuộc múi giờ máy chủ.

Nếu đã tạo buổi qua API mà màn Tự học chưa hiện buổi, việc sửa bài vẫn có thể bị guard backend chặn vì buổi thật đó. Trong đợt này dùng script List/Get/Update/Delete để xử lý liên kết; giao diện sẽ hiện đầy đủ ở 4D.

## 7. Lọc, khởi động lại và xóa

```powershell
.\scripts\Try-StudySessions.ps1 -Mode List `
  -CourseId $courseId -FilterStatus IN_PROGRESS `
  -From '2026-10-30T18:00:00+07:00' `
  -To '2026-10-30T23:59:00+07:00'
```

Có thể dùng thêm SemesterId/AssignmentId. Khoảng lọc lấy các buổi giao với khoảng thời gian, từ mốc đầu đến trước mốc cuối; script tự encode dấu +. Không nhập riêng ngày cho From/To.

Để kiểm tra lưu thật: dừng backend terminal 1 bằng Ctrl+C, chạy lại Run-Local.ps1, rồi dùng List/Get ở terminal 2. Buổi vẫn còn sau khi process backend khởi động lại, không chỉ sau khi F5 trang web.

Xóa riêng buổi sau khi đã thử xong:

```powershell
.\scripts\Try-StudySessions.ps1 -Mode Get -StudySessionId $studyId
$studyVersion = Read-Host 'Nhập version mới nhất từ Get'
.\scripts\Try-StudySessions.ps1 -Mode Delete `
  -StudySessionId $studyId -Version $studyVersion
.\scripts\Try-StudySessions.ps1 -Mode List
```

Xóa buổi không xóa bài, môn hoặc học kỳ. Mất phản hồi khi ghi thì kiểm tra List/Get trước khi tự chạy lại; script không tự gửi lặp thao tác.

## Phạm vi và kết quả kiểm thử

- Backend: V4 + CRUD/lọc/validation/ownership/version; guard bài/môn, giữ buổi khi xóa bài, khóa giao dịch chống ghi đồng thời.
- Frontend: chỉ bổ sung lời nhắc tiếng Việt cho ba mã guard mới. Không nối màn Tự học, không tự chuyển RAM sang server; 4D thực hiện tiếp.
- Chưa lưu lịch học/lịch thi/lặp/ngoại lệ, checklist/tài liệu, Pomodoro; backend chưa kiểm tra trùng với các lịch học/thi RAM. Máy thật/native 2C.3B tiếp tục để sau.

Kết quả ngày 23/10/2026: **Maven verify 155 tests qua, không lỗi hoặc bỏ qua**, gồm 37 test tự học/migration mới, hồi quy API cũ và đóng/mở toàn bộ backend ba lần. Có giờ UTC/offset/DST, giáp ranh deadline/24:00, khóa ngoại ghép/DB checks, hai tài khoản, các request ghi đồng thời và script PowerShell 5.1 CRUD/lọc/đóng riêng phiên test. Nâng V3 giữ tài khoản, hash phiên, kỳ/môn/bài đã có; migration chạy lại không tạo trùng.

TypeScript và các bộ kiểm tra frontend HTTP/tài khoản (15 nhóm), bài tập (32 nhóm), môn (29 nhóm) cũng qua. Kiểm thử backend tạo schema backend_it ngẫu nhiên rồi dọn riêng từng schema; không seed vào database ứng dụng. V4 sẽ được áp dụng cho schema ứng dụng khi bạn chạy backend mới.

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Test-Local.ps1
```

Hợp đồng đầy đủ: [STUDY-SESSIONS.md](../backend/docs/STUDY-SESSIONS.md). Mẫu HTTP cho IntelliJ/REST Client/Postman: `backend/api/study-sessions.http`; thay các UUID/accessToken mẫu bằng giá trị thật và không commit thông tin đăng nhập/token.
