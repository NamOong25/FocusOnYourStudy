# Tên commit cho từng đợt

Theo yêu cầu: mỗi đợt làm xong đều kèm tên commit tiếng Việt và lệnh push. Đây là hướng dẫn để bạn tự chạy; Codex chưa tự commit hoặc push.

Điều chỉnh lộ trình: người dùng chọn để **2C.3B kiểm tra thiết bị thật làm sau**, ưu tiên 3A → 3B → 3C. Tên commit riêng cho thay đổi tài liệu này nếu cần: **Cập nhật lộ trình backend và hoãn kiểm tra điện thoại**.

## Đợt vừa hoàn thành: 5B.2A — Lịch sử các lần học cùng môn

Ghép cùng mã/tín chỉ, thứ tự năm-kỳ/hè; giữ mọi lần học, phân biệt thiếu điểm/F0 và ngữ cảnh theo kết quả trước. Khác tín chỉ/LT-TH báo cần đối chiếu; API chỉ đọc, ownership/snapshot, không chọn điểm tích lũy/tăng version. Có PowerShell 5.1/IntelliJ/test/restart; vẫn V9, không seed/migration/UI/dependency. Quy tắc lựa chọn điểm còn ở 5B.2B; xem `BACKEND-PHASE-5B2A.md`. 504 tests/Maven verify qua (27 mới), không lỗi/bỏ qua; TypeScript qua. Gồm 8 test timeline và 19 test HTTP/PowerShell mới; mở rộng restart qua ba lần khởi động, snapshot đồng thời, quyền tài khoản và dữ liệu thiếu/F0. Schema test riêng tự dọn; không seed dữ liệu app, vẫn V9.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Nhận diện lịch sử các lần học cùng môn theo học kỳ"
git push
```

## 5B.1 — GPA học kỳ theo tín chỉ

477 tests/Maven verify qua (29 mới), không lỗi/bỏ qua; TypeScript qua. Gồm 8 test phép tính và 21 test API/PowerShell mới; kiểm tra GPA qua restart, dữ liệu đồng thời và hồi quy. Vẫn V9, không seed vào tài khoản app.

GET GPA học kỳ từ kết quả môn 5A.2B và tín chỉ; tính F đủ kết quả, tách môn chưa tính/lý do, GPA null khác 0, PARTIAL và tín chỉ tính GPA/đạt/trượt/chưa tính. Đọc snapshot theo tài khoản, tải bảng điểm theo nhóm, không lưu GPA sẵn/tăng version. Có contract, PowerShell/IntelliJ, test tính tay/F/thiếu điểm/làm tròn/cập nhật/đồng thời/restart. Vẫn V9, không migration/seed/frontend/dependency. Tích lũy/học lại và UI còn ở 5B.2/5C; xem `BACKEND-PHASE-5B1.md`.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Tính GPA học kỳ theo tín chỉ và tách môn chưa đủ điểm"
git push
```

## 5A.2B — Kết quả môn theo điểm đã lưu

448 tests/Maven verify qua (58 mới), không lỗi/bỏ qua; TypeScript qua. 42 test công thức và 16 test API/PowerShell mới; kiểm tra kết quả qua restart và ghi đồng thời. Schema test riêng tự dọn; vẫn V9, không seed dữ liệu app.

GET kết quả từ cùng snapshot cấu hình/điểm/tín chỉ, nguồn IUH 2023; BigDecimal, BTL, thiếu dữ liệu/chặn thi, ngoại lệ cuối kỳ dưới 3, tổng kết/điểm chữ/hệ 4 và dấu cần xử lý học lại. Không tự tạo điểm thiếu hoặc ghi sẵn kết quả; vẫn V9, không migration/seed/dependency/UI. Có contract, PowerShell/IntelliJ, test công thức/ngưỡng/ownership/snapshot/đồng thời/restart. GPA ở 5B, nối UI ở 5C. Xem `BACKEND-PHASE-5A2B.md`.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Tính kết quả môn theo điểm đã lưu và quy tắc IUH"
git push
```

## 5A.2A — Lưu điểm thành phần

390 tests/Maven verify qua (33 mới), không lỗi/bỏ qua; TypeScript qua. Kiểm thử dùng schema riêng, không seed vào tài khoản app.

V9 + GET/PUT điểm theo cấu hình, null khác 0, BTL/phần còn lại; đầy đủ mã cột/trường, version dùng chung, ghi nguyên tử và snapshot đọc. Bảo vệ cột/cấu hình còn điểm; đổi tên/thứ tự giữ điểm. Có script Get/Export/Update không tự thay version hoặc ghi đè file, mẫu IntelliJ, migration/restart/đồng thời và PowerShell 5.1. Tính kết quả môn/GPA và nối UI còn ở 5A.2B/5B/5C. Xem `BACKEND-PHASE-5A2A.md`.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Lưu điểm thành phần và bảo vệ các cột đã nhập điểm"
git push
```

