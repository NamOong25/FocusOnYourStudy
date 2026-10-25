# Kiểm tra trùng giờ — 4E.2B / 4H.1B

Đây là guard khi ghi vào các API hiện có, không phải endpoint mới. 4E.2B không thêm migration; 4H.1A đã thêm lịch thi bằng V7. 4H.1B.1 kiểm tra khi ghi lịch thi, 4H.1B.2 bổ sung khi ghi lịch học/ngoại lệ/tự học. Không thêm migration hoặc sửa dữ liệu cũ; Flyway hiện ở V7.

## Khi nào kiểm tra?

| Thao tác | So với dữ liệu nào? |
| --- | --- |
| POST/PUT chuỗi lịch học | Toàn bộ buổi hiệu lực của chuỗi đề xuất so với chuỗi khác, buổi tự học và lịch thi của tài khoản. |
| PUT ngoại lệ một ngày | Chỉ buổi sau thay đổi, so với chuỗi khác, tự học và thi. Buổi CANCELLED không chiếm giờ. |
| DELETE ngoại lệ/khôi phục | Kiểm tra buổi gốc hiện tại với chuỗi khác, tự học và thi trước khi xóa ngoại lệ. |
| POST/PUT tự học | So với buổi hiệu lực của lịch học và lịch thi; guard tự học–tự học của 4C tiếp tục hoạt động, giữ thứ tự kiểm tra cũ. |
| POST/PUT lịch thi (4H.1B.1) | So với lịch thi khác, buổi lịch học hiệu lực và tự học, toàn tài khoản. PUT không so với chính lịch thi đang sửa. |
| Xóa cả chuỗi/tự học; báo nghỉ | Giải phóng giờ, không bị chặn vì các xung đột cũ. Các guard sở hữu/version vẫn áp dụng. |

- Chỉ dữ liệu cùng tài khoản, kể cả khác môn/học kỳ. Giảng viên/phòng không phải tài nguyên dùng chung giữa các sinh viên trong ứng dụng cá nhân này.
- Khoảng giờ **[start,end)**: 07:00–09:00 và 09:00–11:00 được phép. Trùng một phút, trùng hoàn toàn hoặc chứa nhau đều bị chặn.
- So sánh Instant UTC, mở rộng từng ngày trong múi giờ của chính chuỗi; không chỉ so thứ/ngày/giờ dạng chuỗi. Khác ngày địa phương hoặc DST vẫn có thể cùng một thời điểm.
- Áp dụng ngoại lệ trước khi xét: ngày nghỉ bỏ qua; ngày đổi dùng giờ hiệu lực; trường null kế thừa từ chuỗi hiện tại. Sửa cả chuỗi dùng các ngoại lệ hiện có trên cấu hình đề xuất.
- Bỏ chính chuỗi đang sửa khỏi tập đối chiếu, không tự báo trùng với bản cũ. Guard tự học cũ cũng bỏ chính phiên đang sửa.
- Kiểm tra toàn khoảng áp dụng tối đa 366 ngày của chuỗi, không bị giới hạn 92 ngày của endpoint xem occurrences. Không materialize lịch vào database. Query chuỗi trong cửa sổ ngày có đệm cho múi giờ, tải ngoại lệ theo lô và query tự học/thi theo khoảng UTC; không query từng ngày.
- Tự học PLANNED/IN_PROGRESS/COMPLETED đều chiếm khoảng giờ đã lưu, giữ chính sách 4C. Không bỏ qua dữ liệu chỉ vì đã ở quá khứ. Quy định cùng ngày/đến phút của từng API không thay đổi.

## Lỗi trả về

HTTP **409**, `Content-Type: application/problem+json`, `Cache-Control: no-store`, code **SCHEDULE_TIME_CONFLICT** cho lịch–lịch, lịch–tự học và thi–thi/lịch/tự học ở cả hai chiều. Trả **một buổi cản thao tác**, không phải báo cáo tất cả xung đột:

