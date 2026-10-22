# QuanLyHocTap — FocusYourStudy

Frontend React Native + Expo SDK 56, dựng từ template bạn cung cấp; project độc lập với StudyPlanner cũ. Backend Spring Boot + PostgreSQL ở `backend/`. **Đã xong 2C.2: tài khoản thật, giữ phiên khi F5, tự làm mới token và đăng xuất**; các màn học tập vẫn dùng dữ liệu thử trong bộ nhớ.

## Tài khoản trên giao diện — 2C.2

Chạy hai terminal (PowerShell trong IntelliJ/VS Code đều được):

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npx expo start --web --port 8092
```

Mở `http://localhost:8092` → chọn dữ liệu trống hoặc mẫu → **Hồ sơ** góc phải → **Tạo tài khoản** → nhập thông tin → đăng nhập. Hồ sơ lấy từ `/users/me`; tên Trang chủ dùng cùng hồ sơ nếu màn có học kỳ. Có chờ/khóa nút, lỗi theo trường, email trùng/sai mật khẩu, mất mạng, timeout 10 giây mỗi request, hủy khi đóng form và thử tải lại hồ sơ.

**F5 khôi phục phiên khi còn hiệu lực.** Hồ sơ → Đăng xuất → Xác nhận đăng xuất thu hồi phiên và dọn nội dung thử; các tab cùng origin cũng thoát. Mất mạng khi đăng xuất có nút Hoàn tất đăng xuất, không tự khôi phục phiên đã thoát. Sau nâng cấp từ 2C.1 cần đăng nhập một lần. Chưa lưu dữ liệu học tập (đợt 3 trở đi), chưa có API sửa hồ sơ/quên mật khẩu.

URL API mặc định dùng cùng hostname với web và cổng 8080. Cần cổng khác thì tạo `.env.local` ở gốc theo `.env.example`, đặt `EXPO_PUBLIC_API_URL`, rồi tải lại app; không đặt thông tin DB/khóa ký ở frontend. Dùng `localhost` ở cả frontend/backend khi thử cookie. Hướng dẫn test và giới hạn native tại [FRONTEND-AUTH-2C2.md](docs/FRONTEND-AUTH-2C2.md); phần nối API ban đầu tại [FRONTEND-AUTH-2C1.md](docs/FRONTEND-AUTH-2C1.md).

## Backend hiện tại — đợt 2B

Java 21 + Spring Boot 4.1.1; PostgreSQL cục bộ, Flyway và API health. Đã có đăng ký/đăng nhập/hồ sơ, access token 15 phút, refresh token luân chuyển và đăng xuất thu hồi phiên. Phiên lưu trong PostgreSQL; web có cookie HttpOnly + CSRF, native nhận token qua JSON. Frontend đã nối khôi phục/refresh/logout ở 2C.2; nghiệm thu thiết bị thật ở 2C.3.

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Kiểm tra tại `http://localhost:8080/api/v1/health`. Hướng dẫn chạy/test, biến môi trường và cấu trúc nằm trong [backend/README.md](backend/README.md); quan hệ dữ liệu trong [backend/docs/SCHEMA.md](backend/docs/SCHEMA.md).

Các script API cũ vẫn dùng được: `./backend/scripts/Try-Auth.ps1 -Mode Register` và `./backend/scripts/Try-Session.ps1`. Xem [hướng dẫn 2B](docs/BACKEND-PHASE-2B.md). Đợt kế tiếp 2C.3 nghiệm thu tài khoản và thiết bị.

## Chạy ứng dụng

