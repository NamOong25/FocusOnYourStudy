# 4F.3 — Nghỉ, đổi và khôi phục riêng một buổi học

Đăng nhập → **Lịch học → Thời khóa biểu** → chọn ngày → mở thẻ buổi học. Các thao tác dưới đây lưu vào tài khoản/PostgreSQL qua API ngoại lệ đã có. Không đổi backend, migration hoặc database của bạn trong đợt này.

## Khởi động

Giữ hai terminal chạy như trước. Backend trong VS Code hoặc IntelliJ:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Frontend:

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npx expo start --web --port 8092
```

Mở http://localhost:8092, tải lại trang và đăng nhập. Nếu cả hai đã chạy đúng cấu hình thì tiếp tục dùng; không cần tạo lại database. `EXPO_PUBLIC_API_URL` phải trỏ tới backend bạn đang dùng, thường là `http://localhost:8080`.

## Một vòng test cơ bản

### 1. Chuẩn bị chuỗi có nhiều buổi

Tạo học kỳ/môn nếu chưa có. **Thêm chuỗi lịch học**, ví dụ thứ Hai 07:00–09:00, từ 16/11/2026 đến 30/11/2026, phòng A1.01. Chọn một giờ chưa bị lịch khác hoặc tự học chiếm. Chuỗi này có ba buổi: 16, 23 và 30/11. Dùng xem tháng hoặc mũi tên để chọn đúng ngày.

### 2. Đổi riêng buổi 23/11

1. Chọn 23/11, mở thẻ môn → **Đổi buổi này**.
2. Bật **Phòng học riêng**, nhập B2.03, thêm lý do nếu cần.
3. Bấm **Lưu thay đổi buổi này**, chờ kết quả. Buổi có nhãn **Đã điều chỉnh** và phòng B2.03.
4. Xem 16 và 30/11: vẫn A1.01, giờ không đổi. F5 rồi chọn lại học kỳ/ngày: thay đổi vẫn còn.

Bạn chỉ bật những thông tin muốn đổi: giờ bắt đầu, giờ kết thúc, phòng hoặc giảng viên. Giờ chọn bằng đồng hồ; ngày của buổi được giữ cố định. Muốn học bù ngày khác thì xử lý bằng một lịch khác, không đổi ngày của ngoại lệ này.

| Lựa chọn | Cách lưu và dùng |
| --- | --- |
| Không bật thông tin riêng | Theo chuỗi, gồm cả khi sau này sửa chuỗi. |
| Bật phòng/giảng viên và nhập nội dung | Dùng nội dung riêng của ngày này. |
| Bật phòng/giảng viên rồi để trống | Xóa thông tin của riêng buổi; khác với bỏ chọn để theo chuỗi. |
| Chỉ bật giờ bắt đầu | Giờ kết thúc tiếp tục theo chuỗi; giờ hiệu lực vẫn phải kết thúc sau bắt đầu. |

Khi mở lại, ô bật/tắt phản ánh phần đã lưu riêng, không tự biến mọi giá trị đang hiển thị thành ghi đè.

### 3. Nghỉ một buổi

Chọn 23/11 → mở thẻ → **Nghỉ buổi này** → nhập lý do → **Xác nhận nghỉ buổi này**. Thẻ hiện **Đã nghỉ**, tên môn gạch ngang. Buổi vẫn nằm trên lịch để theo dõi; giờ ghi trên thẻ là giờ dự kiến. Ngày 16 và 30/11 vẫn học.

Nếu buổi từng đổi giờ/phòng thì báo nghỉ sẽ bỏ các ghi đè cũ. Có thể mở buổi nghỉ → **Đổi buổi này** để chuyển thành buổi học có điều chỉnh; phần không bật dùng lịch gốc hiện tại.

### 4. Khôi phục

- Buổi nghỉ: mở thẻ → **Khôi phục buổi này**.
- Buổi đã điều chỉnh: mở thẻ → **Bỏ thay đổi buổi này**.

Đọc phần **Khôi phục về lịch gốc hiện tại** rồi **Xác nhận khôi phục buổi này**. Ngoại lệ của đúng ngày đó được bỏ. App dùng giờ/phòng/giảng viên của chuỗi hiện tại, không phục hồi một bản lịch cũ từ RAM. Các buổi khác giữ nguyên.

Có thể kiểm tra thêm: báo nghỉ 23/11, sửa phòng/giảng viên **cả chuỗi** từ một buổi khác, rồi quay lại khôi phục 23/11. Buổi khôi phục phải nhận phòng/giảng viên mới.

## Test lỗi và giữ bản nháp

