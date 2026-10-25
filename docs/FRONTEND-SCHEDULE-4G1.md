# 4G.1 — Lịch thật trên Trang chủ và chi tiết môn

Đã nối dữ liệu lịch học đã lưu vào hai vị trí này. Không thay backend/migration, không đưa lịch RAM vào tài khoản và không làm phần nhắc việc 4G.2 trong đợt này.

## Chạy ứng dụng

Terminal backend, trong VS Code hoặc IntelliJ:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Terminal frontend:

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npx expo start --web --port 8092
```

Mở http://localhost:8092 và đăng nhập. Nếu cả hai terminal đang chạy đúng cấu hình thì dùng tiếp, chỉ cần tải lại trang sau khi cập nhật code. Không cần tạo lại database.

## Cách hiểu giao diện

| Vị trí | Dữ liệu hiển thị |
| --- | --- |
| Trang chủ → Buổi học gần nhất | Buổi đang diễn ra hoặc buổi sắp bắt đầu gần nhất của học kỳ **đang chọn trên Trang chủ**. Không lấy buổi đã kết thúc hoặc báo nghỉ. |
| Trang chủ → Lịch học hôm nay | Những buổi giao với ngày hôm nay theo giờ thiết bị; gồm đã kết thúc, đang học và sắp học. Buổi báo nghỉ không nằm trong danh sách. |
| Chi tiết môn → Tổng quan | Số buổi đang học/sắp tới và buổi gần nhất của đúng môn. Đây là số buổi còn lại trong các chuỗi đã lưu, **không phải số ca cố định mỗi tuần**. |
| Chi tiết môn → Lịch học | Tối đa 5 buổi đang học/sắp tới, đúng môn, theo thời gian; có số tổng và nút mở Thời khóa biểu. |

Giờ, phòng, giảng viên và lý do của buổi đã đổi lấy từ ngoại lệ đã lưu. Bỏ thay đổi/khôi phục sẽ dùng lịch gốc hiện tại.

Nếu lịch dùng múi giờ khác thiết bị, thẻ chính hiển thị ngày/giờ thiết bị và có thêm dòng **Giờ lịch gốc**. Bấm thẻ sẽ mở **ngày gốc của buổi** trong Thời khóa biểu, nơi ghi rõ múi giờ của lịch. Ví dụ buổi tối 24/10 ở New York có thể xuất hiện trong sáng 25/10 trên thiết bị tại Việt Nam.

## Một vòng test chính

### 1. Có lịch và xem Trang chủ

1. Dùng một tài khoản có học kỳ và môn học.
2. Vào **Lịch học → Thời khóa biểu → Thêm chuỗi lịch học**. Chọn ngày hôm nay, giờ chưa tới và không trùng lịch/tự học; cho chuỗi lặp sang tuần sau.
3. Về **Trang chủ**, chọn **đúng học kỳ** ở bộ chọn phía trên. Bộ chọn này độc lập với học kỳ đang xem ở Thời khóa biểu.
4. Buổi xuất hiện ở **Buổi học gần nhất** và **Lịch học hôm nay**. Nếu có buổi khác bắt đầu trước thì thẻ gần nhất phải chọn buổi đó.
5. Bấm thẻ: Thời khóa biểu mở đúng học kỳ và ngày. Mở thẻ buổi học tại đó để xem/sửa chi tiết.

Nếu lúc thử không còn giờ trống trong ngày, tạo buổi ngày mai: phải có ở thẻ gần nhất, không nằm trong danh sách hôm nay.

### 2. Đổi giờ, phòng và giảng viên

1. Mở buổi vừa tạo → **Đổi buổi này**.
2. Bật các thông tin riêng muốn đổi, chọn giờ khác còn trống; nhập phòng/giảng viên mới rồi lưu.
3. Về Trang chủ, không cần F5: giờ/phòng/giảng viên mới và nhãn **Đã điều chỉnh** phải cập nhật.
4. Nếu giờ đổi khiến buổi khác trở thành gần nhất, thẻ gần nhất phải đổi theo. Nếu chuyển giờ thành một buổi đã kết thúc, buổi không còn được đề xuất là sắp học.

### 3. Nghỉ và khôi phục

1. Báo nghỉ đúng một ngày bằng **Nghỉ buổi này**.
2. Về Trang chủ: buổi đó không xuất hiện trong hôm nay hoặc thẻ gần nhất. Các tuần khác vẫn được xét; nếu còn buổi tuần sau thì có thể được chọn làm gần nhất.
3. Vào Thời khóa biểu, chọn lại ngày vừa báo nghỉ → **Khôi phục buổi này**.
4. Về Trang chủ: buổi trở lại theo lịch gốc hiện tại nếu vẫn đang diễn ra/sắp học. Nếu giờ gốc bị chiếm, thao tác khôi phục bị chặn như đợt 4F.3, không tự coi là đã khôi phục.

### 4. Chi tiết môn

1. **Lịch học → Môn & học kỳ → mở môn → Tổng quan**.
2. Đọc số **buổi đang học/sắp tới** và thẻ gần nhất. Không cộng lịch của môn khác trong cùng học kỳ.
3. Chọn phần **Lịch học**: có danh sách tối đa 5 buổi và số tổng khi còn nhiều hơn. Số tổng lấy từ toàn bộ phần lịch còn lại đã lưu, không chỉ 5 thẻ đang hiện.
4. Bấm một thẻ tuần sau: phải mở đúng ngày tuần sau trong Thời khóa biểu.
5. Sửa/xóa cả chuỗi rồi quay lại: số buổi và thẻ phải thay đổi. Xóa hết chuỗi của môn thì có số 0 và trạng thái chưa có lịch, không xóa môn học.

### 5. Học kỳ xa, trống và F5

- Chọn học kỳ có lịch bắt đầu sau hơn 3 tháng: vẫn tìm thấy buổi gần nhất, không kết luận không có lịch vì trang hiện tại chỉ xem 1 tuần/tháng.
- Chọn học kỳ có môn nhưng chưa tạo lịch: hiển thị chưa có lịch. Nếu có chuỗi nhưng mọi buổi đã kết thúc/được nghỉ thì thông báo không còn buổi đang học/sắp tới, khác với chưa tạo lịch.
- F5 rồi chọn lại học kỳ nếu bộ chọn về mặc định: dữ liệu vẫn đọc được từ tài khoản.
- Đăng nhập tài khoản khác: không hiện tên môn, phòng hoặc lịch của tài khoản cũ.

## Mất mạng, tải lại và thay đổi ở nơi khác

- **Tải lại lịch học** trên Trang chủ hoặc **Tải lại lịch môn** trong chi tiết môn đọc lại lịch và danh sách môn.
- Lần tải đầu thất bại: có thông báo lỗi/thử lại, không hiện dữ liệu trống như thể đọc thành công.
- Tải lại thất bại sau khi đã đọc được: giữ bản gần nhất, ghi rõ chưa xác nhận là lịch hiện tại. Số buổi trong chi tiết môn hiện **—**, không tự tính thành 0. Chỉ kết luận trống khi đã tải xong thành công.
- Đổi học kỳ khi request cũ chưa trả: ẩn dữ liệu phạm vi cũ và bỏ phản hồi đến muộn.
- Sau thao tác ghi lịch trong app, dữ liệu tổng hợp bị vô hiệu hóa và được đọc lại khi mở màn tương ứng. Cả thao tác chưa rõ kết quả cũng khiến tổng hợp cần đọc lại; không tự gửi lại thao tác ghi.
- Khi quay lại màn/cửa sổ ứng dụng, app tải lại để nhận sửa đổi từ nơi khác. Nếu hai cửa sổ vẫn cùng mở, dùng nút tải lại để kiểm tra ngay. Đây không phải đồng bộ trực tiếp qua WebSocket.
- Trạng thái đã kết thúc/đang học/sắp học cập nhật theo phút và khi quay về ứng dụng; đổi ngày sẽ đọc lại phần lịch phù hợp.

## Cách lấy dữ liệu

`features/schedule/overview/` là nguồn đọc riêng cho tổng hợp, không dùng các dòng trong trang Thời khóa biểu đang mở làm toàn bộ lịch.

1. Đọc danh sách chuỗi của học kỳ; chi tiết môn chỉ giữ chuỗi của đúng môn.
2. Tìm các khoảng ngày còn liên quan theo phạm vi chuỗi. Bao gồm hai ngày nguồn trước ngày thiết bị để không bỏ sót buổi khác múi giờ.
3. Gộp khoảng chồng nhau, bỏ qua khoảng trống giữa các chuỗi và chia request thành tối đa **92 ngày tính cả hai đầu**, theo giới hạn API có sẵn. Đọc hết các phần cần thiết, không dừng ở trang đầu.
4. Kiểm tra các buổi có đủ theo lịch lặp, không trùng/ngoài phạm vi/sai môn hoặc khác version. Đọc lại danh sách chuỗi để phát hiện thêm/xóa/sửa/ngoại lệ trong lúc tổng hợp.
5. Chỉ công bố ảnh dữ liệu khi mọi phần thành công và nhất quán. Lỗi một phần không trở thành kết quả trống hay danh sách một phần.
6. Dùng mốc UTC để sắp xếp và xét trạng thái, ngày thiết bị để chia hôm nay; không so sánh chuỗi giờ của hai múi giờ khác nhau.

`model.tsx` chỉ giữ dấu cần đọc lại và đích điều hướng tới ngày, không giữ một bản lịch backend trong mảng lịch mẫu. Thẻ dùng chung ở `overview/components/`, phần bố trí riêng ở `dashboard/components/HomeServerSchedule.tsx` và `academics/components/CourseServerSchedule.tsx`.

## Nghiệm thu

- **111 test lịch qua, gồm 30 test tổng hợp mới**: phạm vi xa/qua nhiều request, phạm vi môn, đủ buổi/cancel, bản chụp trước/sau khi sửa/thêm/xóa/khôi phục, phản hồi sai/thiếu, không công bố một phần, đổi phạm vi/revision/tài khoản, hủy phản hồi muộn, qua ngày, UTC và ngày DST dài 25 giờ.
- TypeScript và export web qua. Không đổi backend/migration nên không chạy lại 238 backend tests của các đợt trước.
- **19 nhóm thao tác browser với Spring Boot/PostgreSQL thật** trong schema QA riêng qua: hôm nay/gần nhất, đổi phòng/giảng viên, nghỉ/khôi phục, phạm vi/số buổi của môn, điều hướng ngày tương lai, học kỳ sau hơn 92 ngày, trống, F5, lỗi tải đầu/lỗi tải lại, số buổi chưa biết khi lỗi, phản hồi cũ khi đổi kỳ, thêm/sửa/xóa cả chuỗi, tài khoản B, ngày nguồn khác ngày thiết bị, đổi giờ thực tế và lịch 99 ngày đọc ba khoảng/đủ 16 buổi còn lại.
- Đã xem ảnh Trang chủ ở 320/390/430/1280px, chi tiết môn ở 320px. Kiểm tra điện thoại thật **2C.3B** vẫn đang hoãn theo yêu cầu trước đó.
- Dữ liệu thử nằm trong schema QA riêng, được dọn sau khi kiểm tra; không seed lịch/tài khoản mẫu vào database chính của bạn.

**4G.2 — Nhắc việc dùng lịch đã lưu** đã hoàn thành; xem `FRONTEND-SCHEDULE-4G2.md`. Lịch thi, điểm/GPA và Pomodoro vẫn theo các đợt backend riêng.