## 5A.1 — Lưu cấu hình bảng điểm theo môn

V8 + API cấu hình Lý thuyết/Thực hành, bộ cột tùy chỉnh/thứ tự/tên/vai trò và cách quy BTL, trọng số dựng từ cấu hình và DRAFT thiếu nhóm. Ownership/version/khóa tài khoản, snapshot đọc, giữ ID cột và chặn xóa/chuyển môn còn cấu hình; có mẫu JSON, script PowerShell 5.1, IntelliJ HTTP và test migration/restart/đồng thời. Chỉ lưu cấu hình; điểm số, tổng kết/GPA và nối UI tiếp tục ở 5A.2/5B/5C. Xem `BACKEND-PHASE-5A1.md`.

357 tests/Maven verify qua (32 mới), không lỗi/bỏ qua; TypeScript qua. Các schema kiểm thử tự dọn; không seed vào tài khoản app.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Lưu cấu hình bảng điểm và cách quy bài tập lớn theo môn"
git push
```

## 4H.2C.2 — Nhắc việc lịch thi thật

Chuông dùng lịch thi toàn tài khoản theo mốc nhắc đã lưu; một thẻ mỗi kỳ thi và read revision cho từng mốc. Mở/sửa/xóa qua API, cập nhật khi đổi giờ/phòng/mốc hoặc tắt/xóa/kết thúc. Độc lập với lịch học khi một nguồn lỗi, giữ dấu đọc qua retry và không báo trống giả. 139 test lịch thi (35 mới) + 140 test lịch hồi quy, TypeScript/export web và browser API/PostgreSQL thật qua. Không backend/migration/dependency; xem `FRONTEND-EXAMS-4H2C2.md`. Chưa gửi thông báo thiết bị.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Đồng bộ nhắc việc lịch thi với dữ liệu tài khoản"
git push
```

## 4H.2C.1 — Trang chủ và chi tiết môn dùng lịch thi thật

Kỳ thi gần nhất/đang diễn ra và đếm ngược theo UTC, đúng học kỳ; chi tiết môn lọc theo môn/kỳ. Mở/thêm/sửa/xóa dùng chung API, giữ bộ lọc khi quay lại, làm mới sau thay đổi, tải/lỗi/trống/404 và bản cũ khi mạng lỗi. 104 test lịch thi (20 mới) + 140 test lịch hồi quy, TypeScript/export web và browser API/PostgreSQL thật qua. Không backend/migration/dependency; xem `FRONTEND-EXAMS-4H2C1.md`. Nhắc việc trong chuông thuộc 4H.2C.2.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Đồng bộ lịch thi với Trang chủ và chi tiết môn"
git push
```

## 4H.2B — Thêm, sửa và xóa lịch thi

Nối POST/PUT/DELETE theo tài khoản; chọn ngày/giờ/zone, mốc nhắc tùy chỉnh, xác nhận xóa. Giữ bản nháp khi trùng, chặn version cũ và kết quả ghi chưa xác nhận; đọc/đối chiếu trước khi cho phép thao tác tiếp, không tự retry. 84 test lịch thi (34 mới) + 140 test lịch hồi quy, TypeScript/export web và browser API/PostgreSQL thật qua. Không backend/migration/dependency. Xem `FRONTEND-EXAMS-4H2B.md`. Dashboard/chi tiết môn/nhắc việc thuộc 4H.2C.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Kết nối thêm sửa xóa lịch thi vào tài khoản"
git push
```

