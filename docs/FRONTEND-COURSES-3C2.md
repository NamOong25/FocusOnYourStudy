# 3C.2 — Giao diện môn học dùng dữ liệu thật

Đăng nhập rồi mở **Lịch học → Môn & học kỳ**. Danh sách/tạo/sửa/xóa/chuyển kỳ của môn dùng API 3B và PostgreSQL của tài khoản. F5, đăng xuất rồi đăng nhập lại vẫn giữ môn. Màn quản lý, Dashboard, thống kê tín chỉ và các ô chọn môn dùng cùng danh sách, không tự đưa dữ liệu mẫu vào tài khoản.

**Học kỳ và môn học đã lưu thật.** Bài tập, lịch học/lịch thi, điểm, Pomodoro, thông báo và AI vẫn là thử trong RAM. Tạo bài/nhập điểm rồi F5 sẽ đặt lại các phần thử đó; môn đã lưu vẫn còn. Thiết bị thật 2C.3B tiếp tục để sau.

## Chạy và kiểm tra một vòng

Chạy hai terminal như trước:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npx expo start --web --port 8092
```

Mở `http://localhost:8092`, đăng nhập ở **Hồ sơ** rồi đóng bảng tài khoản. Không cần tạo lại database, không cần chạy SQL hoặc nhập dữ liệu mẫu. Nếu thử khi chưa đăng nhập, học kỳ/môn vẫn chỉ là dữ liệu xem trước và không lưu backend.

1. **Tạo học kỳ:** vào **Lịch học → Môn & học kỳ**, tạo Học kỳ 1 của năm đang học nếu chưa có.
2. **Thêm môn:** bấm **Thêm môn đầu tiên** hoặc **+ Thêm môn**. Nhập tên, mã `web101`, 3 tín chỉ, giảng viên, phòng, màu và mục tiêu rồi **Lưu môn học**. Mã được viết hoa thành `WEB101`, mở chi tiết sau khi lưu.
3. **F5:** đóng bảng Hồ sơ → vào lại kỳ đó → mở môn → bấm bút **Chỉnh sửa môn học**. Kiểm tra các thông tin vẫn đúng. Trang chủ và các ô chọn môn trong form bài/lịch đều có môn này.
4. **Sửa:** đổi tên môn, giảng viên, phòng, số tín chỉ, trạng thái/màu/mục tiêu → lưu → F5. Số tín chỉ trên màn quản lý và Trang chủ cập nhật theo cùng dữ liệu. GPA chưa có điểm sẽ không tự thành 0.
5. **Thử trùng mã:** thêm một môn khác trong cùng kỳ, nhập ` web101 ` → báo trùng và giữ nội dung form. Hai môn cùng mã ở hai kỳ khác nhau được phép; mỗi lần học có ID riêng.
6. **Chuyển kỳ:** tạo Học kỳ 2. Mở môn chưa có bài/lịch/điểm thử → **Chỉnh sửa môn học** → chọn Học kỳ 2 → lưu. Môn biến khỏi kỳ 1, xuất hiện ở kỳ 2; F5 vẫn đúng. Nếu kỳ đích đã có cùng mã, cần đổi mã hoặc chọn kỳ khác trước khi lưu.
7. **Xóa:** chọn một môn không có dữ liệu thử liên quan → bút sửa → **Xóa môn học**. Chọn **Giữ môn học** để hủy; thử lại rồi **Xác nhận xóa môn học**. F5 không thấy môn đã xóa; học kỳ vẫn còn. Học kỳ còn môn không xóa được.
8. **Hai tài khoản:** đổi sang B không thấy môn của A. Trở về A thấy lại các môn thật, nhưng bài/lịch/điểm/bản nháp/timer thử được đặt lại. Không lấy kết quả phản hồi muộn của A để hiển thị ở B.

## Liên kết với dữ liệu thử

- Môn dùng ID từ backend. Đổi tên cập nhật tên môn trên bài tập, ca học và lịch thi trong cùng phiên. Giảng viên của ca học chỉ đổi theo môn nếu ca đó đang dùng giảng viên cũ của môn; giữ thông tin dạy thay đã nhập riêng.
- Chặn chuyển kỳ/xóa nếu còn bài, ca học, lịch thi, buổi tự học hoặc điểm đã nhập trong phiên. Điểm **0** cũng là điểm đã nhập. Liên kết học lại có điểm ở bất kỳ lần học nào trong chuỗi được bảo vệ khi đổi tín chỉ/chuyển kỳ/xóa.
- Hai lần học cùng mã nhưng chưa có điểm chỉ tạo liên kết tính toán rỗng; liên kết rỗng này không khóa quản lý môn. Không thay công thức điểm/GPA IUH trong đợt này.
- Nếu môn bị xóa/chuyển kỳ bằng API hoặc tab khác, lần tải lại sẽ theo dữ liệu server. Các bài/lịch/điểm thử liên quan đến môn đó được đặt lại và có thông báo; các môn khác vẫn giữ nguyên. Nếu cần giữ dữ liệu thử trước khi kiểm tra kiểu này, không thực hiện xóa/chuyển từ nơi khác. Các dữ liệu này chưa được đồng bộ backend.
- Lịch sử phiên tập trung đã hoàn tất giữ thông tin tại thời điểm ghi; timer đang dở của môn bị xóa/chuyển kỳ được đặt lại. Chưa lưu lịch sử Pomodoro lên backend.

