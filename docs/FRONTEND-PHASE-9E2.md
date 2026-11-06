# 9E.2 — Tải bản sao dữ liệu trên giao diện

Trong **Hồ sơ → Xuất dữ liệu**, tài khoản đang đăng nhập có thể chuẩn bị và tải tệp JSON UTF-8 từ API 9E.1. Màn hình hiển thị tên tệp, thời điểm xuất, dung lượng và số bản ghi từng nhóm. Có trạng thái chuẩn bị, hủy, lỗi và thử lại.

## Chạy thử trên web

1. Giữ backend chạy bằng cách đang dùng. Mở [health](http://localhost:8080/api/v1/health) để kiểm tra backend và database đều `UP`.
2. Tại thư mục gốc project, chạy `npx expo start --web --port 8092`. Sau khi cập nhật project trên máy khác, chạy `npm install` trước để cài hai thư viện mới.
3. Đăng nhập, mở biểu tượng hồ sơ ở góc trên, chọn **Xuất dữ liệu** trong phần Tài khoản.
4. Bấm **Chuẩn bị tệp JSON**. Đợi thẻ **Tệp đã sẵn sàng**, kiểm tra email, tên tệp và số môn/bài tập.
5. Bấm **Tải tệp JSON**. Tìm tệp `focusyourstudy-YYYYMMDD-HHmmss.json` trong mục tải xuống của trình duyệt hoặc nơi bạn vừa chọn lưu. Thời gian trong tên tệp dùng UTC, thời gian hiển thị trên màn dùng giờ thiết bị.
6. Mở tệp bằng VS Code. Tìm `profile`, `courses`, `assignments`, `gradeConfigurations` để đối chiếu một môn, một bài tập và điểm đã nhập. Tiếng Việt phải đúng. Điểm chưa nhập giữ `null`, điểm 0 giữ `0`.

Nếu muốn có dữ liệu vừa sửa sau thời điểm xuất, bấm **Chuẩn bị bản mới** rồi tải lại. Tệp là bản sao tại thời điểm chuẩn bị. Chức năng nhập/khôi phục từ JSON chưa nằm trong đợt này.

## Các trường hợp cần thử thêm

| Thử | Thao tác | Kết quả cần thấy |
| --- | --- | --- |
| Đóng màn | Chuẩn bị tệp rồi đóng ×, mở lại Xuất dữ liệu | Bắt đầu lại từ nút chuẩn bị, không giữ tệp cũ trên màn |
| Hủy | Bấm Hủy chuẩn bị tệp trong lúc đang tải | Trở lại trạng thái ban đầu, phản hồi cũ không làm xuất hiện tệp |
| Lỗi kết nối | Tạm dừng backend rồi bấm Chuẩn bị tệp | Báo lỗi, không xoay mãi. Chạy lại backend và bấm thử lại |
| Tài khoản khác | Chuẩn bị cho A, đóng màn, đăng nhập B và xuất lại | Email, hồ sơ và dữ liệu thuộc B. Tài khoản mới chưa nhập dữ liệu có các danh sách rỗng |
| Tải lại | Tải cùng bản đã chuẩn bị thêm lần nữa | Có thể yêu cầu tải lại mà không cần gọi API chuẩn bị lại |

Khi tải bị trình duyệt chặn, kiểm tra quyền tải xuống và bấm tải lại. Thông báo trên app xác nhận đã gửi yêu cầu đến trình duyệt. Kiểm tra mục Tải xuống để xác nhận tệp đã được lưu.

## Điện thoại

Sau khi chuẩn bị, nút **Lưu hoặc chia sẻ tệp** mở bảng chia sẻ của hệ điều hành. Chọn ứng dụng hoặc nơi lưu rồi mở JSON để kiểm tra tiếng Việt. Thử đóng bảng chia sẻ rồi bấm mở lại. App chỉ báo đã mở bảng chia sẻ vì API không phân biệt đầy đủ thao tác hủy và lưu.

Tệp tạm được ghi vào cache riêng của app và lên lịch dọn sau 15 phút để ứng dụng nhận có thời gian đọc. Bộ hẹn giờ cần app tiếp tục chạy. Hệ điều hành cũng có thể thu hồi cache. Đợt này thêm `expo-file-system ~56.0.11` và `expo-sharing ~56.0.27` theo SDK 56. Nếu dùng development build riêng, cần build lại để có module native. Đối chiếu [FileSystem SDK 56](https://docs.expo.dev/versions/v56.0.0/sdk/filesystem/) và [Sharing SDK 56](https://docs.expo.dev/versions/v56.0.0/sdk/sharing/).

## Kết quả kiểm tra tự động và giới hạn

- TypeScript và toàn bộ bộ test frontend đạt. Có 14 test mới về hợp đồng JSON, UTF-8, giới hạn, lỗi, hủy, tách tài khoản, tải web và chia sẻ native.
- Bundle JavaScript web, Android và iOS qua Expo export đạt. Đây chưa phải APK hoặc bản cài iOS.
- Đã chạy SessionManager và mã xuất frontend với API/PostgreSQL thật trong schema QA riêng. Kiểm tra tệp Blob ghi ra đĩa có tiếng Việt, đúng byte, đúng owner, tài khoản mới rỗng và chặn tệp của owner cũ. Đã dừng backend QA và xóa schema riêng.
- Web saver dùng DOM giả lập trong test. Native dùng FileSystem/Sharing giả lập. Chưa nghiệm thu thao tác tải trực tiếp trên trình duyệt vì Local browser use bị tắt trong Work settings. Chưa nghiệm thu trên điện thoại thật. Dùng các bước trên để kiểm tra hai phần này.

Lệnh kiểm tra lại từ thư mục gốc project

```powershell
npm run typecheck
node --test tests/data-export.test.cjs
```

Giới hạn mỗi lần xuất là 10.000 bản ghi và 20 MiB. Dữ liệu chỉ được chuẩn bị khi người dùng bấm nút. Đóng màn hoặc đổi tài khoản hủy thao tác và bỏ bản JSON đang giữ trong bộ nhớ của màn. Backend và schema nghiệp vụ không thay đổi ở 9E.2.
