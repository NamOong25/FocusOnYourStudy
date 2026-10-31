# 8A.3A — API lưu nhóm buổi học, nguyên khối và chống gửi trùng

Backend đã có **POST `/api/v1/study-plans/apply`** để lưu các buổi đã chọn/chỉnh và **GET `/api/v1/study-plans/applications/{clientRequestId}`** để đọc biên nhận. Một nhóm phải hợp lệ toàn bộ trước khi ghi; lỗi trong giao dịch sẽ rollback cả nhóm. Hai lần gửi cùng mã/nội dung chỉ tạo một nhóm buổi.

**Giao diện chưa thêm nút lưu nhóm trong đợt này.** Trợ lý AI vẫn chỉ xem/chỉnh đề xuất ở 8A.2. Nối nút duyệt thật là 8A.3B; kiểm tra toàn luồng là 8A.3C. Các buổi được lưu bằng API/script sẽ có trong danh sách **Lịch học → Tự học** sau khi đọc lại dữ liệu.

## Đã làm

- Đọc lại quyền sở hữu, môn/mục tiêu/version, deadline, giờ hiện tại, ngày/thứ/khung rảnh; kiểm tra chồng lấn và nghỉ giữa các buổi được chọn. Bản sửa không được coi là hợp lệ chỉ vì preview cũ trả 200.
- Kiểm tra lịch bận của toàn tài khoản, kể cả môn/học kỳ khác: lịch học sau ngoại lệ, kỳ thi tắt nhắc và tự học đã lưu. Không tự đổi giờ hoặc ghi đè sự kiện khác.
- Cùng khóa owner với writer hiện có; lấy thời điểm và đọc dữ liệu sau khi chờ khóa. Chặn trường hợp hai lệnh cùng thấy lịch rỗng rồi ghi chồng nhau.
- V13 thêm **study_plan_applications** lưu mã yêu cầu, hash lệnh và ảnh chụp kết quả. Biên nhận cùng transaction với các buổi, giữ qua restart và qua việc xóa buổi/môn/bài; FK owner cascade khi xóa tài khoản. Không reset hoặc seed tài khoản thật.
- Cho phép lưu một phần đã chọn; trả số phút thực lưu và còn thiếu. Trạng thái buổi mới là **PLANNED**, không tự hoàn thành bài/Pomodoro.
- Có script **Prepare → Apply → Get**, UTF-8/PowerShell 5.1, chỉ Apply mới ghi. Chuẩn bị tệp không lưu lịch; tệp giữ mã trước khi gửi, không chứa token/mật khẩu, không tự ghi đè tệp cũ hoặc tự retry ghi.

Chi tiết request/response, lỗi và quy tắc retry: [hợp đồng API](../backend/docs/STUDY-PLAN-APPLICATIONS.md). Có [mẫu IntelliJ HTTP](../backend/api/study-plan-applications.http).

## Chạy backend

Mở terminal CMD hoặc PowerShell, chạy:

```text
powershell.exe -NoProfile -File "D:\Video OBS\QuanLyHocTap\backend\scripts\Run-Local.ps1"
```

Nếu backend cũ còn đang chạy, dừng đúng terminal đó bằng **Ctrl+C**, rồi chạy lại. Flyway tự áp dụng **V13**; không xóa database, không chạy SQL tạo lại các bảng. Health `http://localhost:8080/api/v1/health` phải có status/database UP.

Mở terminal khác cho các bước thử dưới đây. Đăng nhập cùng tài khoản đã tạo môn. Nếu cần tìm UUID môn:

```text
powershell.exe -NoProfile -File "D:\Video OBS\QuanLyHocTap\backend\scripts\Try-Courses.ps1" -Mode List
```

Dùng trường **id** dạng `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`, không dùng mã môn như `JAVAIUH`.

## Thử Prepare → Apply → Get

