# 3C.1 — Giao diện học kỳ dùng dữ liệu thật

**Cập nhật từ 3C.2:** môn học cũng đã nối API và giữ lại sau F5/đăng nhập lại. Bài/lịch/điểm vẫn thử trong RAM; xem `FRONTEND-COURSES-3C2.md`. Nội dung dưới đây lưu phạm vi ban đầu của 3C.1.

Đăng nhập rồi mở **Lịch học → Môn & học kỳ**. Danh sách, tạo, sửa, xóa học kỳ dùng API Spring Boot và PostgreSQL của tài khoản. Trang chủ và các ô chọn học kỳ dùng chung danh sách này.

**Chỉ học kỳ đã nối API trong đợt này.** Môn học, lịch, bài tập, điểm, Pomodoro và AI trên giao diện vẫn là dữ liệu thử trong RAM. API môn 3B đã có nhưng giao diện môn chờ **3C.2**. Dữ liệu mẫu khi chưa đăng nhập vẫn chỉ để xem; không tự nhập mẫu vào tài khoản. Thiết bị thật 2C.3B tiếp tục để sau.

## Chạy để kiểm tra

Terminal 1, tại thư mục backend:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Terminal 2, tại gốc project:

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npx expo start --web --port 8092
```

Mở `http://localhost:8092`, đăng nhập ở **Hồ sơ**, đóng bảng tài khoản. Dùng cùng hostname `localhost` cho web/API; API mặc định cổng 8080. Nếu Metro đang chạy sau khi thay biến môi trường thì khởi động lại Metro.

## Một vòng tự kiểm tra

1. Dùng tài khoản chưa có học kỳ. Trang chủ hiện hướng dẫn tạo; **Lịch học → Môn & học kỳ** hiện **Chưa có học kỳ** sau khi tải thành công.
2. Bấm **Tạo học kỳ đầu tiên**, chọn năm học, **Học kỳ 1**, **Đang học**, ghi chú rồi **Lưu học kỳ**. Khi đang lưu, các ô và nút lưu bị khóa. Lưu xong biểu mẫu đóng và có thông báo thành công.
3. Nhấn **F5**, đóng Hồ sơ rồi quay lại **Môn & học kỳ**. Học kỳ vẫn còn. Bấm biểu tượng bút **Chỉnh sửa học kỳ**: ghi chú vẫn đúng. Nếu đăng xuất rồi vào lại cùng tài khoản cũng giữ học kỳ.
4. Thêm **Học kỳ 2** cùng năm, chọn **Đang học**. Học kỳ 1 tự chuyển **Đã kết thúc**; Trang chủ chọn kỳ đang học mới. Học kỳ hè không tự sinh; chỉ có khi bạn tạo.
5. Sửa ghi chú của một kỳ → lưu → F5 → kiểm tra. Chọn lại cùng kỳ/năm ở form tạo mới sẽ báo trùng, không tạo bản thứ hai.
6. Đăng nhập tài khoản B: không thấy kỳ của A. Trở về A: các kỳ đã lưu xuất hiện lại. Môn/bài thử vừa tạo sẽ được đặt lại khi đổi tài khoản hoặc F5 vì chưa nối API.
7. Với một kỳ không có môn, bấm **Xóa học kỳ** → **Giữ học kỳ** để thử hủy; thử lại → **Xác nhận xóa học kỳ** để xóa. F5 không hiện lại kỳ đã xóa. Xóa kỳ cuối cùng trở về màn thiết lập trống.
8. Nếu kỳ còn môn đã lưu bằng API 3B, backend từ chối xóa. Nếu có môn thử trong phiên này, giao diện cũng yêu cầu xử lý các môn thử trước. Giao diện chưa tải các môn backend ở 3C.1; thông báo trên màn giải thích giới hạn này.

## Thử lỗi và sửa đồng thời

