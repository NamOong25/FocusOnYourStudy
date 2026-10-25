# 4H.1A — Backend lịch thi cơ bản

Đã có API lưu lịch thi theo tài khoản trong PostgreSQL. Đợt này chưa nối màn Lịch thi/Trang chủ/chuông (4H.2) và chưa chặn trùng với lịch thi/lịch học/tự học (4H.1B).

## Khởi động và nâng bảng

Terminal 1 trong VS Code hoặc IntelliJ:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Nếu backend đã chạy từ đợt trước: Ctrl+C rồi chạy lại lệnh trên để Flyway tự áp dụng **V7**. Không xóa database, không chạy lại SQL V1–V6 và không tạo bảng thủ công. V7 thêm bảng `exams`; tài khoản, học kỳ, môn, bài tập, tự học, lịch học và ngoại lệ cũ được giữ.

Giữ terminal này chạy. Health http://localhost:8080/api/v1/health có status/database UP cho biết backend/DB sẵn sàng, không phải trang giao diện lịch thi.

Terminal 2, cũng có thể mở trong VS Code hoặc IntelliJ, dùng để thử API. Không cần mở frontend để chạy những lệnh dưới đây. Khi bạn chạy cả app, frontend vẫn dùng terminal riêng như trước.

## 1. Liệt kê và lấy môn

Dùng tài khoản đã đăng ký trong app. Script hỏi email và mật khẩu nhập ẩn mỗi lần; không ghi token/mật khẩu vào file hoặc hiển thị token.

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Try-Exams.ps1 -Mode List
.\scripts\Try-Courses.ps1 -Mode List
```

`data: []` khi chưa có lịch thi là đúng. Lấy **id môn từ API** (dạng UUID), không dùng tên môn hoặc ID của dữ liệu mẫu. Nếu chưa có môn, tạo học kỳ/môn trong app đã nối API rồi List lại.

## 2. Tạo lịch thi

Thay `THAY_COURSE_ID` bằng UUID thật của môn:

```powershell
.\scripts\Try-Exams.ps1 -Mode Create `
  -CourseId 'THAY_COURSE_ID' `
  -Kind FINAL -Format WRITTEN `
  -StartsAt '2026-11-10T08:00:00+07:00' `
  -EndsAt '2026-11-10T10:00:00+07:00' `
  -TimeZone 'Asia/Ho_Chi_Minh' `
  -Room 'A2.03' `
  -ReminderMinutes @(1440,180,0) `
  -Notes 'Mang thẻ sinh viên'
```

Kết quả có **id** lịch thi và **version: 0**. API trả giờ UTC Z: 08:00 Việt Nam là 01:00Z, 10:00 là 03:00Z; timeZone vẫn được giữ để hiển thị lại. Đây không phải bị sai giờ.

Loại kỳ thi: MIDTERM = Giữa kỳ, FINAL = Cuối kỳ, OTHER = Khác. Hình thức: WRITTEN = Tự luận, MULTIPLE_CHOICE = Trắc nghiệm, PRACTICAL = Thực hành, ORAL = Vấn đáp, ONLINE = Trực tuyến.

Mốc nhắc là cấu hình được lưu. 1440 = trước một ngày, 180 = trước ba giờ, 0 = đúng giờ bắt đầu. Chưa nối nhắc lịch thi vào chuông hoặc thông báo thiết bị trong đợt này.

## 3. Đọc lại, lọc và thử khởi động lại

```powershell
.\scripts\Try-Exams.ps1 -Mode List
.\scripts\Try-Exams.ps1 -Mode Get -ExamId 'THAY_EXAM_ID'
.\scripts\Try-Exams.ps1 -Mode List -CourseId 'THAY_COURSE_ID' -FilterKind FINAL
.\scripts\Try-Exams.ps1 -Mode List `
  -From '2026-11-10T07:00:00+07:00' `
  -To '2026-11-10T11:00:00+07:00'
```

Có thể thêm `-SemesterId 'UUID_KY'` và `-FilterFormat WRITTEN`; các bộ lọc kết hợp AND. Khoảng lọc lấy lịch giao với `[From,To)`, không lấy lịch chỉ chạm biên; có thể chỉ truyền một đầu.

Ở terminal 1, Ctrl+C để tắt backend, chạy lại Run-Local. Ở terminal 2 chạy List/Get: lịch thi vẫn còn. Không cần tạo lại lịch.

## 4. Sửa bằng phiên bản vừa đọc

Thay ID/version bằng kết quả Get mới nhất; ví dụ lần đầu version 0:

```powershell
.\scripts\Try-Exams.ps1 -Mode Update `
  -ExamId 'THAY_EXAM_ID' -Version 0 `
  -CourseId 'THAY_COURSE_ID' `
  -Kind FINAL -Format WRITTEN `
  -StartsAt '2026-11-10T08:00:00+07:00' `
  -EndsAt '2026-11-10T10:00:00+07:00' `
  -TimeZone 'Asia/Ho_Chi_Minh' `
  -Room 'B2.03' -NoReminder `
  -Notes 'Đã đổi phòng'
