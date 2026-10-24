# Ngoại lệ từng buổi — 4E.2A

Base: `/api/v1/class-schedules/{scheduleId}/exceptions`. Cần Bearer của phiên còn hiệu lực; chủ sở hữu lấy từ JWT. Cookie riêng lẻ không cấp quyền. UUID chuỗi không có/khác chủ cùng trả `CLASS_SCHEDULE_NOT_FOUND`, kể cả danh sách ngoại lệ rỗng.

## Endpoint

| Phương thức | Đường dẫn tương đối | Kết quả |
| --- | --- | --- |
| GET | `/` | 200, danh sách ngoại lệ đang có của chuỗi, sắp theo ngày. |
| GET | `/{date}` | 200, ngoại lệ một ngày; 404 nếu ngày có lịch nhưng không có ngoại lệ. |
| PUT | `/{date}` | 200, tạo hoặc thay toàn bộ ngoại lệ cho đúng ngày đó. |
| DELETE | `/{date}?scheduleVersion=1` | 204, bỏ ngoại lệ để dùng lại lịch gốc hiện tại. |

`date` là `YYYY-MM-DD` theo múi giờ của chuỗi, phải nằm trong khoảng áp dụng và đúng một thứ đã chọn. Không dùng ngoại lệ để thêm một ngày không có lịch hoặc dời sang ngày khác. Các buổi còn lại giữ nguyên. Lịch học lặp và các endpoint của 4E.1 tiếp tục hoạt động.

## Nghỉ hoặc đổi buổi

Ví dụ nghỉ ngày 26/10/2026:

```json
{ "kind": "CANCELLED", "reason": "Giảng viên báo nghỉ", "scheduleVersion": 0 }
```

Buổi nghỉ không nhận startTime/endTime/room/teacher; để null hoặc bỏ các trường đó. Giờ gốc vẫn được trả trong occurrences để hiển thị lịch dự kiến, nhưng cờ cancelled là true.

Ví dụ đổi riêng giờ/phòng/giảng viên ngày đó:

```json
{
  "kind": "CHANGED",
  "startTime": "10:00",
  "endTime": "12:00",
  "room": "B2.03",
  "teacher": "Giảng viên thay thế",
  "reason": "Đổi buổi thực hành",
  "scheduleVersion": 1
}
```

- CHANGED cần ít nhất một trường thay thế khác null trong startTime/endTime/room/teacher.
- **Bỏ trường/null = kế thừa từ chuỗi.** Chuỗi rỗng cho room/teacher = chủ động để trống. Nếu chuỗi gốc đổi, trường đang kế thừa theo giá trị mới; trường đã đặt riêng giữ nguyên.
- PUT thay toàn bộ ngoại lệ, không phải PATCH. Bỏ một trường đang ghi đè nghĩa là trở lại kế thừa. Đổi CANCELLED → CHANGED sẽ mở lại buổi ở lịch mới; CHANGED → CANCELLED cần bỏ hết trường ghi đè.
- Giờ đúng HH:mm, theo múi giờ chuỗi. Kiểm tra **giờ thực tế sau khi kế thừa**, kết thúc sau bắt đầu và trước 24:00. Không tự đổi timeZone hoặc courseId qua ngoại lệ. Giờ DST không tồn tại/có hai lần bị từ chối; thời điểm tuyệt đối vẫn trong [1900-01-01Z,2100-01-01Z).
- room/teacher/reason trim, tối đa 100/200/1000 ký tự. reason bỏ qua/null thành chuỗi rỗng. Không gửi reminder hoặc notes riêng; các trường đó tiếp tục từ chuỗi.

Response: `id, scheduleId, date, kind, startTime, endTime, room, teacher, reason, scheduleVersion, createdAt, updatedAt`. Giờ/phòng/giảng viên nullable là **cấu hình ghi đè**, không phải giá trị đã kế thừa; xem occurrences để lấy kết quả cuối cùng.

## Phiên bản và khôi phục

Mọi PUT/DELETE ngoại lệ cần **scheduleVersion của cả chuỗi**. Lấy `version` từ GET chuỗi hoặc `scheduleVersion` từ ngoại lệ/occurrences. Không dùng một phiên bản ngoại lệ riêng. Mỗi lần lưu hoặc khôi phục ngoại lệ làm tăng version chuỗi, kể cả PUT cùng nội dung. Một thay đổi ở ngày khác cũng khiến bản đang sửa trở thành cũ.

Điều này bảo vệ trường hợp: mở bản A → nơi khác khôi phục → tạo lại ngoại lệ cùng ngày. Dù hàng ngoại lệ mới có UUID khác, bản A vẫn bị chặn bằng version chuỗi. Không tự nạp phiên bản mới rồi gửi lại thao tác ghi; cần xem lại dữ liệu trước.

