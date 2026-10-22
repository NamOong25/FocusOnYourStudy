> Tài liệu lịch sử đợt 2C.1. Hiện đã có giữ phiên/refresh/logout ở [2C.2](FRONTEND-AUTH-2C2.md); mô tả phải đăng nhập lại khi F5 bên dưới chỉ đúng tại thời điểm 2C.1.

# 2C.1 — Đăng ký, đăng nhập và hồ sơ thật

Ngày 22/10/2026. Dùng React Native/Expo SDK 56 hiện có, không thêm thư viện. Đã đối chiếu tài liệu Expo SDK 56 và React Native 0.85 trước khi viết code.

## Phạm vi

- Form đăng ký gọi POST `/api/v1/auth/register`, có họ tên/email/mật khẩu/xác nhận, trường và ngành tùy chọn. Thành công chuyển về đăng nhập, điền sẵn email, xóa mật khẩu.
- Đăng nhập gọi POST `/api/v1/auth/login` rồi GET `/api/v1/users/me`. Hồ sơ hiển thị từ GET; không lấy thông tin từ hồ sơ mẫu để giả làm tài khoản thật.
- Web lấy CSRF trước khi gửi, dùng header X-XSRF-TOKEN/X-Auth-Transport: cookie và credentials: include. Refresh token do browser giữ trong cookie HttpOnly, không đọc hoặc chép vào localStorage/sessionStorage.
- Native chuẩn bị transport body theo hợp đồng 2B; chỉ giữ token trong bộ nhớ. Chưa kiểm tra bằng emulator/điện thoại thật hoặc cấu hình truy cập LAN/HTTPS.
- Có chờ/khóa nút và ô nhập, ngăn gửi lặp, lỗi theo trường, email trùng/sai mật khẩu, mạng/timeout, hủy khi đóng form. Timeout 10 giây cho mỗi request, bao gồm đọc body; không tự retry đăng ký/đăng nhập.
- Login thành công nhưng GET hồ sơ thất bại vẫn hiện trạng thái hồ sơ lỗi có thử lại; không hiện hồ sơ tài khoản cũ hoặc hồ sơ mẫu. Mỗi lần đọc kiểm tra ID trả về khớp ID của phiên login.
- Hồ sơ tài khoản thật chỉ đọc; chưa có API cập nhật. Form sửa hồ sơ mẫu vẫn có nhãn mẫu và chỉ đổi dữ liệu học tập thử. Các trang đổi/khôi phục mật khẩu không còn giả báo hoàn tất cho tài khoản thật.
- Tên Trang chủ dùng hồ sơ thật khi đã đăng nhập; số liệu học kỳ/môn/bài vẫn là bản thử trong bộ nhớ, không thuộc dữ liệu lưu của tài khoản.

**Chưa làm 2C.2:** tự khôi phục phiên, native secure storage, tự refresh, logout thật trên app. Tải lại trang sẽ mất trạng thái đăng nhập frontend; tài khoản PostgreSQL vẫn còn, cookie backend không được coi là đã thu hồi. Hết access token thì đăng nhập lại ở đợt này. **2C.3** sẽ kiểm tra toàn bộ đổi tài khoản/dọn dữ liệu, lỗi mạng và thiết bị thật.

## Chạy để tự kiểm tra

Terminal 1 (IntelliJ hoặc VS Code, PowerShell):

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Terminal 2:

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npx expo start --web --port 8092
```

Mở `http://localhost:8092`. Dùng localhost ở cả frontend/backend khi test cookie. Không cần mở trang health để đăng ký; health chỉ là công cụ kiểm tra backend đã chạy.

1. Chọn **Khám phá dữ liệu mẫu** (hoặc dữ liệu trống), bấm **Hồ sơ** góc phải trên.
2. Bấm **Tạo tài khoản**. Nhập email chưa dùng, họ tên, mật khẩu 8–128 ký tự và xác nhận; có thể điền trường/ngành. Bấm tạo, chờ thông báo thành công và màn đăng nhập.
3. Email được điền sẵn; nhập mật khẩu rồi bấm **Đăng nhập**. Phải thấy đúng họ tên/email/trường/ngành vừa đăng ký. Thông tin tài khoản nằm trong PostgreSQL.
4. Bấm **Tải lại hồ sơ** để đọc lại dữ liệu. Đóng tài khoản: với workspace mẫu, tên Trang chủ phải đổi tương ứng. Workspace trống vẫn có nút Hồ sơ trên header.
5. Trong Hồ sơ, chọn **Đăng nhập tài khoản khác**, thử mật khẩu sai: báo lỗi và giữ email. Đóng form khi đang chờ sẽ không tự chuyển tài khoản muộn.
6. Chọn **Tạo tài khoản khác**, dùng email cũ: báo trùng, không ghi đè họ tên hoặc mật khẩu của tài khoản đã tạo.
7. Thử hai tài khoản khác nhau: chỉ hồ sơ API được đổi ở đợt này. Dữ liệu học tập vẫn là workspace thử dùng chung trong phiên, chưa có API theo tài khoản.
8. Để thử mất kết nối, tắt terminal backend rồi bấm đăng nhập hoặc tải lại hồ sơ: phải báo lỗi và mở lại nút, không xoay mãi. Bật backend rồi tự bấm thử lại. Nội dung form được giữ; nếu đăng ký timeout thì server có thể đã tạo tài khoản, nên thử đăng nhập khi gặp email trùng.
9. Tải lại trang: quay về màn bắt đầu, cần đăng nhập lại. Đây là giới hạn 2C.1; giữ đăng nhập thuộc 2C.2.

