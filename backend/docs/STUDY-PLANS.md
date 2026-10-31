# Hợp đồng đề xuất kế hoạch học — 8A.1

`POST /api/v1/study-plans/preview`, Bearer bắt buộc, trả 200 trong envelope `data/meta`, `Cache-Control: no-store`. POST là phép đọc dữ liệu riêng tư, không tạo kế hoạch/buổi học, không gọi AI. API duyệt/lưu nhóm và biên nhận đã có ở **8A.3A**, xem [STUDY-PLAN-APPLICATIONS.md](STUDY-PLAN-APPLICATIONS.md). Preview vẫn chỉ đọc, không giữ chỗ; V13 chỉ bổ sung bảng biên nhận cho thao tác Apply, không seed dữ liệu.

## Request

| Trường | Quy tắc |
| --- | --- |
| `courseId` | UUID môn thuộc tài khoản đăng nhập. |
| `assignmentId` / `examId` | Tùy chọn, tối đa một. Cùng tài khoản và cùng môn. Bài phải chưa hoàn thành; deadline phải còn tương lai. Với kỳ thi, deadline là thời điểm bắt đầu thi, không phụ thuộc bật/tắt nhắc. Bỏ cả hai để tự học độc lập. |
| `goal` | Chuỗi không trống sau trim, tối đa 120 ký tự; chỉ là tên mục tiêu, chưa được AI phân tích. |
| `fromDate`, `toDate` | YYYY-MM-DD thực, bao gồm hai đầu, tối đa 14 ngày liên tiếp; từ hôm nay theo `timeZone`, năm 1900–2099, khung giờ cuối phải kết thúc trước 2100 theo UTC để lưu được qua API tự học hiện tại. |
| `timeZone` | IANA Java ZoneId, ví dụ `Asia/Ho_Chi_Minh`, `UTC`; không nhận offset `+07:00`. |
| `availableStart`, `availableEnd` | HH:mm 24 giờ, một khung rảnh áp dụng mỗi ngày đã chọn. Bắt đầu < kết thúc, cùng ngày, không nhận 24:00. |
| `weekdays` | Mảng 1–7 không trùng, T2=1, CN=7; bỏ/null mặc định cả tuần. Mảng trống/null bên trong không hợp lệ. |
| `totalMinutes` | Số nguyên 1–1440: số phút học **còn muốn xếp thêm**, không phải tổng thời gian của các buổi đã lưu. |
| `sessionMinutes` | Số nguyên 15–240: độ dài buổi ưu tiên. Buổi cuối chỉ lấy số phút còn thiếu, có thể dưới 15 phút. |
| `breakMinutes` | 0–60, mặc định 10. Khoảng nghỉ tối thiểu giữa các buổi mới trong cùng đề xuất, không cộng vào số phút học, không tạo bản ghi nghỉ. |

Không nhận `userId`, `asOf`, deadline hay lịch bận từ client để quyết định quyền/dữ liệu. Clock do server xác định. Các trường thừa không thay thế dữ liệu lấy từ tài khoản.

## Quy tắc xếp

1. Một transaction `readOnly`, isolation `REPEATABLE_READ` đọc môn/mục tiêu và toàn bộ lịch bận của cùng owner. Không khóa ghi, không giữ chỗ sau phản hồi.
2. Lịch bận gồm tất cả học kỳ/môn: chuỗi lịch phát sinh theo ngày và múi giờ gốc, dùng giờ sau ngoại lệ, bỏ buổi nghỉ; mọi lịch thi kể cả tắt nhắc; các buổi tự học đã lưu. Trạng thái hoàn thành buổi tự học vẫn giữ khoảng giờ giống API kiểm tra trùng hiện tại. Không trừ các buổi đã lưu khỏi `totalMinutes`.
3. Các nguồn được đọc theo lô, không query từng ngày/từng phương án. Padded UTC dates ±2 ngày bao phủ lịch ở phía đối diện đường đổi ngày. Trên 500 chuỗi hoặc 10.000 khoảng bận trả 422, không trả đề xuất dở dang.
4. Duyệt ngày/giờ sớm nhất, gộp các khoảng bận và tìm khoảng trống đủ **trọn một buổi**. Dùng khoảng `[start,end)`; được kết thúc đúng lúc sự kiện khác bắt đầu hoặc đúng deadline. Không rút ngắn từng buổi để nhét vào các khoảng vụn; chỉ buổi cuối rút về số phút còn thiếu.
5. Bắt đầu đến phút, làm tròn **lên** khi giờ server/giờ kết thúc bận có giây hoặc microsecond. Không làm tròn deadline lên; không xếp trong quá khứ. Múi giờ đề xuất dùng để xét hôm nay/khung rảnh, mọi so sánh trùng/giới hạn dùng Instant.
6. Khung rảnh có giờ đầu/cuối không tồn tại hoặc lặp lại do DST được bỏ qua ngày đó và có `DST_WINDOW_SKIPPED`, không tự dịch giờ. Khung có hai đầu duy nhất nhưng đi qua đổi giờ dùng số phút thực tế. Lịch học bận dùng `ClassOccurrenceResponse` chung với API lịch hiện có.
7. Kết quả cố định khi cùng input, snapshot dữ liệu và mốc server. Không randomness, không AI/LLM/API key; không tối ưu toàn cục hoặc tự suy ra số giờ cần học từ tên bài. Xếp sớm nhất có thể tập trung nhiều buổi trong một ngày; chưa có nhiều khung rảnh/ngày hay cân bằng theo ngày.