## 4H.2A — Đọc danh sách và chi tiết lịch thi

Nối GET lịch thi theo tài khoản/học kỳ/môn, lọc thời điểm UTC và đọc mới chi tiết. Tải/lỗi/trống/thử lại/404, bỏ phản hồi cũ khi đổi bộ lọc hoặc tài khoản, F5 và giờ nguồn/zone/DST. Giữ chế độ mẫu riêng, chặn ghi RAM trong tài khoản; Dashboard có lối vào danh sách, ghi UI và tổng hợp/nhắc việc làm 4H.2B/4H.2C. TypeScript, 50 test mới + 140 test lịch hồi quy, export web và browser API/PostgreSQL thật qua, ảnh 4 kích thước. Không backend/migration/dependency; hướng dẫn `FRONTEND-EXAMS-4H2A.md`.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Kết nối danh sách và chi tiết lịch thi với API"
git push
```

## 4H.1B.2 — Chặn lịch học và tự học trùng lịch thi

Tạo/sửa chuỗi, đổi/khôi phục một buổi và tạo/sửa tự học kiểm tra thi toàn tài khoản. Dùng giờ hiệu lực và UTC; trùng giờ giữ toàn bộ dữ liệu/ngoại lệ/version, bảo vệ ghi thi và lịch/tự học đồng thời dưới khóa chung. 325 tests/Maven verify qua (31 mới), không bỏ qua, có chuỗi dài, UTC/DST, quyền, rollback và PowerShell 5.1; TypeScript/140 test lịch frontend qua. Không migration/seed, V7. 4H.1B đã hoàn thành, tiếp theo UI 4H.2; hướng dẫn `BACKEND-PHASE-4H1B2.md`.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Chặn lịch học và tự học trùng lịch thi"
git push
```

## 4H.1B.1 — Chặn lịch thi trùng với lịch đã lưu

Khi tạo/sửa lịch thi kiểm tra kỳ thi khác, lịch học hiệu lực sau nghỉ/đổi và tự học toàn tài khoản. So UTC, cho chạm giờ; lỗi nêu môn/buổi/ngày/giờ và giữ nguyên toàn bộ dữ liệu/version khi bị chặn. Khóa tài khoản bảo vệ ghi lịch thi đồng thời. 294 tests/Maven verify qua (26 mới), không bỏ qua, có PowerShell 5.1, rollback, múi giờ và race; TypeScript/140 test lịch frontend qua. Không migration/seed, vẫn V7. Chiều ngược 4H.1B.2 và UI 4H.2 còn trong checklist; hướng dẫn `BACKEND-PHASE-4H1B1.md`.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Chặn lịch thi trùng với lịch đã lưu"
git push
```

## 4H.1A — API lịch thi cơ bản

V7 thêm bảng lịch thi, API CRUD/lọc theo chủ tài khoản và môn/học kỳ, ngày giờ UTC/zone, loại/hình thức và cấu hình mốc nhắc; version chống ghi đè cả PUT giống hệt, bảo vệ xóa/chuyển môn. 268 tests/Maven verify qua (30 mới), có migration giữ dữ liệu, restart và PowerShell 5.1. TypeScript/140 test lịch frontend hồi quy qua. Chưa kiểm tra trùng (4H.1B) hoặc nối UI (4H.2); hướng dẫn `BACKEND-PHASE-4H1A.md`.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Thêm API lịch thi và lưu PostgreSQL"
git push
```

## 4G.2 — Nhắc lịch đã lưu trong mục chuông