Yêu cầu Node.js 20.19 trở lên (khuyên dùng Node 22 LTS).

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npm install
npx expo start
```

Khi mở app, chọn **Bắt đầu với dữ liệu trống** để thử thiết lập học kỳ/môn/bài đầu tiên, hoặc **Khám phá dữ liệu mẫu** để xem các màn có sẵn. Khi có phiên hợp lệ, app khôi phục hồ sơ và mở vùng học tập trống; chưa tải dữ liệu học tập từ backend.

Nhấn `w` để mở web. Có thể mở địa chỉ Metro trong Mobile View của VS Code. Muốn thử trên điện thoại, dùng Expo Go tương thích SDK 56 hoặc development build. Xem địa chỉ và cổng thực tế trong terminal; không dùng terminal đang đứng ở StudyPlanner cũ.

```powershell
npm run typecheck
npm run check:dependencies
npm run build:web
```

## Đợt giao diện đầu tiên

- Trang chủ: người dùng, thẻ tập trung, tổng quan bài tập, ca học hôm nay, bài sắp đến hạn và gợi ý.
- Lịch học: ngày/tuần/tháng, chuyển khoảng thời gian, thêm/sửa/xóa ca học lặp hằng tuần; kiểm tra khung giờ và trùng ca học.
- Bài tập: thêm/sửa/xóa, môn học, deadline, ưu tiên, ghi chú; 3 trạng thái, lọc môn. Trang chủ và thống kê cập nhật cùng dữ liệu.
- Pomodoro: tập trung 25 phút, nghỉ 5/15 phút, đổi môn, bắt đầu/tạm dừng/đặt lại, lịch sử các phiên mới. Dùng mốc kết thúc để thời gian cập nhật khi quay về ứng dụng, không đếm trừ dựa trên số lần interval chạy.
- Thống kê: bộ lọc tuần/tháng/học kỳ và biểu đồ có thể chạm; dữ liệu giờ học là mẫu. Tỷ lệ hoàn thành/trễ hạn lấy từ bài tập hiện tại. Từ đợt 2D, GPA/tín chỉ tính từ bảng điểm trong bộ nhớ; mô phỏng dùng kết quả đó với giả định được ghi rõ.
- Lịch thi: danh sách, thêm lịch, bật/tắt tùy chọn nhắc mẫu.
- Trợ lý AI: 5 công cụ với form đầu vào; sửa/bỏ chọn/duyệt kế hoạch mẫu thành buổi tự học dùng chung sau khi kiểm tra lịch/deadline; điều chỉnh buổi chưa học; tóm tắt và quiz 3/5 câu có trang nguồn minh họa đọc được (bổ sung ở 2F).
- Hồ sơ/cài đặt với các luồng tài khoản minh họa (bổ sung ở 2E), hộp nhắc nhở, trạng thái rỗng và thông báo sau thao tác.

**Dữ liệu học tập nằm trong bộ nhớ; tải lại sẽ xóa thay đổi học tập trong phiên.** Tài khoản đăng ký/đăng nhập/hồ sơ nối API từ 2C.1, khôi phục/refresh/logout từ 2C.2. Chưa có thông báo hệ thống, đồng bộ học tập, upload PDF hoặc gọi AI thật. Pomodoro chưa phát chuông khi app đóng/lưu phiên khi process bị hủy; chưa nghiệm thu chạy nền trên điện thoại thật.

## Cấu trúc

`App.tsx` chứa khung ứng dụng, header và dock. Mã nguồn được chia theo chức năng:

```text
src/
├── features/     # Màn hình, form và xử lý của từng chức năng
├── navigation/   # Điều hướng, quay lại và giữ vị trí cuộn
├── shared/       # Thành phần giao diện, theme, tiện ích dùng chung
└── store/        # Provider và trạng thái mẫu dùng chung toàn app
```

Ví dụ: `src/features/assignments/TaskForm.tsx` là form bài tập; `src/features/grades/GradesScreen.tsx` là màn điểm; `src/shared/components/` chứa các file riêng như `Button.tsx`, `Card.tsx`, `Sheet.tsx` và `Typography.tsx`; `index.ts` chỉ xuất các component để import gọn. Xem **[sơ đồ đầy đủ và quy tắc đặt file](docs/FRONTEND-STRUCTURE.md)**.

Không dùng HTML trong WebView, Tailwind CDN hoặc SQLite cho bản UI này. Điều hướng nằm trong `src/navigation/`; URL deep link, Forward replay và gesture iOS chưa được triển khai. State mẫu/timer vẫn ở `src/store/model.tsx`; lớp gọi API sẽ được bổ sung khi nối Spring Boot.

## Tài liệu tiếp theo

- `docs/UI-AUDIT.md`: đối chiếu yêu cầu, điểm đã sửa, phần còn thiếu và thứ tự phát triển.
- `docs/references/`: 5 screenshot gốc và DESIGN.md gốc để đối chiếu.
- `docs/DECISIONS.md`: quy ước thiết kế và phạm vi kỹ thuật.

Ảnh avatar, sách và trợ lý trong `assets/` lấy từ URL có sẵn trong HTML template bạn gửi. Cần xác nhận quyền sử dụng tài nguyên trước khi phát hành thương mại. Font Plus Jakarta Sans qua gói `@expo-google-fonts/plus-jakarta-sans`; icon từ Ionicons. Các tài nguyên giao diện đã có sẵn cục bộ sau khi cài dependency, không cần tải từ CDN mỗi lần mở màn.

## Cập nhật đợt 2A: Môn học & học kỳ

Mở **Lịch học → Môn & học kỳ** để quản lý học kỳ, môn học và xem lịch/bài/điểm của từng môn. Có tìm kiếm, lọc trạng thái, thêm/sửa và màu nhận diện. Các môn mới dùng chung trong lựa chọn môn của bài tập, ca học, lịch thi và Pomodoro.

Phạm vi nay gồm 9 nhóm chức năng; AI là mục 9 (mục 10 cũ). Xem `docs/UI-PHASE-2.md` và `docs/UI-BACKLOG.md` để biết phần đã làm và các cải thiện người dùng muốn để sau.

## Cập nhật đợt 2B: Bài tập & tự học

Bấm một bài tập để mở màn chi tiết với checklist việc nhỏ, tài liệu mẫu và các buổi học liên quan. Mở **Lịch học → Tự học** để tạo/sửa/xóa buổi học, xem lịch ngày/tuần và bắt đầu Pomodoro cho đúng buổi. Mỗi bài có thể có nhiều buổi; trạng thái hai loại độc lập.

Tài liệu chỉ dùng thư viện minh họa có nội dung đọc được, chưa tải tệp thật. Thời gian buổi học được cộng từ các phiên Pomodoro 25 phút đã hoàn tất; đánh dấu buổi xong thủ công không tự cộng thời gian và không hoàn tất bài tập. Dữ liệu vẫn đặt lại khi tải lại ứng dụng.

Xem `docs/UI-PHASE-2B.md` để biết phạm vi và kiểm tra. `docs/qa-learning.cjs` là smoke test tùy chọn với Playwright/Chromium; hỗ trợ biến `PLAYWRIGHT_MODULE` và `CHROME_PATH` như các script QA trước.

## Cập nhật đợt 2C: Lịch thi & ngoại lệ lịch học

Mở **Lịch học → Lịch & bài tập → Kỳ thi** để quản lý lịch thi, loại/hình thức, giờ kết thúc và các mốc nhắc mẫu. Thống kê và Chi tiết môn cũng mở được cùng lịch thi đó.

Trong **Thời khóa biểu**, bấm một buổi để nghỉ, đổi giờ/phòng riêng ngày đó, khôi phục hoặc sửa/xóa cả chuỗi. Form chuỗi chọn nhiều thứ và khoảng ngày áp dụng. Cảnh báo trùng giờ dùng chung cho ca học, thi và tự học, chỉ rõ lịch liên quan. Các màn đọc cùng ngoại lệ; không coi buổi đã nghỉ là giờ bận.

Xem `docs/UI-PHASE-2C.md` để biết quy tắc và giới hạn. Dữ liệu/tùy chọn nhắc vẫn là mẫu trong bộ nhớ. Từ UI 3A, ngày giờ được chọn bằng lịch/đồng hồ.

## Cập nhật đợt 2D: Điểm số & GPA

Mở **Thống kê → Điểm & GPA** để chọn học kỳ, tìm/lọc môn, xem bảng điểm và so sánh GPA. Bấm môn để nhập điểm thành phần, sửa trọng số, thêm phần điểm và xem trước tổng kết. Trong **Chi tiết môn → Điểm số** cũng sửa cùng dữ liệu này.

Có quy tắc mẫu về thang quy đổi, làm tròn và học lại, dự báo điểm còn thiếu và mô phỏng mục tiêu GPA tích lũy. Ô chưa nhập hiển thị chưa đủ dữ liệu; điểm 0 vẫn tính là điểm đã có. Trang chủ và thống kê lấy GPA cùng nguồn với bảng điểm. Quy tắc hiện tại cần đối chiếu quy chế trường trước khi dùng thật; dữ liệu vẫn đặt lại khi tải lại app.

Xem `docs/UI-PHASE-2D.md` để biết phạm vi và kiểm tra. **Tên commit tiếng Việt và lệnh push mỗi đợt** được ghi trong `docs/GIT-COMMITS.md`, kèm tên dự kiến cho các đợt giao diện tiếp theo. Checklist phần hoãn vẫn ở `docs/UI-BACKLOG.md`.

## Cập nhật đợt 2E: Tài khoản, hồ sơ & cài đặt

Bấm **Hồ sơ** góc phải trên cùng hoặc avatar trang chủ để mở khu vực mới. Có sửa hồ sơ/ảnh mẫu (đồng bộ với trang chủ trong phiên), đăng nhập/đăng ký, quên/đặt lại/đổi mật khẩu và xác nhận đăng xuất minh họa. Có tùy chọn nhắc bài tập/lịch học/lịch thi, mốc nhắc và giờ yên lặng, cùng thẻ xem trước sáng/tối và tiếng Việt/English.

Đây là phạm vi tại thời điểm UI 2E. **Từ 2C.1, đăng ký/đăng nhập/hồ sơ đã dùng API thật**, form mật khẩu được gửi đến backend để xác thực. Chưa gửi email/khôi phục/đổi mật khẩu; hồ sơ mẫu và dữ liệu học tập vẫn là bản thử trong bộ nhớ. Theme/ngôn ngữ/nhắc thiết bị vẫn theo giới hạn của bản xem trước.

Xem `docs/UI-PHASE-2E.md` và `docs/qa-account.cjs` để biết phạm vi/kiểm tra. Tên commit: **Thêm giao diện tài khoản, hồ sơ và cài đặt**; lệnh push được cập nhật trong `docs/GIT-COMMITS.md`. Tiếp theo là UI 2F — các luồng con AI.

## Cập nhật đợt 2F: Trợ lý AI & duyệt kế hoạch

Mở **Trợ lý AI**. **Tạo lộ trình/Tìm lịch trống** cho chọn mục tiêu, bài/kỳ thi, ngày/giờ rảnh, số buổi và thời lượng → xem trước → sửa hoặc bỏ chọn từng buổi → duyệt. Các buổi được kiểm tra trùng lịch/deadline và lưu vào cùng **Lịch học → Tự học**, mở được chi tiết/Pomodoro. **Xem đề xuất** cho điều chỉnh một buổi chưa bắt đầu và duyệt thay thế, giữ liên kết/ghi chú, không tạo bản sao.

**Xem bản mẫu** có hai tài liệu minh họa, tóm tắt ngắn/chi tiết và đọc từng trang nguồn. **Luyện thử** có 3/5 câu, quay lại sửa đáp án, nộp bài, kết quả/giải thích, đọc nguồn và làm lại. Đây là nội dung có sẵn, chưa upload/đọc PDF hoặc gọi AI thật. Kế hoạch được sinh local để thử luồng; ô hỏi chỉ làm mục tiêu, chưa được AI phân tích. Dữ liệu vẫn đặt lại khi tải lại.

Xem `docs/UI-PHASE-2F.md`, `docs/qa-ai-unit.cjs`, `docs/qa-ai.cjs`. Tên commit và lệnh push mới nhất ở `docs/GIT-COMMITS.md`. Sau đợt này nên rà soát tổng thể và quay lại bốn nhóm hoàn thiện đang hoãn trong `docs/UI-BACKLOG.md`.

## Cập nhật đợt 3A: Bộ chọn ngày & giờ

Bấm các ô lịch/đồng hồ trong form để chọn, thay cho gõ chuỗi. Lịch có chọn tháng/năm, ngày nhuận và Hôm nay; đồng hồ có hai cột giờ/phút theo hệ 24 giờ, chọn đến từng phút và mốc nhanh 00/15/30/45. Bấm Xác nhận để áp dụng hoặc Hủy để giữ nguyên. Hiển thị ngày `dd/mm/yyyy`; dữ liệu nội bộ giữ nguyên định dạng cũ.

Đã áp dụng cho bài tập, chuỗi lịch học/ngoại lệ một buổi, lịch thi, tự học, form/preview AI và giờ yên lặng. Nội dung đang sửa được giữ khi mở bộ chọn. Kiểm tra trùng lịch, giờ kết thúc và deadline vẫn thực hiện khi lưu. Không thêm dependency; dữ liệu vẫn là mẫu trong bộ nhớ.

Xem `docs/UI-POLISH-3A.md`, `docs/qa-picker-unit.cjs` và `docs/qa-picker.cjs`. Tên commit: **Thêm bộ chọn ngày giờ cho các biểu mẫu**; lệnh push ở `docs/GIT-COMMITS.md`. Ba mục tiếp theo còn trong checklist: điều hướng, trạng thái giao diện và Dashboard.

## Cập nhật đợt 3B: Điều hướng & quay lại

Mũi tên trong chi tiết quay lại một bước; X đóng cả luồng. Màn đã mở được giữ khi đổi tab, gồm học kỳ, tìm kiếm/bộ lọc, tab chi tiết và vị trí cuộn. Từ bài/buổi học mở Pomodoro rồi **Quay lại màn trước** sẽ về đúng nguồn; từ AI đã duyệt sang lịch tự học cũng quay lại đúng bước trước đó. Thông báo mở bài/kỳ thi rồi trở lại hộp nhắc ban đầu.

Browser Back/Escape và Back Android dùng cùng nguyên tắc (picker → chi tiết → màn chính). Web ở gốc vẫn Back ra trang trước bình thường. Chưa có deep link/Forward replay hoặc gesture iOS; chưa thử Back/cảm ứng trên thiết bị thật. Dữ liệu/navigation vẫn chỉ giữ trong phiên.

Xem `docs/UI-POLISH-3B.md`, `docs/qa-navigation-unit.cjs`, `docs/qa-navigation.cjs`. Tên commit: **Hoàn thiện điều hướng và luồng quay lại**; lệnh push ở `docs/GIT-COMMITS.md`. Tiếp theo là 3C — trạng thái giao diện, rồi 3D — Dashboard.


## Cập nhật đợt 3C: Trạng thái giao diện

Đã có màn bắt đầu, chế độ học tập trống và hướng dẫn thiết lập. Các form chính có chờ/khóa nút, lỗi giữ nội dung, thử lại và hủy; thông báo kết quả hiển thị trong hộp thoại đang mở. Bấm **Bản xem trước · Thử trạng thái** dưới header để xem tải/lỗi và bật lỗi cho lần xử lý kế tiếp. Đây là mô phỏng UI, chưa gọi backend.

Xem `docs/UI-POLISH-3C.md`, `docs/qa-ui-states.cjs` và `docs/GIT-COMMITS.md`. Tiếp theo là UI 3D — Dashboard theo học kỳ và kỳ thi gần nhất.


## Chọn học kỳ theo năm học

Học kỳ dùng lựa chọn cố định: **Học kỳ 1**, **Học kỳ 2**, **Học kỳ 3 (Hè)**. Kỳ hè tùy chọn, không tự thêm. Năm học chọn bằng nút trước/sau; không nhập tên kỳ tự do. Cùng kỳ ở hai năm khác nhau được quản lý riêng; không lưu trùng kỳ trong một năm. Xem `docs/SEMESTERS.md`.
