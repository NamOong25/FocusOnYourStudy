# Pomodoro — hợp đồng 6A.1/6A.2/6C.1/6C.3A

Ngày 28/10/2026. API `/api/v1/pomodoro-sessions`, xác thực Bearer theo tài khoản hiện tại; không nhận `userId`. Success dùng `{data,meta}`, lỗi dùng ProblemDetail và `code` hiện có. Response không cache (`Cache-Control: no-store`). V10 thêm `pomodoro_sessions`; V11 bổ sung trạng thái kết thúc/mục tiêu và giữ nguyên phiên V10. Không seed hoặc sửa dữ liệu học tập cũ.

## Phạm vi

Phiên tập trung **25 phút**, bắt đầu → tạm dừng → tiếp tục → đọc lại. Mỗi tài khoản có tối đa một phiên RUNNING/PAUSED, bảo vệ bằng khóa tài khoản trong transaction và unique partial index PostgreSQL. Không tạo bản ghi Pomodoro từ `study_sessions`: bảng cũ lưu kế hoạch; bảng mới lưu thời gian thực tế.

6A.2 có hoàn tất/hủy, lịch sử và mục tiêu ngày. **GET thấy hết giờ vẫn giữ RUNNING/timeUp=true cho đến lệnh Complete**, không tự ghi hoặc tăng version. COMPLETED được công nhận đủ 25 phút; CANCELLED giữ phần học dở nhưng công nhận 0 phút. UI và khôi phục frontend ở 6B, biểu đồ/chuỗi ngày ở 6C; chế độ nghỉ và native/chạy nền chưa nghiệm thu.

## Endpoints

| Method | Path | Nội dung |
| --- | --- | --- |
| GET | `/active` | Phiên hiện tại; `data:null` nếu chưa có. |
| GET | `/{id}` | Đọc đúng phiên của tài khoản; không tồn tại/khác chủ trả 404. |
| POST | gốc | Bắt đầu; lần đầu 201 + Location, gửi lại cùng yêu cầu 200 + cùng ID. |
| POST | `/{id}/pause` | RUNNING chưa hết giờ → PAUSED; body `{ "version": 0 }`. |
| POST | `/{id}/resume` | PAUSED → RUNNING; body `{ "version": 1 }`. |

Endpoints bổ sung ở 6A.2:

| Method | Path | Nội dung |
| --- | --- | --- |
| POST | `/{id}/complete` | RUNNING đã đủ thời lượng → COMPLETED, body `{ "version": n }`. |
| POST | `/{id}/cancel` | RUNNING/PAUSED chưa hết giờ → CANCELLED, cùng kiểu body version. |
| GET | gốc | Lịch sử terminal phân trang/lọc. |
| GET | `/daily` | Tiến độ ngày theo endedAt, múi giờ và mục tiêu hiện tại. |
| GET | `/api/v1/pomodoro-goal` (đường dẫn tuyệt đối) | Mục tiêu tài khoản; mặc định 4/version 0/persisted=false khi chưa lưu. |
| PUT | `/api/v1/pomodoro-goal` (đường dẫn tuyệt đối) | Body `{ "dailySessions": 6, "version": n }`, dailySessions 1–12. |

Start body:

```json
{
  "clientRequestId": "4d3daf27-f729-4604-85a4-d9d05b479b3f",
  "courseId": "<UUID môn của tài khoản>",
  "assignmentId": null,
  "studySessionId": null,
  "timeZone": "Asia/Ho_Chi_Minh"
}
```

`clientRequestId`, `courseId`, `timeZone` bắt buộc. Zone phải nằm trong bộ ZoneId IANA server hỗ trợ, ví dụ `Asia/Ho_Chi_Minh`, `UTC`. Client không quyết định giờ bắt đầu, thời lượng hoặc thời gian đã học.

