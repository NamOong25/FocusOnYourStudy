# 4F.2 — Thêm, sửa và xóa cả chuỗi lịch học

Đăng nhập → **Lịch học → Thời khóa biểu**. Các thao tác dưới đây lưu thật vào tài khoản/PostgreSQL, không còn ghi vào lịch RAM. Lịch mẫu của khách vẫn hoạt động như trước. Không đổi backend hoặc migration trong đợt này.

## Khởi động

Terminal backend trong VS Code hoặc IntelliJ:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Terminal frontend:

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npx expo start --web --port 8092
```

Mở http://localhost:8092 và đăng nhập. Giữ cả hai terminal chạy. Nếu đã mở frontend trước khi cập nhật code, tải lại trang; kiểm tra `EXPO_PUBLIC_API_URL` nếu trước đây đã tự cấu hình URL backend. Không cần tạo lại database.

## Một vòng test cơ bản

### 1. Tạo chuỗi lịch

1. Có sẵn ít nhất một học kỳ và môn học trong **Môn & học kỳ**.
2. Mở Thời khóa biểu, chọn học kỳ rồi **Thêm chuỗi lịch học**.
3. Chọn môn; chọn một hoặc nhiều thứ; dùng lịch chọn ngày bắt đầu/kết thúc và đồng hồ chọn giờ. Ví dụ thứ Hai, 07:00–09:00, từ 16/11/2026 đến 30/11/2026. Nếu giờ này đã có lịch/tự học, chọn một khoảng trống khác.
4. Nhập phòng, giảng viên, ghi chú; múi giờ Việt Nam là `Asia/Ho_Chi_Minh`. Mốc nhắc là số phút từ 0 đến 10080, hiện chỉ lưu lựa chọn, chưa phát thông báo thiết bị.
5. Bấm **Lưu chuỗi lịch học** một lần, chờ kết quả. App tải lịch thật và chuyển tới ngày có buổi đầu tiên của chuỗi. Nếu chọn môn ở học kỳ khác, app chuyển đến đúng học kỳ của môn đã lưu.
6. F5: đăng nhập còn hiệu lực thì vẫn còn lịch. Bộ chọn về mặc định, nên chọn lại đúng học kỳ/ngày nếu cần. Kiểm tra các tuần tiếp theo, không chỉ ngày đầu.

Khoảng áp dụng tối đa **366 ngày tính cả hai đầu**, giờ đến phút và kết thúc sau bắt đầu, trước 24:00 cùng ngày. Phải có ít nhất một ngày khớp thứ đã chọn.

### 2. Sửa cả chuỗi

1. Mở một thẻ buổi học → **Chỉnh sửa cả chuỗi lịch**.
2. Đổi phòng hoặc giảng viên và lưu. Đây là thông tin chuỗi gốc, không phải ghi đè một buổi.
3. Kiểm tra tuần khác và F5. Buổi không có ngoại lệ phải theo giá trị mới; buổi đã đổi riêng vẫn giữ trường ghi đè, buổi đã nghỉ vẫn nghỉ.
4. Muốn sửa lịch chưa bắt đầu/đã kết thúc mà không thấy thẻ ngày hiện tại, chọn **Quản lý chuỗi lịch**. Danh sách có toàn bộ chuỗi trong học kỳ, không bị giới hạn khoảng ngày của lưới.

### 3. Thử trùng giờ

1. Tạo/sửa một chuỗi khác trùng một phần giờ với lịch/tự học đã lưu của cùng tài khoản. Khác môn/học kỳ vẫn có thể trùng.
2. Phải thấy tên môn/buổi, ngày và giờ đang cản. Nội dung đang nhập giữ nguyên, không đóng form hoặc báo lưu thành công.
3. Sửa sang giờ trống rồi bấm lưu lại. Không cần nạp bản mới chỉ vì lỗi trùng rõ ràng. Hai buổi 07:00–09:00 và 09:00–11:00 được phép.

### 4. Xóa cả chuỗi

1. Mở **Chỉnh sửa cả chuỗi lịch** → **Xóa cả chuỗi lịch**.
2. Đọc xác nhận tên môn, khoảng ngày/giờ và múi giờ của **chuỗi đã lưu**. Nếu đang nhập thay đổi chưa lưu, phần đó chưa được áp dụng.
3. Chọn **Giữ chuỗi lịch** để hủy: dữ liệu phải còn.
4. Bấm xóa lần nữa → **Xác nhận xóa cả chuỗi**. Chuỗi và các ngoại lệ nghỉ/đổi của chính chuỗi bị xóa; môn, bài tập, tự học và chuỗi khác được giữ. Sau F5 không còn chuỗi đã xóa.

Chỉ thử xóa chuỗi bạn vừa tạo để kiểm tra, hoặc dữ liệu bạn chủ động muốn bỏ.

## Kiểm tra lỗi và bản nháp

| Tình huống | Kết quả cần thấy |
| --- | --- |
| Bỏ chọn hết thứ, kết thúc trước bắt đầu, quá 366 ngày, mốc nhắc sai | Báo lỗi trước khi gửi; giữ form. |
| Đổi chuỗi làm mất ngày đang có ngoại lệ/chuyển môn khi còn ngoại lệ | Backend chặn và báo nguyên nhân; giữ nội dung đang nhập. Xử lý ngoại lệ riêng vẫn thuộc 4F.3. |
| Đóng form khi có thay đổi | Có Tiếp tục chỉnh sửa/Bỏ thay đổi; chọn tiếp tục giữ bản nháp. |
| Bấm lưu nhiều lần | Chỉ một thao tác được gửi, các điều khiển bị khóa khi đang xử lý. Đợi kết quả trước khi đóng. |
| Hai tab cùng sửa một chuỗi | Tab lưu sau bị chặn version, bản nháp vẫn còn và không tự ghép version mới. |
| Bấm Thay bản nháp bằng lịch mới nhất | Chủ động bỏ nội dung đang nhập, nạp toàn bộ chuỗi hiện tại rồi mới chỉnh tiếp. |
| Chuỗi bị xóa ở nơi khác | Form báo không còn chuỗi, không tự tạo lại từ bản cũ. Đóng để xem danh sách mới. |
| Server đã xác nhận lưu/xóa nhưng tải lại lịch lỗi | Báo lần ghi đã được xác nhận; chỉ tải lại lịch, không gửi lại thao tác ghi. |

Để thử version: mở cùng chuỗi trên hai tab, thay phòng/ghi chú ở tab A và lưu. Tab B giữ form cũ, nhập giá trị khác và lưu. Phải có cảnh báo bản cũ. Tab B chỉ tiếp tục sau khi chủ động nạp lại; phần nhập dở không bị tự ghi đè.

### Mất mạng hoặc mất phản hồi lúc lưu

Mất phản hồi không chứng minh server chưa lưu. App giữ form, khóa gửi tiếp và yêu cầu **Kiểm tra kết quả lần lưu**. Với chuỗi mới, danh sách kiểm tra đọc **toàn bộ tài khoản**, kể cả học kỳ khác; tìm đúng môn, khoảng ngày, giờ và phòng trước khi quyết định tiếp tục.

- Nếu đã thấy chuỗi: đóng bản nháp, không tạo lại.
- Nếu chưa thấy: chỉ cho phép lưu tiếp sau khi bạn chủ động xác nhận đã kiểm tra; không có tự động gửi lại POST/PUT/DELETE.
- Nếu đã đóng form, vào **Quản lý chuỗi lịch** để kiểm tra và xác nhận trước khi tiếp tục ghi. Trong chế độ này danh sách xem toàn tài khoản, không chỉ học kỳ hiện tại.
- Với chuỗi đang sửa, dùng **Thay bản nháp bằng lịch mới nhất** để đọc đúng id hiện tại; không chỉ thay số version trong bản nháp cũ.

Có thể thử tắt backend rồi lưu và bật lại để kiểm tra đường xử lý. Tình huống server lưu xong nhưng mất phản hồi đã được kiểm tra tự động trên browser với schema QA riêng. Sau F5, hãy đọc lịch/danh sách chuỗi trước khi chủ động tạo lại; ứng dụng chưa có idempotency key lưu bền qua mọi lần mở trang.

## Cấu trúc và nghiệm thu

- `api/scheduleApi.ts`: GET chuỗi theo học kỳ/toàn tài khoản, GET bản mới theo id, POST/PUT/DELETE với version gốc. Body chỉ chứa trường hợp lệ; không gửi id/chủ sở hữu từ bản nháp.
- `api/ScheduleManager.ts`: khóa ghi, giữ kết quả chưa xác định, chỉ cập nhật sau phản hồi xác nhận; không sinh occurrences giả từ chuỗi. DELETE chỉ được xác nhận khi có phản hồi 204 rỗng.
- `components/ServerClassForm.tsx`, `ServerRuleList.tsx`: form/bản nháp, xác nhận xóa và danh sách chuỗi ngoài khoảng đang xem; `ruleDraft.ts` xử lý dữ liệu nhập.
- `npm run test:schedule`: **54 test qua**, gồm 28 test đọc cũ và 26 test ghi mới. TypeScript và export web qua.
- Browser dùng API thật/schema PostgreSQL riêng: tạo/sửa/F5/xóa, hủy xóa, trùng giữ bản nháp/sửa lại, version cũ/nạp rõ ràng, bảo vệ ngoại lệ, đóng khi đang ghi, POST đã commit nhưng mất phản hồi, ghi thành công/GET lỗi, chuỗi bị xóa ở nơi khác; xem lịch ở 320/390/430/1280px và form 320px. Không dùng hoặc seed vào tài khoản của bạn. Backend không đổi nên không chạy lại 238 test backend; chưa nghiệm thu native.

Môi trường QA đã được dọn hoàn tất: dừng backend thử ở cổng 8087, Expo thử ở cổng 8093 và xóa schema QA riêng. Hai cổng đã được kiểm tra không còn lắng nghe; không đổi schema ứng dụng. Chưa tự commit hoặc push.

**4F.3 còn làm:** nghỉ/đổi/khôi phục riêng một buổi trên giao diện. Dashboard/chi tiết môn/nhắc việc tổng hợp lịch thật vẫn theo checklist sau phần ghi lịch; không coi trang lịch tải theo khoảng là toàn bộ lịch.

Tên commit: **Kết nối thêm sửa xóa chuỗi lịch học với backend**.