## Response

```json
{
  "engine":"RULE_BASED_V1",
  "persisted":false,
  "asOf":"2026-11-02T00:00:00Z",
  "courseId":"UUID_MON",
  "courseVersion":0,
  "target":{"kind":"SELF_STUDY","id":null,"version":null,"deadline":null},
  "goal":"Làm bài React",
  "fromDate":"2026-11-02",
  "toDate":"2026-11-03",
  "timeZone":"Asia/Ho_Chi_Minh",
  "requestedMinutes":180,
  "scheduledMinutes":180,
  "unscheduledMinutes":0,
  "complete":true,
  "warnings":[],
  "sessions":[
    {"index":1,"title":"Làm bài React · Buổi 1","courseId":"UUID_MON","assignmentId":null,"startsAt":"2026-11-02T12:00:00Z","endsAt":"2026-11-02T12:45:00Z","timeZone":"Asia/Ho_Chi_Minh","durationMinutes":45}
  ]
}
```

Ví dụ rút gọn `sessions` chỉ minh họa buổi 1: thực tế lịch trống, khung 19:00–21:00 hai ngày và nghỉ 10 phút trả bốn buổi: 19:00–19:45, 19:55–20:40 mỗi ngày.

`target.kind` là SELF_STUDY/ASSIGNMENT/EXAM, có id/version/deadline lấy từ DB khi gắn mục tiêu. Tên/notes của các sự kiện bận không trả về. `index` chỉ vị trí trong bản xem trước, không phải ID buổi đã lưu. Session gắn bài có `assignmentId`; liên kết kỳ thi hiện chỉ nằm trong metadata mục tiêu, chưa thêm cột examId cho buổi tự học.

`scheduledMinutes + unscheduledMinutes = requestedMinutes`; `complete` chỉ có nghĩa đã xếp đủ phút, **không có nghĩa bài tập/buổi học đã hoàn thành hoặc kế hoạch đã lưu**. Thiếu thời gian trả 200 với phần đề xuất có thể xếp và `INSUFFICIENT_CONTIGUOUS_TIME`, không báo thành công toàn phần. `DEADLINE_LIMIT` cho biết deadline cắt khung rảnh đã duyệt; không phải lỗi API.

## Lỗi

| HTTP | Code |
| --- | --- |
| 400 | `VALIDATION_FAILED` cho trường bắt buộc/giới hạn số; `INVALID_REQUEST` cho JSON/UUID sai; `INVALID_STUDY_PLAN` cho ngày/giờ/zone/thứ trùng/hai mục tiêu. |
| 401 | `AUTHENTICATION_REQUIRED` / `INVALID_ACCESS_TOKEN`. Cookie auth không thay thế Bearer ở endpoint này. |
| 403 | `ACCESS_DENIED` cho method/route ngoài allowlist, không bao gồm POST `/apply` đã triển khai ở 8A.3A. |
| 404 | `COURSE_NOT_FOUND`, `ASSIGNMENT_NOT_FOUND`, `EXAM_NOT_FOUND`; ID lạ và ID người khác trả cùng loại lỗi. |
| 409 | `STUDY_PLAN_TARGET_COURSE_MISMATCH`, `STUDY_PLAN_TARGET_COMPLETED`, `STUDY_PLAN_DEADLINE_PASSED`. |
| 422 | `STUDY_PLAN_SOURCE_LIMIT`. |

Đề xuất không có hiệu lực như reservation hay token cho phép lưu. Sau khi người dùng xem/sửa/duyệt, backend phải đọc và kiểm tra quyền, trạng thái, deadline, trùng lịch và version lại. API tự học hiện có vẫn chặn ghi trùng/qua deadline; duyệt nhiều buổi nguyên tử/chống gửi trùng đã có qua API riêng ở 8A.3A; frontend duyệt/lưu còn 8A.3B. Không tự POST từng buổi từ frontend chỉ vì preview trả 200.

Thử bằng `scripts/Try-StudyPlan.ps1` hoặc [IntelliJ HTTP](../api/study-plans.http). [Hướng dẫn người dùng](../../docs/BACKEND-PHASE-8A1.md).
