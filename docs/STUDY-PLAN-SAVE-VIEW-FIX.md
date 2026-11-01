# Cập nhật ngày và danh sách Tự học ngay sau lưu kế hoạch

Phản hồi người dùng ngày 01/11/2026: chỉ thấy danh sách mong đợi sau khi bấm **Xem lịch tự học**; đóng biên nhận rồi tự mở Tự học vẫn thấy danh sách cũ.

## Nguyên nhân và bản sửa

Luồng lưu đã gọi GET danh sách mới ngay khi nhận biên nhận. Tuy nhiên, ngày đang xem nằm riêng trong màn Tự học; trước đây chỉ nút Xem lịch tự học truyền ngày mới và tạo lại màn. Vì vậy các buổi tương lai vẫn bị loại khỏi ngày cũ; bộ lọc Hoàn thành cũng có thể che các buổi vừa lên lịch. Hai ảnh trước cho biết buổi được lưu ngày 02/11 và 03/11, nhưng không hiển thị ngày đang chọn của danh sách, nên ảnh một mình không chứng minh GET chưa chạy.

- Đưa ngày/khoảng xem/bộ lọc Tự học về trạng thái chung của workspace; không phụ thuộc màn đã mở hay đang ẩn.
- Ngay khi nhận biên nhận đã xác nhận, chọn ngày của buổi sớm nhất **trong tập đã lưu**, Theo ngày, Tất cả. Vẫn tải danh sách hiện tại bằng `reloadFresh()` sau commit. Đóng bằng dấu × không hủy lượt GET của store dùng chung.
- Nút Xem lịch tự học chỉ điều hướng tới màn đã được cập nhật; không cần bấm nút này để thực hiện cập nhật ngày.
- Ngày khớp cách hiển thị theo thiết bị của API tự học, kể cả kế hoạch dùng múi giờ khác. Không trộn toàn bộ buổi tương lai vào thống kê một ngày.
- Hiện dòng **Thống kê ngày … / Thống kê tuần …** ngay trên ba ô số liệu.
- Không chèn ảnh chụp biên nhận lịch sử vào danh sách hiện tại; buổi đã sửa/xóa vẫn theo GET. Nếu GET lỗi, vẫn giữ thông báo đã lưu và hiển thị lỗi/tải lại đang có.
- Chuyển tab thông thường giữ lựa chọn ngày/bộ lọc. Một lần lưu mới chọn lại ngày/bộ lọc phù hợp. Trạng thái xem này theo workspace trong phiên, không thêm lưu ngày qua F5/thiết bị. Sau F5, mở lại biên nhận vẫn chọn ngày từ biên nhận như trên.

Không sửa API, migration, dependency hoặc dữ liệu người dùng. Lưu đề xuất là **thêm** các buổi được chọn, không thay thế/xóa kế hoạch đã lưu trước đó.

## Test đúng tình huống người dùng báo

1. F5 web để nạp bản sửa. Đăng nhập, vào Tự học, chọn một ngày cũ khác ngày dự kiến lưu; thử bộ lọc **Hoàn thành**.
2. Sang Trợ lý AI, tạo đề xuất tương lai, chọn một hoặc hai buổi và lưu. Đợi màn **Kế hoạch đã lưu**, ghi nhớ ngày/giờ/tên các buổi trong biên nhận.
3. **Không bấm Xem lịch tự học.** Đóng bằng dấu **×**.
4. Tự vào **Lịch học → Tự học**. Dòng Thống kê ngày phải là ngày sớm nhất trong các buổi vừa lưu; chế độ Theo ngày và bộ lọc Tất cả. Khi GET xong, danh sách có các buổi đã lưu của ngày đó.
5. Nếu hai buổi nằm ở hai ngày khác nhau, ngày đầu chỉ có phần của ngày đó. Chuyển sang Theo tuần để xem cả hai khi cùng tuần. Lưu thêm một buổi không làm các buổi cũ biến mất.
6. Lặp lại với Tự học đã từng mở trước đó và với lần đầu mở sau lưu. Thử **Tiếp tục lập kế hoạch**, rồi đóng và tự vào Tự học: vẫn giữ ngày vừa cập nhật cho tới khi bạn đổi ngày/lưu kế hoạch khác.

Nếu ngày đã đúng nhưng vẫn thiếu buổi sau khi tải xong, dùng Tải lại danh sách tự học và ghi lại thông báo lỗi. Không lưu lại cùng nội dung bằng mã mới để né lỗi đọc.

## Kiểm tra đã chạy

- TypeScript đạt.
- 714/714 tests frontend, không lỗi/bỏ qua; 8 mới về chọn ngày sau lưu, reset bộ lọc cũ, tập đã lưu, sửa/xóa, chọn ngày thủ công, tổng tuần và hai múi giờ qua nửa đêm.
- Nhóm liên quan PlanApplication/StudyRefresh/StudyView: 49/49.
- Export web đạt tại `.expo/plan-save-view-web`.
- Không chạy lại backend vì không đổi nghiệp vụ backend. Không tuyên bố đã thao tác UI trực tiếp; công cụ điều khiển trước đó lỗi khởi tạo. Vòng UI 8A.3C trong checklist vẫn để mở cho người dùng kiểm tra.

Tên commit: **Cập nhật lịch tự học ngay sau khi lưu kế hoạch**. Chưa tự commit/push.