```

PUT là thay **đầy đủ** dữ liệu, không phải sửa riêng mỗi phòng. Truyền đúng loại kỳ thi, hình thức, giờ và các giá trị muốn giữ. `-NoReminder` gửi reminder=false và mảng rỗng; không đi kèm ReminderMinutes khác rỗng. Bỏ NoReminder thì dùng reminder=true và các mốc đã truyền/mặc định 1440,180.

Thành công sẽ có version tăng (ví dụ 1). Gửi lại bản cũ version 0 phải nhận **409 EXAM_VERSION_CONFLICT**. Kể cả PUT nội dung giống hệt vẫn tiêu thụ version, nên cần Get lại trước khi sửa/xóa tiếp. Không tự đổi version trong bản nháp rồi gửi lại mà chưa xem dữ liệu mới.

## 5. Xóa bản ghi thử

Chỉ thực hiện với lịch bạn muốn xóa và version từ Get mới nhất:

```powershell
.\scripts\Try-Exams.ps1 -Mode Delete -ExamId 'THAY_EXAM_ID' -Version 1
.\scripts\Try-Exams.ps1 -Mode List
```

Version trong ví dụ là 1; thay theo bản ghi thật. Xóa chỉ lịch thi đó, không xóa môn/bài/lịch học/tự học. Sau xóa Get/Update ID cũ trả 404, không tự tạo lại.

Script đăng nhập một phiên BODY riêng và logout phiên đó ở cuối; không đăng xuất các phiên trình duyệt/điện thoại khác. Không copy output đăng nhập HTTP thật lên Git.

## Một vòng kiểm tra bổ sung

| Trường hợp | Kết quả |
| --- | --- |
| Tài khoản B List/Get/Update/Delete lịch thi của A | List không có bản ghi của A; truy cập ID A trả 404. |
| CourseId của người khác | 404 COURSE_NOT_FOUND, không tạo/sửa lịch. |
| Giờ không có offset, kết thúc trước/bằng bắt đầu hoặc qua 24:00 ngày địa phương | 400, không ghi dữ liệu. |
| Mốc âm, quá 10080, trùng, hơn 10 mốc, bật nhưng rỗng/tắt nhưng không rỗng | 400. |
| Sửa/xóa cùng version từ hai nơi | Chỉ một thao tác thành công; bên còn lại nhận 409 hoặc 404 nếu đã xóa. |
| Môn còn lịch thi: thử xóa/chuyển học kỳ trong app/API | 409 COURSE_HAS_EXAMS; vẫn được sửa tên/giảng viên/thông tin thường. |
| Xóa hết lịch thi rồi chuyển/xóa môn | Được nếu môn cũng không còn các liên kết khác. |

Muốn thử theo tài khoản B cần tài khoản B độc lập; không chỉ thay email trong payload mà vẫn dùng token A. Script luôn lấy token từ lần đăng nhập vừa nhập.

## Thử trong IntelliJ

Mở thư mục `backend` thành project Maven, dùng JDK 21. Mở `api/exams.http`; nếu IDE có HTTP Client, điền biến/email/mật khẩu tại máy rồi chạy từng request: Login → lấy accessToken → Courses → Create → Get → Update → Delete. Cập nhật version sau mỗi lần ghi. Nếu chưa dùng HTTP Client, các lệnh PowerShell trên vẫn chạy trong terminal IntelliJ.

Hợp đồng đầy đủ: `../backend/docs/EXAMS.md`. Khi dùng query offset trong HTTP Client, encode dấu + hoặc dùng UTC Z như file mẫu.

## Nghiệm thu

- **268 tests/Maven verify qua, không bỏ qua**, gồm 30 test mới cho API/migration; mở rộng kiểm tra tắt/mở toàn backend để đọc lại lịch thi và các dữ liệu học tập cũ.
- Kiểm thử chạy bằng PostgreSQL thật trong schema ngẫu nhiên riêng, dọn sau từng nhóm; không seed/reset database chính của bạn.
- Có CRUD/lọc/ownership/version, PUT giống hệt, kiểm tra DB array/owner/time, UTC/DST, race với xóa/chuyển môn, migration V6 → V7 giữ dữ liệu và script PowerShell 5.1 thật. V1–V6 không sửa.
- Frontend chỉ thêm thông báo COURSE_HAS_EXAMS cho form môn; TypeScript và 140 kiểm tra lịch/nhắc việc hồi quy qua. Màn Lịch thi vẫn là bản thử trong phiên đến đợt 4H.2.

Đợt tiếp theo **4H.1B** sẽ bổ sung kiểm tra trùng thi–thi/thi–lịch học/thi–tự học hai chiều; không coi 4H.1A là đã làm phần này.