Quên mật khẩu hiện chỉ báo chưa sẵn sàng, không gửi email hoặc đổi mật khẩu. Không có nút báo đăng xuất thành công giả cho phiên thật.

## Cấu hình URL

Mặc định web dùng `http://<hostname đang mở>:8080`; vì vậy localhost và 127.0.0.1 không bị trộn khi dùng cookie. Có thể tạo `.env.local` ở gốc:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:8080
```

Nếu đổi cổng backend, đổi URL rồi tải lại ứng dụng. Đổi cổng web thì cần thêm đúng origin vào CORS backend. EXPO_PUBLIC là giá trị có trong bundle, chỉ để URL công khai; không đặt mật khẩu/khóa DB hoặc khóa JWT ở đây. Không cần cấu hình URL trên UI người dùng.

Android emulator cần URL máy chủ truy cập được (thường 10.0.2.2); điện thoại cần địa chỉ máy chủ/HTTPS và cấu hình bind/firewall phù hợp. Backend đang chỉ nghe localhost mặc định; đợt này chưa tự mở LAN hoặc tuyên bố đã thử native.

## Cây thư mục mới

```text
src/shared/api/
  http.ts                  fetch, ApiError, field errors, timeout/cancel
  config.ts                EXPO_PUBLIC_API_URL và chọn web/native
src/features/account/
  api/types.ts             DTO đúng hợp đồng backend
  api/accountApi.ts        CSRF, register, login, profile
  auth/AuthProvider.tsx    Phiên trong bộ nhớ, hồ sơ và kiểm tra đúng ID
  auth/useApiAction.ts     Loading/lỗi/ngăn gửi lặp/hủy theo màn
  auth/displayProfile.ts   Ánh xạ DTO sang avatar/tên
  components/AuthForm.tsx  Form đăng ký/đăng nhập thật
  components/AccountProfile.tsx
  components/AuthHero.tsx
  components/PreferenceEditors.tsx
```

Không dùng ActionScope mô phỏng chờ/lỗi cho request auth thật. Button có loading độc lập; hồ sơ/cài đặt mẫu vẫn dùng cơ chế preview hiện có.

## Đã kiểm tra

- `npm run typecheck` và `npm run build:web` thành công.
- `node docs/qa-account-api-unit.cjs`: 13 nhóm kiểm tra transport/CSRF/Bearer, 409/validation/429/503, lỗi mạng, deadline cả fetch và body, hủy, response sai và không retry mutation.
- `qa-account-api.cjs` qua trên Chrome với backend Spring Boot/PostgreSQL thật ở schema `frontend_it_<uuid>` riêng: tạo hai tài khoản, duplicate email, sai mật khẩu, GET hồ sơ, cookie HttpOnly, không lưu token/password vào browser storage, lỗi hồ sơ lúc login và lúc tải lại, offline/thử lại, timeout 10 giây, đóng form ngăn kết quả muộn, tải lại cần login; 320/390/430/1280 px không tràn ngang, không lỗi runtime.
- `qa-account.cjs` chỉ kiểm tra hồ sơ/appearance/reminders mẫu; không gửi API ghi. `qa-smoke.cjs` kiểm tra hồi quy các màn học tập. Các kiểm thử giao diện cũ được sửa tên nút hồ sơ mẫu; không coi là đã chạy lại mọi bài QA lịch sử.
- Kết quả/screenshot kiểm tra trong `.expo/qa-account-api/`, ngoài Git. Tài khoản QA chỉ được tạo trong schema test, schema đó được dọn sau khi dừng backend test; không seed dữ liệu học tập vào schema ứng dụng.

Chạy QA browser cần Playwright và Chrome/Chromium sẵn có như các script QA khác. `PLAYWRIGHT_MODULE`/`CHROME_PATH` chỉ định runtime, `QA_APP_URL` chỉ URL web. **qa-account-api tạo tài khoản QA thật**, chỉ trỏ vào backend/schema thử riêng. Không đưa token/mật khẩu thật vào code hoặc báo cáo.

## Nguồn

- [Expo SDK 56](https://docs.expo.dev/versions/v56.0.0/): nền tảng/phiên bản React Native.
- [Expo environment variables](https://docs.expo.dev/guides/environment-variables/): EXPO_PUBLIC qua dot notation, giá trị công khai trong bundle.
- [React Native 0.85 networking](https://reactnative.dev/docs/0.85/network): Fetch và khác biệt cookie trên native.

Tên commit: **Kết nối giao diện đăng ký đăng nhập và hồ sơ với backend**.
