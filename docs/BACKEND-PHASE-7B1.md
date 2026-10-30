# 7B.1 — Lưu trạng thái đã đọc thông báo

Ngày 30/10/2026. Backend có API lưu trạng thái đã đọc trong PostgreSQL theo tài khoản, phân biệt bài tập/lịch thi/từng buổi học. Giao diện chuông và trung tâm thông báo **chưa nối API mới**; làm ở 7B.2. Push/thông báo hệ điều hành, giờ yên lặng và điện thoại thật vẫn ở các mục sau.

## Đã làm

- V12 thêm bảng biên nhận đọc, FK owner/nguồn và cascade khi xóa nguồn; giữ dữ liệu học tập V1–V11.
- Query trạng thái theo tập khóa, không tự tạo biên nhận và không tải ghi chú/nội dung riêng vào response.
- PUT một hoặc nhiều mục theo revision đã xem; lặp cùng revision không tạo trùng hoặc đổi thời điểm đọc.
- Deadline/nội dung đổi làm trạng thái cũ không khớp. Buổi học ở hai ngày có biên nhận riêng; đổi ngoại lệ ngày khác không làm buổi không đổi thành chưa đọc.
- Tất cả mục của một lô được kiểm tra trước khi ghi; một mục stale/không khả dụng thì không ghi một phần. Bài hoàn thành, buổi nghỉ và lịch đã hết giờ không bị coi là lời nhắc đã đọc còn hoạt động.
- Chỉ đọc/ghi nguồn của JWT owner; không thể dò trạng thái người khác bằng ID. Chặn lượt đánh dấu cũ khi nguồn đang được thay đổi.

Hợp đồng chi tiết tại [NOTIFICATION-READ-STATES.md](../backend/docs/NOTIFICATION-READ-STATES.md), mẫu IntelliJ tại [notification-read-states.http](../backend/api/notification-read-states.http).

## Bạn kiểm tra nhanh bằng PowerShell

### 1. Khởi động lại backend

Nếu terminal backend cũ đang chạy, Ctrl+C tại terminal đó, rồi chạy:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Giữ terminal này chạy. Flyway tự áp dụng V12; bạn không cần tự tạo/xóa database hoặc bảng. Đợt này không seed dữ liệu vào tài khoản đang dùng.

### 2. Lấy ID bài tập thử

Mở terminal khác trong thư mục `backend` (VS Code hoặc IntelliJ đều được):

```powershell
.\scripts\Try-Assignments.ps1 -Mode List
```

Dùng tài khoản đã đăng ký. Chọn bài **chưa hoàn thành** và copy `id` của bài, không lấy `courseId`. Có thể tạo bài mang tên `TEST 7B1` từ app trước để kiểm tra mà không đổi bài đang dùng.

### 3. Đọc trạng thái

Thay UUID bên dưới bằng ID vừa copy:

```powershell
.\scripts\Try-NotificationReadStates.ps1 -Mode Query -SourceId 'UUID-BAI-TAP'
```

Lần đầu: `available:true`, `read:false`, `readAt:null`, dòng **Chưa đọc**. Nguồn không hợp lệ/không thuộc tài khoản trả **không còn khả dụng**, không coi là lỗi dữ liệu trống. Script hỏi email/mật khẩu ẩn, không in token và đăng xuất riêng phiên thử của nó khi kết thúc.

### 4. Đánh dấu và đọc lại

```powershell
.\scripts\Try-NotificationReadStates.ps1 -Mode MarkRead -SourceId 'UUID-BAI-TAP'
.\scripts\Try-NotificationReadStates.ps1 -Mode Query -SourceId 'UUID-BAI-TAP'
```

Cả hai lần hiện **Đã đọc** và `readAt`. Chạy MarkRead lần nữa phải giữ cùng `readAt`. Đóng/mở lại terminal hoặc khởi động lại backend rồi Query vẫn **Đã đọc**. Đây là kiểm tra API/database; F5 frontend chưa dùng trạng thái này trước 7B.2.

### 5. Đổi deadline rồi đối chiếu