Bài tập/buổi tự học tùy chọn phải thuộc tài khoản và môn. Nếu có buổi tự học, `assignmentId` phải khớp buổi đó, kể cả trường hợp null; không tự suy diễn hoặc đổi liên kết. Đây là ghi nhận thực tế, không tạo lịch mới hay kiểm tra xung đột lịch/deadline như khi lập kế hoạch. Không thay trạng thái hoặc deadline bài tập/buổi tự học.

## Đồng hồ và dữ liệu trả về

- `id`, `clientRequestId`, `status`, `version`, `durationSeconds=1500`.
- `startedAt`: mốc bắt đầu ban đầu, không đổi khi resume/replay.
- `stateChangedAt`: mốc chuyển trạng thái gần nhất.
- `serverTime`: mốc server dùng để tính snapshot, UTC; thời điểm snapshot không phải lúc client nhận xong response.
- `elapsedMillis`: thời gian học đã tích lũy + đoạn RUNNING hiện tại, tối đa 1.500.000 ms.
- `pausedMillis`: tổng thời gian PAUSED; đang PAUSED thì cộng cả đoạn tạm dừng hiện tại.
- `remainingMillis`: `1.500.000 − elapsedMillis`, không âm; `remainingSeconds` làm tròn lên, để 1 ms cuối chưa hiện 0.
- `endsAt`: deadline đoạn đang chạy, null khi PAUSED hoặc đã kết thúc; sau resume dịch theo thời gian tạm dừng, không reset về 25 phút.
- `timeUp`: true khi đã đủ thời lượng; chưa phải trạng thái hoàn tất/phiên được công nhận.
- `endedAt`: null khi hoạt động; deadline thật khi COMPLETED, thời điểm hủy khi CANCELLED.
- `finalizedAt`: thời điểm server thực hiện lệnh kết thúc, có thể sau endedAt.
- `creditedStudyMillis`: 1.500.000 cho COMPLETED, 0 cho mọi trạng thái khác.
- `context`: snapshot `courseId/code/name`, `semesterId/term/startYear`, `assignmentId/title`, `studySessionId/title` lúc bắt đầu.

Mốc chuyển trạng thái được chuẩn hóa đến ms và phép cộng giữ ms qua từng pause/resume. Giờ UTC đo khoảng thời gian thật qua nửa đêm/DST; timeZone dành cho ngữ cảnh hiển thị, không dùng phép trừ giờ địa phương. Nếu đồng hồ server lùi trước mốc chuyển trạng thái gần nhất, delta được chặn ở 0. Vận hành cần đồng hồ server ổn định; không có cam kết chống mọi thay đổi đồng hồ hệ thống.

Backend tắt khi RUNNING: khi mở lại, tính theo deadline cũ và chặn tại 25 phút. Backend tắt khi PAUSED: thời gian còn lại giữ nguyên. Không cần request tick mỗi giây; GET không ghi lại thời gian đã trôi.

Snapshot ngữ cảnh được kiểm tra ownership khi bắt đầu và lưu nguyên. Sau này đổi tên/chuyển kỳ/xóa nguồn không sửa lịch sử phiên. Các ID nguồn là **tham chiếu lịch sử**, không có academic foreign key; giao diện tương lai cần xử lý trường hợp nguồn đã bị xóa. User FK vẫn bắt buộc. Gửi lại Start đã lưu không kiểm tra lại nguồn đã đổi/xóa và không chép tên mới vào phiên cũ.

## Đồng thời và mất phản hồi

Start khóa tài khoản trước tra `clientRequestId`/phiên hoạt động/nguồn. Một `clientRequestId` gắn với nội dung course/assignment/study/zone ban đầu trong tài khoản; cùng UUID ở tài khoản khác độc lập. Gửi lại cùng nội dung trả **trạng thái hiện tại của phiên đó**, kể cả PAUSED/COMPLETED/CANCELLED; không reset giờ, không tạo phiên mới. Dùng lại UUID với nội dung khác trả 409.

Pause/resume bắt buộc version hiện tại. Thao tác thành công tăng version; version cũ trả 409 trước thay đổi. Hai lệnh cùng version không cùng ghi thành công. Đúng version nhưng sai trạng thái cũng trả 409, không sửa dữ liệu.

