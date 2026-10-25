# 4H.2C.2 — Nhắc lịch thi trong chuông

## Phạm vi hoàn thành

- Đọc lịch thi **toàn tài khoản** từ API, không phụ thuộc học kỳ đang chọn trên Dashboard hoặc Lịch thi. Tên/mã môn, học kỳ/năm học và chi tiết thi dùng ID liên kết đã lưu.
- Một thẻ cho mỗi kỳ thi. Xuất hiện từ mốc đầu tiên đã tới, tiếp tục hiện đến trước giờ kết thúc. Mốc 0 là đúng giờ bắt đầu; tắt nhắc hoặc xóa lịch thì bỏ thẻ.
- Nếu có nhiều mốc, thẻ hiển thị **mốc vừa tới gần nhất**. Ví dụ `[1440,180,45,0]`: đến trước 1 ngày có thẻ; trước 3 giờ, 45 phút và đúng giờ thì cập nhật cùng thẻ và hiện chưa đọc lại. Không nhân thành bốn thẻ cùng kỳ thi.
- So thời điểm UTC để xét mốc; ngày/giờ trên thẻ theo zone của kỳ thi, gồm DST. Môn/học kỳ không được lấy từ tên hoặc dữ liệu mẫu.
- Mở nhắc thi đánh dấu đã đọc và GET chi tiết mới nhất, dùng chung form sửa/xóa. Back về chuông giữ bộ lọc; X đóng luồng. Thông báo đang mở không tự đóng đột ngột khi tắt nhắc hoặc tới giờ kết thúc; chi tiết tự xử lý 404 nếu lịch đã bị xóa.
- Sửa ngày/giờ/phòng/loại/hình thức/zone hoặc mốc nhắc cập nhật thẻ và hiện chưa đọc lại. Đếm ngược từng phút, reload, version hoặc ghi chú không hiện trong thẻ không tạo chưa đọc giả.
- Lịch học và lịch thi được xác nhận riêng: một nguồn lỗi không che các thẻ đã xác nhận từ nguồn khác. Chuông hiện `…` khi thiếu dữ liệu, khóa Đánh dấu tất cả và không báo trống giả. Dấu đọc của nguồn tải lỗi được giữ qua thử lại/restart; chỉ dọn khi đã xác nhận thẻ không còn cần nhắc.
- Làm mới khi mở chuông/bấm tải lại, trở lại tab/foreground và sau thao tác ghi lịch thi. Không gọi thao tác ghi từ bộ đọc thông báo.

**Đây là nhắc việc trong app**, chưa gửi push/chuông hệ điều hành hay chạy lịch ở máy chủ. Dấu đã đọc giữ trong phiên app; F5/đăng nhập lại bắt đầu phiên đọc mới như 4G.2. Không thêm backend/migration/dependency. 2C.3B nghiệm thu điện thoại thật vẫn đang hoãn.

## Chạy

```powershell
# Terminal 1
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

```powershell
# Terminal 2
cd 'D:\Video OBS\QuanLyHocTap'
npx expo start --web --port 8092
```

Mở http://localhost:8092 và đăng nhập. Nhắc việc tự xét lại theo đồng hồ từng phút và khi tải lại.

## Test một vòng

1. **Nhắc sớm:** thêm lịch thi bắt đầu sau khoảng 30 phút, kết thúc cùng ngày, không trùng lịch khác. Bật nhắc 45 phút. Mở chuông: có đúng một thẻ, đúng môn/học kỳ/phòng và ghi Mốc nhắc trước 45 phút.
2. **Không phụ thuộc kỳ:** để Dashboard ở học kỳ 1; tạo kỳ thi thuộc môn kỳ 2 tới mốc nhắc. Chuông vẫn có thẻ của kỳ 2 và mở đúng kỳ thi đó.
3. **Đã đọc:** mở một thẻ rồi Back hoặc bấm nút đánh dấu đã đọc. Tải lại nhắc việc: thẻ vẫn đã đọc. Mở chuông không tự đọc tất cả. Thử bộ lọc Chưa đọc và nút Đánh dấu tất cả.
4. **Sửa:** mở thẻ → Chỉnh sửa hoặc xóa lịch thi → đổi phòng rồi lưu → Back. Thẻ đổi phòng và hiện chưa đọc. Sửa giờ sang ngoài khoảng nhắc: thẻ biến mất cho đến khi tới mốc mới. Chỉ sửa ghi chú không hiện trên thẻ thì dấu đọc được giữ.
5. **0 phút:** tạo lịch bắt đầu ở phút kế tiếp, chỉ chọn Đúng giờ bắt đầu. Trước giờ không có thẻ; đến giờ có thẻ Đang thi. Chờ qua giờ kết thúc: thẻ tự biến mất. Chọn khung giờ trống để tránh backend chặn trùng.
6. **Nhiều mốc:** với lịch sắp bắt đầu, chọn 2 phút, 1 phút và 0. Mỗi mốc vừa tới chỉ cập nhật cùng thẻ; nếu đã đọc ở mốc trước thì đến mốc mới sẽ hiện chưa đọc. Đếm ngược giữa hai mốc không đổi dấu đọc.
7. **Tắt/xóa:** tắt nhắc rồi lưu: thẻ của kỳ thi đó biến mất, lịch học và các kỳ thi khác giữ nguyên. Xóa một kỳ thi thử: thẻ bị bỏ; khi đọc thẻ cũ ở tab khác, API trả 404 thay vì mở dữ liệu mẫu.
8. **Mạng lỗi:** đánh dấu các thẻ hiện tại đã đọc, tắt backend rồi bấm Tải lại nhắc việc. Phải thấy chưa xác nhận đủ, chuông `…`, không báo Chưa có nhắc việc. Chạy lại backend và tải lại: dữ liệu không đổi vẫn đã đọc.
9. **Đổi tài khoản:** tài khoản B chỉ có nhắc việc của B. Dấu đọc của A không dùng sang B.

## Xác minh

**139 test lịch thi (35 mới), 140 test lịch học hồi quy, TypeScript và export web qua.** Test mới bao gồm biên mốc/0 phút/kết thúc, nhiều mốc không trùng thẻ, read revision, đổi ngày/giờ, lịch tắt/xóa, khác học kỳ, UTC/DST/đổi ngày, thiếu danh mục, nguồn lỗi một phần và giữ/dọn receipts theo nguồn.

Browser với API/PostgreSQL thật dùng schema và tài khoản QA riêng: mốc 0 phút ở kỳ khác, mở chi tiết, giữ đã đọc qua reload, sửa phòng, đổi giờ/mốc, version/ghi chú không hiển thị, tắt nhắc, xóa lịch, giữ nhắc lịch học, đánh dấu tất cả, bộ lọc Chưa đọc khi Back, tự bỏ thẻ đúng giờ kết thúc, lỗi mạng/restart và hai tài khoản tách biệt. Đã xem chuông 320/390px, ảnh 390px được lưu; dữ liệu QA được dọn sau kiểm tra. Native/OS notifications không thuộc nghiệm thu đợt này.

```powershell
npm run test:exams
npm run test:schedule
npm run typecheck
```

Tên commit: **Đồng bộ nhắc việc lịch thi với dữ liệu tài khoản**. Chưa tự commit/push.
