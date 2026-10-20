# Giao diện điểm IUH — đối chiếu K19

Đợt này chỉ sửa frontend trong `D:\Video OBS\QuanLyHocTap`. Dữ liệu vẫn ở bộ nhớ trong phiên, chưa có Spring Boot, lưu lâu dài hoặc kết nối bảng điểm IUH.

## Nguồn đã đọc

[Tài liệu Khoa Công nghệ Hóa học IUH, năm 2023](https://fce.iuh.edu.vn/wp-content/uploads/2023/10/2023_FCE_faculty_manual.pdf), mục 6, trang in 49–52 và 62 (trang PDF 55–58 và 68). Tài liệu này cùng thời điểm K19, dùng làm căn cứ cho các điều kiện điểm dưới đây; không khẳng định đã xác nhận mọi quy định riêng theo ngành/chương trình hoặc mọi sửa đổi về sau. Không tự lấy quy chế công bố năm 2025 làm mặc định cho K19.

| Nội dung | Cách thể hiện |
| --- | --- |
| Giữa kỳ bằng 0 | Cảnh báo đỏ không đủ điều kiện thi; không tự điền 0 cho cuối kỳ hoặc tổng kết chưa có. |
| Cuối kỳ lý thuyết dưới 3,0 | Tổng kết phần lý thuyết bằng cuối kỳ, xếp F; đủ 3,0 mới xét công thức bình thường. |
| Môn tính điểm chữ | Tổng kết làm tròn 1 chữ số, từ 4,0 đạt. 3,9 không đạt. |
| Lý thuyết | Trung bình thường kỳ 20%, giữa kỳ 30%, cuối kỳ 50%. Cột thường kỳ mặc định là **trung bình đã công bố**; nếu tách nhiều cột thì chia đều tổng trọng số 20%. |
| Thực hành | Trung bình cộng 3 cột với 1–2 tín chỉ; 5 cột với từ 3 tín chỉ. |
| Tích hợp | Tính LT theo 20/30/50, TH theo trung bình cộng; ghép hai phần theo tín chỉ LT và TH. Tổng tín chỉ hai phần phải bằng tín chỉ môn. Không tự thêm ngưỡng thực hành dự thi lấy từ bản 2025. |
| Chỉ xét đạt/không đạt | Từ 5,0 đạt P, không đưa điểm vào GPA. |
| Đồ án/khóa luận | Một cột tổng kết, dưới 5,0 cần làm lại. |
| Bảng quy đổi IUH | A+ từ 9 = 4,0; A từ 8,5 = 3,8; B+ từ 8 = 3,5; B từ 7 = 3; C+ từ 6 = 2,5; C từ 5,5 = 2; D+ từ 5 = 1,5; D từ 4 = 1; F = 0. |

Nhập điểm thành phần **đã công bố** trên bảng điểm. Tài liệu có cả mô tả điểm thành phần một chữ số và bước chấm/làm tròn nửa điểm; app không tự làm tròn lại điểm thành phần đã nhập, tránh thay đổi điểm chính thức. Tổng kết dùng một chữ số với thang IUH. Thang tùy chỉnh có nhãn mô phỏng riêng.

## Trạng thái và học lại

- Tự suy ra trạng thái từ điểm, không có công tắc người dùng tự đánh dấu học lại.
- Cả bảng điểm và danh sách/chi tiết môn học dùng cảnh báo đỏ khi không đạt hoặc bị chặn thi, kèm lý do; có bộ lọc Không đạt.
- Ô trống là chưa có dữ liệu; 0 là điểm đã nhập. Thiếu điểm không tự bị coi là F. Cuối kỳ đã biết dưới 3 vẫn cảnh báo không đạt dù còn thiếu phần khác; chưa tạo điểm GPA cho bản ghi chưa đủ dữ liệu.
- Hai lần học được ghép tự động khi **cùng mã môn, cùng tín chỉ và kỳ trước có thứ tự rõ ràng** theo năm học + học kỳ. Không ghép bằng tên môn. Không ghép khi kỳ gần nhất bị trùng/không xác định. Đổi mã/tín chỉ/học kỳ sẽ tính lại liên kết.
- Lần trước không đạt: Học lại. Lần trước đạt: Học cải thiện. Lần trước thiếu kết quả: Lần học tiếp theo.
- Môn tự chọn không đạt có thể được thay bằng môn phù hợp theo chương trình; nhãn cần học lại là nhắc xử lý kết quả không đạt, không tự đăng ký học lại.
- GPA trong app là mô phỏng theo dữ liệu đã nhập, có lựa chọn điểm cao nhất/lần mới nhất. Chưa coi lựa chọn này là kết luận quy chế IUH K19. Chuyên cần, kỷ luật, miễn/chuyển điểm, chương trình đặc thù và bảng điểm toàn khóa chưa được xác định tự động.
- Theo đề cương riêng cho phép trọng số khác, nhưng chỉ xét ngưỡng tổng 4,0; chưa áp dụng các ràng buộc riêng của loại học phần đó.

## Cách thử nhanh

Thống kê → Điểm & GPA → chọn môn → Nhập/chỉnh sửa điểm. Chọn đúng loại học phần trước khi nhập; đổi loại cần xác nhận tạo lại cột.

1. Lý thuyết: thường kỳ 10, giữa kỳ 10, cuối kỳ 2,9 → tổng 2,9, F, cảnh báo đỏ.
2. Đổi cuối kỳ thành 3 → tổng 6,5, đạt.
3. Cả ba điểm 3,9 → không đạt; cả ba 4 → đạt.
4. Giữa kỳ 0, cuối kỳ trống → chặn thi, không tự tạo tổng kết.
5. Đạt/không đạt: 4,9 không đạt; 5 đạt P, không tham gia GPA.
6. Tạo cùng mã môn và tín chỉ ở kỳ sau → tự nhận diện lần học trước, không cần chọn công tắc Học lại.

Kiểm tra tự động: `node docs/qa-grades-unit.cjs` (68 kiểm tra), `node docs/qa-iuh-grades.cjs`, `node docs/qa-grades.cjs`; các bài trình duyệt dùng Playwright/Chrome như tài liệu QA hiện có. Chạy `npm run typecheck`, `npm run build:web` và xuất Android để kiểm tra bundle; chưa thay thế chạy thật trên điện thoại.