Sau timeout/mất phản hồi: đọc `/active` hoặc `/{id}` để đối chiếu. Chỉ gửi lại Start với **đúng clientRequestId và nội dung cũ**. Không tự tăng version hoặc lặp pause/resume. Script không tự retry thao tác ghi; phiên đăng nhập tạm của script được logout riêng, phiên Pomodoro vẫn còn.

## Hoàn tất/hủy, gửi lại và dữ liệu cuối

Complete chỉ thành công khi RUNNING đã hết thời lượng (đúng deadline trở đi); PAUSED hoặc RUNNING còn thời gian trả POMODORO_NOT_READY. Lưu elapsedMillis=1.500.000, pausedMillis đã tích lũy, endedAt=deadline cuối cùng và finalizedAt=thời điểm xử lý. Không cộng khoảng chậm xác nhận vào phút học/nghỉ. Hủy chỉ khi còn thời gian, lưu phần đã học/nghỉ tới lúc hủy, endedAt=finalizedAt, creditedStudyMillis=0. Phiên đã hết giờ yêu cầu Complete thay vì Cancel.

Lệnh kết thúc khóa tài khoản/kiểm tra owner/version và ghi nguyên tử. Terminal bất biến qua API. Gửi lại cùng hành động được nhận nếu version là **version của lệnh kết thúc đã thành công** hoặc **version hiện tại từ GET**; chỉ trả lại dữ liệu, không tăng version/cộng lần nữa. Version cũ thuộc một chuyển trạng thái trước đó vẫn bị chặn; đổi COMPLETED ↔ CANCELLED bị chặn. Pause/resume terminal bị chặn.

Một hàng COMPLETED tương ứng một phiên công nhận; thống kê truy vấn từ các hàng, không tăng bộ đếm tích lũy riêng. Hai lệnh Complete đồng thời cùng version đều có thể trả 200 nhưng vẫn chỉ một kết quả, một lần công nhận. Terminal giải phóng slot active; có thể Start phiên mới bằng clientRequestId mới. Replay Start cũ vẫn trả đúng phiên cũ, không thay phiên active mới.

## Lịch sử

GET gốc trả `{items,page,size,totalElements,totalPages}`. Page từ 0, mặc định 0; size 1–100, mặc định 20; page × size không vượt 2.147.483.647 (giới hạn offset JPA). Chỉ COMPLETED/CANCELLED; status tùy chọn để lọc một trong hai. Lọc tùy chọn `courseId`, `semesterId`, `assignmentId`, `studySessionId` theo **snapshot ban đầu**, kể cả nguồn đã đổi/xóa; ID ngoài tài khoản/không khớp cho kết quả trống, không tra dữ liệu tài khoản khác.

`from/to` là ISO datetime có offset, từ 1900 đến đầu 2100; from < to khi có cả hai. Lọc endedAt thuộc **[from,to)**. Sắp endedAt DESC, id DESC để xử lý thời điểm bằng nhau. Mỗi request dùng transaction REPEATABLE_READ cho danh sách/đếm; đây là phân trang offset, không giữ snapshot xuyên nhiều request khi có phiên mới được ghi. UI cần tải lại trang đầu khi cập nhật lịch sử.

## Mục tiêu và tiến độ ngày

GET goal mặc định 4/version 0/persisted=false và **không tạo row**. PUT kiểm tra version kể cả lần đầu chưa có row, dùng cùng khóa tài khoản; lần lưu đầu trả version 1/persisted=true. Version API = version ORM + 1 đối với row đã lưu, dành giá trị 0 cho mặc định chưa lưu. Chỉnh giá trị tăng version; cùng giá trị và đúng version là no-op. Version cũ vẫn 409 kể cả muốn ghi lại cùng giá trị. Sau timeout đọc GET để đối chiếu, không tự gửi lại PUT với version đoán.

Đây là cài đặt chung hiện tại cho các ngày; chưa lưu mục tiêu riêng theo ngày hoặc lịch sử thay đổi mục tiêu. Đổi mục tiêu giữ nguyên lịch sử, số phiên và thời gian đã học.

