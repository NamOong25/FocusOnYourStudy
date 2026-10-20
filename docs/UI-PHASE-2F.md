# UI 2F — Trợ lý AI, tài liệu và duyệt kế hoạch

## Cách mở

Tab **Trợ lý AI** giữ bố cục/template hiện tại, mở năm công cụ với các luồng hoàn chỉnh hơn:

1. **Tạo lộ trình**: chọn môn, bài tập/kỳ thi/tự học, mục tiêu, khoảng ngày, giờ rảnh, thời lượng và số buổi.
2. **Tìm lịch trống**: mặc định tự học độc lập; cùng bộ điều kiện và bước duyệt.
3. **Xem bản mẫu**: chọn tài liệu, độ chi tiết → tóm tắt → bấm từng ý để đọc đúng trang nguồn minh họa.
4. **Luyện thử**: chọn tài liệu và 3/5 câu → chọn đáp án, quay lại sửa → nộp bài → điểm, đáp án, giải thích và nguồn từng câu → làm lại/đổi tài liệu.
5. **Xem đề xuất**: chọn một buổi tự học chưa bắt đầu → xem buổi gốc và giờ mới → sửa/duyệt thay thế hoặc hủy.

Các câu hỏi nhanh/ô nhập chuyển thành mục tiêu trong form kế hoạch, không giả là câu trả lời hội thoại. Có nhãn rõ chưa kết nối AI. Chưa xử lý nội dung câu hỏi bằng mô hình ngôn ngữ.

## Đề xuất và duyệt lịch

- Bộ sinh lịch hiện là thuật toán local phục vụ prototype: tối đa 14 ngày, 1–6 buổi, mỗi buổi 1–240 phút. Một khung giờ rảnh chung cho mỗi ngày; xét từ ngày/giờ hiện tại, ưu tiên khoảng sớm nhất và tự chừa ít nhất 10 phút giữa các buổi do cùng đề xuất sinh ra.
- Đối chiếu ca học (kể cả nghỉ/đổi một buổi), lịch thi, buổi tự học hiện có và các buổi khác trong đề xuất. Dùng chung quy tắc khoảng thời gian của calendar; giờ nối tiếp nhau không tính là trùng.
- Bài tập phải chưa hoàn thành, thuộc đúng môn; buổi học không sau **ngày** deadline (bài tập hiện chưa có giờ hạn nộp). Ôn thi phải kết thúc trước giờ bắt đầu kỳ thi, kể cả buổi cùng ngày. Không tự đổi deadline hoặc trạng thái bài tập.
- Nếu không đủ chỗ, nêu rõ tìm được bao nhiêu/tổng mong muốn. Nếu không có khoảng phù hợp, hiện hướng đổi điều kiện. Không tạo các buổi vượt thời gian rảnh/qua deadline để đủ số lượng.
- Preview ghi rõ chưa lưu. Từng buổi có thể đổi tên/ngày/giờ/thời lượng hoặc bỏ chọn; lỗi và lịch bị trùng hiển thị cạnh buổi. Chặn duyệt nếu các buổi đang chọn chưa hợp lệ; buổi bỏ chọn không được lưu.
- Kiểm tra lại dữ liệu hiện tại khi chấp nhận, rồi lưu toàn bộ các buổi được chọn trong một lần. Đề xuất có ID và chặn áp dụng lại cùng ID; không ghi một phần nếu có lỗi.
- Duyệt tạo **StudySession** dùng chung với Lịch học → Tự học, Chi tiết bài tập và Pomodoro. Nút **Xem lịch tự học** chuyển thẳng sang màn này. Thẻ trang chủ lấy các buổi đã duyệt theo ID và dữ liệu hiện tại, không còn lưu một mảng chuỗi lịch riêng; sửa/xóa buổi sẽ phản ánh theo cùng nguồn.
- Điều chỉnh chỉ thay một buổi ở trạng thái `Đã lên lịch`, chưa ghi thời gian tập trung. Giữ ID, môn, liên kết bài và ghi chú gốc; không ghi thêm bản sao. Nếu buổi gốc thay đổi/biến mất/đã bắt đầu từ lúc mở đề xuất, yêu cầu chọn lại thay vì ghi đè.
- Hủy hoặc đóng preview không thay lịch. Chuyển bước đặt lại vị trí cuộn để không bỏ lỡ phần đầu nội dung.