## Tải lỗi, mất phản hồi và sửa đồng thời

- Ban đầu có **Đang tải môn học**. Tải thất bại hiện lỗi/thử lại; không hiện thành danh sách trống. Hồ sơ/đăng xuất vẫn truy cập được khi dữ liệu học tập đang lỗi.
- **Tải lại danh sách học kỳ** và **Tải lại danh sách môn học** cùng làm mới hai danh sách để các lựa chọn và số liệu khớp nhau. Lỗi sau lần tải thành công giữ dữ liệu cũ để xem; khóa ghi môn đến khi kiểm tra lại thành công.
- Mất mạng khi lưu có thể xảy ra sau khi server đã nhận. App không tự gửi lại POST/PUT/DELETE. Form giữ bản nháp, có **Kiểm tra lại danh sách môn học** hoặc **Nạp bản môn học mới nhất**. Kiểm tra danh sách trước khi quyết định lưu tiếp.
- Nếu server xác nhận lưu thành công nhưng GET sau đó lỗi, app vẫn báo lưu thành công, giữ môn vừa nhận từ server và hiển thị lỗi tải lại. Không gửi lại bản đã lưu.
- Để thử xung đột: mở cùng môn ở hai tab, sửa/lưu ở tab 2 rồi lưu bản cũ tại tab 1. Tab 1 báo đã sửa ở nơi khác, giữ bản nháp và khóa lưu. **Nạp bản môn học mới nhất** sẽ thay bản nháp bằng bản server; kiểm tra rồi sửa tiếp. Không tự lấy version mới để ghi đè.
- Đóng biểu mẫu không hoàn tác được request đã tới server. Request bị giới hạn thời gian; phản hồi của cùng tài khoản có thể cập nhật danh sách nhưng không tự mở lại form. Đổi tài khoản sẽ bỏ kết quả cũ.
- Dừng backend hoặc dùng Network Offline để thử lỗi API thật. **Thử trạng thái giao diện** vẫn chỉ mô phỏng các luồng UI thử cũ.

## Tổ chức và kiểm tra

- `features/academics/api/coursesApi.ts`: response/DTO, trạng thái Việt ↔ server, Bearer, PUT/DELETE dùng version.
- `CourseManager.ts`, `useServerCourses.ts`: tải/ghi, gộp GET, khóa gửi trùng, xử lý kết quả chưa rõ và vòng đời tài khoản. Dùng `SessionManager.authorized` đã có, không lưu token vào store môn.
- `components/CourseApiForm.tsx`: form thật và xử lý bản nháp/xung đột/xóa. `forms.tsx` vẫn giữ form xem trước cho khách.
- `courseLinks.ts`: đồng bộ tên và bảo vệ/dọn các liên kết dữ liệu thử. `store/model.tsx` chia sẻ nguồn môn thật; không cho form thật ghi vào danh sách RAM.
- `SemesterSyncStatus.tsx` và AppShell: tải/lỗi/thử lại trước khi mở các màn cần danh sách học kỳ/môn.

```powershell
npm run typecheck
node docs/qa-course-api-unit.cjs
node docs/qa-semester-api-unit.cjs
node docs/qa-session-unit.cjs
node docs/qa-account-api-unit.cjs
node docs/qa-grades-unit.cjs
npm run build:web
```

Browser runner: `qa-courses-api.cjs`, `qa-semesters-api.cjs`, `qa-account-isolation.cjs`, `qa-smoke.cjs`; dùng `QA_APP_URL`, `QA_API_URL`, `PLAYWRIGHT_MODULE`, `CHROME_PATH` theo các đợt trước. Runner có auth tạo tài khoản `ui-a/ui-b-...@example.test`, chỉ chạy trên **schema QA riêng**. Ảnh/kết quả ở `.expo/`, ngoài Git. Không sửa backend/migration, không đưa tài khoản kiểm thử vào database ứng dụng.

Kết quả ngày 23/10/2026: TypeScript và export web qua; 29 nhóm unit API/trạng thái/liên kết môn mới, 23 nhóm học kỳ, 29 nhóm phiên, 15 nhóm HTTP tài khoản và 149 assertions điểm qua. Trên Chrome/PostgreSQL/schema QA riêng: 13 nhóm môn, 11 nhóm học kỳ và 11 nhóm tách tài khoản qua; smoke UI dữ liệu mẫu qua ở 320/390/430/1280px. Đã xem ảnh form ở 320/390px, không ghi nhận lỗi runtime hoặc tràn ngang. Native/máy thật chưa nghiệm thu.

Tên commit: **Kết nối giao diện môn học với dữ liệu backend**. Phần tiếp theo là API và UI bài tập/lịch ở đợt 4; kiểm tra thiết bị thật 2C.3B vẫn để sau.
