# 8A.3C — Kiểm tra liên thông kế hoạch học

Ngày kiểm tra: **01/11/2026**. Phần kiểm thử tự động frontend → HTTP → Spring Boot → PostgreSQL đã đạt. Đã sửa lỗi danh sách có thể dùng kết quả GET bắt đầu trước lúc lưu kế hoạch. **Chưa chốt nghiệm thu UI trực tiếp trong đợt này**: cả công cụ trình duyệt và công cụ dự phòng đều lỗi khởi tạo `failed to write kernel assets: The system cannot find the path specified`. Không gọi kiểm thử Manager/API là thao tác UI; ảnh và kết quả UI 8A.3B thuộc lần kiểm tra trước.

## Bổ sung kết quả người dùng kiểm tra — 05/11/2026

**Test 2 đạt ở nhánh chặn trên UI.** Người dùng thực hiện hướng dẫn giữ đề xuất ở tab A, đổi deadline ở tab B rồi gửi hai ảnh: cảnh báo dữ liệu môn/lịch/mục tiêu đã cập nhật, giữ bản cũ để xem và yêu cầu tạo lại; nút Lưu các buổi đã chọn bị khóa. Đây là kết quả đúng khi frontend phát hiện nguồn đổi trước POST. Không khẳng định ảnh này chứng minh một POST bị 409 hoặc đã đối chiếu DB.

Ảnh Test 1 trước đó cho thấy buổi TEST LƯU RỒI ĐÓNG, 19:00–19:45, 45 phút, trạng thái Đã lên lịch đã hiển thị trong danh sách. Ảnh không bao gồm ngày/bộ lọc hoặc thao tác đóng ×, nên chỉ ghi nhận phần hiển thị buổi. Các mục UI chưa được xác nhận vẫn giữ mở; chưa chốt toàn bộ 8A.3C.

**Test 3 — phần xóa rồi F5 đạt theo xác nhận người dùng ngày 05/11/2026.** Ảnh trước đó hiển thị tên “Test 3 đã sửa” ở ngày 06/11/2026, bộ lọc Tất cả, 19:00–19:45 và thông báo đã xóa khỏi tài khoản. Sau hướng dẫn tải lại trang, chọn lại đúng ngày và bộ lọc, người dùng xác nhận “mình test rồi không còn xuất hiện”. Ghi nhận buổi đã xóa không xuất hiện lại sau F5. Phần đổi tên đã thấy trên UI; chưa có xác nhận riêng tên mới giữ sau F5. Đây là kết quả người dùng thao tác, không phải agent đã điều khiển trình duyệt. Không chạy thêm test hoặc thay mã trong lần cập nhật tài liệu này.

## Đã sửa

Khi app đang tải danh sách Tự học, người dùng có thể lưu một kế hoạch trước lúc GET cũ trả về. Trước đây `reload()` gộp với lượt GET đang chạy, nên nút Xem lịch tự học có thể được bật với dữ liệu cũ, chưa có buổi vừa lưu.

Thêm `StudyManager.reloadFresh()`: đợi lượt GET cũ kết thúc (kể cả lỗi), rồi đọc lại. Màn biên nhận chỉ bật xem lịch khi lần đọc mới thành công. GET mới lỗi vẫn giữ xác nhận **đã lưu**, cho tải lại; không gửi lại POST hoặc chèn biên nhận lịch sử vào danh sách hiện tại. Khi owner cũ đã bị hủy, không phát sinh GET mới cho owner đó.

Không đổi backend nghiệp vụ, migration, quy tắc tính điểm hay dependency. Các buổi mới là **đã lên lịch**, chưa phải thời gian đã học hoặc bài đã hoàn thành. Bộ xếp lịch vẫn theo quy tắc, chưa gọi dịch vụ AI.

## Kết quả tự động

