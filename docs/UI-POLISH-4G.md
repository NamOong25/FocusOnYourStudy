# UI 4G — Cảnh báo khi rời biểu mẫu chưa lưu

Ngày 21/10/2026. Đợt giao diện theo yêu cầu `go`; chưa triển khai backend hoặc lưu dữ liệu lâu dài.

## Phạm vi

- Thêm/sửa học kỳ, môn học, bài tập, chuỗi lịch học, lịch thi và buổi tự học.
- Điều chỉnh giờ/phòng/giảng viên hoặc ghi nghỉ riêng một buổi học.
- Bảng điểm: điểm, tên/loại cột, thêm/xóa cột, loại học phần và cấu hình bài tập lớn.
- Các màn tài khoản/hồ sơ, form AI và cài đặt khác chưa áp dụng đợt này, đã ghi lại trong backlog.

## Quy tắc

`shared/forms/useFormChanges.ts` so bản nháp hiện tại với giá trị khi form được mở. Form mới cũng có mốc so sánh là các giá trị mặc định, không yêu cầu người dùng xác nhận nếu chưa sửa. Sửa rồi trả về chính xác nội dung ban đầu sẽ không hỏi. Điểm 0 khác ô trống; thứ tự chọn lại các ngày học/mốc nhắc không tạo thay đổi giả. Mã cột điểm nội bộ không được tính là nội dung sửa.

`Sheet` chỉ chặn yêu cầu thoát của người dùng, không chặn callback lưu/xóa đã xác nhận:

| Thao tác | Nếu chưa thay đổi | Nếu có bản nháp thay đổi |
| --- | --- | --- |
| Quay lại, Escape, Back trình duyệt/handler Android | Quay lại một bước | Hỏi, rồi quay lại một bước nếu bỏ thay đổi |
| X hoặc bấm nền ngoài bảng | Đóng luồng | Hỏi, rồi đóng luồng nếu bỏ thay đổi |
| Tiếp tục chỉnh sửa | — | Giữ nguyên ô nhập và vị trí cuộn |
| Back/Escape/X/bấm nền khi hộp xác nhận đang hiện | — | Trở về chỉnh sửa, không ngầm bỏ dữ liệu |
| Back khi đang mở bộ chọn ngày/giờ | Hủy chọn, trở lại form | Hủy chọn, giữ bản nháp form; chưa hỏi thoát |
| Lưu thành công hoặc xóa đã xác nhận | Đi tiếp theo luồng sẵn có | Đi tiếp, không hỏi thêm |

Khi thử thoát trong lúc chờ lưu mẫu, thao tác chờ bị hủy trước khi hỏi để tránh bản nháp bị ghi trong lúc quyết định. Chọn tiếp tục sửa rồi bấm Lưu để lưu lại. Nếu lưu lỗi hoặc form báo dữ liệu chưa hợp lệ, bản nháp vẫn được bảo vệ.

Trên web, form đang hoạt động và có thay đổi đăng ký `beforeunload` để trình duyệt hỏi khi tải lại/đóng tab. Đây là hộp mặc định của trình duyệt, không tùy chỉnh được câu chữ và phụ thuộc hỗ trợ/tương tác của trình duyệt. Chọn rời trang vẫn làm mất dữ liệu trong phiên; chưa có lưu nháp hoặc khôi phục sau khi đóng app. Cảnh báo trong app dùng cùng Sheet, không lồng thêm Modal; nội dung xác nhận cuộn được khi màn hình thấp.

## Kiểm tra thủ công

