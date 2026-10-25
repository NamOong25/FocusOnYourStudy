# 4H.2C.1 — Lịch thi thật trên Trang chủ và chi tiết môn

## Đã hoàn thành

- **Trang chủ:** đọc toàn bộ lịch thi của học kỳ đang chọn từ API, chọn kỳ thi đang diễn ra hoặc sắp tới gần nhất theo UTC. Bỏ lịch đã kết thúc; đếm ngược, ngày/giờ theo múi giờ nguồn, phòng, loại và hình thức thi. Nút xem tất cả mở danh sách đúng học kỳ; khi chưa có lịch sắp tới có nút thêm và chọn sẵn môn của kỳ đó.
- **Chi tiết môn → Tổng quan → Lịch thi của môn:** GET theo cả courseId và semesterId; lọc Sắp tới/Đã qua/Tất cả. Không nhầm môn trùng tên ở kỳ khác. Có mở chi tiết và thêm lịch cho môn.
- Hai nơi dùng chung chi tiết API và form thêm/sửa/xóa của 4H.2B. Quay lại cập nhật dữ liệu đã lưu; chi tiết môn giữ môn/học kỳ, bộ lọc lịch thi và vị trí cuộn. Xóa hoặc sửa ở nơi khác được đọc lại; 404 không cho sửa dữ liệu cũ.
- Tải/lỗi/thử lại/trống là các trạng thái riêng. Làm mới lỗi giữ bản của đúng phạm vi với cảnh báo; đổi học kỳ không hiển thị thẻ của kỳ cũ. Thiếu danh mục môn không gán nhầm tên hoặc kết luận trống. Cập nhật khi trở lại màn, quay lại tab, đưa app ra nền rồi mở lại và sau thao tác ghi.
- Không sao chép lịch thi API vào mảng RAM của bản xem trước. Tài khoản đổi thì dọn nguồn đọc; chế độ mẫu vẫn hoạt động riêng.

Không đổi backend/migration/dependency. **Nhắc việc lịch thi trong chuông là 4H.2C.2, chưa làm.** Chưa gửi thông báo hệ điều hành. Kiểm tra native trên máy thật 2C.3B vẫn để sau.

## Chạy

Giữ hai terminal như các đợt trước:

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

Mở http://localhost:8092, đăng nhập tài khoản có học kỳ và môn.

## Test nhanh một vòng

1. Vào Lịch học → Lịch thi, thêm hai lịch thi tương lai không trùng của một học kỳ. Về Trang chủ, chọn học kỳ đó. Thẻ **Lịch thi gần nhất** phải là kỳ thi chưa kết thúc có giờ bắt đầu sớm nhất. Một kỳ thi đang diễn ra được giữ đến đúng giờ kết thúc; sau đó chuyển sang kỳ thi tiếp theo.
2. Chạm thẻ → Chỉnh sửa hoặc xóa lịch thi → đổi phòng → lưu. Bấm Quay lại/Đóng về Trang chủ: phòng trên thẻ đổi theo. Thử F5, dữ liệu vẫn còn; bộ chọn trên Trang chủ mặc định về kỳ đang học sau F5 như trước.
3. Chọn học kỳ khác có môn cùng tên nhưng lịch khác. Thẻ phải đổi đúng ngày/phòng; học kỳ có môn nhưng chưa có kỳ thi thì hiển thị trạng thái trống, không lấy lịch của kỳ trước. Nút **Xem tất cả lịch thi của học kỳ** phải mở đúng kỳ vừa chọn.
4. Lịch học → Môn & học kỳ → mở môn → Tổng quan → kéo tới **Lịch thi của môn**. Kiểm tra ba bộ lọc, nhất là Đã qua. Chọn Tất cả → mở một lịch → sửa phòng → Quay lại: đúng môn, bộ lọc Tất cả còn chọn, phòng đã cập nhật. Nút thêm chọn sẵn môn đang xem.
5. Xóa một lịch thử từ chi tiết. Quay lại môn/Trang chủ: lịch biến mất, thẻ chọn lịch tiếp theo hoặc hiện trống nếu không còn lịch sắp tới. Nếu xóa bằng tab khác rồi chạm thẻ cũ trước khi cập nhật, chi tiết báo không còn tồn tại; quay lại cập nhật danh sách.
6. Tắt backend khi đang xem thẻ, bấm Cập nhật kỳ thi gần nhất: phải báo lỗi và đánh dấu bản cũ. Đổi học kỳ khi backend còn tắt: không hiện thẻ của kỳ trước và không báo trống như đã đọc thành công. Chạy backend lại rồi Thử lại: thẻ hiện đúng.
7. Đăng nhập tài khoản B: không được thấy lịch của A. Trạng thái đọc nhắc việc trong chuông sẽ nghiệm thu riêng ở 4H.2C.2.

## Đã xác minh

- **104 test lịch thi (20 mới)**: chọn gần nhất/đang diễn ra, đúng biên bắt đầu/kết thúc, thứ tự UTC khác zone/DST, tên môn trùng kỳ khác, danh mục thiếu/sai liên kết, tải/lỗi/bản cũ/trống, đếm ngược, phản hồi cũ khi đổi kỳ và dữ liệu xóa ở nơi khác; hồi quy bộ đọc/ghi 4H.2A/B.
- **140 test lịch học**, TypeScript và export web qua. Không đổi package-lock hoặc thêm thư viện.
- Browser với Spring Boot/PostgreSQL và schema QA riêng: thẻ đang diễn ra, mở/sửa từ Dashboard và môn, dữ liệu khớp hai nơi, giữ bộ lọc khi quay lại, đổi kỳ/cùng tên môn, nút xem tất cả, trạng thái trống/nút thêm chọn sẵn môn, xóa ở nơi khác/404, lỗi mạng cùng/khác phạm vi và thử lại sau restart, F5, đổi tài khoản. Đã xem ảnh Dashboard 320/390px và chi tiết môn 390px; không thấy lỗi console. Schema QA và token thử được dọn, dữ liệu người dùng không bị seed/reset.

```powershell
npm run test:exams
npm run test:schedule
npm run typecheck
```

Tên commit: **Đồng bộ lịch thi với Trang chủ và chi tiết môn**. Chưa tự commit/push.
