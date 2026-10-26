# 5A.2A — Lưu và đọc điểm thành phần

Đã có API lưu điểm 0–10 theo bộ cột của 5A.1, phân biệt chưa nhập với 0; lưu BTL/phần còn lại; bảo vệ cột đã có điểm khi sửa/xóa cấu hình. V9 thêm hai trường nullable, không tự điền điểm hoặc sửa dữ liệu cũ. **Chưa tính tổng kết/điều kiện thi/đạt/học lại/GPA và chưa nối màn Điểm/Dashboard.** Đợt này thử bằng API, kết quả môn ở 5A.2B, GPA ở 5B và giao diện thật ở 5C.

**Đã nghiệm thu:** 390 tests/Maven verify qua (33 mới), không lỗi/bỏ qua; `npm run typecheck` qua. Gồm 32 test API điểm/guard/PowerShell, một test V8 → V9 giữ dữ liệu; mở rộng test restart toàn backend. Có Windows PowerShell 5.1 thật (Get/Export/Update, UTF-8, stale version, giữ file/phiên), null/0, BTL, rollback, ownership, snapshot, ghi đồng thời và hồi quy các module trước. Không sửa frontend hoặc dependency.

## 1. Chạy backend

Terminal thứ nhất trong VS Code hoặc IntelliJ:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Giữ terminal chạy. Khởi động lại backend cũ để Flyway áp dụng V9; không tạo lại database. Không cần chạy frontend để thử API đợt này. Nếu chạy IntelliJ, giữ cấu hình DB/khóa đăng nhập như trước.

## 2. Chọn cấu hình và xem điểm trống