1. Vào **Lịch học → Bài tập → Thêm bài tập mới**. Không nhập gì, bấm Quay lại: đóng ngay, không hỏi.
2. Mở lại, nhập tên **Bản nháp Java** rồi bấm Quay lại: thấy **Bạn có thay đổi chưa lưu**.
3. Chọn **Tiếp tục chỉnh sửa**: tên vừa nhập còn nguyên. Xóa tên về trống rồi bấm Quay lại: không hỏi.
4. Mở lại, nhập tên rồi bấm **X**. Chọn **Bỏ thay đổi**: form đóng. Mở lại form mới: tên trống, danh sách không có bài vừa bỏ.
5. Mở một bài đã có → Chỉnh sửa bài tập. Đổi tên, bấm Back rồi bỏ thay đổi: quay về chi tiết; tên đã lưu giữ nguyên. Làm lại nhưng bấm X rồi bỏ: đóng toàn bộ luồng chi tiết.
6. Trong form đã nhập tên, mở Hạn nộp hoặc Giờ hạn nộp rồi bấm Back/Escape: chỉ hủy bộ chọn, giữ tên. Bấm Back thêm lần nữa mới hỏi bỏ bản nháp.
7. Thử Back trên trình duyệt và bấm phần nền tối ngoài form: cũng hỏi khi có thay đổi. Khi đang hiện câu hỏi, bấm Back/Escape: trở về form, không mất nội dung.
8. Sửa tên/ghi chú hợp lệ rồi bấm Lưu: lưu thành công không hỏi. Mở lại form sửa rồi Back ngay: không hỏi.
9. Bỏ trống tên bài rồi Lưu để thấy lỗi kiểm tra; hoặc bật **Thử trạng thái giao diện → Bật lỗi cho lần xử lý tới**. Nội dung còn nguyên; Back vẫn hỏi nếu bản nháp khác lúc mở. Tiếp tục sửa và Lưu lại được.
10. Lặp lại với ghi chú học kỳ, giảng viên môn, phòng lịch học, lý do nghỉ một buổi, phòng lịch thi và nội dung buổi tự học.
11. Trong bảng điểm, đổi một điểm thành **0**, bấm Back: phải hỏi. Bỏ thay đổi rồi mở lại: điểm cũ giữ nguyên. Nhập lại đúng điểm ban đầu rồi Back: không hỏi. Thêm/xóa hoặc đổi loại cột/BTL cũng được tính là thay đổi bản nháp.
12. Khi có bản nháp trên web, thử tải lại trang rồi chọn ở lại trong hộp của trình duyệt: nội dung vẫn giữ. Không chọn rời nếu muốn giữ dữ liệu trong phiên.

## Kiểm tra tự động

Chạy từ thư mục project, dùng Playwright và Chrome đã cài trên máy. Biến `PLAYWRIGHT_MODULE`/`CHROME_PATH` cho phép chọn runtime, không cần thêm thư viện vào app.

```powershell
npm run typecheck
node docs/qa-unsaved-forms.cjs
node docs/qa-navigation.cjs
node docs/qa-ui-states.cjs
npm run build:web
```

`qa-unsaved-forms.cjs` kiểm tra các form nêu trên, dữ liệu cũ sau khi bỏ, điểm 0/cột điểm, giá trị trả về ban đầu, các cách thoát, pending save/lỗi, bộ chọn giờ, tải lại trang và giao diện 320/390/430/1280px, màn hình ngang. Script điều hướng và trạng thái cũ được cập nhật thêm bước Bỏ thay đổi tại chỗ có bản nháp. Ảnh/kết quả lưu dưới `.expo/qa-unsaved-forms`, `.expo/qa-navigation`, `.expo/qa-ui-states` (không đưa lên Git).

Chưa nghiệm thu nút Back Android trên máy thật, bàn phím thật, thao tác iOS hoặc tình huống ứng dụng bị hệ điều hành đóng cưỡng bức. Android bundle chỉ kiểm tra được khả năng đóng gói, không thay thế thử thiết bị.

Kết quả đã chạy: TypeScript, `qa-unsaved-forms.cjs`, hồi quy `qa-navigation.cjs` và `qa-ui-states.cjs` đều qua; không ghi nhận lỗi console/runtime trong các lượt trình duyệt. Web export và Android export đều thành công. Đã xem ảnh hộp xác nhận ở 320/390px và màn hình ngang 844×390; hai nút cuộn tới được trên màn hình thấp.

## Commit

`Cảnh báo khi rời biểu mẫu có thay đổi chưa lưu`