1. **Chuẩn bị bản để xem, chưa lưu:** thay `UUID_MON_CUA_BAN` bằng ID môn thật.

```text
powershell.exe -NoProfile -File "D:\Video OBS\QuanLyHocTap\backend\scripts\Try-StudyPlanApply.ps1" -Mode Prepare -CourseId "UUID_MON_CUA_BAN"
```

Mặc định dùng hôm nay đến sáu ngày sau, rảnh 19:00–21:00, 180 phút, mỗi buổi 45, nghỉ 10. Có thể truyền `-FromDate`, `-ToDate`, `-AvailableStart`, `-AvailableEnd`, `-Weekdays`, `-TimeZone`, `-TotalMinutes`, `-SessionMinutes`, `-BreakMinutes`, `-AssignmentId` hoặc `-ExamId`. Ngày phải còn hợp lệ theo múi giờ. Không xếp được buổi nào thì báo lỗi và không tạo tệp Apply rỗng.

2. Mở **`D:\Video OBS\QuanLyHocTap\backend\.local\study-plan-apply.json`** trong VS Code để xem. Tệp có `clientRequestId`, điều kiện/version và các buổi được đề xuất. Có thể bỏ cả object của buổi không chọn hoặc sửa tên/giờ/thời lượng; giữ JSON hợp lệ, giữ `index` duy nhất. Không sửa version theo phỏng đoán. `startsAt` có `Z` là giờ UTC; 12:00Z tương ứng 19:00 giờ Việt Nam.

3. **Chỉ khi đã xem và muốn lưu thật**, chạy:

```text
powershell.exe -NoProfile -File "D:\Video OBS\QuanLyHocTap\backend\scripts\Try-StudyPlanApply.ps1" -Mode Apply
```

Kết quả có `persisted:true`, `savedMinutes`, `remainingMinutes` và các ID buổi thật. Tải lại web, vào **Lịch học → Tự học** để xem. Có thể chạy frontend ở terminal riêng bằng `npx expo start --web --port 8092` tại thư mục project nếu chưa mở app.

4. Đọc lại biên nhận, không ghi thêm:

```text
powershell.exe -NoProfile -File "D:\Video OBS\QuanLyHocTap\backend\scripts\Try-StudyPlanApply.ps1" -Mode Get
```

5. Chạy **Apply lần nữa với đúng tệp cũ**: nhận cùng biên nhận/ID, số buổi không tăng. Dừng/mở lại backend rồi Get/Apply đúng tệp vẫn không tạo thêm buổi. Nếu sau đó bạn xóa một buổi trong app, Apply tệp cũ cũng **không tạo lại** buổi đã xóa.

6. Muốn chuẩn bị kế hoạch **mới**, dùng tên tệp khác để giữ mã cũ đối chiếu:

```text
powershell.exe -NoProfile -File "D:\Video OBS\QuanLyHocTap\backend\scripts\Try-StudyPlanApply.ps1" -Mode Prepare -CourseId "UUID_MON_CUA_BAN" -RequestFile "D:\Video OBS\QuanLyHocTap\backend\.local\ke-hoach-2.json"
```

Apply/Get kế hoạch mới cũng truyền đúng `-RequestFile` đó. Nếu Prepare báo tệp đã có, không cần xóa tệp hay database; dùng tệp hiện tại để đối chiếu hoặc chọn tên mới cho một lần duyệt mới.

## Trường hợp lỗi nên hiểu thế nào

