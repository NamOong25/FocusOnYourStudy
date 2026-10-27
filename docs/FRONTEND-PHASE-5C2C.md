# 5C.2C — Nghiệm thu toàn luồng cấu hình và nhập điểm

Hoàn thành ngày 27/10/2026 trên web. Phạm vi: tài khoản thật, học kỳ/môn, bộ cột, điểm thành phần, tổng kết và GPA học kỳ. Dashboard, GPA tích lũy/so sánh thuộc 5C.3; kiểm tra thiết bị thật/phiên native vẫn để sau ở 2C.3B.

## Kết quả và thay đổi

Đã thao tác từ hai tài khoản QA trống trong schema PostgreSQL riêng. Tài khoản A tạo học kỳ và môn bằng giao diện, thiết lập cột, nhập điểm rồi xem cùng kết quả ở chi tiết môn và Thống kê → Điểm & GPA. Không dùng hoặc thêm dữ liệu vào tài khoản thật của người dùng.

Phát hiện và sửa một chỗ gây hiểu nhầm ở cả form cấu hình và form điểm: khi lần lưu đã chuyển sang đối chiếu, nút đóng vẫn hỏi “Bỏ thay đổi” dù bản nháp đã được giữ trong workspace. Bây giờ có thể đóng form đó và mở lại bằng **Mở lần lưu cần kiểm tra**, tiếp tục xem đúng bản nháp. Chưa đối chiếu/duyệt thì vẫn khóa ghi; không tự gửi lại. Bản nháp thông thường chưa gửi vẫn có cảnh báo rời form; chọn tiếp tục chỉnh sửa giữ nguyên nội dung. Đang gửi/kiểm tra vẫn phải đợi kết quả trước khi đóng.

Không thay công thức điểm/GPA, backend, migration hay dependency; database vẫn V9.

## Các ca đã đạt

| Ca | Kết quả quan sát |
| --- | --- |
| Tài khoản trống → học kỳ → môn → bộ cột → điểm | Tạo học kỳ 1 năm 2026–2027, môn 3 tín chỉ; bộ đề xuất có 3 cột trống. Nhập 8/8/8: tổng kết 8,0, hệ 4 là 3,5. |
| Hai màn dùng cùng điểm | Chi tiết môn và bảng điểm học kỳ hiển thị đúng tổng kết từ backend. Với TK 8, GK 7, CK 9: tổng kết 8,2, GPA học kỳ 3,50 khi chỉ có môn đó. |
| Đổi tên/thứ tự | Đưa giữa kỳ lên đầu và đổi tên thường kỳ; mã cột giữ nguyên, điểm vẫn gắn đúng GK 7/TK 8/CK 9, tổng kết không đổi. Đã đối chiếu API theo ID. |
| Điểm trống khác 0 | Xóa điểm GK bằng ô trống rồi lưu: thiếu điểm, tổng kết/GPA không tự thành 0; F5 vẫn trống. Nhập GK 0: hiện điểm 0 và trạng thái không đủ điều kiện thi từ backend. |
| BTL cuối kỳ | BTL 100% chỉ tính một lần. Ca góp 40%: TK 8,125; GK 8; BTL 5; phần còn lại 8 → cột cuối kỳ 6,8, tổng kết 7,4. Thiếu phần còn lại thì tổng kết trống và môn chưa tính GPA. |
| BTL thực hành | Năm cột 0/7/8/9/10, một cột là BTL thay thực hành → tổng kết 6,8. Điểm 0 được giữ; BTL không có thêm phần còn lại. |
| Bảo vệ/xóa hợp lệ | UI khóa xóa/đổi loại cột có điểm và xóa cả cấu hình. Backend cũng chặn, kể cả cột điểm 0. Xóa điểm bằng null rồi mới xóa cột: điểm ở các mã còn lại giữ nguyên, trọng số/tổng kết được tính lại. |
| Xóa rồi tạo lại bảng điểm | Xóa toàn bộ điểm giữ nguyên bộ cột. Sau đó xóa cấu hình, tạo lại với cùng mã cột: ID cấu hình mới, điểm trống; lần ghi theo ID cũ bị từ chối và không tự chuyển số cũ sang bảng mới. |
| Hai tab trình duyệt | Tab B giữ nháp GK 6 ở version 4; tab A lưu GK 0 lên version 5. Tab B bị chặn ghi đè, giữ nháp 6. Đóng/mở lại vẫn giữ nháp; kiểm tra thấy điểm server 0. Chỉ sau khi duyệt bản mới và tự lưu, GK 6 mới được ghi ở version 6, tổng kết 7,9/GPA 3,00. |
| Backend mất kết nối | Tắt riêng backend QA khi đang sửa tên cột; lưu báo cần đối chiếu, giữ nháp và không tự gửi lại. Đóng/mở không hỏi bỏ nháp đã giữ. Kiểm tra khi backend còn tắt vẫn báo lỗi và giữ khóa. |
| Khôi phục backend | Khởi động lại đúng schema QA: điểm/bộ cột/version đã lưu còn nguyên. Đối chiếu thấy tên cũ trên server, chọn thay bản nháp không tự ghi tên đang thử; version vẫn 6. |
| Mất phản hồi sau khi lưu | Kiểm thử tích hợp cho server trả HTTP 200 rồi giả lập mất phản hồi ở client: chỉ một PUT, đọc lại thấy điểm đã lưu. Kiểm tra/duyệt không tự gửi lại. |
| GPA và môn không đạt | Môn F hoàn chỉnh vẫn giữ tín chỉ trong mẫu số, hệ 4 bằng 0. Ca bốn môn 3 tín chỉ có GPA 2,25; thiếu phần còn lại của BTL loại đúng môn thiếu điểm và GPA thành 2,00. |
| Đổi tài khoản | A đang có lần lưu cần kiểm tra rồi đổi sang B: UI B không có môn/điểm/bản nháp của A. API B không đọc/ghi bảng điểm hoặc tính GPA của học kỳ A. |