| Kiểm tra | Kết quả |
| --- | --- |
| TypeScript | Đạt |
| Frontend toàn bộ `tests/*.test.cjs` | **706/706**, gồm 4 hồi quy mới về tải danh sách |
| Liên thông frontend adapter/Manager + HTTP + PostgreSQL | **10/10** riêng, không cộng vào 706 |
| Backend liên quan: Engine/Preview/Apply | **80/80**, không lỗi/bỏ qua; không chạy lại full 844 |
| Expo export web bình thường | Đạt, `.expo/qa8a3c-normal` |
| Quan sát DB của lượt liên thông | **31 buổi, 9 biên nhận, 11 tài khoản tổng hợp** |
| Dọn QA | Đã dừng backend riêng, xóa schema/JAR sao chép và tệp đối chiếu tạm; giữ PostgreSQL dùng chung |
| UI trực tiếp / điện thoại thật | Chưa kiểm tra trong đợt này |

10 ca liên thông dùng **chính parser, bộ dựng lệnh, API adapter và Manager của frontend**, không viết một bản thuật toán xếp lịch khác:

1. Preview 4 buổi → chỉnh buổi đầu còn 30 phút/đổi tên → bỏ buổi 4 → lưu 3 buổi/120 phút, thiếu 60; đọc lại đúng tên/phút/bài. Bài vẫn TODO; đề xuất sau tránh các buổi đã lưu.
2. Đổi deadline sau preview: toàn bộ bản cũ bị SOURCE_CHANGED, không lưu buổi nào; preview mới không xếp quá hạn mới.
3. Thêm lịch lớp thuộc môn/học kỳ khác sau preview: TIME_CONFLICT, không ghi một phần nhóm.
4. Backend commit thật nhưng bộ QA bỏ xác nhận: giữ lệnh ra tệp tạm, tạo lại Manager, GET biên nhận; không POST lần hai, vẫn 4 buổi. Đây là mô phỏng mất xác nhận, không phải thử mọi dạng mất mạng hoặc F5 bằng trình duyệt.
5. Lỗi trước khi POST tới backend: GET 404, người dùng chủ động retry cùng body/key, chỉ một nhóm được tạo.
6. Yêu cầu đầu còn chờ gửi, GET 404 rồi retry đồng thời cùng key: backend xử lý hai yêu cầu nhưng chỉ tạo 4 buổi; không dùng 404 để tạo mã mới. Ca này giữ yêu cầu trong adapter QA trước khi gửi, không tuyên bố mô phỏng mọi thứ tự hàng đợi mạng.
7. Sau lưu, sửa tên/hoàn thành một buổi và xóa buổi khác: biên nhận/replay vẫn là lịch sử 4 buổi, danh sách thật còn 3 và giữ sửa đổi; không phục hồi buổi đã xóa.
8. Hai tài khoản A/B: B không đọc biên nhận A hoặc thấy buổi A; cùng chuỗi UUID ở hai owner lưu độc lập.
9. Gắn kỳ thi: giữ cutoff và metadata thi, thiếu phút được báo đúng; không biến metadata thi thành liên kết bài tập.
10. Giữ phản hồi HTTP GET thật bắt đầu trước commit, Apply, rồi refresh: bắt buộc phát sinh GET mới và nhận đủ 4 buổi đã lưu.

Biên bản máy đọc: [study-plan-flow-8a3c.json](test-results/study-plan-flow-8a3c.json). Log cục bộ nằm trong `backend/.local/planflow8a3c-*.log`, Git bỏ qua; không đưa token/mật khẩu vào biên bản.

## Bạn kiểm tra một vòng trên app

Giữ hai terminal chạy như trước. Backend:

```text
powershell.exe -NoProfile -File "D:\Video OBS\QuanLyHocTap\backend\scripts\Run-Local.ps1"
```

Frontend, tại `D:\Video OBS\QuanLyHocTap\frontend`:

```text
cd 'D:\Video OBS\QuanLyHocTap\frontend'
npx expo start --web --port 8092
```

Mở `http://localhost:8092`. Dùng tài khoản thử có môn học và bài chưa hoàn thành. Để dễ đối chiếu, tạo mục tiêu/tên buổi riêng, ví dụ **TEST 8A3C**; kiểm tra lịch rảnh trước. Đây là lưu thật vào tài khoản bạn đăng nhập, không phải dữ liệu mẫu.