Terminal thứ hai cũng trong backend:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Try-GradeConfigurations.ps1 -Mode List
$cauHinh = Read-Host 'Dán data[].id của cấu hình môn thử'
.\scripts\Try-GradeScores.ps1 -Mode Get -ConfigurationId $cauHinh
```

Nếu chưa có cấu hình nào, tạo theo [hướng dẫn 5A.1](BACKEND-PHASE-5A1.md) trước. Dùng ID của cấu hình, khác ID môn. Mỗi lệnh hỏi email/mật khẩu và chỉ đóng phiên thử của nó, không đăng xuất phiên app.

Kết quả ban đầu: mỗi `score` và `remainderScore` là null, `hasScores=false`. `configurationState=READY` chỉ nói bộ cột đủ nhóm, chưa phải đã nhập đủ điểm hoặc qua môn.

## 3. Xuất bản điểm để sửa

```powershell
.\scripts\Try-GradeScores.ps1 -Mode Export -ConfigurationId $cauHinh -OutputFile .\.local\diem-test-5a2a.json
```

Mở `.local/diem-test-5a2a.json` trong editor. File đã có **đúng mã cột, điểm hiện tại và version**, không cần tự chép từ response. Nếu file đã tồn tại, dùng tên mới để giữ bản đang chỉnh; Export không ghi đè.

Ví dụ nếu dùng 4 cột của mẫu `theory.json`, sửa thành:

```json
{
  "version": 0,
  "parts": [
    {"id":"tk1","score":0,"remainderScore":null},
    {"id":"tk2","score":null,"remainderScore":null},
    {"id":"mid","score":7.5,"remainderScore":null},
    {"id":"final","score":null,"remainderScore":null}
  ]
}
```

**Giữ đúng ID và version từ file Export của bạn**, không chép version 0 của ví dụ nếu đã có lần lưu trước. Không bỏ cột hoặc trường `score`/`remainderScore`. JSON dùng dấu chấm cho số thập phân (7.5), và null không có dấu ngoặc kép. Điểm hỗ trợ tối đa 4 chữ số sau dấu thập phân.

```powershell
.\scripts\Try-GradeScores.ps1 -Mode Update -ConfigurationId $cauHinh -InputFile .\.local\diem-test-5a2a.json
.\scripts\Try-GradeScores.ps1 -Mode Get -ConfigurationId $cauHinh
```

Mong đợi: tk1 là **0**, tk2 vẫn **null**, mid là 7.5; `hasScores=true`, version tăng 1. Không có tổng kết/GPA trong response ở đợt này. Chạy Get của API cấu hình cũng thấy cùng version, vì cấu hình và điểm dùng chung version.

## 4. Thử lưu lâu dài và version

1. Ghi nhớ kết quả Get. Ctrl+C terminal backend, chạy lại `Run-Local.ps1`, Get điểm lại: giá trị và version vẫn còn.
2. Dùng lại nguyên file cũ để Update: nhận `GRADE_CONFIGURATION_VERSION_CONFLICT`, dữ liệu mới không bị đè.
3. Đọc Get, đối chiếu thay đổi rồi Export sang **file mới** trước lần sửa tiếp. Không chỉ thay version thủ công trong bản điểm cũ để vượt lỗi.
4. Dùng tài khoản thứ hai với cùng cấu hình ID: Get/Update trả 404; không đọc hoặc sửa được điểm tài khoản đầu.

## 5. Thử bài tập lớn

Cấu hình trước bằng mẫu của 5A.1, rồi Export điểm của đúng cấu hình đó:

| Cách quy BTL | Nhập điểm |
|---|---|
| React: thay một cột thực hành | `score` là điểm BTL, `remainderScore=null`. |
| WWW Java: BTL làm toàn bộ cuối kỳ | Cùng cách nhập; target=FINAL, share=100 trong cấu hình. |
| BTL góp 40% vào cuối kỳ | `score` là điểm BTL, `remainderScore` là điểm 60% còn lại. |

Ví dụ với cột `btl-final` đã cấu hình share=40: `{"id":"btl-final","score":9,"remainderScore":7}`. Các cột khác trong file vẫn phải giữ đủ. Có thể để một điểm null nếu chưa có. Nhập remainderScore=0 vẫn là dữ liệu thật; nó không bị coi là trống.

Đợt này lưu các giá trị, **chưa trả kết quả quy đổi BTL hoặc tổng kết môn**. Không thêm một cột FINAL khác để lưu phần còn lại; phần đó nằm trong `remainderScore` của chính cột BTL.

## 6. Thử bảo vệ điểm khi sửa cột

Sau khi đã lưu điểm, lấy version mới nhất từ Get trước mỗi lần sửa cấu hình qua script/file 5A.1:

- Đổi tên hoặc đổi thứ tự: được; đọc điểm lại vẫn gắn đúng mã cột, kể cả điểm 0.
- Xóa/đổi mã/đổi loại cột có điểm: 409 `GRADE_COLUMN_HAS_SCORES`.
- Đổi share/target của BTL có điểm BTL hoặc điểm phần còn lại: cùng lỗi 409.
- Đổi Lý thuyết ↔ Thực hành khi còn bất kỳ điểm nào: cùng lỗi 409.
- Xóa cả cấu hình khi còn điểm: 409 `GRADE_CONFIGURATION_HAS_SCORES`.
- Thêm cột mới hoặc xóa cột chưa nhập điểm: được; điểm các cột còn lại giữ nguyên. Bộ trọng số có thể đổi theo cấu hình mới.

Muốn sửa cấu trúc một cột đã nhập: Export mới → chủ động đặt `score` và `remainderScore` cột đó thành null → Update → Get cấu hình/version mới → sửa cấu hình. Điểm các cột khác vẫn giữ nguyên. Muốn đổi loại học phần hoặc xóa cả cấu hình thì xóa toàn bộ điểm trước. Không dùng 0 thay null để xóa điểm.

## 7. Thử lỗi nhập

Mỗi lần bắt đầu bằng Export mới để dùng đúng version:

- Điểm -1, 10.1 hoặc quá 4 chữ số thập phân: 400, cả lần lưu không thay đổi.
- Cột thường/BTL thay toàn bộ cột mà remainderScore khác null: 400.
- Thiếu/trùng/thừa mã cột, thiếu trường điểm: 400.
- Thêm name/kind/weight vào file điểm: bị từ chối; sửa cấu hình bằng API 5A.1.
- Một cột sai giữa các cột đúng: Get lại thấy **toàn bộ** điểm và version trước đó vẫn nguyên.

Nếu mạng mất sau khi bấm lưu, dùng Get kiểm tra kết quả trước khi gửi lại. Script không tự retry hoặc tự thay version.

## 8. IntelliJ HTTP Client

```powershell
Copy-Item .\api\grade-scores.http .\.local\grade-scores.http
```

Mở bản sao, nhập tài khoản ở máy, chạy đăng nhập → danh sách cấu hình → Get điểm → chép accessToken/configurationId/version → Put đúng bộ cột → Get lại. Cập nhật version sau mỗi lần ghi. File có ví dụ thường/BTL và xóa điểm bằng null; chỉ chạy ví dụ khớp với bộ cột thực tế. Kết thúc bằng logout refreshToken của chính phiên thử. Nếu IDE chưa có HTTP Client, dùng PowerShell.

Hợp đồng chi tiết: [GRADE-SCORES.md](../backend/docs/GRADE-SCORES.md). Bộ test dùng schema riêng và tự dọn; không seed vào tài khoản app. Chạy lại bằng `backend/scripts/Test-Local.ps1`.

## Commit

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git status
git add .
git commit -m "Lưu điểm thành phần và bảo vệ các cột đã nhập điểm"
git push
```