DELETE xóa ngoại lệ của đúng ngày, dùng lại **giá trị hiện tại của chuỗi**. Không khôi phục ảnh chụp cũ và không sửa các tuần khác. Sau 204 đọc lại chuỗi để lấy version mới; GET ngoại lệ ngày đó trả 404. DELETE khi không có ngoại lệ trả 404, hoặc 409 nếu version đã cũ. Không coi mất phản hồi là chưa lưu; kiểm tra GET/List trước khi chủ động thử lại.

## Occurrences và sửa cả chuỗi

`GET /api/v1/class-schedules/occurrences` bổ sung `cancelled, changed, reason, exceptionId`. startTime/endTime, startsAt/endsAt, room/teacher là giá trị **đã áp dụng ngoại lệ**. cancelled và changed không đồng thời true. Không có ngoại lệ: cả hai false, reason rỗng, exceptionId null. scheduleVersion là version chuỗi ở cùng ảnh chụp đọc.

Buổi nghỉ **vẫn có trong danh sách** để hiển thị/khôi phục; thành phần tính giờ bận phải bỏ dòng cancelled. 4E.2B sẽ nối điều này vào kiểm tra trùng. Không thay giới hạn lọc 92 ngày của 4E.1.

- Sửa ngày/thứ cả chuỗi làm một ngày ngoại lệ không còn thuộc lịch: 409 `CLASS_SCHEDULE_HAS_EXCEPTIONS`. Cần khôi phục ngày đó trước, không tự xóa ngoại lệ.
- Đổi giờ/múi giờ chuỗi làm một buổi CHANGED không còn hợp lệ sau kế thừa: 409, rollback toàn bộ.
- Chuyển chuỗi sang môn khác khi còn ngoại lệ: 409, cần khôi phục ngoại lệ trước. Sửa phòng/giảng viên hoặc thời gian vẫn giữ ngoại lệ nếu tất cả còn hợp lệ.
- Xóa **cả chuỗi** bằng version mới nhất sẽ xóa ngoại lệ của chính chuỗi trong cùng giao dịch; không xóa ngoại lệ của chuỗi khác, môn, bài hoặc tự học.

## Mã lỗi

| HTTP/code | Ý nghĩa |
| --- | --- |
| 400 VALIDATION_FAILED / INVALID_REQUEST | Thiếu/sai kind, giờ, độ dài hoặc scheduleVersion; body có lỗi theo field nếu validation bắt được. |
| 400 INVALID_CLASS_DATE | Ngày đường dẫn sai định dạng/ngoài năm 1900–2099. |
| 400 INVALID_CLASS_EXCEPTION | Kết hợp kind/ghi đè sai, giờ thực tế đảo ngược hoặc DST không rõ. |
| 404 CLASS_SCHEDULE_NOT_FOUND | Chuỗi không có hoặc không được truy cập. |
| 404 CLASS_OCCURRENCE_NOT_FOUND | Ngày hợp lệ nhưng không phải buổi của chuỗi. |
| 404 CLASS_EXCEPTION_NOT_FOUND | Buổi không có ngoại lệ để đọc/khôi phục. |
| 409 CLASS_SCHEDULE_VERSION_CONFLICT | Chuỗi hoặc một buổi đã đổi, cần đọc và xem lại. |
| 409 CLASS_SCHEDULE_HAS_EXCEPTIONS | Sửa cả chuỗi làm mất/sai ngoại lệ hoặc chuyển môn khi còn ngoại lệ. |

Các mã auth/dữ liệu chung như các API trước. POST/PATCH ở endpoint ngoại lệ chưa được mở.

## Database và phạm vi

V6 thêm `class_exceptions`, duy nhất `(schedule_id,occurrence_date)`, FK `(schedule_id,user_id)` → class_schedules, cascade khi xóa cả chuỗi. Thêm counter nội bộ `exception_revision` trên chuỗi để dirty tracking tăng @Version khi ngoại lệ được lưu/khôi phục; counter không lộ trong DTO. Version và dữ liệu chuỗi cũ giữ nguyên lúc migrate, counter mặc định 0; không seed.

Mọi ghi dùng khóa hàng tài khoản đầu tiên, chung với các nghiệp vụ trước. Danh sách ngoại lệ và occurrences đọc trong giao dịch REPEATABLE_READ: tránh lấy version chuỗi ở một thời điểm nhưng ngoại lệ ở thời điểm khác. Query ngoại lệ theo lô cho các chuỗi, không query từng ngày.

**Chưa làm:** kiểm tra trùng với lịch học khác/tự học/thi (4E.2B và đợt lịch thi), nối UI (4F), chuyển một buổi sang ngày khác, phát thông báo hệ điều hành. SQL ngoài API có thể bỏ qua kiểm tra ngày thuộc chuỗi và giờ sau kế thừa; không sửa nghiệp vụ bằng SQL tay.
