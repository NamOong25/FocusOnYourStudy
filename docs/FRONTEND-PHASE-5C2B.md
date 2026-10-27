# 5C.2B — Nhập và lưu điểm số thật

Hoàn thành ngày 27/10/2026. Điểm được gửi qua Spring Boot vào PostgreSQL. Tổng kết, điểm chữ/hệ 4 và GPA học kỳ được đọc lại từ backend theo các quy tắc đã triển khai ở 5A/5B.

## Đã làm

- **Thống kê → Điểm & GPA → mở môn → Nhập / chỉnh sửa điểm**. Lối vào **Lịch học → Môn & học kỳ → mở môn → Điểm số** dùng cùng biểu mẫu.
- Chỉ nhập điểm cho bộ cột đã lưu, giữ tên/loại/thứ tự/trọng số. Muốn sửa bộ cột, dùng **Chỉnh sửa cấu hình cột điểm**. Môn chưa có cấu hình hoặc chưa có cột có lối đi thiết lập trước.
- Điểm từ 0 đến 10, tối đa 4 số thập phân, chấp nhận dấu phẩy. Không làm tròn hoặc ép chuỗi sai thành điểm 0. Có lỗi theo ô, trạng thái lưu, thông báo thành công, xác nhận bỏ thay đổi và chặn đóng khi đang gửi.
- **Trống là chưa có điểm; 0 là điểm đã nhập**. Để trống một điểm đang có rồi lưu sẽ xóa riêng điểm đó. Nút **Xóa điểm trong bản nháp** có bước xác nhận và chỉ xóa điểm trên server sau khi bấm lưu; không xóa bộ cột.
- BTL thay một cột thực hành hoặc toàn bộ cuối kỳ: nhập một điểm BTL. BTL chỉ góp một phần cuối kỳ: nhập điểm BTL và điểm phần còn lại riêng. Không có thêm một cột cuối kỳ trùng vai trò. Tỷ lệ/cách quy BTL phải được thiết lập theo môn ở phần cấu hình.
- Cho lưu điểm chưa đầy đủ. Khi còn thiếu điểm, tổng kết/GPA hiển thị theo phản hồi backend, không tự gán tổng kết 0.
- Form ghi rõ **Kết quả lần lưu gần nhất**. Khi đang sửa, chưa tính tổng kết dự đoán trong frontend; lưu xong đọc lại kết quả môn và snapshot GPA học kỳ.

## Phiên bản, mất mạng và hai nơi cùng sửa

`PUT /api/v1/grade-configurations/{id}/scores` gửi `version` và đủ `parts` theo mã cột, mỗi phần có `id`, `score`, `remainderScore` (null khi trống). Không gửi tên/loại/trọng số hay chủ sở hữu qua API điểm. Phản hồi phải giữ nguyên bộ cột, đúng điểm đã gửi và tăng phiên bản đúng một lần.

Cấu hình và điểm dùng chung phiên bản backend và cùng cơ chế khóa ghi ở frontend. Form giữ bản chụp lúc mở; đọc nền không âm thầm nâng version hoặc thay số đang nhập.

Nếu nơi khác thay điểm/bộ cột, cấu hình bị xóa/thay thế, hoặc chưa xác nhận được phản hồi lưu:

1. Giữ bản nháp đã gửi và chặn ghi tiếp; không tự gửi lại.
2. Chọn **Kiểm tra điểm đã lưu** để đọc mới danh mục và bảng điểm của đúng môn.
3. Xem điểm vừa đọc cùng bản nháp. Chỉ khi chọn **Thay bản nháp bằng điểm vừa kiểm tra** mới thay số đang sửa và dùng phiên bản vừa đọc.
4. Sửa tiếp rồi tự bấm lưu. Nếu bảng điểm đã bị xóa/thay thế, không tự chuyển số cũ sang mã cột khác hoặc tạo lại bảng cũ.

Chỉ đọc kiểm tra không tự gỡ khóa. Nếu đã đóng biểu mẫu, có nút **Mở lần lưu cần kiểm tra** trong màn Điểm. Đổi tài khoản hủy workspace/lần ghi cần kiểm tra của tài khoản trước; phản hồi muộn không cập nhật tài khoản mới.

## Tự kiểm tra một vòng

Giữ backend/frontend chạy như trước, tải lại trang và đăng nhập. Dùng môn/dữ liệu bạn chấp nhận chỉnh sửa. Đợt này không thêm dữ liệu mẫu vào tài khoản thật.

