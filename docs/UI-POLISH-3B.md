# UI 3B — Điều hướng và quay lại đúng ngữ cảnh

## Cách dùng

- **Mũi tên Quay lại** trong màn chi tiết lùi một bước. Ví dụ đang sửa điểm → bảng điểm môn; buổi học → bài tập → môn học → danh sách.
- **Dấu X / Đóng** đóng toàn bộ luồng chi tiết đang mở. Ví dụ đang sửa bài từ chi tiết môn: X trở về danh sách môn, còn mũi tên trở về chi tiết bài.
- **Quay lại màn trước** dưới header dùng cho chuyển giữa các màn chính: đặc biệt Pomodoro → nơi đã mở Pomodoro hoặc lịch tự học → đề xuất AI đã duyệt.
- Back trên trình duyệt và Escape dùng cùng hành động lùi một bước. Trong bộ chọn ngày/giờ, chúng hủy bộ chọn trước, giữ form và nội dung đang nhập.
- Back Android được nối qua BackHandler cho màn chính và onRequestClose cho Modal (Android không phát BackHandler khi Modal đang mở). Cần thử nút Back và thao tác chạm trên điện thoại thật trước khi nghiệm thu native.

Quay lại/đóng form chưa bấm Lưu không tự lưu bản nháp. Đổi tab rồi trở lại trong cùng phiên giữ học kỳ, bộ lọc, ngày đang xem và dữ liệu giao diện; tải lại ứng dụng vẫn trở về mẫu.

## Những đường đi đã hoàn thiện

| Luồng | Kết quả khi quay lại |
| --- | --- |
| Môn → sửa môn/điểm/bài tập/lịch | Giữ tab chi tiết môn, học kỳ và tìm kiếm/bộ lọc ngoài danh sách; sửa cùng học kỳ không tự xóa bộ lọc |
| Bài tập → tài liệu/việc nhỏ/buổi học | Giữ tab trong chi tiết bài; mở buổi đã có vào chi tiết buổi thay vì nhảy thẳng vào form sửa |
| Môn → bài tập → buổi học → Pomodoro | Giữ nguồn mở; quay lại Pomodoro về đúng buổi, rồi về đúng bài và tab của môn |
| Tự học → buổi → bài liên quan | Mũi tên trở lại buổi gốc; X đóng cả luồng về danh sách |
| Thông báo → bài hoặc kỳ thi | Quay lại hộp nhắc nhở ban đầu, không nhảy sang màn Thống kê không liên quan |
| AI điều kiện → preview | Quay về điều kiện đã nhập, chưa lưu đề xuất |
| AI đã duyệt → lịch tự học | Quay lại đúng màn duyệt thành công; không sinh thêm buổi |
| Tóm tắt/quiz → đọc nguồn | Quay về kết quả trước; đáp án và vị trí câu hỏi giữ trong phiên mở công cụ |
| Quiz câu sau → câu trước | Giữ đáp án đã chọn; từ câu đầu quay về lựa chọn tài liệu |
| Tài khoản/cài đặt → bộ chọn | Back hủy bộ chọn trước; không đóng cả khu vực tài khoản |

Các màn chính, ba phần Lịch học và hai phần Thống kê được giữ sau khi mở, thay vì dựng lại mỗi lần đổi tab. Vị trí cuộn của trang và Sheet được ghi nhớ trong bộ nhớ. Màn không hoạt động không hiện Modal hoặc đăng ký hành động Back; trong hiệu ứng rời màn, nội dung modal được ẩn để không giữ vùng chạm/khả năng truy cập thừa.

## Cấu trúc và giới hạn

- `navigationState.ts`: route chính kèm phần lịch học, ngăn xếp trở về (tối đa 40 mốc, giữ gốc), bỏ qua route trùng và registry chọn hành động Back ưu tiên cao nhất.
- `Navigation.tsx`: provider, phạm vi hoạt động, phạm vi đóng cả luồng, nhớ cuộn; nối browser Back/Escape và Android. Picker ưu tiên trước chi tiết; chi tiết ưu tiên trước chuyển màn chính.
- `Sheet`: mũi tên lùi một bước theo callback cục bộ, X theo điểm đóng của FlowScope. Ngày/giờ vẫn có xác nhận/hủy riêng. `StudyDialog.tsx` tách chi tiết buổi học để tái sử dụng mà không tạo import vòng với bài tập.
- Web dùng **một history guard do app sở hữu**, URL giữ nguyên. Khi ở gốc và không có lớp nào cần quay lại, guard được bỏ để Back rời ứng dụng bình thường. Chưa có URL cho từng màn, deep link/chia sẻ trang con hoặc khôi phục trạng thái bằng Forward; không xem đây là router web đầy đủ.
- Chưa thêm React Navigation/Expo Router hoặc dependency mới. Chưa có gesture quay lại iOS hoặc khôi phục navigation sau khi process bị hủy/tải lại. Lựa chọn tab/bộ lọc cùng cấp không được coi là bước chỉnh sửa cần hoàn tác bằng Back.
- Timer và dữ liệu học tập vẫn ở provider, không reset do quay lại màn nguồn. Chưa làm hệ thống trạng thái toàn app, Dashboard mới hoặc backend trong đợt này.

Đã đối chiếu tài liệu [BackHandler RN 0.85](https://reactnative.dev/docs/0.85/backhandler) và [Modal RN 0.85](https://reactnative.dev/docs/0.85/modal#onrequestclose), tương ứng phiên bản React Native của Expo SDK 56 trong project.

## Kiểm tra

```powershell
npm run typecheck
node docs/qa-navigation-unit.cjs
node docs/qa-navigation.cjs
npm run build:web
npx expo export --platform android --output-dir .expo/native-check
```

- 19 kiểm tra logic về route/ngữ cảnh, route trùng và giới hạn ngăn xếp, ưu tiên picker/chi tiết/màn chính và hủy đăng ký handler.
- UI 320/390/430/1280px: chuỗi môn → bài → buổi → Pomodoro → trở lại đúng màn; giữ học kỳ/tìm kiếm/tab chi tiết/vị trí cuộn; thông báo và kỳ thi; hủy picker bằng browser Back; Escape chỉ lùi một bước; AI nguồn/quiz/preview/duyệt và đi-về lịch tự học; X đóng cả luồng; Back rời app về trang trước khi ở gốc.
- Hồi quy `qa-smoke.cjs`, `qa-calendar.cjs`, `qa-academics.cjs`, `qa-learning.cjs`, `qa-grades.cjs`, `qa-account.cjs`, `qa-picker.cjs`, `qa-ai.cjs`. Helper `qa-navigation-helpers.cjs` chỉ chọn nội dung nhìn thấy vì các màn nền được giữ mount; thao tác trở về màn cha dùng mũi tên thay X.
- Ảnh/kết quả ở `.expo/qa-navigation`, không đưa lên Git. Typecheck và bundle Android không thay kiểm tra native trên máy thật.

Tiếp theo: **UI 3C — Trạng thái tải/lỗi/lưu/dữ liệu trống**, rồi **3D — Dashboard**. Tên commit: `Hoàn thiện điều hướng và luồng quay lại`; lệnh push trong `GIT-COMMITS.md`.
