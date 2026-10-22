# Hợp đồng API học kỳ — 3A

Base `/api/v1/semesters`. Tất cả request cần `Authorization: Bearer <accessToken>` và phiên còn hiệu lực. Chủ sở hữu lấy từ JWT `sub`, không từ body/query. Cookie đăng nhập không đủ để truy cập. DTO phản hồi không xuất entity hoặc `userId`.

| Method/path | Thành công | Nội dung |
| --- | --- | --- |
| GET `/api/v1/semesters` | 200 | `data` là danh sách của tài khoản hiện tại; trống `[]`; năm giảm dần rồi kỳ giảm dần |
| GET `/api/v1/semesters/{id}` | 200 | `data` là một học kỳ thuộc tài khoản |
| POST `/api/v1/semesters` | 201 | Tạo mới, có header Location |
| PUT `/api/v1/semesters/{id}` | 200 | Thay toàn bộ các trường sửa được, bắt buộc version mới nhất |
| DELETE `/api/v1/semesters/{id}?version=...` | 204 | Xóa kỳ trống; không có body |

POST body:

```json
{ "term": 1, "startYear": 2026, "status": "UPCOMING", "note": "Kế hoạch học kỳ" }
```

PUT thêm `"version": 0` (thay bằng version nhận từ GET mới nhất). `term`, `startYear`, `status` bắt buộc; note tùy chọn/null → chuỗi rỗng, trim, tối đa 2000 ký tự. Kỳ 1/2 là kỳ chính, 3 là hè tùy chọn; startYear 1900–2099 biểu diễn năm startYear–startYear+1. Các số nguyên không nhận phần thập phân rồi cắt xuống; version không âm. Status chỉ `CURRENT`, `UPCOMING`, `COMPLETED`.

Ví dụ `data`:

```json
{
  "id": "6dedc2ee-6254-4d21-bde7-78dacd8c8dc9",
  "term": 1,
  "startYear": 2026,
  "name": "Học kỳ 1",
  "academicYear": "2026 – 2027",
  "status": "UPCOMING",
  "note": "Kế hoạch học kỳ",
  "version": 0,
  "createdAt": "2026-10-22T08:00:00Z",
  "updatedAt": "2026-10-22T08:00:00Z"
}
```

Thành công có envelope `data/meta` hiện có, timestamp UTC/requestId; `Cache-Control: no-store`. Tên/năm học được suy ra, không nhận chuỗi tên từ client. Không có endpoint chọn học kỳ đang xem của Dashboard; trạng thái CURRENT là kỳ đang học, khác lựa chọn bộ lọc trên giao diện.

## Quy tắc cập nhật

- Không trùng `(tài khoản, năm bắt đầu, kỳ)`; tài khoản khác có thể tạo cùng kỳ/năm.
- Tối đa một CURRENT mỗi tài khoản, có thể chưa có CURRENT. POST/PUT status CURRENT chuyển kỳ CURRENT cũ thành COMPLETED trong cùng transaction. Trường hợp kỳ mới không hợp lệ/trùng/stale thì kỳ cũ không thay đổi. Không tự tạo kỳ 2/hè.
- PUT/DELETE kiểm tra version trước ghi; thay đổi kỳ cũ khi chuyển CURRENT cũng tăng version kỳ đó. Nếu version cũ, tải lại danh sách rồi để người dùng xem/chọn lại, không tự ghi đè hoặc gửi lại vô hạn. PUT không đổi giá trị thực tế có thể giữ version.
- Xóa không tự chọn một CURRENT khác. Kỳ có môn bị chặn, không xóa dây chuyền. Course API vẫn khóa cho tới 3B.
- Mọi ghi học kỳ khóa hàng chủ tài khoản bằng PESSIMISTIC_WRITE trong transaction, rồi truy vấn theo `id + user_id`. Kiểm tra trùng trước ghi; flush kỳ cũ trước đánh CURRENT kỳ mới để phù hợp partial unique index. Constraint V1 vẫn là lớp bảo vệ cuối cùng. 3B cần dùng cùng thứ tự khóa khi ghi môn liên quan học kỳ.

## Lỗi

| HTTP/code | Ý nghĩa |
| --- | --- |
| 400 VALIDATION_FAILED | Thiếu/sai giới hạn trường; có errors field/message, không echo giá trị |
| 400 INVALID_REQUEST | JSON/enum/UUID/version query sai hoặc thiếu |
| 401 AUTHENTICATION_REQUIRED / INVALID_ACCESS_TOKEN | Thiếu token, token/phiên không còn hợp lệ |
| 404 SEMESTER_NOT_FOUND | Không tồn tại hoặc thuộc người khác; cùng phản hồi để không lộ chủ sở hữu |
| 409 SEMESTER_ALREADY_EXISTS | Trùng kỳ/năm trong tài khoản |
| 409 SEMESTER_VERSION_CONFLICT | Bản ghi đã đổi, cần tải lại |
| 409 SEMESTER_HAS_COURSES | Còn môn nên chưa xóa được |
| 409 DATA_CONFLICT | Constraint/optimistic conflict cuối cùng nếu có tác nhân ghi ngoài luồng service |
| 503 DATABASE_UNAVAILABLE | Chưa truy cập được DB; không in SQL/credentials |

Web gọi endpoint học kỳ bằng Bearer chủ động, có thể `credentials: 'omit'`; không cần cookie/CSRF ở đây vì cookie không dùng xác thực nghiệp vụ. GET CSRF và POST auth cookie vẫn giữ nguyên bảo vệ CSRF/origin như 2B. Origin lạ vẫn bị CORS chặn. Chỉ các method/path trong bảng được mở; PATCH và API môn còn bị từ chối.

Mẫu REST Client: `../api/semesters.http`. Hướng dẫn terminal: `../../docs/BACKEND-PHASE-3A.md`.

Tham khảo triển khai: [Spring Data JPA 4.1 locking](https://docs.spring.io/spring-data/jpa/reference/4.1/jpa/locking.html), [PostgreSQL 17 row locks](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-ROWS). Các hành vi ứng dụng ở trên được xác minh bằng test tích hợp, không suy từ tài liệu framework.