```json
{
  "status": 409,
  "code": "SCHEDULE_TIME_CONFLICT",
  "detail": "Trùng lịch học “Buổi học” của môn “Java”, ngày 16/11/2026 07:00–09:00 (Asia/Ho_Chi_Minh). Chọn giờ khác hoặc điều chỉnh buổi đã lưu.",
  "conflict": {
    "kind": "CLASS",
    "id": "UUID_CHUOI_DANG_CHIEM_GIO",
    "courseId": "UUID_MON",
    "courseName": "Java",
    "title": "Buổi học",
    "date": "2026-11-16",
    "endDate": "2026-11-16",
    "startTime": "07:00",
    "endTime": "09:00",
    "timeZone": "Asia/Ho_Chi_Minh",
    "startsAt": "2026-11-16T00:00:00Z",
    "endsAt": "2026-11-16T02:00:00Z"
  }
}
```

Các trường chung type/title/instance/timestamp/requestId vẫn như các lỗi khác. `conflict` mô tả **buổi đã lưu đang cản**, không phải bản đề xuất:

- CLASS: id chuỗi + date nhận diện một buổi; startTime/endTime/UTC đã áp dụng ngoại lệ. title là “Buổi học”, courseName là tên môn hiện tại.
- STUDY: id buổi tự học, title là nội dung tự học. date/endDate và giờ hiển thị theo timeZone của buổi đó.
- EXAM: id lịch thi đã lưu; title ghép loại kỳ thi và hình thức bằng tiếng Việt (ví dụ “Thi cuối kỳ · Tự luận”). Các trường ngày/giờ theo zone của kỳ thi, startsAt/endsAt là UTC.
- Thứ tự chọn ổn định theo startsAt UTC, kind, UUID; trả cặp đầu tiên tìm được khi quét lịch đề xuất theo giờ bắt đầu. Nếu xử lý buổi này mà vẫn còn xung đột khác, lần lưu sau có thể báo buổi tiếp theo.
- Không lộ lịch của người khác, mật khẩu, token hoặc SQL. UUID/cha khác chủ vẫn trả 404 trước khi kiểm tra xung đột.
- `STUDY_TIME_CONFLICT` tiếp tục dùng cho tự học–tự học, giữ contract cũ. Lỗi version/validation/ngoại lệ mất ngày vẫn có mã riêng; không bị thay bằng lỗi trùng giờ.

Form tự học và thời khóa biểu đã nối API ở 4D/4F, hiển thị detail của riêng mã 409 này (giới hạn độ dài, fallback an toàn); không phản chiếu detail của lỗi server/mã lạ. UI lịch thi nối ở 4H.2.

## Tính nguyên tử và dữ liệu cũ

Mọi luồng ghi giữ khóa hàng tài khoản đầu tiên trong transaction đến commit, dùng chung với lịch/ngoại lệ/tự học/bài/môn/thi. Từ 4H.1B.2, các cặp lịch học–lịch học/tự học và thi–thi/lịch học/tự học đều kiểm tra hai chiều. Kiểm tra/lưu cùng giao dịch ngăn hai request cùng thấy trống rồi cùng lưu, cả khi đổi/khôi phục một buổi đồng thời với tạo/sửa lịch thi. Service kiểm tra chỉ chạy trong transaction của bên ghi. Không đọc lịch qua endpoint 92 ngày hoặc dùng snapshot cũ của client để quyết định. Quy tắc liên bảng được thực thi qua API dưới khóa chung, không phải CHECK đối chiếu bảng khác; SQL ghi tay có thể bỏ qua quy tắc này.

Khi bị chặn: không lưu một phần, không tăng version/counter, không mất ngoại lệ khi khôi phục thất bại. Client giữ bản nháp, xem và chủ động điều chỉnh; không tự gửi lại thao tác ghi. Sau thành công vẫn dùng version server trả về; mất phản hồi thì GET trước.

Lịch trùng đã tồn tại trước 4E.2B vẫn đọc được, không tự di chuyển/xóa. Khi sửa một chuỗi, toàn bộ lịch hiệu lực đề xuất phải hợp lệ; kể cả sửa phòng cũng có thể bị chặn nếu chuỗi đó còn trùng. Có thể báo nghỉ đúng ngày, chuyển buổi sang giờ trống hoặc xóa dữ liệu thử của chính mình để xử lý.

4H.1B đã kiểm tra hai chiều, UI thi nối 4H.2. Chưa xét thời gian di chuyển, lịch bù sang ngày khác hoặc tài nguyên phòng/giảng viên toàn trường. Hướng dẫn thực hành: `../../docs/BACKEND-PHASE-4E2B.md`, `../../docs/BACKEND-PHASE-4H1B1.md` và `../../docs/BACKEND-PHASE-4H1B2.md`.
