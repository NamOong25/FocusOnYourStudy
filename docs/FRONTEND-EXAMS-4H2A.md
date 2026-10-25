# 4H.2A — Đọc danh sách và chi tiết lịch thi từ tài khoản

Trong tài khoản thật, **Lịch học → Lịch thi** đã dùng GET API `/api/v1/exams` và `/api/v1/exams/{id}`. Có chọn học kỳ/môn, Sắp tới/Đã qua/Tất cả, tải lại và chi tiết mới nhất. Dữ liệu tạo bằng script ở 4H.1A sẽ hiện trên app và còn sau F5.

Đây là đợt **chỉ đọc**. Thêm/sửa/xóa và đổi cấu hình nhắc từ UI nối ở 4H.2B; tổng hợp kỳ thi gần nhất trên Dashboard/chi tiết môn và nhắc việc nối ở 4H.2C. Dashboard hiện có nút mở danh sách thật; chưa suy ra “không có lịch thi” từ dữ liệu RAM trống. Chế độ xem thử chưa đăng nhập vẫn dùng giao diện mẫu riêng.

## 1. Chạy backend và frontend

Terminal 1:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
./scripts/Run-Local.ps1
```

Terminal 2:

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npm run web -- --port 8092
```

Giữ hai terminal chạy, mở `http://localhost:8092`. Đăng nhập bằng tài khoản đã có học kỳ và môn. Backend mặc định cổng 8080, frontend 8092; dùng nhất quán localhost cho cả hai khi thử phiên cookie.

## 2. Tạo một kỳ thi để xem trên app