- **Mất phản hồi sau Apply:** giữ nguyên file/key/body, chạy **Get** trước. 404 chỉ là chưa thấy biên nhận tại thời điểm đọc, không chứng minh POST đang xử lý sẽ không thành công. Nếu cần gửi lại, chủ động gửi cùng tệp/mã; không tạo key mới để né kết quả chưa rõ.
- **SOURCE_CHANGED:** môn/bài/thi đã đổi sau bản xem trước. Đọc biên nhận nếu chưa rõ lần trước có lưu hay chưa; nếu chắc chưa lưu, xem dữ liệu và tạo đề xuất mới. Không tự thay version trong tệp để ép lưu.
- **TIME_CONFLICT / SELECTION_CONFLICT / AFTER_DEADLINE:** chưa lưu nhóm; sửa điều kiện/các buổi sau khi đối chiếu hoặc tạo đề xuất mới. Không có cơ chế tự lưu các dòng còn hợp lệ.
- **REQUEST_REUSED:** mã đã có một lần lưu thành công với nội dung khác. Đọc biên nhận cũ; không dùng cùng mã cho một lần duyệt khác.
- Biên nhận là **ảnh chụp lúc lưu**, không phải trạng thái hiện tại của từng buổi. Danh sách Tự học là nơi xem các chỉnh sửa/xóa sau đó.

## Kết quả kiểm tra

- **844 tests backend / Maven verify / đóng gói JAR đạt, 0 lỗi/0 bỏ qua**, 40 test mới. Kiểm tra toàn bộ chạy 8 phút 18 giây, 54 test suites; không gọi riêng 92 test liên quan là toàn bộ backend.
- Trước lượt toàn bộ: **92 test liên quan đạt**, gồm API mới, preview/engine cũ và Foundation/schema. Nhóm mới qua HTTP/PostgreSQL thật: lưu đầy đủ/phần chọn, chỉnh buổi, owner/nguồn/version/điều kiện, deadline/microsecond, DST, múi giờ, schema V12→V13 và PowerShell 5.1 Prepare/Apply/Get/retry/lỗi.
- Gây lỗi có chủ đích ở **dòng study thứ hai** và **lúc ghi biên nhận**: không còn dòng tự học/biên nhận dở dang sau rollback; bỏ bộ gây lỗi rồi gửi cùng key thành công. Hai lệnh cùng key trả 201/200 với cùng ID; khác key nhưng trùng giờ chỉ một lệnh được lưu. Lệnh chờ khóa phải đọc sự kiện vừa commit và thời điểm sau khi chờ.
- **TypeScript và 665 tests frontend hồi quy đạt**, không lỗi/bỏ qua. Không đổi frontend, dependency hoặc quy chế điểm; không lặp export web hay test UI vì đợt này chưa có nút lưu nhóm.
- JAR chạy ở host/schema QA riêng với tài khoản thử, mở **ba tiến trình backend nối tiếp (hai lần restart)**. Lần đầu 201 lưu hai buổi/90 phút; sau restart GET và replay 200 trả cùng biên nhận, số dòng vẫn hai. Cùng key đổi body và key khác trùng giờ đều 409. Xóa một buổi qua API, restart lần nữa, replay vẫn để **một** buổi hiện tại, không khôi phục buổi đã xóa. Đây là test API/process thật, không gọi là thao tác UI hoặc mô phỏng mọi lỗi mạng.
- [Số liệu QA](test-results/study-plan-apply-8a3a.json) không kèm token/mật khẩu. Schema và server QA riêng đã dọn, fixture riêng có credential đã xóa; không seed/reset dữ liệu người dùng. V13 được áp dụng cho database thật khi người dùng khởi động lại backend.
- Biên nhận/lookup được kiểm tra độc lập với phản hồi ban đầu; lỗi chưa rõ cần giữ key để đối chiếu. Không tuyên bố đã kiểm tra mọi tình huống mất gói trên thiết bị thật; nghiệm thu UI end-to-end còn 8A.3C.

## Checklist và commit

Đã đánh dấu **8A.3A** trong `UI-BACKLOG.md`, giữ **8A.3B/8A.3C** chưa hoàn tất. Bảng biên nhận không phải triển khai lại lưu tệp/PDF hoặc AI ngoài phạm vi đã bỏ.

Tên commit tiếng Việt: **Thêm API lưu nhóm buổi học và chống gửi trùng**. Chưa tự commit/push.
