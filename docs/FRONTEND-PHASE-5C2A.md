# 5C.2A — Cấu hình cột điểm thật

Hoàn thành ngày 27/10/2026. Bộ cột được lưu qua Spring Boot vào PostgreSQL; **nhập điểm số trực tiếp thuộc 5C.2B**.

## Đã làm

- Vào **Thống kê → Điểm & GPA → mở môn → Thiết lập bảng điểm / Chỉnh sửa cấu hình cột điểm**. Các lối mở cấu hình trong chi tiết môn dùng cùng form.
- Chỉ hai loại học phần: Lý thuyết và Thực hành. Danh sách loại cột được lọc theo học phần; Bài tập lớn dùng được ở cả hai.
- Thêm, xóa, đổi tên, đổi loại và di chuyển cột lên/xuống, tối đa 10 cột. Mã cột giữ nguyên khi đổi tên/thứ tự để không làm lệch điểm đã có.
- Bộ cột đề xuất là lựa chọn khi bảng còn trống: lý thuyết có thường kỳ/giữa kỳ/cuối kỳ; thực hành đề xuất 3 hoặc 5 cột theo tín chỉ. Số cột thực hành vẫn sửa được theo đề cương; đề xuất không phải giới hạn bắt buộc.
- BTL thay một cột thực hành với tỷ lệ 100%, hoặc làm/góp vào cột cuối kỳ. Tỷ lệ góp do người dùng nhập theo môn, lớn hơn 0 đến 100%, tối đa 4 số thập phân; chấp nhận dấu phẩy. Không tự suy cách quy BTL từ tên môn, không tạo hai cột cuối kỳ.
- Có thể lưu bộ cột thiếu nhóm hoặc trống dưới trạng thái đang thiết lập. Trọng số của bộ đã lưu lấy từ backend, không cho nhập trọng số tùy ý.
- Cột đã có điểm, **kể cả điểm 0 hoặc điểm phần còn lại bằng 0**, bị khóa thao tác xóa, đổi loại và cách quy BTL. Đổi tên/thứ tự vẫn được và giữ nguyên điểm. Loại học phần được giữ khi bảng còn điểm.
- Có xóa cả cấu hình với bước xác nhận, chỉ khi chưa có điểm; backend kiểm tra lại phiên bản và điểm trước khi xóa. Môn còn điểm phải được xử lý điểm trước ở phần nhập điểm/API tương ứng.
- Có lỗi trường, đang lưu, thông báo thành công và xác nhận bỏ thay đổi chưa lưu. Đợi kết quả trước khi đóng form đang gửi yêu cầu.

## Lưu, phiên bản và dữ liệu thật

POST chỉ gửi `assessment` và `parts`; PUT thêm `version`. Không gửi `score`, `remainderScore`, trọng số tính sẵn hoặc `userId`. Định danh cấu hình và mã cột được kiểm tra, phản hồi lưu được đối chiếu với bộ cột đã gửi. DELETE cần đúng ID cấu hình và version, chỉ chấp nhận phản hồi 204 rỗng.

Form giữ một snapshot khi bắt đầu sửa. Đọc nền/focus không âm thầm thay bản nháp hoặc nâng version trong lúc người dùng đang sửa. Lưu thành công làm mới bảng điểm môn và snapshot học kỳ của 5C.1.

Khi hai nơi cùng sửa, cấu hình bị xóa/thay thế, xuất hiện điểm mới ở cột hoặc mất phản hồi khi ghi:

1. Giữ bản nháp, không tự gửi lại và không ghi đè bằng version tự nâng.
2. Hiện phần đối chiếu rõ ràng, có lối mở lại từ màn Điểm nếu đã đóng form.
3. Bấm **Kiểm tra cấu hình đã lưu** để đọc mới danh mục và dữ liệu môn.
4. Chỉ khi người dùng chọn bản đã kiểm tra thì mới thay bản nháp. Nếu lần tạo chưa thấy cấu hình, người dùng có thể quay lại bản nháp và tự quyết định lưu lại. Không tự tạo lại cấu hình cũ đã bị xóa.

Chỉ đọc kiểm tra không tự gỡ khóa lần ghi chưa rõ kết quả. Trạng thái ghi được giữ trong workspace và hủy khi đổi tài khoản; phản hồi muộn không xuất hiện trong tài khoản mới.

Không đổi code backend, dependency hay schema; vẫn V9. Quy tắc điểm/GPA giữ nguyên 5A/5B. Điểm số chưa có vẫn là null, không tự tạo điểm 0 khi thiết lập cột.

## Hướng dẫn kiểm tra

Giữ backend và frontend đang chạy như trước. Tải lại trang để nhận giao diện mới rồi đăng nhập.

