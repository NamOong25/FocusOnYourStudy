# UI 4B — Giờ deadline, tìm kiếm và lọc bài tập

Ngày cập nhật: 21/10/2026. Đây là đợt 2 sau điều hướng UI 4A; các đề xuất khác trong `UI-BACKLOG.md` vẫn để làm sau.

## Những gì đã làm

- Form bài tập chọn **ngày** bằng lịch và **Giờ hạn nộp** bằng đồng hồ 24 giờ, gồm giờ/phút và nút xác nhận/hủy. Giờ mặc định là 23:59. Điểm dữ liệu cũ chưa có giờ cũng dùng 23:59; không tự sửa các ngày đã lưu.
- Tìm kiếm theo tên bài, tên môn hoặc mã môn. Không phân biệt hoa thường/dấu tiếng Việt; ví dụ `co so du lieu` tìm được môn Cơ sở dữ liệu, `IT303` tìm bài thuộc mã môn đó.
- Bộ lọc thời hạn riêng với bộ lọc trạng thái; kết hợp thêm môn và từ khóa. Có nút xóa từ khóa, bỏ lọc môn, và **Xóa tìm kiếm và bộ lọc** khi không có kết quả.
- Danh sách sắp theo ngày/giờ hạn nộp, rồi mức ưu tiên khi cùng hạn. Bài hoàn thành vẫn xem được trong Tất cả/Hôm nay nhưng không tính vào Quá hạn hoặc Sắp hạn.
- Chi tiết bài, Dashboard, góc nhắc nhở, môn học, buổi tự học và form kế hoạch AI đều hiển thị giờ hạn nộp. Số bài trễ trong Thống kê dùng cùng quy tắc mới; biểu đồ thời gian mẫu chưa thay đổi trong đợt này.
- Màn đang mở cập nhật thời điểm đầu mỗi phút, khi quay lại màn hoặc đưa app ra trước. Đổi hạn/trạng thái cập nhật các màn qua store dùng chung; không phải tải lại trang.

## Quy ước thời gian

| Bộ lọc | Quy tắc |
| --- | --- |
| Tất cả | Không giới hạn thời hạn; vẫn áp dụng từ khóa, môn và trạng thái đang chọn. |
| Hôm nay | Ngày deadline trùng hôm nay theo thiết bị, gồm cả bài quá giờ và bài đã hoàn thành; kết hợp trạng thái để lọc tiếp. |
| Quá hạn | Bài chưa hoàn thành có mốc ngày/giờ hạn nộp trước thời điểm hiện tại. |
| Sắp hạn | Bài chưa hoàn thành đến hạn từ hiện tại đến cùng giờ sau 7 ngày, bao gồm hai mốc biên. |

Mốc hạn là `YYYY-MM-DD` + `HH:mm:00`, theo giờ địa phương của thiết bị. Đúng mốc bằng giờ nộp chưa tính trễ, sau mốc đó là quá hạn. Ví dụ bài hạn 21/10 lúc 10:00: lúc 09:59 còn hạn, sau 10:00 quá hạn ngay trong ngày; màn cập nhật ở nhịp phút kế tiếp/khôi phục màn. Giờ 00:00 là đầu ngày được chọn, không phải cuối ngày.

Các ngày và giờ chưa hợp lệ không được lưu từ form. Chưa chuẩn hóa múi giờ để đồng bộ nhiều thiết bị; phần đó cần chốt khi làm backend. Dữ liệu hiện vẫn chỉ trong bộ nhớ phiên; tải lại trang sẽ mất thay đổi thử nghiệm.

## Buổi tự học và kế hoạch AI

- Buổi tự học liên kết phải kết thúc **không sau** ngày/giờ nộp. Kết thúc đúng 18:45 khi hạn 18:45 là hợp lệ; kết thúc 18:46 bị chặn. Tự học độc lập giữ quy tắc riêng.
- Sửa hạn sớm hơn lúc kết thúc một buổi đã liên kết sẽ báo tên buổi và giữ bản đang nhập. Cần điều chỉnh buổi hoặc gỡ liên kết trước; không âm thầm xóa/dời buổi.
- Đề xuất AI mẫu tránh các khoảng kết thúc sau giờ nộp. Khi duyệt lại, kiểm tra theo deadline hiện tại; hạn đã thay đổi hoặc bài quá hạn không được tự áp dụng đề xuất cũ.
- Góc nhắc nhở chỉ là danh sách trong app; chưa lên lịch thông báo thật trên hệ điều hành.

## Tự kiểm tra

1. Vào Lịch học → Bài tập → Thêm bài tập mới. Chọn ngày hôm nay, giờ 18:45, đặt tên dễ nhận biết rồi lưu. Mở chi tiết/chỉnh sửa lại: ngày và giờ vẫn đúng.
2. Tìm bằng một phần tên, tên môn không dấu hoặc mã môn. Thử từ khóa không tồn tại, bấm Xóa tìm kiếm và bộ lọc: danh sách trở lại.
3. Kết hợp Sắp hạn + Chưa làm + một môn. Chuyển sang Lịch thi rồi quay lại: từ khóa và các bộ lọc vẫn giữ.
4. Với bài không có buổi tự học liên kết, đổi hạn thành hôm nay 00:00. Sau 00:00, bài xuất hiện ở Quá hạn và cảnh báo tương ứng trên Dashboard; góc nhắc nhở hiện giờ mới. Đánh dấu hoàn thành: bài rời Quá hạn/Sắp hạn nhưng vẫn có trong Hoàn thành.
5. Đặt hạn 18:45, tạo buổi tự học cùng ngày bắt đầu 19:00, dài 45 phút: bị chặn sau giờ nộp. Đổi bắt đầu 17:00: có thể lưu nếu không trùng lịch khác. Sau đó thử đổi hạn thành 17:10: bị chặn vì buổi kết thúc 17:45.
6. Thử trên màn hình hẹp: tìm kiếm, bộ lọc, ngày/giờ và nội dung dài không tràn ngang. Cần thử tiếp với bàn phím và chọn giờ trên điện thoại thật trước khi nghiệm thu native.

## Kiểm tra đã thực hiện

- TypeScript, xuất bundle web và Android đều thành công; chưa thử trên điện thoại thật.

- `node docs/qa-assignments-unit.cjs`: 62 kiểm tra biên ngày/giờ, 23:59 mặc định, 00:00, giới hạn 7 ngày, tìm không dấu, lọc kết hợp, loại bài hoàn thành, sắp theo giờ, hạn của buổi học, Dashboard và AI.
- `node docs/qa-dashboard-unit.cjs`: 28 kiểm tra tổng hợp; cửa sổ Sắp hạn đã đổi sang 7 ngày tính theo giờ hiện tại.
- `node docs/qa-ai-unit.cjs`: 31 kiểm tra sinh/duyệt đề xuất, lịch trùng và mốc deadline.
- Kiểm tra trực tiếp trên web: tìm không dấu, trạng thái không có kết quả/xóa lọc; giữ từ khóa sau khi sang lịch thi rồi quay lại; lưu/mở lại 18:45, đổi 00:00 vào Quá hạn, cập nhật Dashboard/nhắc bài; chặn buổi học sau giờ nộp và sửa hạn trước buổi liên kết; giao diện không tràn ngang ở 320/390/430/1280 px. Không có lỗi console trong phiên thử.

Các script UI cũ không thay thế kiểm tra giờ deadline mới; phần kiểm tra tự động chính cho quy tắc mới là `qa-assignments-unit.cjs`. Chưa nghiệm thu backend, thông báo thiết bị, lưu lâu dài hoặc chạy trên điện thoại thật.
