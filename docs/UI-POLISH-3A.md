# UI 3A — Bộ chọn ngày và giờ

## Cách dùng

Bấm ô có biểu tượng lịch/đồng hồ trong form. Bộ chọn mở trong cùng màn/hộp thoại; form gốc được giữ nguyên trong lúc chọn.

- **Ngày:** lịch tuần bắt đầu từ thứ Hai, chuyển tháng bằng mũi tên, bấm tiêu đề để chọn tháng/năm, nút Hôm nay. Chọn ngày rồi **Xác nhận ngày**.
- **Giờ:** đồng hồ 24 giờ, hai cột cuộn giờ/phút; chọn nhanh phút 00/15/30/45 hoặc bất kỳ phút 00–59, rồi **Xác nhận giờ**.
- **Hủy**, dấu đóng/quay lại của bộ chọn hoặc nút Back hệ thống trên Android chỉ hủy lựa chọn đang thử; chưa đóng cả form. Bấm lại ô sẽ mở từ giá trị đã xác nhận trước đó.
- Giá trị trên form hiển thị `dd/mm/yyyy` và `HH:mm`. Không còn bàn phím để nhập chuỗi ngày/giờ. Khi mở bộ chọn sẽ đóng bàn phím đang có, sau khi xác nhận/hủy trả focus về ô đã mở trên web.

## Những nơi đã thay

| Form | Trường |
| --- | --- |
| Bài tập | Hạn nộp |
| Chuỗi lịch học | Ngày áp dụng từ/đến; giờ bắt đầu/kết thúc |
| Ngoại lệ một buổi học | Giờ bắt đầu/kết thúc mới |
| Lịch thi | Ngày thi, giờ thi/kết thúc |
| Buổi tự học | Ngày học, giờ bắt đầu |
| Kế hoạch AI | Khoảng ngày, giờ rảnh, ngày/giờ khi sửa buổi đề xuất |
| Cài đặt nhắc học | Giờ yên lặng từ/đến |

Thời lượng học, số tín chỉ, điểm và năm học/niên khóa vẫn dùng trường phù hợp với dữ liệu đó; không phải ngày/giờ cụ thể.

## Quy tắc và kiến trúc

- React Native components và `react-native-svg` đã có sẵn; không thêm dependency hoặc dùng input HTML chỉ chạy trên web. Đã đọc tài liệu [Expo SDK 56](https://docs.expo.dev/versions/v56.0.0/) và [SVG cho SDK 56](https://docs.expo.dev/versions/v56.0.0/sdk/svg/) trước khi triển khai.
- `DateTimePicker.tsx` có DateField/TimeField, provider cục bộ và panel lịch/đồng hồ. Sheet và khu vực Account tích hợp một picker trong modal hiện tại, tránh mở modal con chồng lên modal cha. Form được ẩn bằng display, không unmount: giữ nguyên tên, ghi chú, công tắc và các dữ liệu đang sửa.
- Chọn lịch 1900–2100; lịch không có ngày không tồn tại. Chuyển tháng/năm sẽ giữ số ngày nếu có, hoặc lấy ngày cuối tháng (31/01 → 28/02 hoặc 29/02). Mọi thay đổi đó chỉ ở bản nháp cho đến khi xác nhận.
- Dữ liệu bên trong vẫn là `YYYY-MM-DD` / `HH:mm`. Không đổi schema hoặc chuyển ngày qua UTC/`toISOString`; không làm lệch ngày do chênh múi giờ.
- Bộ chọn bảo đảm giá trị ngày/giờ đúng định dạng; **quy tắc nghiệp vụ vẫn kiểm tra khi lưu**: kết thúc sau bắt đầu, giới hạn chuỗi, ca học/trùng lịch/ngoại lệ, tự học không sau deadline, giới hạn giờ rảnh và lịch thi của AI, giờ yên lặng có thể qua đêm nhưng hai đầu không bằng nhau.
- Các giá trị quan hệ không bị âm thầm sửa theo nhau. Ví dụ chọn giờ bắt đầu sau giờ kết thúc hiện có vẫn cần sửa lại giờ kết thúc trước khi lưu; cảnh báo hiện có được giữ.

## Kiểm tra

```powershell
npm run typecheck
node docs/qa-picker-unit.cjs
node docs/qa-picker.cjs
npm run build:web
npx expo export --platform android --output-dir .expo/native-check
```

Script trình duyệt dùng Playwright/Chrome, hỗ trợ PLAYWRIGHT_MODULE/CHROME_PATH. `qa-picker-helpers.cjs` thực sự bấm lịch, chọn tháng/năm/ngày, cuộn giờ/phút và xác nhận; không gán giá trị form từ ngoài.

- 24 kiểm tra logic: ngày nhuận/các năm thế kỷ, chuyển tháng/năm và ngày cuối tháng, giới hạn năm, lịch 42 ô bắt đầu thứ Hai, chuỗi ngày địa phương, 00:00/23:59/phút lẻ và giờ không hợp lệ.
- Thử giao diện 320/390/430/1280px; không chọn được 29/02/2026 hay 30/02/2026, chọn/lưu 29/02/2028, hủy giữ giá trị/form, giờ 08:37, chọn nhanh phút, nửa đêm/cuối ngày, focus và giữ công tắc cài đặt khi mở bộ chọn.
- Cập nhật và chạy hồi quy `qa-smoke.cjs`, `qa-academics.cjs`, `qa-calendar.cjs`, `qa-learning.cjs`, `qa-account.cjs`, `qa-ai.cjs` qua bộ chọn mới. Kiểm tra trùng ca/thi/tự học, deadline, ngoại lệ, học kỳ/môn, tài khoản và duyệt AI vẫn được giữ.
- Kết quả/ảnh ở `.expo/qa-picker`, không đưa lên Git. Bundle Android xác nhận đóng gói; chưa thay kiểm tra cuộn/cảm ứng, nút Back, bàn phím và screen reader trên điện thoại Android/iOS thật.

Dữ liệu ứng dụng vẫn trong bộ nhớ và trở về mẫu khi tải lại; chưa nối backend. Các đợt còn lại: **3B Điều hướng**, **3C Trạng thái giao diện**, **3D Dashboard**. Tên commit và lệnh push xem `GIT-COMMITS.md`.
