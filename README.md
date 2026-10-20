# QuanLyHocTap — FocusYourStudy

Frontend React Native + Expo SDK 56, dựng từ 5 màn Stitch và DESIGN.md do bạn cung cấp. Project độc lập với StudyPlanner cũ. Giai đoạn hiện tại chỉ làm giao diện tương tác với dữ liệu mẫu; chưa có backend Spring Boot.

## Chạy ứng dụng

Yêu cầu Node.js 20.19 trở lên (khuyên dùng Node 22 LTS).

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npm install
npx expo start
```

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
- Trợ lý AI: 5 công cụ, xem đề xuất mẫu, chấp nhận/để sau, trắc nghiệm mẫu có giải thích, tóm tắt mẫu kèm nguồn minh họa. Đề xuất khung giờ đối chiếu lịch học mẫu và chỉ thêm vào danh sách tự học khi chấp nhận.
- Hộp thoại hồ sơ và nhắc nhở, trạng thái rỗng và thông báo sau thao tác.

**Dữ liệu nằm trong bộ nhớ. Tải lại ứng dụng sẽ trở về mẫu.** Không có đăng nhập thật, thông báo hệ thống, đồng bộ, upload PDF hoặc gọi AI thật. Pomodoro không phát chuông khi app bị đóng; chưa lưu phiên khi process bị hủy. Không coi kiểm tra bằng trình duyệt/Mobile View là đã kiểm tra chạy nền trên điện thoại thật.

## Cấu trúc

`App.tsx` chứa khung ứng dụng, header, dock và điều hướng 5 tab của prototype. `src/components.tsx` và `src/theme.ts` là thành phần dùng chung. `src/model.tsx` quản lý dữ liệu mẫu và timer. `src/forms.tsx` chứa form bài tập/lịch học/lịch thi. `src/screens/` chứa 5 màn riêng.

Không dùng HTML trong WebView, không đưa Tailwind CDN vào React Native, không dùng SQLite cho bản UI này. Khi mở rộng luồng chi tiết và tài khoản ở đợt tiếp theo, thay điều hướng tab nội bộ bằng navigation stack có deep link/back gesture và tách API service khỏi state giao diện.

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

Xem `docs/UI-PHASE-2C.md` để biết quy tắc và giới hạn. Dữ liệu/tùy chọn nhắc vẫn là mẫu trong bộ nhớ. Ngày giờ tiếp tục nhập chuỗi theo checklist đã hoãn.

## Cập nhật đợt 2D: Điểm số & GPA

Mở **Thống kê → Điểm & GPA** để chọn học kỳ, tìm/lọc môn, xem bảng điểm và so sánh GPA. Bấm môn để nhập điểm thành phần, sửa trọng số, thêm phần điểm và xem trước tổng kết. Trong **Chi tiết môn → Điểm số** cũng sửa cùng dữ liệu này.

Có quy tắc mẫu về thang quy đổi, làm tròn và học lại, dự báo điểm còn thiếu và mô phỏng mục tiêu GPA tích lũy. Ô chưa nhập hiển thị chưa đủ dữ liệu; điểm 0 vẫn tính là điểm đã có. Trang chủ và thống kê lấy GPA cùng nguồn với bảng điểm. Quy tắc hiện tại cần đối chiếu quy chế trường trước khi dùng thật; dữ liệu vẫn đặt lại khi tải lại app.

Xem `docs/UI-PHASE-2D.md` để biết phạm vi và kiểm tra. **Tên commit tiếng Việt và lệnh push mỗi đợt** được ghi trong `docs/GIT-COMMITS.md`, kèm tên dự kiến cho các đợt giao diện tiếp theo. Checklist phần hoãn vẫn ở `docs/UI-BACKLOG.md`.