Nhắc đúng mốc của lịch/ngoại lệ toàn tài khoản; nghỉ/xóa/kết thúc bỏ mục, khôi phục/đổi giờ xét lại. Điều hướng đúng kỳ/ngày, giữ dấu đọc qua tải lại/lỗi và bảo vệ dữ liệu chưa xác nhận. 140 test (29 mới), 62 kiểm tra nhắc việc cũ, TypeScript/export web và 15 nhóm browser API thật qua; không đổi backend/migration. Hướng dẫn `FRONTEND-SCHEDULE-4G2.md`.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Kết nối nhắc lịch học với dữ liệu đã lưu"
git push
```

## 4G.1 — Lịch thật trên Trang chủ và chi tiết môn

Tổng hợp độc lập đủ phạm vi/version từ API: buổi gần nhất/hôm nay đúng học kỳ, số buổi và danh sách đúng môn, ngoại lệ và múi giờ, mở đúng ngày trong Thời khóa biểu. Tải lại sau ghi, xử lý lỗi/phản hồi cũ và không tính dữ liệu chưa biết thành 0. 111 test lịch (30 mới), TypeScript/export web và 19 nhóm browser API thật qua; không đổi backend/migration. Hướng dẫn `FRONTEND-SCHEDULE-4G1.md`; nhắc việc 4G.2 làm sau.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Hiển thị lịch học thật trên Trang chủ và chi tiết môn"
git push
```

## 4F.3 — Nghỉ đổi và khôi phục từng buổi

Nối giao diện ngoại lệ đúng ngày bằng API: kế thừa/ghi đè từng trường, nghỉ và khôi phục về chuỗi hiện tại, bảo vệ version, trùng giờ và bản nháp. Mất phản hồi kiểm tra đúng buổi; không tự gửi lại hoặc tạo lại chuỗi đã xóa. 81 test đọc/ghi (27 mới), TypeScript, export web và browser API thật qua. Hướng dẫn `FRONTEND-SCHEDULE-4F3.md`; không đổi backend/migration.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Kết nối nghỉ đổi và khôi phục từng buổi học"
git push
```

## 4F.2 — Thêm sửa xóa chuỗi lịch học

Nối POST/PUT/DELETE cả chuỗi; form và danh sách chuỗi trong học kỳ, giữ bản nháp/lỗi trùng, nạp rõ ràng khi version cũ, xác nhận xóa và không tự tạo lại chuỗi đã mất. Mất phản hồi kiểm tra toàn tài khoản trước khi tiếp tục; ghi đã xác nhận khác với GET lỗi. 54 test đọc/ghi (26 mới), TypeScript, export web và browser API thật qua, không đổi backend/migration. Hướng dẫn `FRONTEND-SCHEDULE-4F2.md`; ghi từng buổi đã có ở 4F.3.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Kết nối thêm sửa xóa chuỗi lịch học với backend"
git push
```

`git push` dùng nhánh/upstream bạn đã thiết lập khi push các đợt trước. Nếu chưa có upstream, dùng `git push -u origin TEN_NHANH_HIEN_TAI`, thay tên nhánh lấy từ `git branch --show-current`.

## Các đợt trước