Các số trên là kết quả theo bộ quy tắc app hiện tại và dữ liệu QA, không phải bảng điểm chính thức của trường hay tỷ lệ BTL mặc định cho mọi môn.

## Bạn tự test một vòng

Khởi động backend và frontend như trước, rồi tải lại trang để lấy bản mới. Dùng môn thử riêng vì các bước sau có sửa/xóa điểm đã lưu.

1. **Lịch học → Môn & học kỳ:** tạo một học kỳ, thêm môn thử 3 tín chỉ. Mở môn → Điểm số → Thiết lập bảng điểm → thêm bộ cột lý thuyết đề xuất → lưu.
2. **Nhập điểm:** mở Nhập / chỉnh sửa điểm, nhập TK 8/GK 7/CK 9 rồi lưu. Mong đợi tổng kết 8,2; nếu kỳ chỉ có môn đủ điểm này thì GPA là 3,50.
3. **Đối chiếu hai màn:** đóng chi tiết → Thống kê → Điểm & GPA → chọn đúng học kỳ. Mở môn: số phải khớp. F5, đóng Hồ sơ nếu đang mở rồi vào lại: bộ cột/điểm vẫn còn.
4. **Đổi cấu hình:** đổi tên TK và đưa GK lên đầu rồi lưu. Điểm phải đi theo đúng tên/loại cột, không đi theo vị trí cũ. Cột có điểm bị khóa xóa/đổi loại.
5. **Trống/0:** để trống GK rồi lưu, tổng kết phải về thiếu dữ liệu; nhập GK 0 rồi lưu phải hiện 0 và trạng thái không đủ điều kiện thi. Nhập GK 7 để trở lại kết quả ban đầu. Hãy nhìn tên cột sau khi đã đổi thứ tự.
6. **Bản nháp chưa gửi:** sửa một điểm hoặc tên cột, bấm đóng. Phải có lựa chọn tiếp tục chỉnh sửa/bỏ thay đổi. Tiếp tục phải giữ số vừa sửa; bỏ thay đổi không ghi số đó lên server.
7. **Hai tab:** mở cùng app ở tab A/B, cùng mở sửa điểm một môn. A lưu trước; B sửa từ bản cũ rồi lưu phải bị chặn. Đóng form B và mở lại từ Mở lần lưu cần kiểm tra: bản nháp vẫn còn, không hỏi bỏ bản nháp đã giữ. Kiểm tra điểm đã lưu → xem và chọn thay bản nháp → sửa rồi tự lưu. Chỉ đọc kiểm tra chưa được gỡ khóa ghi.
8. **Xóa điểm/cột:** ở môn thử, để trống một điểm rồi lưu; vào cấu hình, chỉ cột không còn điểm mới xóa/đổi loại được. Xóa điểm không được xóa các cột khác. Với toàn bộ điểm trống mới có thể xác nhận xóa cả cấu hình.
9. **BTL:** thử bằng môn riêng theo hướng dẫn [5C.2B](FRONTEND-PHASE-5C2B.md), phân biệt toàn bộ cuối kỳ, một phần cuối kỳ và một cột thực hành. Không lấy tỷ lệ QA 40% làm mặc định của môn thật.
10. **Hai tài khoản:** đổi từ A có dữ liệu sang B; không thấy dữ liệu/lần lưu cần kiểm tra của A. Đăng nhập lại A vẫn xem được điểm đã lưu.

Ca mất kết nối có thể thử bằng cách dừng terminal backend đang dùng để test, lưu thay đổi rồi khởi động backend lại. Không tắt PostgreSQL, không xóa database. Sau khi kết nối lại phải kiểm tra dữ liệu server trước khi quyết định lưu tiếp; đừng nhấn lưu lặp.

## Kiểm chứng kỹ thuật

- TypeScript và **374 tests frontend** đạt, gồm 95 test phần điểm đã có. Đã kiểm tra trực tiếp cả hai nhánh đóng form thông thường/đang đối chiếu ở cả cấu hình và điểm.
- **14 nhóm tích hợp API/PostgreSQL** đạt, kiểm tra dữ liệu UI theo mã cột, tính nhất quán điểm/GPA, các cách quy BTL, F/thiếu điểm, bảo vệ/xóa/recreate, mất phản hồi và quyền tài khoản.
- Build web với cấu hình bình thường đạt; không còn URL backend QA trong bundle. Không chạy lại 537 tests backend vì backend không thay đổi (baseline đã đạt ở 5B.2B.2).
- Dùng schema `backend_it_<UUID>`, hai tài khoản giả và các tiến trình loopback riêng. Schema/tiến trình QA được dọn sau kiểm tra; PostgreSQL cục bộ và dữ liệu thật được giữ nguyên.

```powershell
npm run typecheck
node --test tests/*.test.cjs
npm run build:web
```

Ảnh QA: [GPA sau luồng tạo và nhập điểm](images/frontend5c2c-flow.png), [mở lại đối chiếu sau khi đóng form](images/frontend5c2c-reopened-review.png).

## Bước sau

5C.2A/B/C đã hoàn thành trên web. Chuyển sang 5C.3 theo từng đợt nhỏ: nối GPA tích lũy, so sánh học kỳ và Dashboard vào API 5B. Các màn đó chưa dùng để nghiệm thu tính đồng bộ điểm trong đợt này. Kiểm tra thiết bị thật 2C.3B vẫn chưa đánh dấu hoàn thành.

Tên commit: `Nghiệm thu luồng cấu hình và nhập điểm`.
