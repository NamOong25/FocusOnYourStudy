# Kiểm tra đợt giao diện đầu

## Build và phiên bản

- `npm run typecheck`: qua.
- `npm run check:dependencies`: qua với endpoint phiên bản Expo; React types được giữ ở nhánh `~19.2.14` để không tự nâng lên 19.3.
- `npm run build:web`: qua, bundle khoảng 600KB, 9 tài nguyên cần dùng.
- `npx expo export --platform android --output-dir .expo/native-check`: qua, tạo bundle Hermes Android. Đây là kiểm tra bundle, chưa phải chạy trên thiết bị hay tạo APK.

## Trình duyệt

Kiểm tra tự động bằng Playwright/Chrome headless với hồ sơ tạm riêng, URL Metro của project QuanLyHocTap. Không dùng session trình duyệt cá nhân. Kích thước: 320, 390, 430 và 1280px. Xem ảnh chụp trực quan của 5 màn ở 390px và Trang chủ ở 320/1280px.

Các luồng đã qua:

- Mở/chuyển đủ 5 tab.
- Lịch ngày/tuần/tháng, chuyển bộ lọc.
- Tạo bài tập, từ chối ngày không tồn tại (2026-02-30), đổi trạng thái và cập nhật tỷ lệ hoàn thành ở Thống kê.
- Từ chối ca học trùng giờ; lưu ca không trùng và hiển thị trong danh sách.
- Pomodoro bắt đầu, giữ thời gian khi đổi tab, tạm dừng, đổi sang nghỉ ngắn.
- AI xem trước, chấp nhận và hiển thị kế hoạch tự học ở Trang chủ.
- Không có lỗi runtime hoặc console.error trong lượt smoke cuối. Không tràn cuộn ngang ở các kích thước đã kiểm tra.

Script: `docs/qa-smoke.cjs`. Cần Playwright và Chromium để chạy trên máy khác; có thể dùng biến `PLAYWRIGHT_MODULE` và `CHROME_PATH` để trỏ tới bộ cài sẵn. Trước khi chạy, mở Metro tại localhost:8092 (hoặc truyền URL vào script). Kết quả và screenshot được ghi vào `.expo/qa/`, không đưa vào Git.

## Giới hạn

Kiểm tra tự động và ảnh web không xác nhận layout native giống tuyệt đối hoặc chứng minh notification/background timer trên thiết bị. Chưa chạy ứng dụng trên điện thoại thật. Các nghiệp vụ auth, sync, upload, AI thật, quy tắc GPA theo trường và ngoại lệ lịch thuộc giai đoạn sau.
