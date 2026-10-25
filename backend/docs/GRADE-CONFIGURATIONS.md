# Cấu hình điểm — 5A.1

V8 thêm `grade_configurations` và `grade_columns`; không seed và không sửa V1–V7. Chỉ lưu cấu trúc bảng điểm, chưa lưu giá trị điểm, tổng kết, kết quả đạt/học lại hoặc GPA. Màn Điểm React Native nối ở 5C. Các quy tắc dưới đây tái hiện cấu hình hiện có trong `src/features/grades/grades.ts`; đề cương từng lớp quyết định số cột và cách quy BTL, không suy từ tên môn.

## API

Tất cả yêu cầu cần Bearer access token của phiên đang hoạt động. Thành công dùng `{data,meta}`, `Cache-Control: no-store`; lỗi dùng Problem Detail. `userId` lấy từ token. Không có endpoint công khai.

| Phương thức | Đường dẫn sau `/api/v1` | Kết quả |
|---|---|---|
| GET | `/grade-configurations?courseId=...&semesterId=...` | Danh sách cấu hình của tài khoản; hai bộ lọc kết hợp AND. Không có trả `[]`. |
| GET | `/courses/{courseId}/grade-configuration` | Cấu hình hiện có của môn. Chưa tạo trả 404, không tự tạo cột. |
| POST | `/courses/{courseId}/grade-configuration` | Tạo một cấu hình/môn; 201 và Location. Tạo lại khi đã có trả 409. |
| GET | `/grade-configurations/{id}` | Chi tiết mới nhất, gồm version. |
| PUT | `/grade-configurations/{id}` | Thay toàn bộ cấu hình với version mới nhất. |
| DELETE | `/grade-configurations/{id}?version=n` | Xóa cấu hình cùng các cột của nó; 204. |

`id` của cấu hình và `courseId` là hai UUID khác nhau. ID cấu hình đổi khi xóa rồi tạo lại, nên bản sửa cũ không thể ghi đè cấu hình mới dù version cùng bằng 0. Môn/học kỳ/ID của tài khoản khác trả cùng 404 như không tồn tại. Không nhận chuyển cấu hình sang môn khác.

## Request

POST chỉ nhận `assessment` và `parts`. PUT thêm `version`: số nguyên không âm kiểu long. **Không gửi toàn bộ GET response trở lại**: `weight`, `state`, `missingGroups`, thời gian và các ID ở cấp gốc là dữ liệu chỉ đọc. Trường không hỗ trợ, gồm `score`, `remainderScore`, `weight` và `userId`, bị trả 400 để không báo lưu thành công khi thực tế chưa lưu điểm.

```json
{
  "assessment": "THEORY",
  "parts": [
    {"id":"tk1","name":"Thường kỳ 1","kind":"REGULAR"},
    {"id":"mid","name":"Giữa kỳ","kind":"MIDTERM"},
    {"id":"btl-final","name":"BTL cuối kỳ","kind":"PROJECT","project":{"target":"FINAL","share":100}}
  ]
}
```

- `assessment`: `THEORY` / `PRACTICAL`, chỉ hai lựa chọn như UI hiện tại.
- `parts`: mảng **0–10 cột**; thứ tự mảng chính là thứ tự hiển thị. `[]` lưu được bản trống đang thiết lập.
- `parts[].id`: mã cột ổn định, 1–80 ký tự ASCII chữ/số/`_`/`-`, bắt đầu bằng chữ/số, không trùng trong cùng cấu hình. Không đổi ID khi chỉ đổi tên, vai trò hoặc vị trí. Đổi ID có nghĩa xóa cột cũ, thêm cột mới.
- `name`: tên 1–200 ký tự, bỏ khoảng trắng hai đầu; không được chỉ có khoảng trắng.
- `project`: chỉ dùng khi kind=PROJECT; với loại cột khác phải bỏ hoặc null.

| `kind` | Nhãn | Lý thuyết | Thực hành |
|---|---|---|---|
| REGULAR | Điểm thường kỳ | Có | — |
| REGULAR_TEST | Kiểm tra thường kỳ | Có | — |
| MIDTERM | Giữa kỳ | Có, tối đa 1 | Có |
| PRACTICE_REGULAR | Thường kỳ thực hành | — | Có |
| PRACTICE_TEST | Kiểm tra thực hành | — | Có |
| FINAL | Cuối kỳ | Có | Có |
| PROJECT | Bài tập lớn | Có | Có |

Không khóa các cột đề xuất. Có thể thêm/xóa/đổi tên/đổi loại/đổi thứ tự và lưu bản thiếu nhóm. Một cấu hình có tối đa **một vai trò cuối kỳ**, tính cả PROJECT→FINAL. Không tạo thêm cột FINAL bên cạnh BTL đã làm hoặc góp vào cuối kỳ.

### Bài tập lớn

`project = {target, share}`. `share` lớn hơn 0, không quá 100, tối đa 4 chữ số sau dấu thập phân, là tỷ lệ **trong cột đích**, không phải tỷ lệ toàn môn.

- `PRACTICE`, `share=100`: BTL thay một cột thực hành, chỉ ở học phần PRACTICAL. Không tạo thêm một cột thực hành trùng cho cùng điểm BTL.
- `FINAL`, `share=100`: BTL làm toàn bộ cột cuối kỳ, dùng được ở THEORY/PRACTICAL.
- `FINAL`, `0<share<100`: BTL góp một phần cột cuối kỳ, phần còn lại sẽ nhập điểm riêng ở 5A.2. Ví dụ 40% là 40% **cột cuối kỳ**. Không thêm cột FINAL thứ hai.

