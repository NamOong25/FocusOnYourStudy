# 8A.1 — Backend đề xuất kế hoạch học từ dữ liệu thật

Ngày 31/10/2026. Thực hiện đề xuất kế hoạch học đã thống nhất sau khi bỏ phần upload/đính kèm tài liệu. **8A.1 ở đây là lập kế hoạch, không phải đề xuất tài liệu PDF cũ.**

## Đã làm

API `POST /api/v1/study-plans/preview` nhận môn, mục tiêu, khoảng ngày, khung giờ rảnh, các thứ, số phút muốn học, độ dài mỗi buổi và thời gian nghỉ. Có thể gắn một bài tập hoặc kỳ thi của chính tài khoản; backend tự đọc deadline/giờ thi từ PostgreSQL.

Lịch bận lấy toàn tài khoản, gồm buổi tự học, lịch thi và buổi học sau ngoại lệ đổi/nghỉ. So sánh bằng thời điểm thực tế, xét múi giờ, hiện tại và deadline; có khoảng nghỉ giữa các buổi đề xuất. Trả số phút đã xếp/chưa xếp và metadata nguồn. Thiếu thời gian vẫn cho xem các buổi tìm được, không báo là xếp đủ.

Đây là **bộ xếp lịch theo quy tắc `RULE_BASED_V1`**, chưa gọi AI/LLM và không cần API key. API chỉ xem trước, chưa lưu/duyệt/điều chỉnh nhiều buổi, chưa thay giao diện Trợ lý. PostgreSQL vẫn V12; không migration/dependency/seed dữ liệu người dùng. Mã được tách trong package `com.focusstudy.planning`.

Ví dụ lịch trống 19:00–21:00 trong hai ngày, cần thêm 180 phút, mỗi buổi 45 phút, nghỉ 10 phút:

| Ngày | Buổi | Thời gian |
| --- | --- | --- |
| Ngày 1 | 1 | 19:00–19:45 |
| Ngày 1 | 2 | 19:55–20:40 |
| Ngày 2 | 3 | 19:00–19:45 |
| Ngày 2 | 4 | 19:55–20:40 |

Nếu chỉ chọn một ngày trong ví dụ trên: xếp được **90/180 phút**, thiếu 90 phút. Khung thừa 20 phút không được biến thành buổi nhỏ để lấp đủ số phút; chỉ buổi cuối được ngắn hơn khi số phút cần học còn ít hơn độ dài một buổi.

## Bạn kiểm tra bằng PowerShell

**Terminal backend** trong VS Code hoặc IntelliJ đều được:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Giữ terminal đó chạy; nếu backend cũ đang chạy thì Ctrl+C rồi chạy lại để nạp API mới. Không cần reset/tạo lại database.

**Terminal thứ hai** cũng ở thư mục `backend`:

```powershell
.\scripts\Try-Courses.ps1 -Mode List
```

Nhập tài khoản đã đăng ký. Lấy `id` của môn từ danh sách; nếu chưa có môn thì tạo học kỳ/môn trong app trước. Thay phần ID dưới đây bằng UUID thật, không dùng tên/mã môn:

```powershell
.\scripts\Try-StudyPlan.ps1 -CourseId 'THAY_ID_MON_HOC'
```

Script hỏi email/mật khẩu nhập ẩn; mặc định tìm trong hôm nay và 6 ngày tiếp theo, giờ 19:00–21:00, cần 180 phút, buổi 45 phút, nghỉ 10 phút. Không in/lưu token; đăng xuất phiên riêng do script tạo, không thu hồi phiên app đang dùng.

Kết quả cần xem:

- `engine: RULE_BASED_V1`, `persisted: false`.
- `requestedMinutes`, `scheduledMinutes`, `unscheduledMinutes`; hai số sau cộng lại bằng số đầu.
- `complete: true` chỉ nghĩa xếp đủ phút, không nghĩa đã hoàn thành bài hay lưu kế hoạch.
- `sessions`: giờ bắt đầu/kết thúc UTC có chữ Z; `timeZone` cho biết múi giờ hiển thị, ví dụ UTC 12:00 là 19:00 Việt Nam.
- Mở danh sách Tự học trên app trước/sau khi thử: **không có buổi nào tự được thêm**. Đây là đúng hành vi của 8A.1.

Thử gắn deadline một bài đang làm thuộc đúng môn:

```powershell
.\scripts\Try-StudyPlan.ps1 -CourseId 'THAY_ID_MON_HOC' -AssignmentId 'THAY_ID_BAI_TAP'
```

Hoặc ôn thi, không truyền đồng thời AssignmentId:

```powershell
.\scripts\Try-StudyPlan.ps1 -CourseId 'THAY_ID_MON_HOC' -ExamId 'THAY_ID_LICH_THI' -TotalMinutes 90
```

