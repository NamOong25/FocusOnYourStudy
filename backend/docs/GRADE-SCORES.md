# Điểm thành phần — 5A.2A

V9 thêm `score` và `remainder_score` nullable vào `grade_columns`. Cột hiện có giữ ID/tên/loại/thứ tự/BTL/version; điểm ban đầu là NULL, không phải 0. Không seed và không sửa V1–V8. Lưu điểm qua API riêng; API cấu hình 5A.1 vẫn không nhận giá trị điểm.

Endpoint `/scores` chỉ lưu/đọc điểm gốc; từ 5A.2B, quy đổi BTL/tổng kết/điểm chữ/điều kiện thi/đạt/cần xử lý học lại được đọc qua GET `/grade-configurations/{id}/result`, xem [contract kết quả](GRADE-RESULTS.md). `configurationState=READY` chỉ nói bộ cột đủ nhóm, không nói điểm đầy đủ hay qua môn. Màn Điểm/Dashboard React Native nối ở 5C, GPA ở 5B.

## Endpoint

Cần Bearer token của phiên đang hoạt động; thành công `{data,meta}` và `Cache-Control: no-store`; lỗi Problem Detail theo quy ước hiện có.

| Phương thức | Đường dẫn | Kết quả |
|---|---|---|
| GET | `/api/v1/grade-configurations/{configurationId}/scores` | Cấu hình và toàn bộ giá trị điểm trong cùng snapshot PostgreSQL. Không tự tạo cấu hình/cột. |
| PUT | Cùng đường dẫn | Thay đầy đủ bộ giá trị điểm, cần version mới nhất. |

Không có POST/PATCH/DELETE điểm. Muốn xóa điểm, PUT rõ null theo hợp đồng dưới. ID không thuộc tài khoản hoặc không tồn tại đều 404 `GRADE_CONFIGURATION_NOT_FOUND`, kể cả cấu hình đã xóa/tạo lại. `configurationId` là UUID cấu hình, khác `courseId` và các mã cột.

## Request PUT

```json
{
  "version": 0,
  "parts": [
    {"id":"tk1","score":0,"remainderScore":null},
    {"id":"mid","score":7.5,"remainderScore":null},
    {"id":"btl-final","score":9,"remainderScore":7}
  ]
}
```

Ví dụ áp dụng khi cấu hình hiện có đúng ba mã `tk1,mid,btl-final` và BTL góp một phần vào cuối kỳ. Client phải đọc đúng cấu hình của mình, không đoán mã theo tên hiển thị.

- `version`: số nguyên không âm kiểu long, dùng chung với API cấu hình.
- `parts`: mảng 0–10 phần tử, **khớp đầy đủ bộ mã cột hiện tại**, không thiếu/trùng/thừa. Thứ tự input không đổi thứ tự cấu hình; response theo thứ tự cột đã lưu. Cấu hình trống nhận `[]`.
- Mỗi phần tử chỉ có `id`, `score`, `remainderScore`. Hai trường điểm **phải xuất hiện**, nhưng có thể null. Bỏ trường hoặc bỏ cột trả 400 thay vì vô tình xóa dữ liệu.
- Điểm từ 0 đến 10, tối đa 4 chữ số thập phân. `null` là chưa nhập hoặc chủ động xóa giá trị hiện có; `0` là điểm thật và phải được giữ.
- Cột thường: `score` là điểm cột, `remainderScore` phải null.
- PROJECT→PRACTICE/100 hoặc PROJECT→FINAL/100: `score` là điểm BTL, `remainderScore` phải null.
- PROJECT→FINAL có `share<100`: `score` là điểm BTL; `remainderScore` là điểm phần còn lại của cột cuối kỳ. Có thể nhập một phần trước và để phần kia null. Đợt này lưu nguyên các giá trị, chưa tổng hợp công thức.
- Không nhận weight/kind/name/project/userId/courseId hoặc các trường ngoài hợp đồng. Sửa cấu trúc cột bằng endpoint cấu hình. Không chép toàn bộ GET response làm PUT body.

Toàn bộ input được kiểm tra trước khi ghi. Một cột sai khiến cả yêu cầu thất bại; giá trị/metadata/version cũ giữ nguyên. Không tự làm tròn điểm đầu vào nhiều hơn 4 chữ số để che lỗi nhập.

## Response

`data` có `configurationId, courseId, assessment, parts, configurationState, missingGroups, hasScores, version, createdAt, updatedAt`.

