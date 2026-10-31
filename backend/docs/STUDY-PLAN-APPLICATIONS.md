# Lưu nhóm buổi đề xuất — 8A.3A

| Method | Endpoint | Kết quả |
| --- | --- | --- |
| POST | `/api/v1/study-plans/apply` | 201 khi lưu mới; 200 khi cùng mã/nội dung đã lưu trước đó. `Location` trỏ tới biên nhận theo mã yêu cầu. |
| GET | `/api/v1/study-plans/applications/{clientRequestId}` | 200 biên nhận của chính tài khoản; 404 như nhau cho mã lạ hoặc mã của tài khoản khác. Chỉ đọc. |

Cần Bearer; cookie đăng nhập không thay thế Bearer. Thành công dùng envelope `data/meta` và `Cache-Control: no-store`. Không gọi LLM, không thay đổi API preview và không tự POST từng buổi. Giao diện duyệt/lưu nhóm đã nối ở 8A.3B; xem [hướng dẫn web](../../docs/FRONTEND-PHASE-8A3B.md).

## Body Apply

```json
{
  "clientRequestId":"a0000000-0000-4000-8000-000000000001",
  "conditions":{
    "courseId":"b0000000-0000-4000-8000-000000000001",
    "goal":"Ôn tập React",
    "fromDate":"2026-11-02","toDate":"2026-11-03",
    "timeZone":"Asia/Ho_Chi_Minh",
    "availableStart":"19:00","availableEnd":"21:00",
    "weekdays":[1,2,3,4,5,6,7],
    "totalMinutes":180,"sessionMinutes":45,"breakMinutes":10
  },
  "courseVersion":0,
  "targetVersion":null,
  "sessions":[
    {"index":1,"title":"Ôn tập React · Buổi 1","startsAt":"2026-11-02T12:00:00Z","durationMinutes":45},
    {"index":3,"title":"Luyện bài tập","startsAt":"2026-11-03T12:00:00Z","durationMinutes":30}
  ]
}
```

UUID và ngày trong ví dụ phải thay bằng dữ liệu thật/còn tương lai. Chỉ gửi **các buổi đã chọn**, không gửi cờ `selected` hoặc các dòng đã bỏ chọn.

- `clientRequestId`: UUID tạo **một lần cho một lần duyệt**, giữ trước khi gửi. Cùng key thuộc tài khoản khác là phạm vi độc lập.
- `conditions`: hợp đồng [preview](STUDY-PLANS.md), validation lồng nhau, tối đa 14 ngày từ hôm nay theo zone, tổng phút 1–1440; `weekdays` mặc định cả tuần, nghỉ mặc định 10. Chọn tối đa bài hoặc thi; không có cả hai.
- `courseVersion`: version môn từ bản đã xem, số nguyên không âm. `targetVersion` bắt buộc khi có bài/thi, phải null/bỏ khi tự học độc lập. Version phải khớp DB khi lưu mới; không tự thay bằng version vừa đọc mà chưa xem lại đề xuất.
- `sessions`: 1–97 dòng, `index` nguyên 1–97 duy nhất, có thể không liên tiếp. Tên trim 1–200 ký tự; `startsAt` ISO có offset/Z, đến phút; thời lượng nguyên 1–240 phút. Có thể sửa thời lượng khác giá trị ưu tiên `sessionMinutes`. Tổng thời lượng được backend tính lại và không vượt `totalMinutes`.
- Mỗi buổi nhận cùng môn, bài tùy chọn và zone từ `conditions`, trạng thái **PLANNED**, ghi chú rỗng. Trường thừa như `userId`, `status`, `savedMinutes`, `courseId` bên trong dòng không thay thế giá trị do server quyết định.
- Mục tiêu thi được kiểm tra và lưu trong metadata biên nhận; chưa thêm `examId` vào bảng `study_sessions`, giống hợp đồng preview. Không khôi phục phần upload/tài liệu.

## Kiểm tra và lưu nguyên khối

1. Transaction `READ_COMMITTED` lấy **khóa app_users của owner trước**, cùng khóa với các writer học kỳ/môn/bài/lịch học/ngoại lệ/thi/tự học. Sau khi chờ khóa mới đọc dữ liệu và lấy giờ server; không dùng snapshot trước khi chờ.
2. Nếu đã có biên nhận cho key: đối chiếu SHA-256 của lệnh đã chuẩn hóa. Đúng nội dung trả 200 biên nhận cũ **trước** kiểm tra ngày/nguồn hiện tại; khác nội dung trả 409 `STUDY_PLAN_REQUEST_REUSED`.
3. Lưu mới: kiểm tra owner, liên kết môn, trạng thái mục tiêu, deadline còn tương lai và version. Không tin deadline, tổng đã lưu, lịch bận hay quyền do client tự gửi. Endpoint nhận bản người dùng đã chỉnh và xác minh lại; preview không phải chữ ký/chứng thư hoặc giữ chỗ.
4. Bắt đầu không trước giờ server, kết thúc cùng ngày theo zone và trước năm 2100 UTC; nằm đúng ngày/thứ/khung rảnh. Khung có đầu/cuối không tồn tại hoặc mơ hồ do DST bị từ chối. Với hai đầu duy nhất, so sánh bằng Instant nên khoảng qua DST vẫn tính phút thực. Offset rõ ràng giữ nguyên thời điểm trong giờ lặp, không tự dịch giờ.
5. Kiểm tra chồng lấn và khoảng nghỉ giữa các dòng đang chọn; đọc lịch bận **toàn tài khoản/tất cả môn-kỳ** theo lô bằng bộ đọc chung với preview, bao gồm ngoại lệ, lịch thi tắt nhắc và buổi tự học đã hoàn thành. Khoảng nửa mở cho phép chạm biên; không yêu cầu nghỉ thêm giữa buổi mới và sự kiện đã lưu, giống preview. Giới hạn 500 chuỗi/10.000 khoảng bận vẫn áp dụng.
6. Khi tất cả hợp lệ mới tạo các `study_sessions` và biên nhận trong **cùng transaction**. Lỗi ở một dòng hoặc khi ghi biên nhận rollback toàn nhóm. Không lưu phần đầu và báo thành công phần còn lại; không tự sửa giờ/lùi deadline/ghi đè lịch khác.

