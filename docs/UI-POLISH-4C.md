# UI 4C — Pomodoro, lịch sử và mục tiêu ngày

Phạm vi: frontend React Native/Expo của `D:\Video OBS\QuanLyHocTap`. Dữ liệu giữ trong bộ nhớ phiên, chưa gọi backend hoặc lưu bền. Đây là đợt giao diện Pomodoro; Thống kê và các nghiệp vụ chạy nền trên thiết bị làm sau.

## Đã bổ sung

- Lịch sử có bản ghi từng phiên: mã phiên, mã/tên môn, bài tập và buổi tự học nếu có, mốc bắt đầu/kết thúc, số giây học và số giây tạm dừng. Tên được chụp tại lúc bắt đầu, không bị thay đổi khi sửa/xóa nội dung sau đó.
- Nhóm theo ngày kết thúc trên thiết bị; lọc Hôm nay, 7 ngày hoặc Tất cả, mới nhất trước. Một nhóm có tổng số phiên và phút học; phiên qua ngày hiện cả ngày bắt đầu/kết thúc.
- Mục tiêu chọn từ 1 đến 12 phiên/ngày, mặc định 4. Lưu thay đổi cập nhật tiến độ ngay; Hủy/Quay lại không lưu. Mỗi phiên tập trung là 25 phút; thanh tiến độ tối đa 100%, số phiên thực tế vẫn hiển thị nếu vượt mục tiêu.
- Thẻ Học hôm nay và 7 ngày gần nhất (hôm nay + 6 ngày trước) cộng phút từ bản ghi hoàn tất. Phiên tạm dừng/bỏ dở, nghỉ ngắn/dài không được cộng. Thời gian chờ tạm dừng không phải thời gian học.
- Chuỗi ngày học: có ít nhất 1 phiên tập trung hoàn tất trong ngày là được tính. Chuỗi tính lùi từ hôm nay nếu đã học, hoặc từ hôm qua nếu chưa học hôm nay. Bỏ lỡ trọn một ngày sẽ bắt đầu lại từ 0. Đổi mục tiêu không ảnh hưởng chuỗi.
- Timer dùng mốc kết thúc và mã phiên ổn định. Tạm dừng giữ chính xác phần còn lại, Tiếp tục giữ nguyên ngữ cảnh ban đầu; callback đến muộn vẫn ghi giờ kết thúc đã tính. Chuyển tab giữ timer. Đổi chế độ/môn, đặt lại hoặc chọn buổi khác sẽ bỏ phần phiên đang dở.
- Chỉ cộng phút vào buổi tự học đã liên kết. Hoàn thành buổi tự học không tự đổi trạng thái bài tập; học vượt thời lượng dự kiến vẫn giữ số phút thực tế, ví dụ 50/45 phút.

## Dữ liệu mẫu và trống

Khám phá dữ liệu mẫu có 3 phiên **Mẫu**, mỗi phiên 25 phút ở ba ngày trước: hôm nay 0 phiên/0 phút, 7 ngày 75 phút, chuỗi 3 ngày. Có lời giải thích trên màn chính và nhãn trên từng phiên. Đây là dữ liệu để xem thiết kế, có tham gia số liệu bản mẫu nhưng không cộng tiến độ các buổi tự học.

Bắt đầu với dữ liệu trống: 0 phiên, 0 phút, chuỗi 0, lịch sử trống. Vẫn có thể chỉnh mục tiêu và xem lịch sử trước khi thêm môn. Tải lại trang/app sẽ về màn chào và khởi tạo lại workspace, lịch sử và mục tiêu; chưa có lưu/khôi phục sau khi tắt app.

## Kiểm tra một vòng trên giao diện