## Tài liệu và câu hỏi mẫu

- Có hai bộ nội dung do ứng dụng dựng: **Cây nhị phân & cách duyệt** và **Khóa & thiết kế bảng quan hệ**, mỗi bộ ba trang nguồn, ba ý tóm tắt và năm câu hỏi có sẵn.
- Tham chiếu trang đọc được ngay từ ý tóm tắt hoặc lời giải. Trang nguồn là đoạn văn minh họa có sẵn, không phải kết quả trích một PDF thật. Không giả nút upload; chưa chọn/tải file thiết bị hoặc xử lý tài liệu người dùng.
- Tóm tắt chọn ngắn/chi tiết; chuyển sang luyện tập giữ đúng tài liệu đang chọn.
- Trắc nghiệm cần chọn đáp án trước khi sang câu sau; có quay lại giữ đáp án, chấm đúng/sai, tỷ lệ, giải thích và nguồn. Làm lại xóa đáp án nhưng dùng lại bộ câu hỏi mẫu đó. Điểm luyện tập không cộng vào GPA.
- Tài liệu mẫu chưa nối với tệp đính kèm bài tập, lịch sử quiz chưa lưu xuyên lần mở luồng. Chưa có AI tạo câu hỏi, upload PDF, phân quyền tệp, OCR, citation thật hay xử lý lỗi/quota của dịch vụ AI.

## Kiểm tra

```powershell
npm run typecheck
node docs/qa-ai-unit.cjs
node docs/qa-ai.cjs
node docs/qa-smoke.cjs
node docs/qa-learning.cjs
npm run build:web
npx expo export --platform android --output-dir .expo/native-check
```

Script trình duyệt hỗ trợ `PLAYWRIGHT_MODULE` và `CHROME_PATH`, dùng trình duyệt thử riêng; kết quả/ảnh ở `.expo/qa-ai` không đưa vào Git.

- 31 kiểm tra logic: giới hạn khoảng ngày/giờ quá khứ, thời gian nghỉ, trùng nội bộ/lịch hiện có, deadline/kỳ thi, ngoại lệ nghỉ, buổi gốc thay đổi hoặc đã học, giữ ID/ghi chú và chỉ lấy buổi được chọn.
- Thử UI ở 320/390/430/1280px; kiểm tra form, sửa/bỏ chọn/duyệt/hủy, liên kết lịch tự học, thay buổi chưa bắt đầu, nguồn tóm tắt/quiz, đáp án/quay lại/nộp/làm lại và mục tiêu từ ô nhập.
- Kiểm tra không có lỗi page/console hoặc yêu cầu ghi mạng từ các luồng mẫu; hồi quy năm tab và nghiệp vụ tự học/Pomodoro.
- Bundle Android chỉ xác nhận đóng gói, chưa thay thử trên điện thoại thật. Dữ liệu vẫn trong bộ nhớ, tải lại app trở về mẫu.

## Tiếp theo

Đã có luồng prototype cho cả chín nhóm chức năng. Bước tiếp theo là duyệt tổng thể và quay lại bốn nhóm người dùng đã hoãn trong `UI-BACKLOG.md`: bộ chọn ngày/giờ, điều hướng, hệ thống trạng thái và Dashboard. Chưa tự làm các mục hoãn hoặc chuyển sang backend trong đợt này.

Tên commit: `Hoàn thiện giao diện trợ lý AI và duyệt kế hoạch học`. Lệnh push ở `GIT-COMMITS.md`.
