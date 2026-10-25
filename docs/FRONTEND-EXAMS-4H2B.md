# 4H.2B — Thêm, sửa và xóa lịch thi trong tài khoản

Mở **Lịch học → Lịch thi**, đăng nhập tài khoản thật. Đợt này nối POST/PUT/DELETE đã có ở backend; không thêm bảng, migration, seed dữ liệu người dùng hoặc dependency.

## Đã triển khai

- Thêm lịch theo môn và học kỳ, loại kỳ thi, hình thức, ngày/giờ bằng bộ chọn, múi giờ, phòng và ghi chú. Lưu thành công mở chi tiết mới nhất; khi tạo ở kỳ khác, danh sách chuyển sang đúng kỳ và mục Tất cả để thấy cả lịch đã qua.
- Từ chi tiết chọn **Chỉnh sửa hoặc xóa lịch thi**. PUT thay toàn bộ dữ liệu với ID/version của bản đã đọc; xóa cần bấm xác nhận, DELETE gửi đúng version. Xóa lịch chỉ xóa lịch và cấu hình nhắc của nó.
- Nhắc có/không, mốc gợi ý và mốc tùy chọn nguyên 0–10080 phút, tối đa 10 mốc khác nhau. 0 là đúng giờ bắt đầu. Tắt nhắc gửi mảng rỗng; phòng/ghi chú có thể để trống.
- Giờ theo zone của kỳ thi, giữ nguyên instant khi sửa thông tin khác. Giờ mùa bị thiếu bị chặn; giờ xuất hiện hai lần cần chọn rõ lần nếu thay giờ. Kết thúc phải sau bắt đầu theo UTC và trước 24:00 cùng ngày tại zone đó.
- Trùng thi/lịch học/tự học do backend kiểm tra toàn tài khoản: hiển thị môn/ngày/giờ đang cản, giữ bản nháp và cho sửa để lưu lại. Không dùng lịch RAM để kết luận không trùng.
- Version cũ/404: chặn thao tác tiếp, giữ bản nháp; bấm **Kiểm tra kết quả đã lưu** chỉ đọc dữ liệu. Chỉ **Thay bản nháp bằng lịch vừa kiểm tra** mới thay nội dung/version. Không tự ghép version mới rồi PUT lại.
- Mạng/timeout/phản hồi ghi không hợp lệ/5xx: coi kết quả chưa xác nhận; không tự retry. Đọc lại bản theo ID khi sửa/xóa, toàn danh sách khi tạo (để không bỏ sót lịch đã chuyển môn/kỳ). Đọc lỗi không mở khóa. Người dùng đối chiếu rồi mới xác nhận tiếp tục hoặc đóng.
- Khóa ghi dùng chung các màn trong phiên tài khoản, tránh bấm đôi và giữ yêu cầu cần kiểm tra khi đóng/mở form. Đổi tài khoản dọn trạng thái, bỏ phản hồi cũ; không lưu token/bản nháp vào danh sách mẫu. Danh sách/chi tiết tự tải lại sau thao tác; thông tin tổng hợp lịch học được đánh dấu cần cập nhật.

## Chạy app