Mở bài thử trong app và sửa deadline, lưu thành công. Chạy Query lại: **Chưa đọc**, `revision` mới và `readAt:null`. MarkRead lần nữa thì nhận thời điểm đọc mới. Chạy Query bằng tài khoản khác: **không còn khả dụng**, không thấy trạng thái/thời điểm đọc của tài khoản gốc.

Muốn thử **409** trong IntelliJ: giữ revision query cũ, sửa deadline qua app/API rồi PUT bằng revision cũ trong file `.http`; phải trả `NOTIFICATION_REVISION_CONFLICT`. Script MarkRead tự query trước mỗi lượt nên không cố tạo lỗi stale; không tự đổi revision/gửi lại sau conflict.

### Lịch thi và từng buổi học

```powershell
.\scripts\Try-NotificationReadStates.ps1 -Mode Query -Kind EXAM -SourceId 'UUID-LICH-THI'
.\scripts\Try-NotificationReadStates.ps1 -Mode MarkRead -Kind CLASS -SourceId 'UUID-CHUOI-LICH' -OccurrenceDate '2026-11-02'
```

CLASS cần ngày thật thuộc chuỗi, đúng thứ và chưa kết thúc. EXAM cần bật nhắc và chưa kết thúc. Không gửi OccurrenceDate cho bài tập/lịch thi. `available:true` chỉ là nguồn hợp lệ, không thay bộ lọc cửa sổ nhắc của inbox.

## Nghiệm thu

**Báo cáo cuối: 761 test backend đều đạt, TypeScript và 594 test frontend hồi quy đạt; không lỗi/bỏ qua trong các báo cáo cuối.** Lượt chạy toàn bộ 761 test có một timeout khi đăng ký tài khoản thử (trước khi gọi API thông báo); đã chạy lại 51 test gồm NotificationRead, Foundation và SessionRestart bằng Maven verify, tất cả đạt và đóng gói JAR thành công. Không coi lượt full có timeout là một lượt full xanh; số 761 là tổng các báo cáo từng nhóm sau khi chạy lại. Test nền tảng đã cập nhật kỳ vọng migration V12.

38 test mới: 37 HTTP/PostgreSQL/PowerShell và một nâng V11 → V12; mở rộng test restart hiện có để kiểm tra biên nhận giữ nguyên sau khi đóng/mở toàn bộ backend. Các trường hợp gồm:

- Query rỗng/không ghi, revision opaque, không lộ nội dung, thứ tự kết quả và tối đa 200 mục.
- Lưu bằng kết nối DB độc lập/đăng nhập mới, PUT lặp giữ readAt, source/metadata basis.
- Sửa deadline qua API thật → chưa đọc/409; hoàn thành/hết giờ/tắt nhắc → không khả dụng.
- Các ngày học độc lập, sửa/nghỉ một buổi qua API, không lan trạng thái đọc sang buổi khác.
- Đọc tất cả chỉ đúng các mục đã gửi; một lỗi không ghi một phần; hai lượt PUT đồng thời chỉ một biên nhận.
- PUT chờ khóa thay đổi học tập rồi phát hiện revision mới; owner A/B, ID thiếu/foreign giống nhau.
- FK/CHECK/unique, xóa nguồn qua API dọn đúng biên nhận; migration không đổi dữ liệu cũ, chạy lại không lặp.
- Windows PowerShell 5.1 Query/MarkRead/lỗi, UTF-8 và chỉ thu hồi phiên script.

Schema `backend_it_<UUID>` của tests tự dọn; không reset/seed database người dùng. Không thêm dependency hoặc đổi frontend. Không coi kiểm tra API là đã nghiệm thu giao diện thông báo.

## Tiếp theo

- **7B.2:** nối UI với query/PUT, đối chiếu basis với nội dung đã hiển thị, giữ qua F5/đổi tab/tài khoản, lỗi/retry; chỉ đánh dấu đúng tập và revision người dùng đã thấy.
- **7B.3:** nghiệm thu UI liên thông deadline/lịch học/lịch thi, mục bị hoàn thành/hủy/xóa, hai tài khoản, nhiều tab và restart.

Commit đề xuất:

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git add .
git commit -m "Lưu trạng thái đã đọc thông báo theo tài khoản"
git push origin main
```

Chưa tự commit hoặc push.
