# 9A.1 — API cập nhật hồ sơ tài khoản

Đã có **PUT `/api/v1/users/me`** để lưu họ tên, trường và ngành vào PostgreSQL. GET hồ sơ và hồ sơ trong register/login/refresh bổ sung **version**. Khi hai nơi cùng sửa, backend chặn bản cũ bằng 409 `PROFILE_VERSION_CONFLICT`. Tài khoản chỉ sửa chính mình, dùng Bearer và kiểm tra phiên như các API dữ liệu học tập.

Đợt này làm backend và công cụ thử. Form Lưu hồ sơ trên app sẽ nối ở **9A.2**; không coi form mẫu hiện tại là đã lưu được qua API mới. Giữ schema V13, không tạo bảng hay dependency mới.

## Bước 1 — Khởi động lại backend

Nếu backend đang chạy ở terminal cũ, nhấn **Ctrl+C tại terminal đó** rồi chạy lại để nạp API mới. Trong Terminal VS Code hoặc IntelliJ:

```text
cd "D:\Video OBS\QuanLyHocTap\backend"
powershell.exe -NoProfile -File ".\scripts\Run-Local.ps1"
```

Đợi `Started FocusStudyBackendApplication`. Mở `http://localhost:8080/api/v1/health`, status/database đều UP. Script chuẩn bị PostgreSQL portable và khóa cục bộ như trước. Giữ terminal này chạy.

## Bước 2 — Đọc hồ sơ và version

Mở terminal thứ hai, chạy:

```text
powershell.exe -NoProfile -File "D:\Video OBS\QuanLyHocTap\backend\scripts\Try-Profile.ps1" -Mode Get
```

Nhập email tài khoản đã đăng ký và mật khẩu khi được hỏi (mật khẩu nhập ẩn). Kết quả `data` gồm id/email/fullName/school/major/timeZone/**version**. Ghi nhớ nội dung và version. Không phải nhập ID tài khoản và không nhập token bằng tay.

## Bước 3 — Lưu ba ô hồ sơ

Thay họ tên/trường/ngành bằng giá trị bạn muốn dùng. **Thay số 0 bằng version vừa Get** nếu khác 0:

```text
powershell.exe -NoProfile -File "D:\Video OBS\QuanLyHocTap\backend\scripts\Try-Profile.ps1" -Mode Update -Version 0 -FullName "Nguyễn Văn A" -School "Đại học Công nghiệp TP.HCM" -Major "Công nghệ thông tin"
```

Chỉ Mode Update mới thay hồ sơ. School/Major không truyền hoặc để rỗng sẽ xóa nội dung tương ứng, nên gửi cả ba giá trị đã xem. Họ tên bắt buộc tối đa 60 ký tự, trường/ngành mỗi ô tối đa 100. Script gửi và đọc UTF-8 để giữ tiếng Việt trên Windows PowerShell 5.1; không in token/mật khẩu, không tự gửi lại thao tác ghi.

Kết quả phải có nội dung mới và version của bản đã lưu. Chạy **Get** lại ở Bước 2: các giá trị phải giữ đúng. Mỗi lần thử script mở một phiên riêng rồi đăng xuất phiên đó; phiên đang mở trong app được giữ.

## Bước 4 — Thử chặn bản cũ và hai tài khoản

1. Sau lần Update có thay đổi thành công, giữ nguyên version cũ và thử Update một lần nữa. Phải có **PROFILE_VERSION_CONFLICT**. Get lại, dữ liệu vẫn là bản đã lưu, không bị ghi đè.
2. Muốn sửa tiếp, Get, xem nội dung/version mới, rồi chủ động tạo lần Update mới. Mất kết nối lúc Update cũng dùng Get đối chiếu trước, không mặc định chưa lưu hoặc tự tăng version.
3. Chạy Get, nhập tài khoản B: B vẫn có hồ sơ riêng. Không cần tạo/xóa database để thử. Dùng tài khoản thử nếu muốn nhập các tên minh họa.
4. Đăng xuất/đăng nhập lại app hoặc F5 để đọc hồ sơ tài khoản từ API: các thông tin được trả từ DB. Chỉnh và bấm lưu ngay trong form app vẫn chờ 9A.2.

Nếu báo không gọi được API/404/403 khi PUT: xác nhận đúng backend/cổng và đã chạy lại backend có mã 9A.1. Không chạy hai backend cùng cổng. Thử bằng [IntelliJ HTTP](../backend/api/user-profile.http) cũng được; token/version trong file là chỗ trống cần thay bằng kết quả thật.

## Thiết kế và kiểm tra

- Dùng cột version hiện có, khóa owner trước khi đọc/check version, `@Transactional` và flush trước response. Chỉ thay ba cột hồ sơ; ID/email/hash mật khẩu/múi giờ và dữ liệu học tập được giữ.
- Trường tùy chọn null/không gửi chuẩn hóa thành rỗng; trim đầu/cuối theo cùng quy ước đăng ký. Cùng dữ liệu và version hợp lệ có thể giữ nguyên version (không bắt buộc tăng khi không đổi gì).
- Cookie đăng nhập web không thay Bearer. Không có endpoint chọn ID tài khoản khác để sửa. Thêm version vào response tương thích parser hiện tại; frontend API/Provider chưa thêm lệnh sửa.
- **19 kiểm thử mới** với HTTP/PostgreSQL thật và PowerShell 5.1: Unicode/trim, version/no-op/cạnh giới hạn, null/độ dài/JSON, quyền Bearer/cookie/session đã thu hồi, hai chủ sở hữu và chèn thuộc tính ngoài DTO, bản cũ/hai lần đồng thời/chờ khóa, login/refresh đọc hồ sơ mới và Get/Update/Get trên script. Tổng với Auth/Session là **47/47**, không lỗi/bỏ qua.
- TypeScript và **714/714 tests frontend hiện có đạt**, chưa đổi UI. Full backend **863/863 tests trong 55 bộ**, không lỗi/bỏ qua; Maven verify và đóng gói JAR thành công. [Biên bản máy đọc](test-results/profile-api-9a1.json).
- Test tạo schema `backend_it_<UUID>` riêng và tự dọn; không seed/reset hoặc sửa hồ sơ tài khoản người dùng. Script hướng dẫn chỉ dùng tài khoản bạn chủ động nhập; có thao tác lưu thật ở Update.

[Hợp đồng API](../backend/docs/USER-PROFILE.md). Tên commit: **Thêm API cập nhật hồ sơ tài khoản**. Chưa tự commit/push.
