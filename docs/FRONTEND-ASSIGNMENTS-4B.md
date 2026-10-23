# 4B — Bài tập trên giao diện lưu vào PostgreSQL

Đăng nhập rồi mở **Lịch học → Bài tập**. Danh sách, thêm/sửa/xóa, độ ưu tiên, ghi chú, hạn nộp và trạng thái dùng API 4A. Tải lại trang hoặc đăng nhập lại cùng tài khoản vẫn giữ bài đã lưu. Dashboard, thống kê bài tập, chi tiết môn, ô chọn bài trong tự học/AI và thông báo trong app cùng dùng một danh sách đã xác nhận từ backend.

Không cần tạo lại database, không thêm migration và không đưa dữ liệu mẫu của bản xem trước vào tài khoản. Flyway V3 của 4A cần được chạy bởi backend hiện tại.

## Chạy ứng dụng

Terminal PowerShell 1 trong VS Code hoặc IntelliJ:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Giữ terminal này chạy. Nếu backend đang chạy từ bản trước 4A, dừng bằng Ctrl+C rồi chạy lại để nạp API bài tập và migration V3.

Terminal PowerShell 2:

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npx expo start --web --port 8092
```

Mở `http://localhost:8092`, đăng nhập bằng tài khoản của bạn và đóng bảng Hồ sơ. Đây là giao diện app; `/api/v1/health` chỉ kiểm tra backend/database.

## Kiểm tra một vòng cơ bản

1. Vào **Lịch học → Môn & học kỳ**, tạo Học kỳ 1 và thêm môn **Java Web**, mã **JAVA**, 3 tín chỉ nếu chưa có.
2. Chuyển sang **Bài tập → Thêm bài tập mới**. Nhập **Báo cáo Java**, chọn đúng môn; dùng lịch chọn ngày mai và đồng hồ chọn **18:45**. Chọn ưu tiên Cao, trạng thái Chưa làm, nhập ghi chú rồi bấm **Tạo bài tập**.
3. Chỉ khi API xác nhận thành công, form mới đóng và bài xuất hiện. Mở chi tiết → Chỉnh sửa bài tập để đối chiếu ngày/giờ, môn, ghi chú và ưu tiên.
4. Nhấn F5. Phiên còn hiệu lực sẽ tự khôi phục; đóng Hồ sơ, vào lại Bài tập. Bài và thông tin vừa lưu vẫn còn. Bộ lọc giao diện có thể trở về mặc định sau F5.
5. Mở chi tiết bài và chọn **Hoàn thành**. Chờ lưu xong rồi về **Trang chủ**, chọn đúng học kỳ. Nếu kỳ chỉ có một bài, Dashboard hiện **1/1 bài tập, 100%**. Nếu kỳ có nhiều bài, số liệu tính theo tất cả bài của kỳ đó.
6. Trở lại chi tiết → Chỉnh sửa bài tập → Xóa bài tập. Lần đầu chỉ hỏi xác nhận; **Giữ bài tập** hủy việc xóa. Chọn **Xác nhận xóa bài tập** mới gửi yêu cầu xóa.
7. F5 lần nữa: bài đã xóa không quay lại. Môn và học kỳ vẫn còn.

## Bộ lọc và liên kết

| Thử | Kết quả cần thấy |
| --- | --- |
| Bấm nút Học kỳ bài tập | Chọn một kỳ hoặc Tất cả học kỳ; lọc môn chỉ liệt kê môn trong kỳ đang chọn. |
| Tìm tên bài, tên hoặc mã môn | Danh sách lọc cùng lúc với học kỳ, môn, hạn nộp và trạng thái. Có thể tìm không dấu. |
| Lọc Quá hạn | Chỉ bài chưa hoàn thành đã qua cả ngày và giờ hạn nộp. |
| Lọc Sắp hạn | Bài chưa hoàn thành từ hiện tại đến cùng giờ sau 7 ngày. |
| Lọc Hôm nay | Bài đến hạn hôm nay, gồm cả bài hoàn thành; dùng thêm bộ lọc trạng thái nếu cần. |
| Sửa tên môn rồi trở lại bài | Nhãn môn đổi theo danh sách môn, bài vẫn giữ cùng định danh. |
| Chuyển bài sang môn khác | Giữ cùng bài và chuyển về đúng kỳ của môn mới; nếu có buổi tự học liên kết trong phiên thì cần gỡ liên kết trước. |
| Xóa/chuyển kỳ môn còn bài | Bị chặn cho đến khi xử lý các bài đã lưu, kể cả bài Hoàn thành. F5 không gỡ liên kết bài thật. |

Ngày và giờ trên giao diện theo múi giờ thiết bị. Ví dụ 18:45 tại Việt Nam được lưu thành 11:45 UTC; khi mở lại ở Việt Nam vẫn hiển thị 18:45. Đổi trạng thái hoặc ghi chú giữ nguyên thời điểm hạn nộp, kể cả giây/phần lẻ của dữ liệu tạo từ API.

## Hai tài khoản, hai tab và lỗi mạng