Hai ví dụ người dùng cung cấp: React→PRACTICE/100, World Wide Web Java→FINAL/100. Tệp mẫu chỉ minh họa; chọn loại học phần và bộ cột đúng lớp đang học. File WWW Java minh họa THEORY; nếu lớp là thực hành phải đổi assessment và các loại cột tương ứng. API không dò tên môn để tự gán chính sách.

## Response và trọng số

Phản hồi có `id, courseId, assessment, parts, state, missingGroups, version, createdAt, updatedAt`. Mỗi cột có `id, name, kind, project, weightNumerator, weightDenominator, weight`.

- THEORY: nhóm thường kỳ tổng 20% chia đều các cột REGULAR/REGULAR_TEST; MIDTERM 30%; FINAL hoặc PROJECT→FINAL 50%. Thiếu nhóm vẫn giữ đúng phần trăm nhóm còn lại, không tự phân bổ lên 100%.
- PRACTICAL: từng cột bằng nhau, mỗi cột `100 / số cột` %. BTL thay cột thực hành hoặc cuối kỳ vẫn là một cột trong bộ này. Gợi ý 3/5 cột theo tín chỉ của UI không biến thành ràng buộc cứng; người dùng chọn đúng số cột theo đề cương.
- `weightNumerator/weightDenominator` biểu diễn phần trăm dưới dạng tỷ lệ chính xác; `weight` là phần trăm để hiển thị, làm tròn tối đa 12 chữ số sau dấu thập phân. Với 3 cột thực hành là `100/3`, không lưu 33.33 làm nguồn tính điểm. Backend tự dựng trọng số từ cấu hình đã lưu, client không gửi tỷ lệ toàn môn tùy ý.
- `state=READY`: cấu trúc đủ nhóm theo chính sách trên; **không có nghĩa đã nhập đủ điểm, qua môn hoặc được tính GPA**. `DRAFT` lưu được nhưng còn thiếu nhóm; THEORY có `missingGroups` là REGULAR/MIDTERM/FINAL, PRACTICAL trống có PRACTICAL_COLUMNS.

Tỷ lệ BTL được chuẩn hóa JSON giống nhau trước/sau đọc DB/restart. Điểm chưa nhập khác điểm 0 sẽ do 5A.2 xử lý; 5A.1 không sinh điểm 0 hoặc kết quả giả.

## Đồng thời và quan hệ dữ liệu

Mọi lần ghi khóa hàng tài khoản giống các module môn/học kỳ/bài/lịch/thi. PUT kể cả giống hệt hoặc chỉ đổi cột cũng tăng version. Version cũ trả 409; thất bại giữ nguyên toàn bộ header/cột/version. GET/List dùng một snapshot PostgreSQL cho header/version và các cột, tránh trộn bản cũ/mới.

Thay bộ cột giữ UUID nội bộ cho ID cột còn tồn tại; xóa thật các cột bị bỏ. DB có FK ownership, loại học phần/cột, BTL, vị trí 0–9, key/vị trí và vai trò cuối kỳ/giữa kỳ không trùng. Unique/FK phù hợp được kiểm tra cuối transaction để cho phép hoán đổi vị trí, thay cột cuối kỳ và đổi học phần nguyên tử.

Xóa/chuyển học kỳ một môn còn cấu hình (kể cả DRAFT trống) trả 409 `COURSE_HAS_GRADE_CONFIGURATION`; cần xử lý cấu hình trước. Đổi tên/tín chỉ/thông tin môn trong cùng kỳ không reset bộ cột. Xóa cấu hình không xóa môn/lịch/bài tập và không tác động cấu hình môn khác. Đợt 5A.2 sẽ bổ sung quy tắc khi cột đã có giá trị điểm.

## Lỗi chính

| Code | HTTP | Xử lý |
|---|---|---|
| VALIDATION_FAILED / INVALID_REQUEST | 400 | Kiểm tra kiểu/trường/độ dài/JSON; không có dữ liệu mới. |
| INVALID_GRADE_CONFIGURATION | 400 | Sửa loại cột/BTL/mã trùng/vai trò cuối kỳ, giữa kỳ. |
| GRADE_CONFIGURATION_NOT_FOUND | 404 | Chưa có/đã xóa/không thuộc tài khoản; đọc lại List hoặc môn. |
| COURSE_NOT_FOUND / SEMESTER_NOT_FOUND | 404 | Chọn ID của chính tài khoản. |
| GRADE_CONFIGURATION_ALREADY_EXISTS | 409 | Đọc cấu hình hiện có, không tự retry POST. |
| GRADE_CONFIGURATION_VERSION_CONFLICT | 409 | Đọc mới nhất rồi đối chiếu trước khi sửa/xóa. |
| COURSE_HAS_GRADE_CONFIGURATION | 409 | Xử lý cấu hình trước khi xóa/chuyển môn. |

Nếu request ghi mất phản hồi, dùng List/Get đối chiếu; không tự gửi lại thao tác tạo/sửa/xóa. Hướng dẫn thực hành: `../../docs/BACKEND-PHASE-5A1.md`.