GET `/daily?date=yyyy-MM-dd&timeZone=Asia/Ho_Chi_Minh`: date tùy chọn, mặc định hôm nay tại zone; timeZone tùy chọn, mặc định hồ sơ tài khoản. Zone phải là ZoneId IANA server hỗ trợ. Ngày local trong 1900–2099 được đổi sang [đầu ngày,đầu ngày kế tiếp) UTC, xử lý DST 23/25 giờ. Phân loại theo endedAt và **zone query**, không theo ngày xác nhận hoặc tự gán theo zone từng hàng. Script mặc định luôn gửi Asia/Ho_Chi_Minh.

Trả `date,timeZone,from,to,goal,completedSessions,studyMillis,studySeconds,remainingSessions,progressPercent,goalReached`. Đếm COMPLETED toàn tài khoản trong cửa sổ ngày, tổng elapsedMillis của các phiên đó; CANCELLED/RUNNING/PAUSED không được công nhận. Tiến độ % lấy phần nguyên và chặn tối đa 100; số phiên còn thiếu chặn tối thiểu 0. Goal/số phiên/phút cùng snapshot REPEATABLE_READ; GET không ghi. Đây là tiến độ ngày cơ bản, không phải API biểu đồ/chuỗi ngày 6C.

Hoàn tất giữ liên kết kế hoạch/bài và snapshot gốc để truy vấn, không tự thay trạng thái kế hoạch/bài tập hoặc cập nhật một bộ đếm khác trong study_sessions. Thời gian thực tế cho một buổi có thể truy vấn lịch sử COMPLETED với studySessionId. Giao diện nối các nguồn ở 6B/6C.

## Lỗi nghiệp vụ

| Status/code | Ý nghĩa |
| --- | --- |
| 400 `VALIDATION_FAILED` / `INVALID_REQUEST` | Thiếu/sai kiểu ID, zone rỗng, version thiếu/âm/phân số. |
| 400 `INVALID_POMODORO_TIME_ZONE` | Zone không được hỗ trợ. |
| 401 | Chưa đăng nhập/phiên xác thực không còn hợp lệ. |
| 404 `POMODORO_NOT_FOUND` | Phiên không tồn tại hoặc khác tài khoản. |
| 404 `COURSE_NOT_FOUND` / `ASSIGNMENT_NOT_FOUND` / `STUDY_SESSION_NOT_FOUND` | Nguồn không tồn tại hoặc khác tài khoản. |
| 409 `POMODORO_CONTEXT_MISMATCH` | Môn/bài/buổi tự học không khớp. |
| 409 `POMODORO_ALREADY_ACTIVE` | Tài khoản đã có phiên chạy/tạm dừng, kể cả đã hết giờ. |
| 409 `POMODORO_REQUEST_REUSED` | Mã Start đã dùng cho nội dung khác. |
| 409 `POMODORO_VERSION_CONFLICT` | Version cũ. |
| 409 `POMODORO_INVALID_STATE` | Pause/resume không đúng trạng thái. |
| 409 `POMODORO_TIME_UP` | Phiên đã đủ thời lượng; không pause/resume nữa. |

Lỗi bổ sung 6A.2:

| Status/code | Ý nghĩa |
| --- | --- |
| 409 `POMODORO_NOT_READY` | Chưa đủ 25 phút học để Complete. |
| 409 `POMODORO_ALREADY_FINISHED` | Không thể đổi kết quả/học tiếp phiên terminal. |
| 409 `POMODORO_TIME_UP` | Không hủy phiên đã đủ giờ; dùng Complete. |
| 409 `POMODORO_GOAL_VERSION_CONFLICT` | Mục tiêu đã được lưu/sửa ở nơi khác. |
| 400 `INVALID_POMODORO_HISTORY_FILTER` | Sai page/size/status/range/ngày/múi giờ của lịch sử hoặc Daily. |

