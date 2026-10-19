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
