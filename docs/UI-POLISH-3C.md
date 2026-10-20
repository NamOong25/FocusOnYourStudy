# UI 3C — Lần đầu, tải, lỗi và dữ liệu trống

Đợt giao diện ngày 20/10/2026. Chỉ dùng dữ liệu trong bộ nhớ; chưa gọi Spring Boot, gửi email/thông báo, đọc PDF hoặc gọi AI thật.

## Cách xem

Khi mở hoặc tải lại app, chọn **Bắt đầu với dữ liệu trống** hoặc **Khám phá dữ liệu mẫu**. Chế độ trống khởi tạo dữ liệu học tập rỗng và 0 phiên tập trung mẫu; có lộ trình học kỳ → môn → bài tập. Không tự thêm học kỳ/môn giả để tránh màn bị lỗi.

Trong app, bấm **Bản xem trước · Thử trạng thái** dưới header:

- Xem lại hướng dẫn và đi đến quản lý môn/học kỳ.
- Thử đang tải hoặc tải → lỗi. Có **Thử tải lại** và **Quay về nội dung**.
- Bật lỗi cho lần xử lý kế tiếp, đóng bảng thử rồi lưu/tạo một mục hoặc chạy một công cụ AI. Lỗi xảy ra trước khi thay đổi dữ liệu. Nút bật có thể tắt lại và tự tắt khi lỗi đã được dùng.

## Phạm vi

- Màn bắt đầu giải thích các bước đầu tiên, cách xem mẫu và giới hạn lưu trong phiên.
- Trạng thái trống có hướng dẫn/hành động cho học kỳ, môn, bảng điểm, Pomodoro, kế hoạch AI và trang chủ; các danh sách bài tập/lịch thi/tự học vẫn có trạng thái trống và bộ lọc như trước. Không truy cập học kỳ không tồn tại. Chế độ trống không hiển thị biểu đồ giờ học giả; biểu đồ minh họa vẫn ở chế độ mẫu.
- `StateView` dùng chung cho tải, lỗi và trống. Khi thử tải, các màn giữ mount nhưng ẩn nội dung/tương tác; bộ lọc, bản nháp và dữ liệu không được tải lại từ nguồn khác. Chuyển màn hủy lượt tải mẫu cũ để lỗi không xuất hiện muộn ở màn mới.
- `ActionScope` bao quanh từng Sheet và khu vực tài khoản. Các thao tác chính được đánh dấu rõ bằng `Button.actionLabel`: tạo/sửa học kỳ, môn, bài tập, ca học/ngoại lệ, lịch thi, buổi tự học, điểm/quy tắc, hồ sơ/cài đặt/các form tài khoản; tạo/duyệt đề xuất và chuẩn bị tóm tắt/bài luyện mẫu.
- Chờ mẫu 650ms trước khi chạy handler hiện có; khóa các nút, ô nhập và bộ chọn chung trong phạm vi đó, chặn bấm lưu lặp. Footer có tiến trình và **Hủy chờ**. Các thao tác đồng bộ nhỏ như đổi bộ lọc, đánh dấu checklist và điều khiển timer vẫn phản hồi ngay.
- Lỗi xử lý có thông báo/thử lại/sửa nội dung. Form vẫn mount; thử lại đọc handler mới nhất nên dùng các giá trị vừa sửa. Validation/trùng lịch/quy tắc điểm cũ vẫn chạy, không tự lưu khi sai.
- Hủy chờ, đóng form, quay lại hoặc rời phạm vi màn sẽ hủy callback đang đợi; không tự ghi dữ liệu sau khi đã rời. Nút xác nhận xóa mới dùng chờ mẫu, bước hỏi xác nhận đầu tiên vẫn mở ngay.
- Thông báo kết quả dùng chung, đọc bằng live region, tự đóng sau 6 giây và có nút đóng. Host ưu tiên hộp thoại đang mở để kết quả không bị che sau Modal; chỉ một host hiển thị. Tài khoản cũng dùng cùng thông báo.

## Cấu trúc

- `src/features/onboarding/`: WelcomeScreen và SetupCard.
- `src/features/preview/PreviewPanel.tsx`: công cụ xem trạng thái của prototype.
- `src/shared/feedback/FeedbackProvider.tsx`: thông báo, host và cờ lỗi một lần.
- `src/shared/feedback/ActionScope.tsx`: chờ/hủy/chống lặp theo phạm vi.
- `src/shared/components/StateView.tsx`, `ActionStatus.tsx`, `NoticeToast.tsx`: giao diện dùng chung, vẫn tách file theo tên.

## Kiểm tra

`docs/qa-ui-states.cjs` kiểm tra luồng bắt đầu trống → học kỳ → môn → bài, lỗi giữ form, retry dùng giá trị mới, chặn lưu lặp, hủy/đóng/back không ghi muộn, tải/lỗi/retry giữ bộ lọc, đổi màn hủy lượt tải cũ và thông báo trong Modal. Có ảnh ở 320/390/430/1280px trong `.expo/qa-ui-states/`.

Các script QA trước dùng `qa-onboarding-helpers.cjs` để vào chế độ mẫu và chờ thao tác hoàn tất; kiểm tra UI 3C riêng vẫn quan sát trạng thái đang xử lý và nút bị khóa.

## Giới hạn và bước sau

Lỗi và thời gian chờ trong bảng thử là mô phỏng, không thể kết luận backend/mạng đang lỗi. Dữ liệu, trạng thái bắt đầu và tùy chọn thử không được lưu bền; tải lại sẽ về màn chọn ban đầu. Đây chưa phải cơ chế retry/idempotency/hủy request của API thật; validation của form hiện có chạy khi handler được thực thi sau thời gian chờ mẫu.

GPA/quy chế, tài khoản và thông báo thật vẫn thuộc backend; chưa nghiệm thu bàn phím/screen reader/Back trên điện thoại thật. Phần tổng hợp thống kê với dữ liệu thật và Dashboard theo học kỳ chưa làm ở đợt này.

Tiếp theo: **UI 3D — Dashboard, bộ chọn học kỳ và kỳ thi gần nhất**. Tên commit UI 3C: **Bổ sung trạng thái tải, lỗi và dữ liệu trống**. Xem `GIT-COMMITS.md`.

## Kết quả nghiệm thu prototype

- `npm run typecheck`: qua.
- Export web và bundle Hermes Android: qua. Bundle Android chưa phải kiểm tra trên máy thật hoặc APK.
- `qa-ui-states.cjs`: qua các luồng mới và ảnh 320/390/430/1280px, không có lỗi runtime/console hoặc tràn ngang.
- Hồi quy: `qa-smoke`, `qa-navigation`, `qa-academics`, `qa-account`, `qa-grades`, `qa-calendar`, `qa-learning`, `qa-picker`, `qa-ai` đều qua.
- Kiểm tra trực quan ảnh welcome, lỗi lưu, lỗi tải và thông báo thành công trong chi tiết môn. Kết quả nằm trong `.expo/`, được Git bỏ qua.
- Các kiểm tra cũ đã bổ sung bước vào mẫu sau mở/tải lại và chờ thao tác hoàn tất để phù hợp luồng mới. Selector của kiểm tra tài khoản được giới hạn vào Modal khi tên hồ sơ cũng có ở trang chủ phía sau.
