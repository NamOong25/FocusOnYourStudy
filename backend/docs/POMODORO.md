# Pomodoro — hợp đồng 6A.1

Ngày 28/10/2026. API `/api/v1/pomodoro-sessions`, xác thực Bearer theo tài khoản hiện tại; không nhận `userId`. Success dùng `{data,meta}`, lỗi dùng ProblemDetail và `code` hiện có. Response không cache (`Cache-Control: no-store`). V10 chỉ thêm bảng `pomodoro_sessions`, không seed hoặc sửa dữ liệu học tập cũ.

## Phạm vi

Phiên tập trung **25 phút**, bắt đầu → tạm dừng → tiếp tục → đọc lại. Mỗi tài khoản có tối đa một phiên RUNNING/PAUSED, bảo vệ bằng khóa tài khoản trong transaction và unique partial index PostgreSQL. Không tạo bản ghi Pomodoro từ `study_sessions`: bảng cũ lưu kế hoạch; bảng mới lưu thời gian thực tế.

Chưa có hoàn tất/hủy, lịch sử phiên hoàn tất, mục tiêu ngày, chế độ nghỉ hoặc thống kê. **Hết 25 phút vẫn giữ phiên đang hoạt động với `timeUp=true`, không tự cộng phút/hoàn thành bài.** Chỉ đọc dữ liệu không tạo bản ghi, không tăng version. Hoàn tất/hủy sẽ bổ sung ở 6A.2; UI và khôi phục trong frontend ở 6B. Không nghiệm thu native/chạy nền trong đợt này.

## Endpoints

| Method | Path | Nội dung |
| --- | --- | --- |
| GET | `/active` | Phiên hiện tại; `data:null` nếu chưa có. |
| GET | `/{id}` | Đọc đúng phiên của tài khoản; không tồn tại/khác chủ trả 404. |
| POST | gốc | Bắt đầu; lần đầu 201 + Location, gửi lại cùng yêu cầu 200 + cùng ID. |
| POST | `/{id}/pause` | RUNNING chưa hết giờ → PAUSED; body `{ "version": 0 }`. |
| POST | `/{id}/resume` | PAUSED → RUNNING; body `{ "version": 1 }`. |

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
- `endsAt`: deadline đoạn đang chạy, null khi PAUSED; sau resume dịch theo thời gian tạm dừng, không reset về 25 phút.
- `timeUp`: true khi đã đủ thời lượng; chưa phải trạng thái hoàn tất/phiên được công nhận.
- `context`: snapshot `courseId/code/name`, `semesterId/term/startYear`, `assignmentId/title`, `studySessionId/title` lúc bắt đầu.

Mốc chuyển trạng thái được chuẩn hóa đến ms và phép cộng giữ ms qua từng pause/resume. Giờ UTC đo khoảng thời gian thật qua nửa đêm/DST; timeZone dành cho ngữ cảnh hiển thị, không dùng phép trừ giờ địa phương. Nếu đồng hồ server lùi trước mốc chuyển trạng thái gần nhất, delta được chặn ở 0. Vận hành cần đồng hồ server ổn định; không có cam kết chống mọi thay đổi đồng hồ hệ thống.

Backend tắt khi RUNNING: khi mở lại, tính theo deadline cũ và chặn tại 25 phút. Backend tắt khi PAUSED: thời gian còn lại giữ nguyên. Không cần request tick mỗi giây; GET không ghi lại thời gian đã trôi.

Snapshot ngữ cảnh được kiểm tra ownership khi bắt đầu và lưu nguyên. Sau này đổi tên/chuyển kỳ/xóa nguồn không sửa lịch sử phiên. Các ID nguồn là **tham chiếu lịch sử**, không có academic foreign key; giao diện tương lai cần xử lý trường hợp nguồn đã bị xóa. User FK vẫn bắt buộc. Gửi lại Start đã lưu không kiểm tra lại nguồn đã đổi/xóa và không chép tên mới vào phiên cũ.

## Đồng thời và mất phản hồi

Start khóa tài khoản trước tra `clientRequestId`/phiên hoạt động/nguồn. Một `clientRequestId` gắn với nội dung course/assignment/study/zone ban đầu trong tài khoản; cùng UUID ở tài khoản khác độc lập. Gửi lại cùng nội dung trả **trạng thái hiện tại của phiên đó**, kể cả PAUSED; không reset giờ, không tạo phiên mới. Dùng lại UUID với nội dung khác trả 409.

Pause/resume bắt buộc version hiện tại. Thao tác thành công tăng version; version cũ trả 409 trước thay đổi. Hai lệnh cùng version không cùng ghi thành công. Đúng version nhưng sai trạng thái cũng trả 409, không sửa dữ liệu.

Sau timeout/mất phản hồi: đọc `/active` hoặc `/{id}` để đối chiếu. Chỉ gửi lại Start với **đúng clientRequestId và nội dung cũ**. Không tự tăng version hoặc lặp pause/resume. Script không tự retry thao tác ghi; phiên đăng nhập tạm của script được logout riêng, phiên Pomodoro vẫn còn.

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

Các method/route ngoài phạm vi vẫn bị cấu hình deny-by-default chặn. Web tiếp tục dùng bảo vệ CSRF hiện có khi request có Origin/cookie; không mở endpoint public hoặc bỏ auth để chạy script.
