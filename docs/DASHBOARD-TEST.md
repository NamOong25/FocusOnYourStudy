# Kiểm tra một vòng từ dữ liệu trống

Project: `D:\Video OBS\QuanLyHocTap`. Đợt UI 3D: Dashboard theo học kỳ.

## Chuẩn bị

Mở project và chạy `npx expo start --port 8092`, mở bản web. Tải lại trang **trước khi bắt đầu** rồi chọn **Bắt đầu với dữ liệu trống**. Chỉ tải lại nếu bạn muốn bỏ dữ liệu thử của phiên hiện tại. Trong lượt kiểm tra, không F5/tắt trang vì dữ liệu đang nằm trong bộ nhớ, chưa có backend hoặc lưu lâu dài.

## 1. Tạo học kỳ

Trang chủ → **Tạo học kỳ đầu tiên** → ở màn Môn & học kỳ bấm **Tạo học kỳ đầu tiên** để mở form.

- Chọn năm học **2026 – 2027**, **Học kỳ 1**, trạng thái **Đang học**.
- Bấm **Lưu học kỳ**.
- Kỳ vọng: có thẻ Học kỳ 1 với đúng năm học; danh sách môn đang trống.

## 2. Thêm môn

Bấm **Thêm môn đầu tiên**, nhập:

| Ô | Giá trị thử |
| --- | --- |
| Tên môn học | Cơ sở dữ liệu kiểm thử |
| Mã môn học | TEST101 |
| Số tín chỉ | 3 |
| Giảng viên | Giảng viên kiểm thử |
| Phòng học thường dùng | A101 |

Giữ đúng Học kỳ 1 vừa tạo → **Lưu môn học**. Kỳ vọng: mở Chi tiết môn học, đúng mã môn và 3 tín chỉ.

## 3. Thêm lịch học

Trong chi tiết môn → tab **Lịch học** → nút **+** có nhãn Thêm ca học cho môn.

- Chọn thứ của **hôm nay**; khoảng ngày áp dụng bao gồm hôm nay.
- Chọn **08:00 – 10:00**, phòng **A101**, lưu lịch.
- Kỳ vọng: xuất hiện một ca học; giảng viên/phòng được lấy từ môn. Một ca đã kết thúc hôm nay vẫn xuất hiện trên Dashboard với nhãn Đã học.

## 4. Thêm bài tập

Trong chi tiết môn → **Bài tập** → **+** Thêm bài tập cho môn.

- Tên: **Bài kiểm thử Dashboard**.
- Môn đã được chọn sẵn; chọn hạn nộp **ngày mai** bằng lịch.
- Giữ trạng thái **Chưa làm** → **Tạo bài tập**.
- Kỳ vọng: bài tập gắn đúng môn, ngày hiển thị khớp ngày vừa chọn.

## 5. Nhập điểm

Trong chi tiết môn → **Điểm số** → **Nhập / chỉnh sửa điểm**.

- Giữ loại học phần **Lý thuyết** và thang quy đổi IUH mặc định.
- Thường kỳ **8**, giữa kỳ **8**, cuối kỳ **8**; trọng số **20/30/50**.
- **Lưu điểm môn học**.
- Kỳ vọng: tổng kết **8,0**, điểm chữ **B+**, thang 4 là **3,5**, trạng thái Đạt môn.

## 6. Về Dashboard

Quay lại/đóng Chi tiết môn → bấm tab **Trang chủ**. Bấm bộ chọn học kỳ nếu cần, chọn **Học kỳ 1, 2026 – 2027**.

| Nội dung | Kết quả cần thấy |
| --- | --- |
| Học kỳ | Học kỳ 1, năm học 2026 – 2027 |
| Tổng quan | 1 môn, 3 tín chỉ, 1 bài chưa hoàn thành |
| GPA học kỳ | **3.50 /4**, mô phỏng từ môn đã nhập |
| Bài tập hoàn tất | **0%**, **0/1 bài tập** |
| Lịch học hôm nay | Môn TEST101, 08:00 – 10:00, phòng A101 |
| Việc cần xử lý / 7 ngày tới | Có Bài kiểm thử Dashboard |
| Lịch thi | Chưa có lịch thi sắp tới |