Nguyên tắc transaction tham chiếu [tài liệu Spring Framework](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html). Test PostgreSQL kiểm tra lỗi ngay ở dòng thứ hai và lúc ghi biên nhận, cùng thao tác đồng thời khi tập lịch ban đầu rỗng.

## Biên nhận và đối chiếu sau mất phản hồi

`data` gồm `applicationId`, `clientRequestId`, `persisted:true`, `appliedAt`, `courseId`, `courseVersion`, `target` (kind/id/version/deadline từ DB), `requestedMinutes`, `savedMinutes`, `remainingMinutes`, `sessions:[{index,session:<StudyResponse>}]`.

`savedMinutes + remainingMinutes = requestedMinutes`. Cho phép duyệt phần đã chọn dù thiếu phút; không gọi đó là đã học xong hoặc đã lưu đủ mục tiêu. Danh sách và tổng là ảnh chụp **giao dịch đã thành công**, có các ID thật; GET/replay không sửa lại nội dung biên nhận.

- Sau timeout/mất mạng: giữ **đúng key và body đã gửi**, GET biên nhận để đối chiếu. 404 chỉ là chưa thấy biên nhận ở thời điểm đọc; một POST có thể còn đang xử lý. Không suy ra được phép tự tạo key mới.
- Nếu cần gửi lại, người dùng chủ động gửi **cùng key/body**: 201/200 vẫn chỉ có một nhóm buổi. Không có cơ chế tự retry ghi trong đợt này.
- Các trường hợp chuẩn hóa tương đương không tạo lệnh khác: thứ tự các dòng/weekday, offset khác biểu diễn cùng Instant, khoảng trắng ngoài tên/mục tiêu, defaults nghỉ/thứ bỏ hoặc khai rõ. Đổi nội dung/điều kiện/version đã lưu cùng key trả 409.
- Lỗi trước commit không tạo biên nhận và không chiếm key. Chỉ chỉnh/retry sau khi đã đối chiếu kết quả; không dùng việc “không có dữ liệu trên UI” làm bằng chứng giao dịch thất bại.
- Sau khi buổi/môn/bài đã sửa hoặc xóa: replay vẫn trả biên nhận gốc, **không tạo lại** các buổi đã xóa và không ghi đè sửa đổi. Đọc API tự học để lấy trạng thái hiện tại; không đổ ảnh chụp cũ trực tiếp lên danh sách hiện hành.
- V13 thêm `study_plan_applications`, unique `(user_id,client_request_id)`, hash/JSON constraints, FK owner cascade khi xóa tài khoản. Không FK tới môn/bài/buổi để mất nguồn không làm mất khóa chống tạo trùng. Chưa có TTL/tác vụ tự xóa biên nhận, không coi là bản nháp được lưu trước khi Apply.

## Lỗi chính

| HTTP | Code |
| --- | --- |
| 400 | `VALIDATION_FAILED`, `INVALID_REQUEST`, `INVALID_STUDY_PLAN`: field/nested/UUID/time/index trùng/tổng vượt/metadata version không phù hợp. |
| 401 | `AUTHENTICATION_REQUIRED`, `INVALID_ACCESS_TOKEN`. |
| 403 | `ACCESS_DENIED`: method/route ngoài allowlist. |
| 404 | `COURSE_NOT_FOUND`, `ASSIGNMENT_NOT_FOUND`, `EXAM_NOT_FOUND`, `STUDY_PLAN_APPLICATION_NOT_FOUND`; không phân biệt lạ và khác owner. |
| 409 | `STUDY_PLAN_SOURCE_CHANGED`, `STUDY_PLAN_TARGET_COURSE_MISMATCH`, `STUDY_PLAN_TARGET_COMPLETED`, `STUDY_PLAN_DEADLINE_PASSED`. |
| 409 | `STUDY_PLAN_IN_PAST`, `STUDY_PLAN_OUTSIDE_AVAILABILITY`, `STUDY_AFTER_DEADLINE`, `STUDY_PLAN_SELECTION_CONFLICT`, `STUDY_PLAN_TIME_CONFLICT`, `STUDY_PLAN_REQUEST_REUSED`. |
| 409/503 | Lỗi database dùng ProblemDetail chung (`DATA_CONFLICT` / `DATABASE_UNAVAILABLE`); không có thành công giả. Sau sự cố truyền tải cần đối chiếu key. |
| 422 | `STUDY_PLAN_SOURCE_LIMIT`: không ghi nhóm dở dang. |

Thử bằng `scripts/Try-StudyPlanApply.ps1 -Mode Prepare|Apply|Get` hoặc [IntelliJ HTTP](../api/study-plan-applications.http). [Hướng dẫn từng bước](../../docs/BACKEND-PHASE-8A3A.md).