1. **Tạo bộ cột:** ở môn lý thuyết chưa có bảng điểm, thêm bộ thường kỳ/giữa kỳ/cuối kỳ đề xuất rồi lưu. Mở **Nhập / chỉnh sửa điểm**. Các ô phải trống, không tự có điểm 0.
2. **Lưu thật:** nhập thường kỳ 8, giữa kỳ 8, cuối kỳ 8 → lưu. Bảng điểm phải hiện tổng kết 8,0 từ backend, đủ 3 cột và GPA học kỳ cập nhật. F5 → đóng Hồ sơ nếu đang mở → Thống kê → Điểm & GPA → mở lại môn: điểm phải còn.
3. **Điểm chưa có khác 0:** bỏ trống giữa kỳ rồi lưu: phải về trạng thái thiếu điểm, tổng kết không phải 0. Nhập giữa kỳ 0 rồi lưu: ô hiện 0 và backend trả trạng thái theo điều kiện dự thi. Điểm 11, -1 hoặc 8,12345 phải báo lỗi; 8,1234 hợp lệ và không bị frontend làm tròn.
4. **BTL cuối kỳ một phần:** cấu hình BTL góp 40% cuối kỳ trên môn QA phù hợp (đây là tình huống test, không phải tỷ lệ mặc định của môn). Nhập thường kỳ 8,125; giữa kỳ 8; BTL 5; phần còn lại 8. Sau lưu, điểm cột cuối kỳ là 6,8, tổng kết 7,4. Bỏ trống một nửa BTL rồi lưu phải báo thiếu dữ liệu thay vì tự dùng 0. BTL toàn bộ cuối kỳ không có ô phần còn lại.
5. **Thực hành:** dùng bộ 5 cột, một cột là BTL thay thực hành. Nhập 0, 7, 8, 9, 10 → lưu: tổng kết 6,8. Điểm 0 phải còn, BTL chỉ tính một lần và không có ô phần còn lại.
6. **Xóa điểm:** ở một môn thử, chọn Xóa điểm trong bản nháp → xác nhận. Nếu đóng rồi bỏ thay đổi thì server vẫn giữ điểm cũ. Nếu lưu bản trống, mở lại thấy điểm trống nhưng tên/thứ tự/loại cột giữ nguyên. Cột đã xóa hết điểm mới có thể được sửa/xóa theo luồng cấu hình.
7. **Hai tab:** cùng mở nhập điểm một môn. Tab A lưu điểm mới (hoặc sửa cấu hình). Tab B lưu bản cũ: phải bị chặn và giữ bản nháp. Kiểm tra điểm đã lưu → xem bản mới → chọn thay bản nháp → sửa rồi tự lưu. Không có lần ghi đè tự động.
8. **Hai tài khoản:** đổi sang tài khoản khác, không được thấy môn/điểm/bản nháp của tài khoản trước.

## Đã kiểm tra

- TypeScript, build web và **374 tests frontend** đạt, gồm **34 test mới**, tổng **95 test phần điểm**. Các test mới kiểm tra null/0, số/độ chính xác, mã và đủ bộ cột, BTL, payload/phản hồi, phiên bản, lỗi trường, khóa dùng chung, xung đột, mất phản hồi, duyệt rõ ràng và đổi tài khoản.
- Trình duyệt trên schema PostgreSQL riêng, hai tài khoản giả: lưu lý thuyết với dấu phẩy/BTL một phần, F5 đọc lại đúng; lưu thực hành có điểm 0; mở form từ cả Thống kê và chi tiết môn; xóa bản nháp rồi bỏ thay đổi giữ nguyên điểm server.
- Khi form giữ version 0, nơi khác đổi tên cột và lưu điểm lên version 2: UI chặn lần lưu cũ, giữ bản nháp 9, hiển thị điểm server 8. Chỉ sau khi duyệt bản mới và tự lưu, điểm 9 mới được ghi ở version 3.
- Tích hợp API thật mô phỏng mất phản hồi **sau HTTP 200 đã lưu**: chỉ một PUT, đọc lại thấy điểm đã ghi; không tự gửi lại. Kiểm tra điểm 0/trống riêng và xóa toàn bộ điểm bằng null vẫn giữ nguyên cấu hình/bộ cột.
- Tài khoản QA B hiển thị Chưa có bảng điểm. Dữ liệu QA và tiến trình riêng được dọn sau kiểm tra; không sửa dữ liệu thật.
- Không đổi backend, dependency hay schema (vẫn V9); không chạy lại 537 tests backend đã đạt ở 5B.2B.2.

```powershell
npm run typecheck
npm run test:grades
node --test tests/*.test.cjs
npm run build:web
```

Ảnh QA: [điểm đã lưu](images/frontend5c2b-saved.png), [đối chiếu trước khi ghi tiếp](images/frontend5c2b-conflict.png).

## Còn lại

- **5C.2C:** nghiệm thu trọn luồng cấu hình → nhập điểm → sửa/xóa hợp lệ → đồng bộ các màn; vẫn để riêng trong checklist.
- **5C.3:** GPA tích lũy, so sánh học kỳ và Dashboard dùng API. Không dùng số ở các màn còn thử để nghiệm thu đợt này.
- Kiểm tra thiết bị thật/phiên native 2C.3B tiếp tục để sau theo lựa chọn trước.

Tên commit: `Kết nối nhập và lưu điểm số thật qua API`.