Đổi khung giờ/thứ/thời lượng:

```powershell
.\scripts\Try-StudyPlan.ps1 -CourseId 'THAY_ID_MON_HOC' -AvailableStart '18:00' -AvailableEnd '20:00' -Weekdays 1,3,5 -TotalMinutes 120 -SessionMinutes 30 -BreakMinutes 10
```

Với backend chạy cổng khác, thêm `-BaseUrl 'http://localhost:CONG_CUA_BAN'`. Mỗi đề xuất tối đa 14 ngày; `-FromDate 'YYYY-MM-DD' -ToDate 'YYYY-MM-DD'` phải là ngày hợp lệ từ hôm nay theo múi giờ đã chọn. Script dùng ngày máy làm mặc định; nếu thử múi giờ khác, truyền ngày tương ứng rõ ràng.

## Kiểm tra trong IntelliJ

Mở [backend/api/study-plans.http](../backend/api/study-plans.http), chạy backend, thay baseUrl/courseId/ngày. Đăng nhập lấy accessToken rồi thử request tự học, bài tập hoặc kỳ thi. Không commit mật khẩu/token thật vào file HTTP.

## Các tình huống đã kiểm tra

**40 test mới: 13 thuật toán + 27 HTTP/PostgreSQL tích hợp**, không lỗi/bỏ qua trong lượt riêng. Bao gồm:

- 180 phút/bốn buổi, phần còn lại 25 phút hoặc 1 phút, thiếu khoảng trống, ngày không có thứ đã chọn và giới hạn 1440 phút/96 buổi.
- Khoảng bận trùng/nối tiếp/không có thứ tự, giáp ranh cho phép; giờ bận và giờ hiện tại có phần lẻ làm tròn lên đến phút.
- Deadline đúng lúc kết thúc, microsecond trước ranh giới; bài hoàn thành/quá hạn, kỳ thi bắt đầu, môn không khớp và ID người khác/mất.
- Mọi lịch bận kể cả học kỳ khác, thi tắt nhắc, ngoại lệ nghỉ/đổi/khôi phục, ngoại lệ ngày khác, lịch bên kia đường đổi ngày; nguồn người khác không chặn tài khoản đang dùng.
- DST không tồn tại/lặp giờ được báo/bỏ ngày, khung đi qua DST tính phút thực; giới hạn năm/UTC không tạo buổi mà API tự học sẽ từ chối.
- Bearer/method/route, JSON/numeric/nested validation, spoof userId, metadata/version và cache no-store.
- Preview lặp không ghi/giữ chỗ; lịch mới xuất hiện giữa preview và lưu bị API tự học chặn. Có test chủ động POST từng buổi qua API hiện có để xác nhận dữ liệu đề xuất lưu được, không phải preview tự tạo.
- Script Windows PowerShell 5.1: thành công/lỗi, không in token/mật khẩu, không ghi buổi và chỉ thu hồi phiên script.

**Toàn bộ 804 test backend đạt (40 mới), 0 lỗi/bỏ qua; Maven verify và đóng gói JAR thành công trong một lượt đầy đủ.** TypeScript và **630 test frontend hồi quy đạt**, không đổi UI. Tests dùng schema PostgreSQL biệt lập và tự dọn; không seed/reset dữ liệu người dùng. Các log kiểm tra nằm trong `backend/.local` được Git bỏ qua.

## Giới hạn và đợt tiếp theo

Một khung rảnh lặp theo thứ, tối đa 14 ngày và 1440 phút. Xếp sớm nhất, chưa cân bằng theo ngày/nhiều khung/ngôn ngữ tự nhiên. `totalMinutes` là số phút muốn **xếp thêm**, các buổi đã lưu chỉ là lịch bận. Buổi cuối có thể ngắn hơn 15 phút nếu phần còn thiếu nhỏ.

Preview không phải reservation; nội dung có thể đổi ngay sau `asOf`. Cần kiểm tra lại khi duyệt, không tự dùng version mới để ghi đè bản người dùng chưa xem. **8A.2** nối UI xem/sửa/bỏ chọn với API này; phần duyệt/lưu nhiều buổi và chống tạo trùng/xử lý lỗi sẽ cần API riêng và kiểm tra ở đợt tiếp theo. Không gọi backend xếp theo quy tắc là AI tạo nội dung.

[Hợp đồng đầy đủ](../backend/docs/STUDY-PLANS.md), [tài liệu Spring transaction](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html). Chưa thử UI mới/điện thoại vì 8A.1 chỉ backend; các đợt native đã hoãn vẫn giữ nguyên.

## Git

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git add .
git commit -m "Thêm API đề xuất kế hoạch học từ lịch thực tế"
git push origin main
```

Chưa tự commit/push. Điều chỉnh bỏ upload/tài liệu đã có trong checklist được giữ lại.