Bấm thẻ ca học hoặc bài tập: mở đúng chi tiết, **Quay lại** trở về Dashboard. Bấm thẻ GPA: mở danh sách điểm của kỳ đang xem, bấm môn để xem/sửa điểm.

## 7. Thử lịch thi gần nhất

Trên Dashboard → **Thêm lịch thi cho học kỳ này**.

- Môn được chọn sẵn thuộc học kỳ đang xem.
- Chọn ngày mai, **14:00 – 16:00**, phòng **B202**, loại Cuối kỳ → **Thêm lịch thi**.
- Quay lại Dashboard: thẻ gần nhất có môn, loại/hình thức thi, ngày/giờ, phòng và đếm ngược.
- Bấm thẻ → chỉnh sửa phòng thành **C303** → lưu → quay lại: thẻ phải cập nhật C303.
- Không tạo lịch trùng giờ một ca học/buổi tự học; nếu trùng, form sẽ báo để bạn chọn khung khác.

## 8. Thử cập nhật qua lại

1. Mở bài tập từ Dashboard → Chỉnh sửa bài tập → đổi hạn sang hôm qua → lưu → quay lại. Bộ lọc **Quá hạn** phải có bài và cảnh báo đỏ.
2. Mở bài → chọn **Hoàn thành** → quay lại: tiến độ **100%**, **1/1 bài tập**; bài biến mất khỏi danh sách cần làm/quá hạn.
3. Bấm GPA → chọn môn → sửa cuối kỳ thành **2,9** → lưu → quay về Dashboard: GPA **0.00**, hiện **Môn học cần chú ý**. Bấm cảnh báo phải mở đúng bảng điểm.
4. Sửa cuối kỳ lại **8** → lưu: GPA về **3.50**, cảnh báo biến mất.
5. Xóa điểm trong form rồi **Lưu**: GPA trở thành **—**, trạng thái Chưa đủ dữ liệu; không tự coi điểm trống là 0. Có thể nhập lại ba điểm 8 để tiếp tục.

## 9. Kiểm tra không trộn học kỳ

Từ bộ chọn Dashboard → **Quản lý học kỳ và môn** → **+ Thêm** để tạo Học kỳ 2 cùng năm. Thêm một môn với **cùng tên/mã TEST101**, nhưng chưa nhập lịch, bài hay điểm. Sau đó quay lại Dashboard và chọn Học kỳ 2.

- GPA **—**, tiến độ **—**, số bài **0/0**.
- Không xuất hiện ca học, bài tập, lịch thi hoặc điểm của Học kỳ 1.
- Đổi lại Học kỳ 1: dữ liệu thử vẫn còn, đúng các thay đổi đã lưu.
- Đổi tab rồi về Trang chủ: giữ kỳ đã chọn.
- Kỳ chưa có môn: hiện hướng dẫn thêm môn, không hiện các số liệu của kỳ khác. Nút **Thêm môn cho học kỳ** mở quản lý đúng kỳ đó.

## Phạm vi đã kiểm tra tự động

- `node docs/qa-dashboard-unit.cjs`: 28 kiểm tra lọc học kỳ, quá hạn/7 ngày, chuyển ngày, thi đã kết thúc/đang diễn ra, ca nghỉ/đổi và GPA dùng chung.
- `node docs/qa-dashboard.cjs`: tạo dữ liệu từ UI, sửa bài/điểm/lịch thi, mở chi tiết và quay lại, chuyển kỳ và bố cục 320/390/430/1280px.
- Các bài trình duyệt dùng Playwright + Chrome qua biến `PLAYWRIGHT_MODULE`, `CHROME_PATH` giống các đợt trước. Kết quả/ảnh nằm trong `.expo/qa-dashboard/`, không đưa vào Git.

Các thẻ lấy từ dữ liệu đã tạo trong phiên, chưa phải dữ liệu API. GPA là mô phỏng theo quy tắc đang chọn. Chưa nghiệm thu thiết bị thật, thông báo đẩy, đăng nhập/lưu/đồng bộ hoặc biểu đồ thống kê thật; đợt này chỉ hoàn thiện Dashboard.