- **Tách tài khoản:** tạo bài ở A → Hồ sơ → Đăng nhập tài khoản khác → B. B không thấy bài của A. Đăng nhập lại A thì bài đã lưu vẫn còn; lịch/điểm/buổi tự học thử của phiên cũ được dọn.
- **Mở tab mới:** mở thêm tab cùng địa chỉ `http://localhost:8092`. Phiên hợp lệ được khôi phục, bài thật được tải từ backend. Hai tab không tự cập nhật tức thì; dùng **Tải lại danh sách bài tập** hoặc F5 sau khi sửa ở tab khác.
- **Xung đột:** mở form chỉnh sửa một bài ở cả hai tab. Tab A lưu thay đổi trước; tab B sửa và lưu sau sẽ được báo phiên bản đã thay đổi. Nội dung B đang nhập vẫn giữ, nút Lưu bị khóa. **Nạp bản bài tập mới nhất** thay bản nháp bằng dữ liệu đã lưu; kiểm tra lại rồi sửa tiếp. Không tự ghi đè bản của A.
- **Backend dừng trước khi tải:** thấy lỗi và nút thử lại, không coi là tài khoản trống. Khởi động lại backend rồi thử tải lại.
- **Lỗi khi đã tải được dữ liệu:** danh sách đã xác nhận vẫn hiển thị cùng thông báo lỗi. Tải lại danh sách trước khi lưu tiếp.
- **Mất phản hồi lúc lưu:** có thể backend đã ghi nhận hoặc chưa ghi nhận. Form giữ bản nháp và yêu cầu kiểm tra lại danh sách, không tự gửi lại. Với tạo mới, kiểm tra bài đã tồn tại trước khi chủ động tạo thêm để tránh trùng.
- **Lưu thành công nhưng lần tải danh sách ngay sau đó lỗi:** vẫn coi thao tác lưu đã thành công và giữ bài backend vừa trả về. Cảnh báo tải lại xuất hiện trên danh sách/Dashboard.

Nút mô phỏng lỗi trong Bản xem trước áp dụng các mục RAM. Học kỳ, môn và bài tập thật dùng lỗi API/kết nối thực tế.

## Buổi tự học đang liên kết

Tạo buổi học cho một bài bằng **Chi tiết → Lên lịch học cho bài này**, chọn giờ kết thúc trước hạn. Sửa bài sang môn khác hoặc kéo hạn về trước giờ kết thúc buổi học sẽ bị chặn ngay trên form trong phiên hiện tại.

Nếu một thiết bị/tab khác sửa môn/hạn khiến buổi học trong phiên này không còn hợp lệ, sau khi tải lại bài tập app **giữ nội dung và thời gian buổi học, gỡ liên kết với bài**, đồng thời báo cho người dùng. Xóa bài cũng giữ buổi học độc lập. Checklist/tài liệu mẫu của bài đã xóa được dọn; bộ đếm đang gắn với bài không còn hợp lệ được đặt lại. Lịch sử Pomodoro đã hoàn thành giữ thông tin chụp tại lúc học.

Các kiểm tra buổi tự học hiện chỉ áp dụng dữ liệu đang có trong phiên. Backend sẽ kiểm tra nguyên tử các quan hệ này khi làm API tự học ở đợt tiếp theo.

## Phạm vi và kiểm thử

- Đã lưu thật: tài khoản/phiên, học kỳ, môn và bài tập.
- Còn RAM: lịch học/lịch thi, buổi tự học, checklist, tài liệu mẫu, điểm/GPA, Pomodoro và cấu hình thử. Thông báo trong app được dựng lại từ dữ liệu; chưa có push notification của hệ điều hành.
- Danh sách toàn tài khoản được tải một lần, lọc ở frontend và chia sẻ cho các màn; chưa phân trang hoặc đồng bộ thời gian thực.
- Thiết bị thật/native 2C.3B tiếp tục để sau theo lựa chọn của bạn.

Kiểm tra tự động:

```powershell
npm run typecheck
node docs/qa-assignment-api-unit.cjs
node docs/qa-course-api-unit.cjs
node docs/qa-semester-api-unit.cjs
node docs/qa-account-api-unit.cjs
node docs/qa-session-unit.cjs
node docs/qa-grades-unit.cjs
npm run build:web
```

Browser runner `docs/qa-assignments-api.cjs` dùng `QA_APP_URL`, `QA_API_URL`, `PLAYWRIGHT_MODULE`, `CHROME_PATH`. Chỉ chạy với backend trỏ tới **schema QA riêng** vì runner tạo tài khoản `assign-a/assign-b-...@example.test` và các dữ liệu kiểm thử. Runner hồi quy môn/tách tài khoản đã cập nhật kỳ vọng bài thật; ảnh và kết quả nằm trong `.expo/`, ngoài Git.

Tài liệu Expo đã đối chiếu: [SDK 56](https://docs.expo.dev/versions/v56.0.0/). Hợp đồng backend giữ nguyên ở [ASSIGNMENTS.md](../backend/docs/ASSIGNMENTS.md).

Kết quả ngày 23/10/2026: TypeScript và export web qua; 32 nhóm unit bài tập mới, 29 nhóm môn, 23 nhóm học kỳ, 15 nhóm HTTP, 29 nhóm phiên và 149 assertions điểm qua. Trên Chrome/PostgreSQL/schema QA riêng: 16 nhóm bài tập, 13 nhóm môn và 11 nhóm tách tài khoản qua; smoke dữ liệu mẫu qua ở 320/390/430/1280px. Đã xem ảnh form 320/390px; màn hẹp dùng hai hàng cho ngày và giờ. Chưa nghiệm thu máy thật.
