# Trạng thái đã đọc thông báo — 7B.1

API này lưu **biên nhận đã đọc** theo tài khoản. Danh sách lời nhắc/nội dung vẫn được lấy từ bài tập, lịch thi và lịch học. Đây không phải API gửi push, hàng đợi thông báo hoặc lịch sử thông báo đã phát. Giao diện sẽ nối ở 7B.2.

## Đối tượng

`target` gồm:

| Trường | Giá trị |
| --- | --- |
| `kind` | `ASSIGNMENT`, `EXAM`, `CLASS` |
| `sourceId` | UUID bài tập/lịch thi/chuỗi lịch học đã lưu |
| `occurrenceDate` | Chỉ `CLASS`: YYYY-MM-DD của một buổi thuộc chuỗi, năm 1900–2099. Bài tập/lịch thi bỏ trường hoặc gửi null. |

Hai ngày của cùng chuỗi là hai lời nhắc riêng. Không nhận ID/loại dữ liệu xem thử. Owner luôn lấy từ JWT; `userId` do client gửi không thể chọn tài khoản khác.

## Đọc trạng thái

`POST /api/v1/notification-read-states/query`, Bearer access token, JSON:

```json
{"targets":[{"kind":"ASSIGNMENT","sourceId":"<UUID>"}]}
```

POST để gửi tập khóa có cấu trúc, nhưng giao dịch này **chỉ đọc**, không tạo hàng mặc định, không tăng version. Tối đa 200 khóa, không trùng; mảng rỗng hợp lệ. Một câu SQL tập hợp nguồn/nội dung/biên nhận, không một lượt đọc cho mỗi mục. Trả theo thứ tự yêu cầu:

```json
{
  "data": {
    "asOf": "2026-10-30T00:00:00Z",
    "items": [{
      "target": {"kind":"ASSIGNMENT","sourceId":"<UUID>","occurrenceDate":null},
      "available": true,
      "revision": "<64 ký tự hex thường do server cấp>",
      "basis": {"sourceVersion":0,"courseVersion":0,"semesterVersion":0},
      "read": false,
      "readAt": null
    }]
  },
  "meta": {"timestamp":"...","requestId":"..."}
}
```

`available` là nguồn còn hợp lệ cho việc lưu trạng thái, **không khẳng định mục đang nằm trong cửa sổ nhắc của inbox**:

- Bài tập: đúng owner và chưa COMPLETED; bài quá hạn vẫn khả dụng.
- Lịch thi: đúng owner, bật nhắc và chưa kết thúc.
- Lịch học: ngày khớp thứ/phạm vi chuỗi, chưa kết thúc theo múi giờ lịch, không CANCELLED.
- Nguồn thiếu/đã xóa/không thuộc owner/không khả dụng: cùng trả `available:false`, `revision:null`, `basis:null`, `read:false`, `readAt:null`; không lộ trạng thái của người khác.

Client vẫn áp dụng bộ lọc ngày/giờ nhắc đã có và không tạo thêm lời nhắc chỉ vì `available:true`. API không trả tiêu đề, nội dung ghi chú, thông tin tài khoản, chuỗi revision nội bộ hoặc số lượng thông báo toàn tài khoản.

`revision` là SHA-256 của nội dung nguồn hiện tại, không phải frontend tự bịa hoặc version DB của biên nhận. Khi nội dung đổi, biên nhận cũ không còn khớp, `read:false`, `readAt:null`. Bài tập/lịch thi gồm version nguồn; lời nhắc lịch học dùng **nội dung hiệu lực của riêng ngày đó**, không dùng parent version: đổi ngoại lệ ở ngày khác không làm buổi không đổi thành chưa đọc. Tên/mã môn và kỳ/năm cũng được đối chiếu; đổi màu môn không làm đổi revision.

Đối với lịch học được khôi phục về đúng nội dung đã từng đọc, revision có thể trở lại giá trị cũ. Đây là trạng thái đọc theo nội dung hiện tại, không phải nhật ký giao nhận của mọi thay đổi.