| Đợt | Tên commit |
| --- | --- |
| Frontend 4F.1 — Đọc thời khóa biểu | `Kết nối thời khóa biểu với dữ liệu lịch học từ backend` |
| Backend 4E.2B — Kiểm tra trùng giờ | `Bổ sung kiểm tra trùng giờ lịch học và buổi tự học` |
| Backend 4E.2A — Ngoại lệ từng buổi | `Bổ sung API nghỉ đổi và khôi phục từng buổi học` |
| Backend 4E.1 — API lịch lặp | `Triển khai API quản lý lịch học lặp theo môn` |
| Frontend 4D — Nối tự học | `Kết nối giao diện tự học với dữ liệu backend` |
| Backend 4C — API tự học | `Triển khai API kế hoạch tự học và kiểm tra liên kết bài tập` |
| Frontend 4B — Nối bài tập | `Kết nối giao diện bài tập với dữ liệu backend` |
| Backend 4A — API bài tập | `Triển khai API quản lý bài tập theo môn học` |
| Frontend 3C.2 — Nối môn học | `Kết nối giao diện môn học với dữ liệu backend` |
| Frontend 3C.1 — Nối học kỳ | `Kết nối giao diện học kỳ với API và lưu dữ liệu thật` |
| Backend 3B — API môn học | `Triển khai API quản lý môn học theo học kỳ` |
| Backend 3A — API học kỳ | `Triển khai API quản lý học kỳ theo tài khoản` |
| Frontend 2C.3A — Kiểm tra tài khoản web | `Kiểm tra tách dữ liệu tài khoản và xử lý phiên trên web` |
| Frontend 2C.2 — Giữ phiên | `Bổ sung giữ phiên làm mới token và đăng xuất trên ứng dụng` |
| Frontend 2C.1 — Nối tài khoản | `Kết nối giao diện đăng ký đăng nhập và hồ sơ với backend` |
| Backend 2B — Phiên và đăng xuất | `Bổ sung làm mới phiên đăng nhập và đăng xuất` |
| Backend 2A — API tài khoản | `Triển khai API đăng ký đăng nhập và hồ sơ tài khoản` |
| Backend 1 — Nền tảng | `Khởi tạo backend Spring Boot và kết nối PostgreSQL` |
| UI 4H — Rà soát và trình diễn giao diện | `Bổ sung kiểm thử tổng thể giao diện và trình diễn trực tiếp` |
| UI 4G — Cảnh báo biểu mẫu chưa lưu | `Cảnh báo khi rời biểu mẫu có thay đổi chưa lưu` |
| UI 4F — Thông báo trong app và trạng thái đã đọc | `Hoàn thiện giao diện thông báo và trạng thái đã đọc` |
| UI 4E — So sánh GPA giữa các học kỳ | `Hoàn thiện giao diện so sánh GPA giữa các học kỳ` |
| UI 4D — Thống kê từ phiên học và bài tập | `Hoàn thiện thống kê từ phiên học và bài tập` |
| UI 4C — Pomodoro và mục tiêu ngày | `Hoàn thiện Pomodoro lịch sử phiên học và mục tiêu ngày` |
| UI 4B — Giờ deadline và lọc bài tập | `Bổ sung giờ deadline tìm kiếm và lọc bài tập` |
| UI 4A — Điều hướng và Bài tập riêng | `Đơn giản hóa điều hướng lịch học và tách màn bài tập` |
| Checklist backend | `Bổ sung lộ trình backend 5 đợt vào checklist` |
| Cột điểm đề xuất và BTL | `Cho phép thêm xóa sửa cột điểm và quy đổi bài tập lớn` |
| UI 3D — Dashboard | `Hoàn thiện Dashboard theo học kỳ và lịch thi gần nhất` |
| Điểm IUH và tự nhận diện học lại | `Bổ sung quy tắc điểm IUH và tự xác định môn cần học lại` |
| UI 3C và bộ chọn học kỳ | `Hoàn thiện trạng thái giao diện và bộ chọn học kỳ` |
| UI 2D — Điểm số & GPA | `Thêm giao diện điểm số, GPA và mục tiêu học tập` |
| UI 2E — Tài khoản, hồ sơ và cài đặt | `Thêm giao diện tài khoản, hồ sơ và cài đặt` |
| UI 2F — Trợ lý AI và duyệt kế hoạch học | `Hoàn thiện giao diện trợ lý AI và duyệt kế hoạch học` |
| UI 3A — Bộ chọn ngày giờ | `Thêm bộ chọn ngày giờ cho các biểu mẫu` |
| UI 3B — Điều hướng và quay lại | `Hoàn thiện điều hướng và luồng quay lại` |
| Cấu trúc frontend và component | `Tổ chức thư mục frontend và tách component dùng chung` |

## Tên dự kiến cho các đợt tiếp theo

Các đợt này **chưa làm**, chỉ chuẩn bị tên. Khi hoàn thành sẽ điều chỉnh tên theo đúng phạm vi thực tế rồi mới commit/push.

| Đợt dự kiến | Phạm vi | Tên commit tiếng Việt |
| --- | --- | --- |


| 2C.3B — Để làm sau | Kết nối native, mở lại app, kho bảo mật trên máy thật | Hoàn thiện kiểm tra tài khoản và kết nối trên thiết bị |

Mỗi mục làm riêng để người dùng xem và push. Đã xong backend 1/2A/2B/3A/3B/4A/4C/4E.1/4E.2A/4E.2B, UI tài khoản 2C.1/2C.2/2C.3A và UI học kỳ/môn/bài/tự học/lịch 3C.1/3C.2/4B/4D/4F.1/4F.2; tiếp theo theo `next`/`go`.
