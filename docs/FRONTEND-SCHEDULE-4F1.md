# 4F.1 — Xem thời khóa biểu từ tài khoản

Ghi chú phiên bản: từ **4F.2** giao diện đã thêm/sửa/xóa cả chuỗi; xem `FRONTEND-SCHEDULE-4F2.md`. Nội dung bên dưới ghi lại phạm vi và kiểm tra của riêng đợt đọc 4F.1.

Phạm vi đã làm: đọc lịch theo học kỳ, ngày/tuần/tháng, tải lại và xem chi tiết. Chưa nối thêm/sửa/xóa chuỗi (4F.2) hoặc nghỉ/đổi/khôi phục một buổi trên giao diện (4F.3). Backend các thao tác này đã có từ 4E; hiện vẫn có thể thử bằng script/HTTP như trước.

## Chạy để xem

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

Mở http://localhost:8092 → Hồ sơ → Đăng nhập → đóng Hồ sơ → Lịch học → Thời khóa biểu. Giữ hai terminal chạy. Không cần cài lại, tạo lại database hoặc xóa tài khoản. Frontend mặc định gọi backend ở cùng hostname, cổng 8080; nếu đã cấu hình `EXPO_PUBLIC_API_URL`, kiểm tra URL đó đúng với backend đang chạy.

**Không thấy lịch thử trước đây là có thể đúng:** lịch tạo bằng giao diện mẫu/RAM trước 4F.1 chưa được lưu lên server. Lịch đã tạo bằng `Try-ClassSchedules.ps1` thuộc cùng tài khoản mới được hiển thị ở đây. App không tự nhập lịch mẫu vào tài khoản.

## Một vòng kiểm tra

1. **Có lịch thật:** đăng nhập đúng tài khoản đã tạo lịch bằng API ở 4E. Chọn đúng học kỳ và tuần/tháng chứa ngày bắt đầu chuỗi. Nếu chưa có dữ liệu, xem `BACKEND-PHASE-4E1.md` để tạo một chuỗi thử bằng script; đây là thao tác chủ động của bạn, không phải dữ liệu mẫu tự thêm.
2. **Bộ chọn học kỳ:** chuyển sang học kỳ khác. Chỉ thấy buổi thuộc các môn của học kỳ đã chọn. Kỳ trống có thông báo “Chưa có buổi học…” sau khi tải thành công; không trộn lịch kỳ trước.
3. **Ngày/tuần/tháng:** bấm ngày trong lịch, chuyển khoảng trước/sau, chuyển Theo tuần/Theo tháng và Về hôm nay. Chấm dưới ngày đánh dấu có buổi trong khoảng đang xem. Theo tháng tải đủ lưới 42 ngày, kể cả ngày mờ của tháng liền kề; bên dưới hiển thị ngày được chọn.
4. **Chi tiết:** mở thẻ môn, kiểm tra giờ, phòng, giảng viên, múi giờ, ghi chú và chuỗi áp dụng. Chỉ có nút xem/đóng, chưa có thao tác sửa thật.
5. **Buổi đổi/nghỉ:** dùng script ngoại lệ 4E.2A với version mới nhất, rồi Tải lại lịch. Buổi đổi dùng giờ/phòng/giảng viên hiệu lực; buổi nghỉ có nhãn đỏ và vẫn hiện để theo dõi. Chi tiết có lý do và lịch gốc. Lịch ngày/giờ theo múi giờ của chính buổi, không chuyển ngày bằng timezone thiết bị.
6. **F5:** phiên còn hiệu lực thì vẫn đăng nhập và tải lại được lịch đã lưu. Bộ lọc/ngày xem trở về mặc định; không cam kết nhớ vị trí sau F5. Chọn lại học kỳ/ngày nếu cần.
7. **Mất mạng/backend:** tắt backend rồi Tải lại lịch. Cùng khoảng đã tải sẽ giữ dữ liệu cũ kèm cảnh báo và tạm khóa mở chi tiết. Đổi sang khoảng/kỳ mới khi mất mạng phải hiện lỗi, không gắn dữ liệu cũ hoặc báo trống thành công. Bật backend lại, bấm Tải lại để phục hồi.
8. **Hai tài khoản:** Hồ sơ → Đăng nhập tài khoản khác. Lịch tài khoản A phải biến mất; B chỉ thấy lịch riêng. Thoát tài khoản quay về chế độ thử, không mang lịch thật sang dữ liệu mẫu.
9. **Lịch đã thay đổi khi đang xem:** mở danh sách, sửa/xóa chuỗi bằng API ở nơi khác rồi mở chi tiết. Nếu khác version hoặc đã xóa, chi tiết báo tải lại thay vì ghép giờ cũ với thông tin chuỗi mới.

Nút tải lại cũng lấy lại danh mục môn để cập nhật tên môn. Không có polling thời gian thực; dùng nút tải lại hoặc quay lại màn lịch để đọc thay đổi từ nơi khác. Tài khoản chưa có học kỳ có lối đến Môn & học kỳ.

## Trạng thái chuyển tiếp

- Trong tài khoản, Thời khóa biểu là dữ liệu đã lưu và **chỉ xem**. Form lịch mẫu từ các lối vào cũ cũng được chặn; không lưu tạm rồi báo thành công như dữ liệu thật.
- Chế độ khách/dữ liệu mẫu tiếp tục dùng lịch local và giữ các thao tác thử cũ.
- Trang chủ và chi tiết môn dẫn đến Thời khóa biểu; chưa tổng hợp lịch backend vào thẻ hôm nay, số ca trên môn hoặc nhắc việc. Các phần này được ghi riêng trong checklist, không dùng một trang lịch tải theo khoảng làm dữ liệu toàn bộ.
- Lịch thi vẫn theo đợt riêng, không chèn lịch thi mẫu vào thời khóa biểu thật. Mốc nhắc được xem từ dữ liệu đã lưu, chưa gửi thông báo thiết bị.

## Cấu trúc và kiểm tra

- `src/features/schedule/api/`: contract/validation cho GET, manager hủy và chặn phản hồi cũ theo học kỳ/khoảng, hook gắn vòng đời tài khoản/màn hình.
- `ServerSchedule.tsx`: lịch tài khoản; `components/ScheduleCalendar.tsx` và `ServerClassDialog.tsx`: lịch và chi tiết chỉ đọc.
- `scheduleView.ts`: lưới ngày và khoảng truy vấn, giới hạn năm 1900–2099.
- Giữ nguyên date/giờ địa phương và UTC server; kiểm tra kiểu dữ liệu, cờ ngoại lệ, định danh trùng, khoảng trả về, version và timezone trước khi hiển thị. Chi tiết chỉ ghép với chuỗi cùng version.
- Không đổi backend/migration. Không gửi POST/PUT/DELETE lịch từ màn mới. Không cache lịch/token vào localStorage mới.

Đã qua **28 test đọc lịch**, `npm run typecheck`, export web; kiểm tra browser với API thật trên schema PostgreSQL riêng: đăng nhập, hai tài khoản, F5, đổi/không có học kỳ, ngày/tuần/tháng, nghỉ/đổi, chi tiết, mất mạng/thử lại và kích thước 320/390/430/1280px. Không dùng dữ liệu tài khoản của bạn, không nghiệm thu native trong đợt này. Backend không đổi nên không chạy lại 238 test backend.

```powershell
npm run test:schedule
npm run typecheck
npm run build:web
```

Tên commit: **Kết nối thời khóa biểu với dữ liệu lịch học từ backend**.
