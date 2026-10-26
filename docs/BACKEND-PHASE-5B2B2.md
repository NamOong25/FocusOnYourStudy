# Backend 5B.2B.2 — GPA tích lũy trong app

Đã có `GET /api/v1/gpa/cumulative`: lấy tổng kết đạt cao nhất trong cùng mã/tín chỉ; bằng điểm chọn lần gần nhất; chưa có lần đạt giữ F hoàn chỉnh gần nhất với hệ 4 bằng 0. Mỗi nhóm tính tín chỉ một lần. Điểm thiếu không thành 0; khác tín chỉ/LT-TH hoặc thứ tự không rõ được tách ra để đối chiếu. Lịch sử mọi lần học vẫn còn.

Đây là **quy tắc app đã chốt với người dùng**, không gắn nhãn GPA tích lũy chính thức của trường. Xem [hợp đồng chi tiết](../backend/docs/CUMULATIVE-GPA.md). Phần hủy/phục hồi điểm vẫn để sau. Vẫn V9, không migration/seed/dependency mới; không cần tạo lại database.

## Xem kết quả

1. Khởi động lại backend bằng `scripts/Run-Local.ps1`, hoặc Stop/Run backend trong IntelliJ như trước. Giữ backend chạy.
2. Mở terminal thứ hai tại thư mục `D:\Video OBS\QuanLyHocTap\backend`, chạy:

```powershell
.\scripts\Try-CumulativeGpa.ps1 -Mode Get
```

Nhập email/mật khẩu đã đăng ký. Không cần id môn/học kỳ. Nếu backend dùng cổng khác, thêm `-BaseUrl 'http://localhost:CONG_BACKEND'`; đây là cổng backend, không phải cổng Expo.

Script in JSON và kết quả dễ đọc: GPA, tín chỉ tính GPA/đã đạt/chưa đạt, số nhóm và CourseId đã chọn. GPA null hiện “Chưa có nhóm môn đủ kết quả để tính”; toàn F hoàn chỉnh hiện 0.00. Khi PARTIAL, xem `groups` để biết dữ liệu còn thiếu/nhóm cần đối chiếu. Script chỉ đọc dữ liệu hiện có và đăng xuất đúng phiên thử của nó.

Mẫu IntelliJ ở `backend/api/cumulative-gpa.http`. Sao chép vào `.local` trước khi nhập tài khoản/token thật; không commit thông tin đăng nhập.

## Một vòng kiểm tra

Nên dùng tài khoản thử riêng. Tạo học kỳ/môn bằng UI đã nối API hoặc các script 3A/3B. **Điểm trên giao diện hiện vẫn trong RAM**, vì vậy để test endpoint mới, tạo cấu hình/nhập điểm bằng script [5A.1](BACKEND-PHASE-5A1.md)/[5A.2A](BACKEND-PHASE-5A2A.md), không chỉ nhập vào màn Điểm. Nối UI Điểm/Dashboard ở 5C.

| Dữ liệu thử | Mong đợi khi chạy script |
| --- | --- |
| Tài khoản chưa có môn. | EMPTY, GPA null, 0 tín chỉ tính GPA. |
| A 3 tín chỉ: LT TK/GK/CK đều 8; B 2 tín chỉ đều 8.5; C 1 tín chỉ TK/GK=8, CK=0. | GPA 3.02; 6 tín chỉ tính, 5 đạt, 1 chưa đạt. |
| Thêm A cùng mã/3 tín chỉ ở kỳ sau, tổng kết 6. | Vẫn chọn A tổng kết 8; GPA và tín chỉ ở ví dụ trên giữ nguyên. |
| Hai lần cùng mã/3 tín chỉ, tổng kết lần trước 8.4 và lần sau 8.0. | Chọn 8.4 dù đều hệ 4 bằng 3.5. |
| Cùng môn hai lần đều 8. | Chọn lần ở năm-kỳ gần nhất; cùng năm kỳ hè đứng sau kỳ 2. |
| Cùng môn chỉ có các lần F hoàn chỉnh. | Chọn F hoàn chỉnh gần nhất; GPA nhóm 0.00, tín chỉ đạt 0. Lịch sử F cũ vẫn có. |
| Có một lần đạt, lần sau chưa nhập đủ. | Giữ kết quả đạt hiện có; state PARTIAL và pendingAttempts tăng. |
| GK=0 hoặc thiếu CK, chưa có lần hoàn chỉnh nào khác. | Nhóm chưa được tính, không tự tạo điểm F/0; xem incompleteReason/decisions. |
| Cùng mã nhưng 3 và 4 tín chỉ ở các kỳ khác nhau. | Các nhóm biến thể đều REVIEW_REQUIRED, không tự cộng/gộp; các nhóm rõ ràng khác vẫn được tính. |
| Sửa điểm lần sau từ 6 thành 9. | Lần sau được chọn, gradeVersion thay đổi; GET không tự ghi đè lựa chọn cũ vào database. |
| Đăng nhập tài khoản B. | Chỉ có số liệu của B, không lẫn A. |
| Tắt/chạy lại backend, đọc lại. | Kết quả dựa trên dữ liệu đã lưu vẫn giữ nguyên. |

Ví dụ các cột ở bảng trên giả sử đã chọn cấu hình LT đề xuất 20/30/50; số 0 của ví dụ C là điểm CK đã nhập thật, không phải ô trống. Thang hệ 4 dùng kết quả bộ tính môn hiện có.

## Nghiệm thu

537 tests/Maven verify qua (33 mới), không lỗi/bỏ qua; TypeScript qua. Gồm 15 test phép tính và 18 test HTTP/PowerShell mới, kiểm tra snapshot đồng thời và mở rộng restart qua ba lần khởi động. Schema test riêng tự dọn; không seed dữ liệu app, vẫn V9.

## Git

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Thêm API GPA tích lũy theo điểm đạt cao nhất"
git push
```