Terminal 1 (VS Code hoặc IntelliJ):

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Terminal 2:

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npx expo start --web --port 8092
```

Mở http://localhost:8092, đăng nhập, có sẵn một học kỳ và môn của tài khoản.

## Kiểm tra một vòng

1. **Thêm:** Lịch học → Lịch thi → Thêm lịch thi mới. Chọn môn, ngày tương lai, giờ không trùng, phòng `B202`, thêm nhắc 45 phút và đúng giờ bắt đầu. Lưu: chi tiết phải đúng ngày/giờ/phòng/mốc nhắc. Đóng, F5, vào lại: lịch vẫn còn.
2. **Sửa:** Mở lịch → Chỉnh sửa hoặc xóa lịch thi. Đổi phòng `C303`, chọn Không nhắc, xóa ghi chú rồi lưu. Chi tiết và danh sách phải khớp; F5 vẫn đúng, nhắc không tự bật lại.
3. **Trùng lịch:** Tạo một lịch khác giao giờ với lịch đã có, kể cả khác môn/kỳ. Nhập ghi chú trước khi lưu. Phải thấy lỗi chỉ rõ lịch cản; form và ghi chú còn nguyên, không thêm dòng mới. Chọn giờ khác và tự bấm lưu. Chạm đúng giờ kết thúc được phép nếu không vướng lịch khác.
4. **Bản cũ:** Mở cùng lịch ở hai tab, mở form sửa ở cả hai. Tab B đổi phòng và lưu. Tab A giữ bản nháp rồi lưu: phải báo lịch đã thay đổi. Bấm Kiểm tra: xem bản B mà ô nhập chưa đổi. Bấm Thay bản nháp: mới nhận dữ liệu B; sau đó sửa và tự lưu tiếp được. Không có PUT tự động.
5. **Mất kết nối:** Mở form trước, tắt terminal backend, bấm lưu. Phải báo cần kiểm tra kết quả, giữ bản nháp và khóa lưu/xóa. Kiểm tra khi backend còn tắt vẫn khóa. Chạy backend lại, bấm kiểm tra. Nếu lịch đã có thì đóng; nếu chắc chắn chưa có mới chọn cho phép lưu lại và tự bấm lưu.
6. **Xóa:** Mở lịch thử → Chỉnh sửa hoặc xóa → Xóa lịch thi. Trước xác nhận có thể chọn Giữ lịch thi. Xác nhận: quay lại danh sách, F5 không còn lịch này; môn và các lịch khác vẫn còn.
7. **Đổi tài khoản:** Tài khoản B không được thấy hoặc sửa lịch của A. Quay lại A mới thấy lịch A. Đừng dùng bản xem trước để nghiệm thu dữ liệu đã lưu.

## Giới hạn còn lại

- **4H.2C chưa làm:** thẻ thi gần nhất trên Dashboard, danh sách thi trong chi tiết môn và nhắc việc trong chuông. Nút vào danh sách lịch thi đã có. Cấu hình nhắc được lưu nhưng chưa gửi thông báo hệ điều hành.
- Bản nháp/khóa đối chiếu giữ trong phiên app; F5 làm mất bản nháp, không phải hàng đợi ghi bền vững. Sau một lần gửi bị gián đoạn, luôn đối chiếu lịch đã lưu trước khi tạo lại. Backend hiện chưa có idempotency key cho POST; GET không bảo đảm một yêu cầu mạng cũ chưa kết thúc, nên app không tự khẳng định lần ghi trước thất bại và không tự gửi lại.
- Kiểm tra native trên điện thoại thật 2C.3B vẫn đang hoãn.

## Xác minh kỹ thuật

**Kết quả: 84 test lịch thi (34 mới), 140 test lịch hồi quy, TypeScript và export web đều qua.** Browser với API/PostgreSQL thật đã kiểm tra tạo/sửa, nhắc tùy chỉnh/0 phút/tắt nhắc, F5, version cũ và nhận bản mới, trùng giữ nháp, mất mạng/kiểm tra lỗi/restart/cho phép lưu lại, chuyển kỳ sau tạo, hủy/xác nhận xóa, chọn ngày/giờ, cảnh báo chưa lưu và đổi tài khoản. Đã xem form 320px và cảnh báo 390px; không thấy lỗi console ở bản cuối.

`npm run test:exams` kiểm tra hợp đồng đọc/ghi, phản hồi xác nhận, version/204, nhắc, UTC/DST, bấm đôi, bản cũ, mất phản hồi, đối chiếu và đổi chủ sở hữu. `npm run test:schedule` hồi quy lịch học. Có TypeScript và export web. Luồng browser được chạy với Spring Boot/PostgreSQL và schema QA riêng; dữ liệu thử được dọn sau kiểm tra, không seed vào dữ liệu của người dùng.

```powershell
npm run test:exams
npm run test:schedule
npm run typecheck
```

Tên commit: **Kết nối thêm sửa xóa lịch thi vào tài khoản**. Chưa tự commit/push.