Các method/route ngoài phạm vi vẫn bị cấu hình deny-by-default chặn. API Pomodoro yêu cầu Bearer token; cookie đăng nhập riêng lẻ không có quyền truy cập API này. Luồng auth web trong /api/v1/auth/* tiếp tục dùng cookie/CSRF hiện có khi có Origin/cookie. Không mở endpoint public hoặc bỏ auth để chạy script.

## Thống kê tuần/tháng — 6C.1

Bổ sung ngày 29/10/2026: **GET `/api/v1/pomodoro-statistics`**, Bearer theo tài khoản, `Cache-Control: no-store`, `{data,meta}`. Không nhận `userId`; chỉ đọc các bảng hiện có ở V11. Các method khác không được mở trong SecurityConfig.

| Query | Quy tắc |
| --- | --- |
| `period` | `WEEK` mặc định hoặc `MONTH`, phân biệt hoa/thường tại API. |
| `date` | Ngày neo `yyyy-MM-dd`; bỏ qua thì lấy hôm nay tại múi giờ đã chọn. |
| `timeZone` | Múi giờ IANA server hỗ trợ; bỏ qua thì lấy hồ sơ tài khoản. |
| `courseId`, `semesterId` | UUID tùy chọn; lọc theo snapshot nguồn ban đầu. Hai bộ lọc kết hợp bằng AND. |

WEEK là thứ Hai đến Chủ nhật chứa ngày neo, có thể qua tháng/năm. MONTH là toàn bộ tháng chứa ngày neo. Ngày neo và mọi ngày local trong khoảng phải nằm ở 1900–2099; ví dụ tuần chứa 2099-12-31 vượt năm 2099 nên trả 400, tháng 12/2099 vẫn hợp lệ. `fromDate/toDate` bao gồm ngày đầu/cuối local; `from/to` là instant UTC với khoảng **[from,to)**. Mỗi ngày dùng quy tắc ZoneId thực tế, không giả định luôn 24 giờ.

`data` có `period,date,timeZone,fromDate,toDate,from,to,filters`, các tổng `completedSessions,studyMillis,studySeconds`, mảng `days` và `courses`. `filters` trả lại courseId/semesterId đã chọn, null khi không lọc.

- `days`: đủ 7 ngày hoặc 28–31 ngày, tăng dần theo ngày; mỗi dòng có `date,from,to,completedSessions,studyMillis,studySeconds`. Ngày không học là 0; ngày bị bỏ qua do đổi múi giờ lịch sử vẫn có bucket 0.
- `courses`: mỗi nhóm `(courseId,semesterId)` snapshot có `courseCode,courseName,semesterTerm,semesterStartYear` và ba tổng như trên. Một môn chuyển kỳ được giữ thành hai nhóm đúng kỳ gốc. Nhãn lấy từ phiên kết thúc gần nhất trong khoảng/bộ lọc đang xem; nếu cùng endedAt thì UUID dạng chuỗi lớn hơn quyết định, độc lập thứ tự truy vấn. Nhóm sắp thời gian giảm dần, rồi courseId/semesterId tăng dần để ổn định.
- Chỉ `COMPLETED`, dùng `elapsedMillis` đã công nhận; RUNNING/PAUSED/CANCELLED không được cộng. Không có phiên hoàn tất thì ba tổng bằng 0, `days` đủ ngày và `courses:[]`. Đơn vị giây là phần nguyên của tổng ms / 1000; UI đổi sang phút khi trình bày.
- Phân ngày theo **endedAt trong timeZone query**, thống nhất API Daily/lịch sử; không theo startedAt, finalizedAt hoặc múi giờ lưu trên từng phiên. Xác nhận muộn không dời thời gian học sang ngày/tháng khác.
- Không nối lại bảng môn/học kỳ hiện tại. Đổi tên/chuyển kỳ/xóa nguồn không làm mất phút học cũ; ID khác tài khoản/không tồn tại cho kết quả 0, không tra hoặc trả thông tin nguồn của người khác.

Một transaction chỉ đọc REPEATABLE_READ lấy múi giờ hồ sơ (nếu cần) và một truy vấn scalar trong cửa sổ tối đa 31 ngày. Mọi tổng/ngày/môn cùng tổng hợp từ tập phiên đó; không có truy vấn riêng từng ngày và không tạo cài đặt/mục tiêu. Nếu vừa có phiên hoàn tất đồng thời, một response thấy trước hoặc sau commit nhưng các tổng trong response luôn thống nhất. Nhiều request riêng có thể thấy dữ liệu mới hơn; UI cần tải lại sau hoàn tất phiên.

Query kỳ/ngày/zone không hợp lệ trả 400 `INVALID_POMODORO_STATISTICS_FILTER`; UUID sai định dạng dùng lỗi binding 400 hiện có. Thiếu Bearer trả 401. Hướng dẫn tại [6C.1](../../docs/BACKEND-PHASE-6C1.md), request `api/pomodoro-statistics.http`. Script `Try-Pomodoro.ps1 -Mode Statistics` chuẩn hóa Period sang chữ hoa và chỉ gửi timeZone khi người dùng truyền rõ, nên bỏ tham số zone sẽ theo hồ sơ (khác chế độ Daily cũ luôn gửi zone mặc định).

Đợt 6C.1 chưa có API chuỗi ngày hoặc thay biểu đồ/Dashboard. Hai phần giao diện tiếp tục ở 6C.2/6C.3.

## Chuỗi ngày học — 6C.3A

Bổ sung ngày 29/10/2026: **GET `/api/v1/pomodoro-streak`**, Bearer theo tài khoản, `{data,meta}`, `Cache-Control: no-store`. Chỉ mở method GET trong SecurityConfig. Không nhận userId; các method/route khác giữ deny-by-default. Không thêm bảng/migration hoặc lưu bộ đếm chuỗi.

| Query | Quy tắc |
| --- | --- |
| `month` | Tùy chọn `yyyy-MM`, tháng 1900–2099; bỏ qua thì dùng tháng chứa hôm nay trong múi giờ đã chọn. Chuỗi vẫn tính trên toàn lịch sử đến hôm nay. |
| `timeZone` | ZoneId IANA được Java server hỗ trợ; bỏ qua thì dùng hồ sơ tài khoản. |

Ngày tham chiếu **today lấy từ đồng hồ server trong timeZone**, không lấy từ thiết bị hoặc tháng lịch đang xem. API này tính chuỗi toàn tài khoản, không lọc theo môn/học kỳ và không có tham số giả lập ngày hiện tại.

Một ngày đã học khi có ít nhất một phiên COMPLETED với endedAt thuộc ngày đó. Ngày dùng quy tắc ZoneId Java, thống nhất Daily/Statistics: không theo ngày bắt đầu, ngày xác nhận finalizedAt hoặc zone lưu trên từng phiên. RUNNING/PAUSED/CANCELLED và phiên hết giờ chưa Complete không đánh dấu ngày. Số phiên lớn hơn một trong cùng ngày vẫn chỉ tăng một ngày học; mục tiêu ngày 1–12 không thay điều kiện này.

`data` gồm:

| Field | Ý nghĩa |
| --- | --- |
| `today`, `timeZone` | Ngày tham chiếu và múi giờ thực sự sử dụng. |
| `currentStreakDays` | Độ dài chuỗi kết thúc hôm nay; nếu hôm nay chưa học nhưng hôm qua đã học thì giữ chuỗi kết thúc hôm qua. Nếu cả hôm nay/hôm qua chưa học thì 0. |
| `longestStreakDays` | Chuỗi dài nhất trong lịch sử được hỗ trợ, đến hết ngày today. |
| `totalStudiedDays` | Số ngày học khác nhau trong toàn bộ lịch sử đến today; không phải tổng số phiên. |
| `studiedToday` | Hôm nay có ít nhất một phiên hoàn tất hay chưa. |
| `firstStudyDate`, `lastStudyDate` | Ngày học đầu/cuối; null nếu chưa có ngày học. |
| `currentStreakStartDate`, `currentStreakEndDate` | Khoảng chuỗi hiện tại; cả hai null khi currentStreakDays = 0. End có thể là hôm qua. |
| `longestStreakStartDate`, `longestStreakEndDate` | Khoảng chuỗi dài nhất; null nếu chưa học. Nếu nhiều chuỗi dài bằng nhau, chọn chuỗi có ngày kết thúc gần nhất. |
| `calendar` | Dữ liệu tháng đang chọn, không ảnh hưởng các field chuỗi/toàn lịch sử phía trên. |

`calendar` gồm `month,fromDate,toDate,from,to,studiedDays,completedSessions,studyMillis,studySeconds,days`. Date đầu/cuối bao gồm cả ngày; instant from/to là **[from,to)**. Có đủ 28–31 dòng ngày tăng dần, mỗi dòng `{date,from,to,studied,completedSessions,studyMillis,studySeconds}`. Ngày không học là false/0; ngày tương lai false/0. Tháng tương lai có lịch trống nhưng chuỗi hiện tại/dài nhất giữ nguyên. Các tổng calendar bằng tổng các dòng ngày; đơn vị giây là ms/1000, mỗi phiên công nhận 1.500 giây.

Lịch sử chỉ xét các ngày local từ 1900-01-01 đến today, bằng khoảng instant `[historyFrom,today.to)`. Có thể xem lịch 1900–2099 nhưng dữ liệu tương lai chưa được tính. Một snapshot đồng hồ xác định đồng thời today/tháng mặc định/cutoff, tránh lệch khi qua nửa đêm. DST 23/25 giờ vẫn tính một ngày. Nếu một ngày local bị bỏ qua hoàn toàn do thay đổi múi giờ lịch sử (ví dụ Pacific/Apia 30/12/2011), lịch vẫn trả bucket false/0/from=to; ngày không có cơ hội học đó không cộng vào chuỗi và không làm đứt chuỗi giữa hai ngày thực tế liền kề. Ngày bình thường không học vẫn làm đứt chuỗi.

Transaction chỉ đọc REPEATABLE_READ lấy zone hồ sơ (nếu cần) và một truy vấn hai cột `ended_at,elapsed_millis` của các phiên COMPLETED thuộc owner. JDBC forward-only/fetchSize 256, gộp bằng Java theo local date; không tải entity/metadata đầy đủ hoặc toàn bộ danh sách phiên vào bộ nhớ. Bộ nhớ theo số ngày khác nhau, tối đa phạm vi ngày được hỗ trợ; chi phí đọc tăng theo số phiên hoàn tất. Dùng chỉ mục lịch sử V11 hiện có. Không đổi timezone session database hoặc phụ thuộc timezone alias của PostgreSQL. Mọi chuỗi và calendar được tính từ cùng tập dữ liệu; không query riêng từng ngày, không join môn/kỳ đã đổi/xóa và không tạo mục tiêu/cài đặt khi GET.

Month/zone sai trả 400 `INVALID_POMODORO_STREAK_FILTER`; thiếu Bearer trả 401, cookie riêng lẻ không cấp quyền. Đọc đồng thời Complete có thể thấy trước hoặc sau commit, nhưng một response không có tổng/ngày/chuỗi khác snapshot. Các lần GET riêng có thể thấy dữ liệu mới hơn; frontend cần tải lại sau hoàn tất và khi qua ngày.

Xem [hướng dẫn 6C.3A](../../docs/BACKEND-PHASE-6C3A.md), `api/pomodoro-streak.http`, `scripts/Try-Pomodoro.ps1 -Mode Streak [-Month yyyy-MM] [-TimeZone IANA]`. Script bỏ zone thì theo hồ sơ, dùng phiên đăng nhập tạm và logout đúng phiên đó; chặn các tham số Date/Period/course/semester không thuộc chế độ Streak trước khi hỏi mật khẩu. Giao diện/Dashboard nối ở **6C.3B**.