1. Mở app, chọn **Khám phá dữ liệu mẫu → Tập trung**. Kiểm tra 0/4 phiên, 0 phút hôm nay, 75 phút/7 ngày và chuỗi 3 ngày. Vào **Xem lịch sử theo ngày**, xem ba ngày trước và nhãn Mẫu; chọn Hôm nay thấy trạng thái trống.
2. Chọn **Sửa mục tiêu → 2 phiên → Hủy thay đổi**: vẫn 0/4. Chọn lại 2 rồi **Lưu mục tiêu**: thành 0/2, mục tiêu 50 phút. Chuyển tab rồi quay lại vẫn giữ 2.
3. Vào **Lịch học → Tự học**, tìm **Hoàn thiện bố cục trang chủ**, bấm nút tập trung của buổi đó. Bắt đầu, đợi vài giây, Tạm dừng: đồng hồ đứng yên. Chuyển Trang chủ rồi trở lại Tập trung, bấm Tiếp tục: tiếp tục phần còn lại.
4. Khi đủ 25 phút học, kiểm tra 1/2 phiên, 25 phút hôm nay, 100 phút/7 ngày, chuỗi 4 ngày và 25/45 phút của buổi tự học. Mở lịch sử Hôm nay: đúng một bản ghi, đúng môn/bài/buổi; mốc kết thúc kéo dài thêm phần tạm dừng và dòng ghi thời gian bị loại trừ.
5. Bấm **Học lại**, hoàn thành thêm một phiên: 2/2, đạt mục tiêu, 50 phút hôm nay, 125 phút/7 ngày, buổi học Hoàn thành với 50/45 phút. Lịch sử hôm nay có đúng 2 bản ghi. Bài tập liên quan vẫn **Đang làm**.
6. Chạy **Nghỉ ngắn 5′** đến hết: số phút/phiên không tăng. Chạy tập trung vài giây rồi đặt lại/đổi chế độ: không thêm bản ghi. Sửa mục tiêu về 1: vẫn giữ 2 phiên và 50 phút, thanh tiến độ 100%.
7. Tải lại → **Bắt đầu với dữ liệu trống → Tập trung**: có hướng dẫn thêm môn, mục tiêu 0/4, chuỗi 0 và lịch sử trống. Thêm môn để bắt đầu một phiên mới.

Các mốc số liệu trên giả định thử cùng ngày và không hoàn thành thêm phiên ngoài hai phiên ở bước 4–5. Nếu thử qua nửa đêm, phiên được tính vào ngày kết thúc.

## Kiểm tra kỹ thuật

- `npm run typecheck`: qua.
- `node docs/qa-focus-unit.cjs`: 88 kiểm tra logic qua, gồm pause/resume chính xác, gọi lặp/Strict Mode, callback muộn, reset đúng hạn, nghỉ/bỏ dở, mục tiêu, qua nửa đêm/năm, chuỗi, nhóm lịch sử và cộng phút đúng buổi.
- Các kiểm tra hồi quy assignment (62), Dashboard (28), AI (31) và navigation (30): qua.
- `node docs/qa-focus.cjs`: chạy trình duyệt headless riêng, đồng hồ test tăng thời gian để thử đủ phiên mà không cần đợi 25 phút thật. Qua hai phiên, pause, đổi tab, mục tiêu lưu/hủy, nghỉ/reset, trạng thái bài tập độc lập, bản trống/mẫu, console và các kích thước 320/390/430/1280px. Kết quả/ảnh nằm trong `.expo/qa-focus/`, không đưa vào Git.
- `node docs/qa-learning.cjs`: qua luồng hồi quy chi tiết bài tập/checklist/tài liệu → tạo và liên kết nhiều buổi tự học → Pomodoro hoàn tất đúng một lần → giữ trạng thái bài tập → sửa/xóa và bỏ liên kết. Script đã cập nhật cách đọc lịch sử mới và chọn nút trong đúng hộp thoại.
- `npm run build:web` và `npx expo export --platform android --output-dir .expo/native-check`: qua. Android mới kiểm tra bundle, chưa chạy trên điện thoại.

Script giao diện cần Playwright và Chromium hiện có; nếu máy chưa có trong project, đặt `PLAYWRIGHT_MODULE`/`CHROME_PATH` trỏ đến bộ cài của máy, tương tự các script QA trước. Cần mở `npx expo start --web --port 8092`, hoặc truyền URL làm đối số cho script. Công cụ xem trực tiếp trình duyệt gặp lỗi khởi tạo trong đợt này; ảnh được chụp từ kiểm thử headless và xem lại từ file.

## Để lại đợt sau

- Lưu/khôi phục sau khi tiến trình ứng dụng bị đóng; đồng bộ qua thiết bị và backend.
- Nghiệm thu ra nền, khóa màn hình, quay lại/khôi phục trên điện thoại thật. Timestamp và kiểm thử đồng hồ không thay cho thử thiết bị.
- Âm thanh/thông báo kết thúc trên thiết bị.
- Nối biểu đồ Thống kê với bản ghi phiên học, chọn khoảng ngày/học kỳ và so sánh GPA.

Tên commit: `Hoàn thiện Pomodoro lịch sử phiên học và mục tiêu ngày`. Lệnh tại `GIT-COMMITS.md`.
