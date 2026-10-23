# 2C.3A — Kiểm tra tách tài khoản và phiên trên web

**Cập nhật từ 3C.2:** runner giữ học kỳ **và môn học** thật của A khi trở về A, còn bài/lịch/điểm/bản nháp/timer thử bị đặt lại. B không thấy học kỳ/môn của A. Xem `FRONTEND-COURSES-3C2.md` cho hướng dẫn hiện tại.

**Cập nhật từ 3C.1:** học kỳ thật giữ lại khi trở về A, còn môn/bài/bản nháp/timer thử bị xóa. B không thấy học kỳ A. Runner đã cập nhật theo hành vi này; hướng dẫn hiện tại ở `FRONTEND-SEMESTERS-3C1.md`. Nội dung dưới đây lưu phạm vi đợt 2C.3A ban đầu.

Đợt này kiểm tra tài khoản thật với Spring Boot/PostgreSQL, đồng thời kiểm tra dữ liệu học tập thử trong bộ nhớ không đi theo khi đổi danh tính. Chưa mở API lưu học kỳ/môn/bài tập; các dữ liệu này mất khi đổi tài khoản hoặc F5, kể cả đăng nhập lại tài khoản cũ.

## Đã sửa

- Đặt `FeedbackProvider` cùng vùng được tạo lại khi danh tính đổi: thông báo thao tác, nơi hiển thị thông báo và chế độ “Thử lỗi cho lần xử lý tới” được đặt lại cùng dữ liệu học tập, form, điều hướng và Pomodoro.
- Nếu một tab đọc thấy phiên của người khác khi tự refresh, trước khi nhận storage event: bỏ hồ sơ/vùng học tập cũ, vô hiệu các yêu cầu cũ, tải hồ sơ đúng người rồi mới mở lại. Nếu chưa kết nối được thì hiện bước khôi phục/thử lại, không để hồ sơ A đi cùng token B.
- Bổ sung kiểm tra hồi quy cho hồ sơ A trả về muộn sau khi B đăng nhập; không cho kết quả cũ ghi đè B.

## Cách tự kiểm tra

Chạy backend và frontend trong hai terminal như trước:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npx expo start --web --port 8092
```

Mở `http://localhost:8092`. Dùng hai tài khoản A và B do bạn tạo, cùng một hồ sơ trình duyệt. Lượt tự động của Codex dùng tài khoản/schema riêng và không để lại tài khoản mẫu cho bạn.

### 1. Đổi tài khoản khi đang có form và đồng hồ

1. Đăng nhập A, đóng Hồ sơ. Tạo học kỳ, môn **Môn của A**, bài **Bài của A**, buổi tự học **Buổi của A**.
2. Bắt đầu Pomodoro cho môn/buổi đó. Sang Bài tập, thêm bài mới, nhập **Bản nháp của A** nhưng chưa lưu.
3. Nhấn Ctrl+T, nhập cùng địa chỉ `http://localhost:8092`. Tab mới khôi phục hồ sơ A.
4. Ở tab mới chọn **Đăng nhập tài khoản khác**, đăng nhập B.
5. Trở lại tab đầu: phải thấy hồ sơ B, form A đã đóng. Đóng Hồ sơ, kiểm tra các mục dưới đây.

| Nơi xem | Kết quả |
| --- | --- |
| Trang chủ/Môn & học kỳ | Vùng học tập trống, không có học kỳ/môn A |
| Bài tập | Không có Bài của A; không còn bản nháp A |
| Tập trung | Chưa chọn môn, không có đồng hồ đang chạy; 0 phiên |
| Lịch sử Pomodoro | Chưa có phiên hoàn tất |
| Chuông thông báo | Không còn nhắc việc của A |

Đăng nhập lại A cũng khởi đầu trống ở giai đoạn này. Đây là dọn dữ liệu thử, chưa phải lưu riêng dữ liệu học tập từng người trên backend.

### 2. Đăng xuất từ tab khác khi còn bản nháp

Với cùng tài khoản ở hai tab, tạo lại một bản nháp tại tab đầu. Tab thứ hai → **Đăng xuất → Xác nhận đăng xuất**. Tab đầu phải đóng bản nháp và thoát tài khoản; không hỏi lưu bản nháp của phiên đã kết thúc. F5 không tự vào lại.

### 3. Mất mạng rồi kết nối lại

