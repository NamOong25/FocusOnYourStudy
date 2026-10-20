# Quyết định của đợt giao diện đầu

- React Native thật, Expo SDK 56, React 19.2.3, React Native 0.85.3. Đọc tài liệu versioned tại https://docs.expo.dev/versions/v56.0.0/ trước khi viết code.
- Giữ thương hiệu FocusYourStudy từ template. Tên folder/repository kỹ thuật là QuanLyHocTap.
- Nền #F4FAFD, màu chính #5341CD, gradient #6C5CE7/#A29BFE, font Plus Jakarta Sans 400–800. Ionicons dùng một bộ icon thống nhất trên native/web.
- Ảnh chỉ là tài nguyên phụ. Nội dung thẻ, biểu đồ, timer, form, điều hướng đều là native components, không phải ảnh chụp hay trang HTML nhúng.
- Context quản lý state prototype; module screens tách riêng. Không vội thêm database, auth giả, framework backend hay API client khi phạm vi là duyệt UI.
- Navigation 5 tab dùng state trong bản nhỏ; giai đoạn mở rộng chi tiết sẽ dùng navigation stack. Timer ở provider nên không bị reset khi chuyển tab.
- Dữ liệu chỉ ở bộ nhớ. Tải lại khôi phục mẫu. Xóa cần bấm xác nhận lần thứ hai trong form. Kiểm tra ngày và thời gian ở biên form.
- Lịch học tạm lặp theo thứ trong tuần. Chưa có ngày bắt đầu/kết thúc học kỳ hoặc ngoại lệ. Lịch thi là ngày cụ thể; lịch mẫu không có cơ chế đồng bộ nhắc hệ thống.
- Thời gian timer suy từ endsAt. Khi trở lại tab/app sẽ tính thời gian thực đã trôi. Không cam kết chạy tác vụ/chuông nền hay khôi phục process ở giai đoạn UI.
- Dữ liệu GPA mẫu 3.82, 68 tín chỉ đã đạt/135 tổng; mô phỏng giả định 20 tín chỉ mới cùng thang 4. Công thức: (target × 88 − 3.82 × 68) / 20. Chưa mô phỏng quy tắc học lại/thang điểm trường.
- AI không gọi dịch vụ. Kế hoạch, summary, quiz đều ghi rõ mẫu; không upload tài liệu hoặc khẳng định đã phân tích câu hỏi. Quyền chấp nhận kế hoạch thuộc người dùng.
- Dùng lockfile để tái lập dependency. Không đưa node_modules, cache hoặc build output vào Git. Cài npm cache trên ổ D để giảm dùng dung lượng ổ C.

## Thay thế trong các đợt sau

- Đợt 2C đã bổ sung phạm vi chuỗi, nhiều thứ, ngoại lệ một buổi và lịch thi dùng chung kiểm tra trùng. Mô tả lịch đơn giản phía trên chỉ ghi lại trạng thái đợt đầu.
- Đợt 2D thay hằng GPA 3,82 và tín chỉ 68/135 bằng điểm thành phần và GPA theo tín chỉ trong Context. Quy tắc mẫu có hai thang quy đổi, làm tròn trước quy đổi và liên kết học lại rõ; xem `UI-PHASE-2D.md`. Chưa chốt quy chế trường, không dùng dữ liệu này làm bảng điểm chính thức.
- Từ đợt 2D, mỗi đợt kèm tên commit tiếng Việt/lệnh push trong `GIT-COMMITS.md` và câu trả lời hoàn thành. Người dùng tự chạy commit/push.
- Đợt 2E dùng một modal toàn màn hình cho khu vực tài khoản, có chuyển màn/quay lại cục bộ. Không chặn năm tab hiện có bằng màn đăng nhập, vì chưa có auth thật. Hồ sơ/tùy chọn ở Context; mật khẩu chỉ ở state form và không được lưu/gửi. Sáng/tối/ngôn ngữ là thẻ preview, không giả là đã có theme/i18n toàn app. Xem `UI-PHASE-2E.md`.
- Đợt 2F bỏ mảng chuỗi kế hoạch AI độc lập. Đề xuất local chỉ tạo/thay StudySession sau preview và kiểm tra lại; trang chủ tham chiếu các buổi đã duyệt theo ID. Chặn áp dụng lại cùng đề xuất; điều chỉnh chỉ buổi chưa học, giữ ID/ghi chú gốc. Nguồn tóm tắt/quiz là hai bộ văn bản minh họa theo trang, không giả đã phân tích PDF. Sheet nhận scrollKey để đặt lại vị trí cuộn ở các bước mới, không đổi hành vi mặc định của màn cũ. Xem `UI-PHASE-2F.md`.
- Đợt 3A dùng lịch/đồng hồ React Native chung cho native và web, tận dụng SVG có sẵn, không thêm dependency. Provider cục bộ trong Sheet/Account thay nội dung bằng panel khi chọn nhưng giữ form mount; không tạo modal chồng. Ngày hiển thị dd/mm/yyyy, lưu YYYY-MM-DD địa phương; giờ HH:mm, chính xác từng phút. Lịch giới hạn 1900–2100, xác nhận/hủy riêng. Chưa chạm điều hướng toàn app, hệ thống trạng thái hoặc Dashboard. Xem `UI-POLISH-3A.md`.
- Đợt 3B dùng route trail cho màn chính/phần lịch học và registry Back theo phạm vi, không thêm thư viện. Giữ màn đã mở và cuộn; Sheet mũi tên lùi một bước, X đóng điểm gốc của FlowScope; nguồn mở Pomodoro được giữ. Web dùng một history guard, không giả là router deep link/Forward replay; Android Modal xử lý onRequestClose riêng. Xem `UI-POLISH-3B.md`.