| Tình huống | Kết quả mong đợi |
| --- | --- |
| Đổi giờ buổi sang giờ có lịch hoặc tự học trong tài khoản | Báo trùng với dữ liệu đã lưu, kể cả học kỳ khác; giữ bản nháp, chưa đổi buổi. Chỉnh giờ khác rồi lưu lại. |
| Báo nghỉ rồi tạo tự học vào giờ gốc; thử khôi phục | Báo trùng và tiếp tục giữ buổi nghỉ. Dời/xóa buổi tự học rồi khôi phục lại mới được. |
| Mở form ở tab A, sửa một buổi/cả chuỗi ở tab B, rồi lưu tab A | Chặn phiên bản cũ, giữ nội dung. **Thay bản nháp bằng buổi mới nhất** là thao tác chủ động thay nội dung đang nhập bằng dữ liệu hiện tại; đọc lại trước khi sửa/lưu. |
| Chuỗi/ngày vừa bị xóa hoặc không còn thuộc chuỗi | Báo không còn, chặn gửi bản cũ; không tự tạo lại chuỗi hoặc buổi. |
| Bấm lưu liên tiếp | Chỉ có một thao tác ghi đang chạy, không gửi lặp đồng thời. |
| Máy chủ có thể đã lưu nhưng mất phản hồi | Chặn gửi tiếp. Kiểm tra lại đúng chuỗi/ngày, không tự PUT/DELETE lại. |
| Lần ghi đã được xác nhận nhưng đọc lịch lỗi | Hiện rõ đã lưu; chỉ tải lại lịch, không cần gửi lại thay đổi. |

Mỗi ngoại lệ dùng version của **cả chuỗi**. Sửa một ngày khác cũng có thể khiến form đang mở cần đọc lại.

### Khi mất phản hồi

Trong form, có thể dùng **Thay bản nháp bằng buổi mới nhất** để đọc lại đúng buổi. Nếu đã đóng form, mở **Kiểm tra buổi vừa thay đổi**, xem trạng thái/giờ/phòng/lý do rồi **Đã kiểm tra đúng buổi, đóng**. Nếu dữ liệu đổi trong lúc kiểm tra, app nạp dữ liệu mới và yêu cầu xem lại.

**Quản lý chuỗi lịch** không thay thế bước kiểm tra buổi này: danh sách cả chuỗi không cho biết đủ ngoại lệ của ngày vừa ghi. Tải lại lịch thông thường cũng không tự coi lần ghi chưa rõ kết quả là đã kiểm tra xong.

Đây là nhánh lỗi không chắc chắn; tắt mạng trước khi bấm lưu chỉ thử được một phần. Khi nghiệm thu tự động, đã cho API thực sự lưu rồi chủ động chặn phản hồi PUT/DELETE để kiểm tra không gửi lại.

## Cấu trúc và nghiệm thu

- `api/classExceptionsApi.ts`: đọc lịch gốc + occurrence + ngoại lệ cùng version; kiểm tra hợp đồng/giá trị kế thừa; PUT/DELETE đúng ngày với version gốc đã đọc.
- `exceptionDraft.ts`: giữ riêng trạng thái bật ghi đè và giá trị, gồm khác biệt `null`/chuỗi rỗng.
- `components/ServerExceptionFlow.tsx`: điều chỉnh, nghỉ, khôi phục, giữ bản nháp và kiểm tra lại đúng ngày.
- `ScheduleManager`/hook: dùng chung khóa ghi với cả chuỗi, giữ ngày của thao tác chưa rõ kết quả, không tự retry thao tác ghi.

Đã kiểm tra trong đợt này:

- **81 test đọc/ghi lịch qua, gồm 27 mới**: dữ liệu không đồng nhất/khác version/khác ID, kế thừa và chuỗi rỗng, giới hạn/giờ hiệu lực, payload và version, phản hồi PUT/DELETE sai, xung đột, khóa ghi, phản hồi muộn sau đổi tài khoản và kiểm tra đúng ngày khi mất phản hồi.
- `npm run typecheck` qua; export web qua.
- Chrome web với Spring Boot/PostgreSQL thật trong schema QA riêng: đổi phòng, F5, xóa riêng phòng, nghỉ, trùng tự học khi khôi phục, đổi giờ trùng/giữ bản nháp/sửa lại; tuần khác giữ nguyên. Mở ghi đè một đầu giờ sau khi sửa chuỗi và khôi phục về giờ/phòng mới đúng.
- Kiểm tra version từ nơi khác, chủ động thay bản nháp, PUT/DELETE đã commit nhưng mất phản hồi, danh sách chuỗi không được gỡ khóa một buổi, dữ liệu đổi khi xác nhận kiểm tra, chuỗi bị xóa không tạo lại và tài khoản B chỉ sửa buổi của B.
- Ảnh web lịch ở 320/390/430/1280px, kiểm tra form khôi phục ở 320px. Đây chưa phải nghiệm thu điện thoại thật.

Tài khoản/lịch mẫu chỉ được tạo trong schema QA riêng và dọn sau khi kiểm tra; không seed vào tài khoản của bạn. Backend/migration không thay đổi; không chạy lại 238 backend tests vì đợt này không sửa backend. Kiểm tra thiết bị thật **2C.3B** vẫn theo lịch hoãn của bạn.

Sau 4F.3, tổng hợp lịch thật ở Dashboard/chi tiết môn/nhắc việc và API lịch thi vẫn nằm trong `UI-BACKLOG.md`; chưa tự coi nguồn lịch của một khoảng đang mở là toàn bộ dữ liệu.