- Dừng backend rồi tải lại danh sách: có lỗi và nút thử lại. Lỗi tải lần đầu **không** hiện thành tài khoản trống. Nếu đã tải được trước đó, danh sách cũ được giữ để xem và chặn ghi tiếp đến khi tải lại thành công. Chạy backend lại rồi bấm nút tải lại.
- Mở form sửa, sau đó sửa cùng học kỳ ở tab/trình duyệt khác. Lưu form cũ sẽ báo phiên bản đã thay đổi và giữ bản nháp. **Nạp bản học kỳ mới nhất** sẽ thay nội dung đang sửa bằng bản server; kiểm tra rồi sửa/lưu lại. Không tự lấy version mới để ghi đè bản nháp cũ.
- Nếu mất mạng sau khi gửi lưu, chưa thể biết server đã nhận hay chưa. App không tự gửi lại thao tác ghi. Bấm **Kiểm tra lại danh sách học kỳ** hoặc **Nạp bản học kỳ mới nhất** rồi kiểm tra kết quả trước khi tiếp tục. Không bấm tạo lại ngay.
- Nếu server xác nhận lưu thành công nhưng tải danh sách sau đó bị lỗi, app vẫn báo đã lưu và hiện yêu cầu tải lại danh sách. Không báo lưu thất bại khiến bạn gửi lại bản đã lưu.
- Đóng form khi đang gửi không hoàn tác được request đã tới server. Cần xem lại danh sách; phản hồi muộn không tự mở lại form. Khi đổi tài khoản, phản hồi cũ bị bỏ và không đưa dữ liệu A vào B.
- Các nút **Thử trạng thái giao diện** chỉ mô phỏng luồng UI cũ; thử lỗi API thật bằng dừng backend/Network Offline như trên.

## Tổ chức mã và kiểm tra tự động

- `features/academics/api/semestersApi.ts`: chuyển đổi kiểu/trạng thái Việt ↔ API, kiểm tra response, gửi Bearer, PUT/DELETE kèm version.
- `SemesterManager.ts`: trạng thái tải/ghi, gộp GET, chặn gửi trùng, lấy lại dữ liệu sau ghi, xử lý kết quả chưa rõ và hủy vòng đời tài khoản.
- `useServerSemesters.ts`: nối manager vào React và thông báo kết quả. `store/model.tsx` chia sẻ cùng nguồn học kỳ cho các màn; giữ dữ liệu xem trước riêng khi chưa đăng nhập.
- `components/SemesterApiForm.tsx`: form thật, giữ bản nháp và quyết định nạp bản mới khi xung đột; `SemesterSyncStatus.tsx`: trạng thái tải/lỗi/thử lại và phạm vi dữ liệu thật.
- `SessionManager.authorized`: dùng access token trong RAM, làm mới một lần khi hết hạn/401; không tự lặp POST/PUT/DELETE khi lỗi mạng/5xx. Kết quả phiên cũ bị bỏ khi đăng xuất/đổi tài khoản.

```powershell
npm run typecheck
node docs/qa-semester-api-unit.cjs
node docs/qa-session-unit.cjs
node docs/qa-account-api-unit.cjs
npm run build:web
```

Kiểm tra trình duyệt dùng `qa-semesters-api.cjs`, `qa-session.cjs`, `qa-account-isolation.cjs` với `QA_APP_URL`, `QA_API_URL`, `PLAYWRIGHT_MODULE`, `CHROME_PATH`. Các script tạo tài khoản `ui-a/ui-b-...@example.test`; chỉ chạy trên **schema backend kiểm thử riêng**. Kết quả/ảnh nằm trong `.expo/`, ngoài Git. `qa-account-isolation.cjs` đã cập nhật kỳ vọng: học kỳ thật giữ lại, môn/bài/timer thử bị xóa khi đổi danh tính.

Không thay schema/Flyway, không seed hoặc xóa database người dùng trong đợt này. Dữ liệu học kỳ được tạo bằng giao diện hoặc script 3A hiện có.

Kết quả ngày 23/10/2026: TypeScript và export web qua; 23 nhóm kiểm tra API/trạng thái học kỳ, 29 nhóm phiên và 15 nhóm HTTP tài khoản qua. Trên Chrome/PostgreSQL với schema QA riêng: 11 nhóm học kỳ, 9 nhóm phiên và 11 nhóm tách tài khoản đều qua. Smoke test dữ liệu mẫu qua ở 320/390/430/1280px; đã xem ảnh form ở 320/390px, không ghi nhận lỗi runtime hoặc tràn ngang. Chưa nghiệm thu native/máy thật. Không đổi mã backend trong đợt này.

Tên commit: **Kết nối giao diện học kỳ với API và lưu dữ liệu thật**. Lệnh ở `GIT-COMMITS.md`.