1. **Trợ lý AI → Tìm lịch trống**. Chọn môn, mục tiêu tự học, từ ngày mai đến sáu ngày sau, 19:00–21:00, cả tuần, 180 phút, mỗi buổi 45, nghỉ 10. Với lịch đủ trống, có 4 buổi. Nếu ít hơn, kiểm tra lịch bận/phần phút thiếu thay vì cố yêu cầu đúng 4.
2. Đổi tên buổi đầu thành TEST 8A3C, giữ 45 phút; bỏ chọn buổi 4. Trường hợp đủ 4 ban đầu: **đang chọn 3 buổi/135 phút, thiếu 45**. Nhập 241 phút phải khóa lưu; đổi về 45 và sửa hết lỗi trước khi tiếp tục.
3. **Lưu các buổi đã chọn**. Biên nhận phải hiện 3 buổi/135 phút, thiếu 45. Không bấm tạo kế hoạch mới để thử lại một lần chưa rõ kết quả.
4. **F5 khi còn biên nhận** → mở lại Trợ lý/Xem kế hoạch: thấy đúng biên nhận cũ. **Xem lịch tự học** mở ngày có buổi đầu; kiểm tra tên, giờ, số buổi từng ngày. Không nhầm số buổi trong một ngày với tổng nhiều ngày.
5. Sửa tên một buổi trong Tự học; tải lại, tên mới còn. Nếu thử xóa, chỉ xóa buổi TEST của chính bạn. Kiểm tra lại danh sách không làm buổi đã xóa xuất hiện lại.
6. Lập đề xuất mới: phải tránh các giờ đã lưu. Buổi đã lên lịch không tự tăng số phút Pomodoro đã hoàn thành hoặc tự đánh dấu bài xong.
7. Để thử nguồn đổi bằng hai tab: tab A xem đề xuất gắn bài; tab B đăng nhập cùng tài khoản, sửa deadline/ghi chú bài và lưu. Trở về A duyệt bản cũ: bị từ chối/cảnh báo nguồn đổi, không lưu nhóm dở. Tải danh mục và tạo lại đề xuất, xem rồi mới duyệt. Nếu app đã tự đọc nguồn mới và khóa nút trước POST, đó cũng là kết quả đúng.
8. Đăng xuất → tài khoản B: không thấy buổi A. Đăng nhập lại A: các buổi thật vẫn còn. Bản đối chiếu web chỉ giữ theo tab/endpoint/tài khoản; đóng tab hoặc xóa dữ liệu duyệt có thể mất mã.

Phần lỗi sau commit và retry đồng thời có bộ tự động riêng bên dưới; không cần phá kết nối đang dùng hoặc xóa database để thử. Sau khi các bước UI trên đạt, mới đánh dấu mục UI cuối trong checklist và chốt 8A.3 trên web. Native, chạy nền và APK vẫn là phạm vi riêng.

## Chạy lại bộ liên thông tự động

Không cần nhập tài khoản của bạn hoặc chạy frontend. Từ bất kỳ terminal nào:

```text
powershell.exe -NoProfile -File "D:\Video OBS\QuanLyHocTap\backend\scripts\Test-StudyPlanFlow.ps1"
```

Script dùng **JAR backend đã đóng gói hiện có** trong `backend/target`; nếu vừa sửa backend, chạy `backend/scripts/Test-Local.ps1` để kiểm thử/đóng gói lại trước. Cần Node/dependency frontend, Java 21 và database/khóa cục bộ hiện có. Script có thể mở PostgreSQL dùng chung nếu đang dừng, không tắt nó sau khi xong.

Runner tạo schema `qa_planflow8a3c_<UUID>` mới, khởi động một bản backend trên cổng loopback ngẫu nhiên, tạo tài khoản tổng hợp chỉ ở schema đó. Không mượn backend 8080, không ghi vào bảng người dùng hiện tại. Sau kiểm tra, dừng đúng process mang tên schema, chỉ DROP schema có tiền tố/UUID hợp lệ và xóa bản JAR sao chép. Tệp đối chiếu tạm không chứa credential. Không tự xóa database hoặc tải/đưa dữ liệu người dùng ra ngoài.

Phần test này nằm trong `tests/integration/` để `node --test tests/*.test.cjs` thường ngày không tự mở kết nối hoặc tạo tài khoản. Chạy trực tiếp thiếu ngữ cảnh QA bị từ chối.

Tên commit: **Kiểm tra và hoàn thiện luồng lưu kế hoạch học**. Chưa tự commit/push.