1. **Tạo bộ cột lý thuyết:** mở một môn chưa có bảng điểm → Thiết lập bảng điểm → Lý thuyết → Thêm bộ cột lý thuyết đề xuất. Đổi tên một cột; thử thêm/xóa/di chuyển cột.
2. **BTL cuối kỳ:** đổi loại cột cuối kỳ sang Bài tập lớn, đặt tên rõ. Nếu BTL là toàn bộ cuối kỳ, chọn Toàn bộ cột cuối kỳ. Nếu chỉ góp một phần, nhập tỷ lệ theo đề cương. Bỏ trống tỷ lệ phải báo lỗi và giữ form.
3. **Lưu rồi F5:** bấm Lưu cấu hình cột điểm, chờ thông báo. Bảng điểm đọc lại đúng tên/thứ tự/cách quy BTL và trọng số. F5 → nếu Hồ sơ đang mở thì đóng → Thống kê → Điểm & GPA → mở lại môn. Bộ cột phải còn; điểm vẫn trống vì chưa có chức năng nhập điểm số ở đợt này.
4. **BTL thực hành:** dùng môn khác → Thực hành → bộ đề xuất. Có thể xóa một cột chưa có điểm rồi thêm cột khác. Chọn Bài tập lớn → Một cột thực hành; lưu và mở lại. Với 5 cột, mỗi cột là 20%; BTL chỉ là một trong các cột đó.
5. **Bảo vệ điểm đã có:** nếu môn đã có điểm từ API 5A, kiểm tra cả cột có điểm 0. Nút xóa, đổi loại/cách quy BTL và xóa toàn bảng bị khóa; tên/thứ tự vẫn sửa và lưu được. Đối chiếu điểm và tổng kết sau lưu phải giữ nguyên nếu chỉ đổi tên/thứ tự.
6. **Hai tab cùng sửa:** mở app ở hai tab trình duyệt, đăng nhập cùng tài khoản và cùng mở sửa cấu hình một môn. Tab A đổi tên rồi lưu. Tab B sửa từ bản đang mở rồi lưu: phải bị chặn, giữ bản nháp và hiện đối chiếu. Kiểm tra bản đã lưu → chọn thay bản nháp → sửa tiếp → tự bấm lưu; không có lưu lại tự động.
7. **Đổi tài khoản:** tài khoản khác không được thấy bộ cột/bản nháp/lần lưu cần kiểm tra của tài khoản trước.
8. **Xóa cấu hình không có điểm:** mở chỉnh sửa → Xóa cấu hình bảng điểm → đọc xác nhận rồi chọn xóa nếu đúng môn cần xử lý. Mở lại môn phải trở về Chưa có bảng điểm.

Mọi dữ liệu cần test phải là dữ liệu bạn chấp nhận chỉnh sửa. Đợt này không tự thêm dữ liệu mẫu vào tài khoản của bạn.

## Đã kiểm tra

- TypeScript, build web và **340 kiểm thử frontend** đạt: **38 test mới**, tổng **61 test phần điểm**.
- Test mới kiểm tra loại cột/BTL, tỷ lệ/giới hạn, mã ổn định, null/0, payload cấu hình không lẫn điểm, phiên bản/ownership, phản hồi ghi sai, lỗi trường, chặn double click, xung đột, mất phản hồi, kiểm tra/duyệt rõ ràng và hủy theo tài khoản.
- QA dùng schema `backend_it_<UUID>` riêng và hai tài khoản giả. Trình duyệt đã lưu cấu hình lý thuyết, BTL 100% cuối kỳ, F5/đọc lại; lưu thực hành sau thêm/xóa/đổi thứ tự và BTL thay một cột thực hành.
- Đã xác nhận UI khóa xóa/đổi loại cột điểm 0 nhưng vẫn đổi tên/thứ tự. Đọc PostgreSQL sau lưu: điểm 0 giữ nguyên; BTL vẫn 7.5; tổng kết vẫn 6.2.
- Đã mô phỏng nơi khác sửa từ version 0 lên 1 trong lúc form đang mở. UI giữ bản nháp, chặn lần lưu cũ, đối chiếu rồi chỉ lưu version 2 sau lựa chọn của người dùng.
- Kiểm thử tích hợp mô phỏng mất phản hồi sau khi server trả HTTP 201: chỉ **một POST**, đọc lại thấy cấu hình đã lưu, không gửi lặp; sau đó DELETE cấu hình chưa có điểm và đọc lại thấy chưa có cấu hình.
- Tài khoản QA thứ hai không có dữ liệu của tài khoản đầu. Schema và tiến trình QA được dọn sau kiểm tra; không sửa dữ liệu thật.
- Không chạy lại 537 tests backend vì không đổi backend; đó là baseline đã đạt ở 5B.2B.2.

```powershell
npm run typecheck
npm run test:grades
node --test tests/*.test.cjs
npm run build:web
```

Ảnh kiểm tra: [sau F5](images/frontend5c2a-after-f5.png), [BTL thực hành](images/frontend5c2a-practical-editor.png), [đối chiếu xung đột](images/frontend5c2a-conflict-review.png).

## Tiếp theo

- 5C.2B: nhập/lưu điểm từng cột và phần còn lại của BTL qua API điểm, nhận tổng kết từ backend.
- 5C.2C: nghiệm thu luồng cấu hình + nhập điểm sau khi nối đầy đủ.
- 5C.3: GPA tích lũy/so sánh và Dashboard dùng API.

Tên commit: `Thêm cấu hình cột điểm thật qua API`.
