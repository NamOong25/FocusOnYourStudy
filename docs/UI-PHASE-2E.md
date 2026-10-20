# UI 2E — Tài khoản, hồ sơ và cài đặt

## Cách mở và phạm vi

Bấm **Hồ sơ** ở góc phải trên cùng, hoặc avatar/tên ở trang chủ. Hộp hồ sơ cũ được thay bằng khu vực toàn màn hình, cùng palette tím, nền xanh nhạt, Jakarta và các thẻ bo tròn của app. Có đóng/quay lại trong các luồng mới; chưa thay điều hướng toàn app.

| Màn | Tương tác đã có |
| --- | --- |
| Hồ sơ & cài đặt | Thẻ sinh viên, số học kỳ/môn/tín chỉ đạt từ dữ liệu hiện có; các lối vào hồ sơ, cài đặt và tài khoản |
| Chỉnh sửa hồ sơ | Họ tên, email, mã sinh viên, trường, ngành, niên khóa, giới thiệu; avatar ảnh mẫu hoặc chữ cái với ba màu; lưu/hủy |
| Đăng nhập | Email/mật khẩu, hiện/ẩn mật khẩu, kiểm tra form, chuyển đăng ký/quên mật khẩu, mở phiên minh họa |
| Đăng ký | Họ tên, email, mật khẩu/xác nhận; kiểm tra khớp; dùng tên/email để xem hồ sơ mẫu |
| Quên mật khẩu | Nhập email → màn xem trước kiểm tra hộp thư → form đặt lại mật khẩu → trở về đăng nhập |
| Đổi mật khẩu | Form hiện tại/mới/xác nhận và phản hồi hoàn tất xem trước |
| Đăng xuất | Màn xác nhận hoặc ở lại; trở về đăng nhập minh họa, đóng ra trang chủ có lời chào khách |
| Giao diện & ngôn ngữ | Thẻ xem trước sáng/tối, tiếng Việt/English; lưu lựa chọn xem trước trong phiên |
| Tùy chọn nhắc học | Bật/tắt bài tập/lịch học/lịch thi, chọn nhắc trước 5/15/30/60 phút; bật/tắt giờ yên lặng và kiểm tra HH:mm |

## Quy tắc bản dùng thử

- Dữ liệu hồ sơ và tùy chọn nằm trong Context; tải lại trở về mẫu. Tên và avatar vừa lưu cập nhật cùng trang chủ. Đóng/quay lại form không tự lưu các chỉnh sửa.
- Tài khoản mặc định là hồ sơ mẫu đang mở. Đăng ký/đăng nhập chỉ thay hồ sơ minh họa; **mọi email thử dùng chung dữ liệu học tập mẫu**. Không kiểm tra sự tồn tại của email, không tạo tài khoản thật và không có phân quyền/tách dữ liệu người dùng.
- Mật khẩu chỉ nằm trong state của form lúc thử nhập; không thêm vào Context, storage, log hoặc API. Sau khi hoàn tất/chuyển luồng/đóng khu vực tài khoản, form bị xóa. Kiểm tra 8–128 ký tự và xác nhận khớp chỉ để thử giao diện, không thay việc xác thực backend.
- Khôi phục/đổi mật khẩu hiển thị rõ là xem trước. Không gửi email, không phát hành token, không xác thực mật khẩu cũ và không cập nhật mật khẩu thật.
- Sáng/tối và ngôn ngữ **chỉ áp dụng lên thẻ xem trước**. Các màn còn lại vẫn sáng và tiếng Việt; chưa nghiệm thu theme/i18n toàn app. Lựa chọn lưu là lựa chọn xem trước, không phải bật chế độ toàn ứng dụng.
- Tùy chọn nhắc lưu trong phiên nhưng chưa yêu cầu quyền/gửi thông báo thiết bị hoặc thay các lời nhắc riêng của ca học/lịch thi. Giờ yên lặng cho phép qua đêm; giờ bắt đầu/kết thúc phải khác nhau. Vẫn nhập chuỗi giờ theo checklist đã hoãn.
- Avatar chỉ dùng ảnh mẫu và initials, chưa có tải ảnh/chọn ảnh thiết bị. Email chỉnh trong hồ sơ chưa là email đăng nhập đã xác minh.
- Thông tin trường/ngành có thể để trống; họ tên và email cần hợp lệ. Giới hạn tên 60, mã sinh viên 30, trường/ngành 100, niên khóa 40, giới thiệu 160 ký tự. Email được cắt khoảng trắng và chuẩn hóa chữ thường.

## Kiểm tra

```powershell
npm run typecheck
node docs/qa-account.cjs
npm run build:web
npx expo export --platform android --output-dir .expo/native-check
```

Script trình duyệt hỗ trợ `PLAYWRIGHT_MODULE` và `CHROME_PATH` nếu dùng runtime có sẵn; không dùng hồ sơ trình duyệt cá nhân. Ảnh/kết quả ở `.expo/qa-account`, được bỏ qua bởi Git.

Đã thử ở 320/390/430/1280px: lưu/hủy hồ sơ và dùng chung tên/avatar, kiểm tra email/tên/giới thiệu, lưu lựa chọn preview, công tắc nhắc và giờ không hợp lệ, email/mật khẩu/xác nhận, ẩn/hiện mật khẩu, đăng ký/đăng nhập/đăng xuất mẫu, khôi phục/đặt lại/đổi mật khẩu mẫu. Lượt thử kiểm tra không có yêu cầu ghi mạng (POST/PUT/PATCH/DELETE) và không có lỗi console/page.

Kiểm tra hồi quy `qa-smoke.cjs` và `qa-grades.cjs` cho các tab chính, bài tập/lịch/timer/AI và bảng điểm. Xuất bundle Android chưa thay kiểm tra trên điện thoại thật hoặc bản cài native.

## Tiếp theo

**UI 2F — Các luồng con của trợ lý AI và duyệt kế hoạch học**. Bốn nhóm hoàn thiện đang hoãn vẫn ở `UI-BACKLOG.md`. Auth thật, email, lưu/đồng bộ hồ sơ, theme/i18n toàn app và thông báo thiết bị là công việc sau, không đánh dấu xong chỉ vì đã có các màn này.

Tên commit: `Thêm giao diện tài khoản, hồ sơ và cài đặt`. Xem lệnh ở `GIT-COMMITS.md`.