Mở terminal 3 để chạy lệnh thử; terminal này có thể đóng sau khi chạy xong:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
./scripts/Try-Courses.ps1 -Mode List
```

Lấy `id` môn thuộc đúng học kỳ cần kiểm tra. Mỗi script hỏi email/mật khẩu; dùng cùng tài khoản đang đăng nhập trên app. Thay UUID bằng ID thực:

```powershell
./scripts/Try-Exams.ps1 -Mode Create -CourseId 'UUID_MON_CUA_BAN' -Kind MIDTERM -Format WRITTEN -StartsAt '2026-11-24T08:00:00+07:00' -EndsAt '2026-11-24T10:00:00+07:00' -Room 'B2.03' -ReminderMinutes @(1440,180,0) -Notes 'Mang the sinh vien - thu giao dien doc lich thi'
```

Lệnh này ghi một kỳ thi thật vào PostgreSQL của tài khoản. Nếu nhận 409 trùng lịch, chọn ngày/giờ trống khác; backend đã kiểm tra cả thi, lớp và tự học. Ghi lại ID/version để sửa/xóa dữ liệu thử bằng script sau này. Không cần import SQL hoặc tạo lại database.

Nếu tài khoản đã có kỳ thi, có thể bỏ bước Create và kiểm tra bằng:

```powershell
./scripts/Try-Exams.ps1 -Mode List
```

## 3. Xem danh sách và chi tiết

1. Trong app, mở **Lịch học → Lịch thi** hoặc nút **Xem lịch thi đã lưu** trên Trang chủ.
2. Chọn đúng **học kỳ/năm học** chứa môn vừa dùng.
3. Bấm **Tải lại lịch thi**. Kỳ thi phải hiện đúng tên/mã môn, loại/hình thức, ngày/giờ, phòng và cấu hình nhắc.
4. Chọn riêng môn đó: chỉ lịch của môn đó xuất hiện. Chuyển học kỳ: bộ chọn môn về tất cả môn của kỳ mới, không còn lịch ở kỳ trước. Môn cùng tên ở hai kỳ được phân biệt bằng ID và học kỳ.
5. Bấm thẻ kỳ thi: mở **Chi tiết lịch thi**, đọc mới từ GET theo ID. Đối chiếu ngày/giờ, múi giờ, phòng, ghi chú với script.
6. **0 phút** hiển thị “Đúng giờ bắt đầu”; tắt nhắc hiển thị “Không chọn nhắc”. Đây là cấu hình đã lưu, chưa gửi thông báo thiết bị.
7. Đóng chi tiết sẽ cập nhật lại danh sách, giữ bộ lọc đang xem.

Ngày/giờ theo **múi giờ lưu trên kỳ thi**, không tự đổi thành giờ máy đang dùng. Nếu offset thay đổi trong kỳ thi do DST, hai đầu hiển thị kèm GMT để phân biệt giờ lặp. Thứ tự và Sắp tới/Đã qua xét bằng thời điểm UTC thực; kỳ thi đang diễn ra vẫn ở Sắp tới, chuyển sang Đã qua đúng lúc kết thúc.

## 4. Kiểm tra dữ liệu còn sau F5

Tải lại trang, đóng hồ sơ nếu app mở hồ sơ sau khôi phục phiên, rồi vào Lịch thi và chọn lại đúng học kỳ. Kỳ thi vẫn còn và không yêu cầu nhập lại dữ liệu.

Các bộ chọn giữ khi qua lại giữa màn đã mở trong phiên; sau F5, chọn lại bộ lọc nếu cần. Dữ liệu lịch thi được đọc lại từ PostgreSQL, không lấy từ localStorage hoặc bản mẫu trong RAM.

## 5. Thử danh sách trống và lọc thời điểm

- Chọn học kỳ/môn chưa có kỳ thi: hiện trạng thái chưa có dữ liệu sau khi GET thành công.
- Nếu kỳ thi ở quá khứ, bấm **Đã qua** hoặc **Tất cả**. Sắp tới mặc định không hiển thị kỳ thi đã kết thúc.
- Khi có dữ liệu nhưng bộ lọc thời điểm không khớp, hiện “Chưa có kỳ thi ở mục này” và nút **Xem tất cả lịch thi**.
- Không có học kỳ: hướng dẫn đến **Môn & học kỳ**. Không tự thêm kỳ hoặc mẫu dữ liệu.

## 6. Thử thay đổi ở nơi khác

Dùng script Get lấy version mới nhất rồi Update kỳ thi (truyền lại đầy đủ các thông tin muốn giữ). Trên app bấm **Tải lại chi tiết lịch thi**: phòng/ghi chú mới phải xuất hiện. Đóng chi tiết để danh sách được cập nhật.

Với một kỳ thi thử có thể xóa, dùng script Delete theo ID/version hiện tại. Nếu app vẫn đang mở chi tiết, bấm tải lại: hiện **Lịch thi không còn tồn tại**, bỏ nội dung cũ. Bấm **Quay lại và cập nhật danh sách** để bỏ thẻ đã xóa. Không tự tạo lại kỳ thi.

## 7. Thử lỗi kết nối và thử lại

1. Khi đã có danh sách, Ctrl+C terminal **backend**; giữ frontend chạy.
2. Bấm **Tải lại lịch thi**: báo không thể kết nối và ghi rõ đang giữ bản tải gần nhất của đúng bộ lọc; không báo lưu thành công hoặc tự tạo dữ liệu mẫu.
3. Chuyển sang một học kỳ khác khi backend còn tắt: hiện lỗi tải, không mang lịch cũ sang và không diễn giải lỗi thành “chưa có kỳ thi”.
4. Chạy lại backend trong terminal 1, bấm **Thử tải lại lịch thi**: danh sách đúng học kỳ xuất hiện.

Khi quay lại màn hoặc đưa app/trình duyệt về foreground, lịch được đọc lại. Request cùng bộ lọc đang chạy được gộp; đổi học kỳ/môn sẽ hủy request cũ và bỏ phản hồi đến muộn, kể cả khi mạng không thực sự hủy được.

## 8. Hai tài khoản

Đăng nhập tài khoản A có lịch thi, sau đó vào Hồ sơ → Đăng nhập tài khoản khác để đổi sang B. Danh sách/chi tiết và bộ nhớ request của A phải biến mất. B chỉ thấy các học kỳ/môn/lịch thuộc B; có thể là danh sách trống. Đăng nhập lại A, chọn đúng kỳ để xem lại dữ liệu A.

Trong tài khoản thật, đợt này không có nút lưu/xóa/đổi nhắc bằng RAM. Các lối vào form mẫu từ màn khác được hướng sang danh sách đã lưu, tránh báo thành công giả. Chưa đăng nhập vẫn có thể dùng chế độ mẫu như trước.

## Cấu trúc mã và kết quả đã kiểm tra

- `src/features/exams/api/examsApi.ts`: GET danh sách/chi tiết qua authorized client, kiểm tra DTO/UUID/enum/ngày giờ/zone/version/mốc nhắc, loại property ngoài contract, kiểm tra trùng ID và course scope.
- `api/ExamReadManager.ts`: trạng thái đọc, gộp request, hủy/bỏ kết quả cũ, giữ bản cùng query khi mạng lỗi, xóa nội dung khi nhận 401/404, dispose theo tài khoản.
- `api/useServerExams.ts`: hook theo phiên/query và màn active/foreground. List và detail có manager riêng.
- `ServerExams.tsx`, `components/ServerExamCard.tsx`, `components/ServerExamDialog.tsx`: giao diện đọc, bộ chọn và trạng thái. Không trộn nguồn server vào mảng mẫu dùng cho Dashboard/nhắc việc trước đợt 4H.2C.
- `examView.ts`: lọc thời điểm UTC, hiển thị ngày/giờ nguồn, offset khi đổi DST và nhãn mốc nhắc.

**Đã qua:** `npm run typecheck`, **50 test đọc lịch thi mới**, **140 test lịch frontend hồi quy**, export web. Không đổi backend/migration/dependency.

Browser đã kiểm tra với Spring Boot/PostgreSQL thật trong schema thử riêng: danh sách, GET chi tiết mới sau sửa phòng, bộ lọc môn/thời điểm/học kỳ, cùng tên môn ở kỳ khác, học kỳ trống, F5 giữ phiên, xóa ở nơi khác rồi 404, lỗi mạng giữ bản cũ, đổi kỳ khi lỗi, khởi động lại backend/thử lại và đổi tài khoản. Đã xem ảnh ở 320/390/430/1280px. Đây là kiểm tra web; thiết bị thật 2C.3B vẫn để sau.

Dữ liệu QA tự động dùng schema riêng và được dọn sau kiểm tra, không seed schema ứng dụng. Các bước thử thủ công ở trên dùng tài khoản của bạn; kỳ thi được tạo bằng lệnh Create sẽ còn cho đến khi bạn chủ động xử lý nó.

Test chạy lại: `npm run test:exams`, `npm run test:schedule`. Checklist: [UI-BACKLOG.md](UI-BACKLOG.md). Tên commit và lệnh push: [GIT-COMMITS.md](GIT-COMMITS.md).