- Đang đăng nhập, DevTools → Network → Offline → **Tải lại hồ sơ**: có lỗi kết nối, nút thử lại, không quay vô hạn. Chuyển Online → **Thử tải lại hồ sơ**: đúng tài khoản cũ xuất hiện.
- Chuyển Offline rồi đăng xuất: không còn hồ sơ; hiện chưa xác nhận với server và nút **Hoàn tất đăng xuất**. Chuyển Online, bấm nút hoặc F5 để app xử lý dấu đăng xuất trước; không tự khôi phục tài khoản đã thoát.
- Muốn kiểm tra tab khi Offline: lưu ý trình duyệt có thể không tải lại được chính trang frontend. Điều đó khác lỗi API; chuyển Online rồi mới kiểm tra F5.

### 4. Trạng thái thử lỗi không đi sang tài khoản khác

Đăng nhập A → **Thử trạng thái giao diện → Bật lỗi cho lần xử lý tới → Đóng**. Chuyển sang B → mở lại mục đó: phải hiện **Bật lỗi cho lần xử lý tới**, tức lỗi chưa được bật ở B. Lần lưu thử đầu tiên của B không bị lỗi được bật từ A.

### 5. Phiên hết hiệu lực hoặc yêu cầu về muộn

Giữ phiên hợp lệ rồi F5: vẫn khôi phục. Nếu server thu hồi phiên/hết hạn thì app trở về đăng nhập, không lặp refresh vô hạn. Các trường hợp server trả hồ sơ/đăng nhập chậm sau khi người dùng đã thoát được kiểm tra bằng runner bên dưới; không cần tự canh thời gian bấm để nghiệm thu.

## Kiểm tra tự động

`qa-account-isolation.cjs` dùng Playwright/Chrome riêng, tạo hai email `ui-a-*`/`ui-b-*@example.test`. Chỉ chạy với schema PostgreSQL QA riêng vì script tạo tài khoản thật. Không chạy trên production hoặc schema chứa dữ liệu bạn đang sử dụng. Thiết lập `QA_APP_URL`, `QA_API_URL`, `PLAYWRIGHT_MODULE`/`CHROME_PATH` theo môi trường. Kết quả/ảnh ở `.expo/qa-account-isolation`, không commit.

```powershell
node docs/qa-session-unit.cjs
node docs/qa-account-api-unit.cjs
node docs/qa-account-isolation.cjs
node docs/qa-session.cjs
npm run typecheck
npm run build:web
```

Không thay đổi bộ đếm/hạn token thật để kiểm tra. Unit test dùng đồng hồ giả cho expiry; browser chèn lỗi mạng/401 và giữ phản hồi để kiểm tra các tình huống có kiểm soát. Backend và database trong lượt tích hợp là thật.

## Kết quả ngày 22/10/2026

- TypeScript và export web qua.
- `qa-session-unit.cjs`: 22 nhóm qua, gồm 3 kiểm tra mới về đọc danh tính mới trước storage event, lỗi mạng trong trường hợp đó và hồ sơ A trả về muộn sau khi B đăng nhập.
- `qa-account-api-unit.cjs`: 15 nhóm qua.
- `qa-account-isolation.cjs`: 11 nhóm qua với hai tài khoản/backend/PostgreSQL schema riêng; có dữ liệu học tập thử và form nháp thật trên UI, Pomodoro đang chạy, đổi/đăng xuất liên tab, offline và phản hồi bị giữ lại rồi trả về. Kiểm tra bốn chiều rộng 320/390/430/1280, không lỗi runtime/tràn ngang.
- Hồi quy `qa-session.cjs`: 9 nhóm qua (F5, xoay cookie, 401, nhiều tab, logout lỗi mạng, mất phản hồi refresh và server thu hồi phiên). `qa-smoke.cjs` qua các luồng học tập mẫu và bốn chiều rộng.
- Hai lỗi được sửa trong đợt này là phạm vi FeedbackProvider và thứ tự refresh/storage event. Lỗi thứ tự được tái hiện bằng test unit trước sửa (hồ sơ còn A thay vì B), sau sửa test qua.
- Hết hạn access token dùng đồng hồ giả ở unit; phiên mất hiệu lực trên browser dùng thu hồi thật hoặc chèn 401 có kiểm soát. Chưa coi là đã chờ hết hạn phiên 7/30 ngày.
- Không thay đổi schema/API backend. Schema và tài khoản QA được dọn sau kiểm tra; giữ nguyên schema ứng dụng.

## Còn lại — 2C.3B

**2C.3B**: kết nối Android/iOS/điện thoại thật, mở lại process, ra nền, SecureStore thật và bàn phím/Back. Các đợt backend học tập sau cần nghiệm thu quyền đọc/ghi từng bản ghi; dọn prototype trên frontend không thay cho phân quyền server.

Tên commit: **Kiểm tra tách dữ liệu tài khoản và xử lý phiên trên web**.