`parts[]` có `id, name, kind, project, weightNumerator, weightDenominator, weight, score, remainderScore`. Cấu hình/nhãn/trọng số và điểm được đọc từ **cùng snapshot**, tránh version cũ đi kèm điểm mới. Trọng số giữ cách phân bổ của 5A.1; không lấy từ request điểm.

`hasScores=true` nếu có ít nhất một score/remainderScore khác null, kể cả 0. Còn cột chưa nhập không bị đổi thành 0. Số được chuẩn hóa biểu diễn JSON trước/sau đọc DB/restart (ví dụ 8.1250 → 8.125, 0.0000 → 0); giá trị số không đổi. Không có tổng kết/GPA/trạng thái học lại giả trong response.

## Version và bảo vệ điểm

Điểm và cấu hình dùng cùng khóa ghi hàng tài khoản, cùng header version. PUT điểm kể cả không thay đổi giá trị vẫn tăng version. Sửa cấu hình khiến bản điểm cũ bị 409; lưu điểm khiến bản cấu hình cũ bị 409. Đây là điều kiện cần để không xóa cột vừa có điểm ở một request khác.

| Thay đổi cấu hình | Khi đã có điểm |
|---|---|
| Đổi tên/đổi thứ tự cột | Được, giữ mã/UUID nội bộ và điểm. |
| Thêm cột mới hoặc bỏ cột chưa có điểm | Được; điểm các cột còn lại giữ nguyên, trọng số theo bộ mới. |
| Xóa/đổi mã/đổi loại một cột có điểm | 409 `GRADE_COLUMN_HAS_SCORES`. Xóa điểm cột bị ảnh hưởng trước. |
| Đổi target/share BTL có điểm hoặc điểm phần còn lại | Cùng lỗi 409; tỷ lệ 40 và 40.0000 được xem là tương đương. |
| Đổi THEORY/PRACTICAL khi bất kỳ cột nào có điểm | Cùng lỗi 409; cần xóa điểm trước khi đổi. |
| Xóa toàn bộ cấu hình còn điểm | 409 `GRADE_CONFIGURATION_HAS_SCORES`. Xóa toàn bộ điểm qua PUT null trước. |

Mọi guard coi 0 là dữ liệu. Có thể xóa điểm ở đúng cột đang sửa và giữ các cột khác; không ép xóa cả bảng. Xóa điểm không xóa môn/cấu hình/lịch/bài tập. Muốn xóa cấu hình sau khi đã xóa điểm phải dùng version mới; guard xóa/chuyển học kỳ môn có cấu hình từ 5A.1 vẫn áp dụng.

API cấu hình tiếp tục trả shape cũ; đọc endpoint `/scores` khi cần cả điểm và cấu hình. Không có endpoint ghi cấu hình mới nào bỏ qua các guard trên.

## Lỗi chính

| Code | HTTP | Ý nghĩa |
|---|---|---|
| VALIDATION_FAILED / INVALID_REQUEST | 400 | Sai kiểu/khoảng/độ chính xác/trường/JSON/version. |
| INVALID_GRADE_SCORES | 400 | Thiếu/trùng/thừa mã cột, thiếu trường điểm hoặc remainder không phù hợp. |
| GRADE_CONFIGURATION_NOT_FOUND | 404 | Không có/đã xóa/không thuộc tài khoản. |
| GRADE_CONFIGURATION_VERSION_CONFLICT | 409 | Điểm hoặc cấu hình đã đổi; đọc và đối chiếu trước khi lưu tiếp. |
| GRADE_COLUMN_HAS_SCORES | 409 | Sửa cấu trúc có nguy cơ mất/hiểu sai điểm cột. |
| GRADE_CONFIGURATION_HAS_SCORES | 409 | Đang xóa cấu hình còn điểm. |

Mất phản hồi khi PUT: GET đối chiếu kết quả; không tự retry. Không tự lấy version mới rồi gửi nguyên bản điểm cũ đè lên dữ liệu vừa đổi.

## Script

`scripts/Try-GradeScores.ps1` có Get/Export/Update. Export giữ **giá trị hiện tại và version cùng snapshot**, chỉ xuất các trường cần PUT; không ghi đè file có sẵn. Update dùng version trong file, không tự thay bằng bản mới. Windows PowerShell 5.1 đọc/ghi UTF-8 và đóng đúng refresh session mà script đã mở. Không in token/mật khẩu.

Thực hành: [BACKEND-PHASE-5A2A.md](../../docs/BACKEND-PHASE-5A2A.md), IntelliJ `api/grade-scores.http`. Kiểm thử dùng schema riêng, gồm V8→V9, restart, 0/null, BTL, rollback, version, ownership, snapshot và ghi đồng thời.