`basis` là phiên bản nguồn/môn/học kỳ dùng khi tính nội dung. **Hợp đồng cho 7B.2:** client phải đối chiếu basis với nguồn đã render trước khi cho đánh dấu đã đọc; nếu query mới hơn nội dung đang hiển thị, đọc lại và hiển thị nội dung mới rồi mới cho đánh dấu. Không lấy revision mới ghép với UI cũ. Với CLASS, `sourceVersion` là `scheduleVersion`; parent đổi vì buổi khác có thể yêu cầu đối chiếu nguồn nhưng không tự làm mất biên nhận của buổi không đổi.

## Đánh dấu đã đọc / tất cả mục đang xem

`PUT /api/v1/notification-read-states`, cùng Bearer:

```json
{
  "items": [{
    "target": {"kind":"ASSIGNMENT","sourceId":"<UUID>"},
    "revision": "<revision đã đọc cùng nội dung hiển thị>"
  }]
}
```

1–200 mục, không trùng. Trả snapshot cùng cấu trúc, mọi mục thành `read:true`. “Đọc tất cả” gửi **tập mục và revision đã quan sát**, dùng cùng API; không có endpoint quét đánh dấu cả những mục vừa xuất hiện mà người dùng chưa thấy. Nếu danh sách nhiều hơn 200, chia theo lô; tính nguyên tử chỉ trong một lô, không toàn bộ các lô.

Server khóa owner theo cùng thứ tự với các API ghi học tập, đọc/kiểm tra toàn bộ revision trước khi ghi và commit một giao dịch. Một mục không còn khả dụng → 404; một revision đã đổi → 409; **không lưu một phần lô**. PUT lặp cùng revision giữ nguyên `readAt`, không tạo trùng; phản hồi thất lạc có thể đối chiếu bằng query rồi gửi lại đúng revision đã quan sát. Không tự thay revision rồi gửi lại sau conflict.

Nguồn bị hoàn thành/hủy/hết giờ không hiển thị thành đã đọc từ biên nhận cũ. Khi nguồn bị xóa, FK xóa cascade các biên nhận tương ứng. Không tự xóa biên nhận khi chỉ chuyển màn hình, đổi bộ lọc hoặc khi một nguồn đang lỗi tải.

## Lỗi và bảo mật

| HTTP / code | Ý nghĩa |
| --- | --- |
| 400 `INVALID_REQUEST` | JSON/UUID/enum không đọc được |
| 400 `VALIDATION_FAILED` | Thiếu trường, revision sai mẫu, null phần tử, số mục vượt giới hạn hoặc PUT rỗng |
| 400 `INVALID_NOTIFICATION_TARGET` | Ngày sai/không đúng loại, khóa trùng |
| 401 | Thiếu/hỏng/hết hạn/thu hồi phiên |
| 403 `ACCESS_DENIED` | Phương thức/đường dẫn ngoài allowlist |
| 404 `NOTIFICATION_SOURCE_UNAVAILABLE` | PUT chứa nguồn không còn khả dụng, thiếu hoặc của người khác |
| 409 `NOTIFICATION_REVISION_CONFLICT` | Nội dung đã đổi sau khi đọc |
| 503 `DATABASE_UNAVAILABLE` | Không truy cập được database; không được coi là chưa đọc/đã đọc thành công |

Response thành công và lỗi nghiệp vụ có `Cache-Control: no-store`; lỗi dùng ProblemDetail chuẩn/requestId. Không xác thực bằng cookie ở các endpoint này; không nhận owner từ body. Các FK nguồn + owner ở database chặn cả biên nhận trỏ nhầm tài khoản. Không có API reset/xóa toàn bộ lịch sử đọc.

## Lưu trữ

V12 thêm `notification_read_states` với khóa `(user_id,kind,source_id,occurrence_date)`; ngày sentinel 1970-01-01 chỉ dùng nội bộ cho ASSIGNMENT/EXAM. Có FK composite owner tới ba loại nguồn, CHECK đúng loại/ngày/revision và chỉ mục hỗ trợ cascade. Thêm unique `(id,user_id)` cho exams để tạo FK; không sửa bản ghi học tập. Không dependency mới.

Giao dịch đọc dùng `readOnly=true, REPEATABLE_READ`; giao dịch ghi dùng owner lock, kiểm tra và upsert. Tham khảo ngữ nghĩa giao dịch tại [tài liệu Spring chính thức](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html). Exception nghiệp vụ là RuntimeException để rollback theo cấu hình hiện tại.
