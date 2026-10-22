# 2C.2 — Giữ phiên, tự làm mới và đăng xuất

Frontend đã nối API phiên của backend 2B. Hồ sơ lấy từ PostgreSQL; học kỳ/môn/bài tập vẫn trong bộ nhớ và mất khi tải lại. Chưa mở CRUD học tập.

## Hoạt động

1. Đăng nhập đúng: access token hạn 15 phút chỉ giữ trong bộ nhớ. Web nhận refresh token qua cookie HttpOnly; Android/iOS có adapter lưu refresh token bằng Expo SecureStore.
2. Mở lại/F5: đọc dấu phiên, xin cặp token mới rồi tải hồ sơ; không yêu cầu mật khẩu khi phiên còn hiệu lực. Sau nâng cấp từ 2C.1 cần đăng nhập một lần để tạo dấu phiên mới.
3. App ở trước màn hình kiểm tra hạn mỗi 30 giây và khi quay lại tab/app, làm mới trước hạn khoảng 30 giây. Hồ sơ gặp 401 thì refresh rồi thử lại tối đa một lần.
4. Đăng xuất: ghi dấu không được khôi phục trước, dọn hồ sơ/dữ liệu thử/điều hướng/form/timer, gọi API thu hồi phiên. Tài khoản trong PostgreSQL vẫn còn.
5. Mất mạng khi đăng xuất: đã thoát trên thiết bị, nhưng hiện rõ chưa xác nhận thu hồi với server và nút **Hoàn tất đăng xuất**. F5 không tự vào lại. Có mạng thì bấm nút để hoàn tất.

Đổi tài khoản đặt lại dữ liệu học tập thử. Khi đã đăng nhập, vùng học tập khởi đầu trống; chưa có dữ liệu học tập lưu cùng tài khoản để tải lại.

## Kiểm tra thủ công

Giữ hai terminal đang chạy:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npx expo start --web --port 8092
```

1. Mở `http://localhost:8092`, chọn trống/mẫu → **Hồ sơ** → tạo tài khoản nếu chưa có → đăng nhập; kiểm tra họ tên/email.
2. Nhấn **F5**: trạng thái khôi phục ngắn rồi hồ sơ hiện lại, không nhập mật khẩu.
3. Mở thêm tab cùng địa chỉ; F5 hai tab vẫn dùng được.
4. Trong Hồ sơ, cuộn xuống **Đăng xuất** → **Xác nhận đăng xuất**. Tab kia cũng thoát. F5 không hiện hồ sơ đã thoát.
5. Đăng nhập lại, DevTools → Network → Offline rồi đăng xuất: thấy chưa xác nhận với server. Chuyển Online → **Hoàn tất đăng xuất**. F5 lúc giữ Offline có thể không tải được cả trang; kiểm tra sau khi trang tải lại được.
6. Muốn xem tự refresh: giữ tab trước màn hình khoảng 15 phút, Network lọc `auth/refresh`; hoặc quay lại tab sau hơn 15 phút. Thành công thì không nhập lại mật khẩu. Không chia sẻ token/cookie trong ảnh test.

Cổng thường ngày là backend 8080/frontend 8092; cổng QA 8085/8093 chỉ dùng trong lượt kiểm tra tự động.

## Lưu trữ và đồng thời

- Web localStorage chỉ có `{kind,userId?}`: không token, mật khẩu hay hồ sơ. Đây là dấu khôi phục, không cấp quyền. Browser gửi cookie HttpOnly; JS không đọc refresh token.
- Native SecureStore giữ refresh token/dấu phiên, dùng `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Không lưu access token/hồ sơ/mật khẩu. Có plugin Expo SecureStore; adapter đã thử bằng mock, chưa nghiệm thu keychain/keystore thật.
- Một app dùng chung lần refresh đang chạy; nhiều tab cùng origin xếp hàng bằng Web Locks. storage event/BroadcastChannel báo thay đổi phiên, không truyền token.
- Web cần browser hỗ trợ Web Locks trên localhost hoặc HTTPS. Các origin frontend khác nhau không chia sẻ khóa; dùng một origin frontend thống nhất cho một môi trường backend. Production HTTPS/CORS/cookie làm sau.
- Ghi dấu `inflight` trước login/refresh. Timeout, mất phản hồi hoặc đóng trang có thể khiến không biết server đã xử lý chưa: không tự gửi lại token cũ. Lần mở sau thu hồi phiên chưa xác nhận rồi yêu cầu đăng nhập lại, tránh replay.
- Đóng form hủy yêu cầu giao diện; refresh/logout đang xử lý vẫn kết thúc với timeout để bảo toàn xoay/thu hồi token.

## Kiểm tra ngày 22/10/2026

- TypeScript, export web và Android Hermes bundle qua; bundle không thay thế kiểm tra máy thật.
- `node docs/qa-session-unit.cjs`: 19 nhóm qua: khôi phục/expiry, đồng thời, 401 một lần, CSRF trước POST, mất phản hồi, crash journal, logout offline/sau refresh, hai manager, hủy một caller, lỗi lưu trữ, hồ sơ về muộn và adapter SecureStore mock.
- `node docs/qa-account-api-unit.cjs`: 15 nhóm qua, có cookie/body cho refresh/logout và logout 204.
- `node docs/qa-session.cjs`: 9 nhóm qua với browser/backend/PostgreSQL schema riêng. F5, cookie đổi, storage không token, F5 hai tab đồng thời, 401, logout liên tab, lỗi mạng khi logout, mất phản hồi refresh đã thành công và phiên bị thu hồi. Bốn chiều rộng 320/390/430/1280px không tràn ngang/lỗi runtime.
- Hồi quy `qa-account-api.cjs`: 13 nhóm qua (hai tài khoản, lỗi mạng/timeout và F5 theo 2C.2); `qa-smoke.cjs` và `qa-account.cjs` qua, giữ các luồng prototype và hồ sơ/cài đặt mẫu.
- Expiry thử bằng đồng hồ giả trong unit; không coi là đã chờ 15 phút thật trên browser. Test 401 chèn một phản hồi 401 rồi để backend thật xử lý refresh/hồ sơ.
- `expo install --check` nhận SecureStore 56.0.4 nhưng báo Expo 56.0.23 có bản vá 56.0.24 mới. Chưa nâng Expo trong đợt này.

QA browser tạo email `ui-a-*`/`ui-b-*@example.test`, chỉ chạy với schema riêng. Ảnh/kết quả ở `.expo/`, không commit; không tạo tài khoản mẫu vào schema ứng dụng.

## Tiếp theo — 2C.3

Nghiệm thu hai tài khoản với các luồng học tập đang mở, mạng chập chờn, Android/iOS/điện thoại thật, đóng/mở process và secure storage thật. Chưa đánh dấu cả đợt tài khoản hoàn thành chỉ dựa vào web. Sửa hồ sơ, email khôi phục/đổi mật khẩu, quản lý thiết bị và lưu học tập backend thuộc các đợt sau.

Tên commit: **Bổ sung giữ phiên làm mới token và đăng xuất trên ứng dụng**.
