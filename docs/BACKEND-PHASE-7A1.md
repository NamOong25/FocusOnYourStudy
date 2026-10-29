# 7A.1 — API thống kê tiến độ bài tập

Đã thêm API thống kê bài tập theo học kỳ, có lọc môn/múi giờ; giao diện giữ nguyên trong đợt này. Không tạo lại database, không migration/dependency mới, không tự thêm dữ liệu mẫu vào tài khoản của bạn. Kế hoạch tự học và Pomodoro không bị tính thành bài tập.

## 1. Khởi động lại backend

Dừng terminal backend cũ bằng Ctrl+C rồi chạy lại ở VS Code hoặc IntelliJ:

```powershell
cd 'D:\Video OBS\QuanLyHocTap\backend'
.\scripts\Run-Local.ps1
```

Giữ terminal này chạy. Lệnh bên dưới dùng terminal thứ hai, cũng ở thư mục `backend`. Đợt này thử API nên không cần mở frontend. Nếu backend chạy cổng khác 8080, thêm `-BaseUrl 'http://localhost:CỔNG_CỦA_BẠN'` vào script thử.

## 2. Lấy ID học kỳ

```powershell
.\scripts\Try-Semesters.ps1 -Mode List
```

Nhập email/mật khẩu tài khoản đã đăng ký. Trong kết quả, tìm đúng term/startYear rồi copy trường `id`. Nếu danh sách trống, tạo một học kỳ trong app trước; kỳ đã có nhưng chưa có bài vẫn thống kê được số 0.

## 3. Xem thống kê cả học kỳ

Thay chuỗi bên dưới bằng ID thật vừa copy:

```powershell
$hocKyId = 'DÁN_ID_HỌC_KỲ_VÀO_ĐÂY'
.\scripts\Try-AssignmentStatistics.ps1 -SemesterId $hocKyId
```

Nhập lại tài khoản khi được hỏi; mật khẩu nhập ẩn. Script đăng nhập phiên riêng, in JSON thống kê và câu tiếng Việt, rồi đăng xuất chính phiên script; không đăng xuất phiên app. Không in access/refresh token, không lưu mật khẩu vào file được commit.

Ví dụ nếu kỳ có 5 bài và 2 bài COMPLETED thì `totalAssignments = 5`, `completedAssignments = 2`, `completionPercent = 40`.

| Trường | Bạn đọc thế nào |
| --- | --- |
| todoAssignments | Chưa làm |
| inProgressAssignments | Đang làm |
| completedAssignments | Đã hoàn thành |
| pendingAssignments | Chưa làm + đang làm |
| overdueAssignments | Chưa xong và đã qua đúng ngày/giờ hạn nộp |
| notDueAssignments | Chưa xong và còn hạn, gồm cả sắp hạn và xa hơn |
| dueSoonAssignments | Chưa xong, hạn từ thời điểm tính đến cùng giờ sau 7 ngày lịch |

`asOf` là thời điểm server tính; `date/timeZone` cho biết ngày/múi giờ đang dùng. Tài khoản mới thường dùng Asia/Ho_Chi_Minh. Bỏ `-TimeZone` lấy zone hồ sơ; có thể thử rõ ràng:

```powershell
.\scripts\Try-AssignmentStatistics.ps1 -SemesterId $hocKyId -TimeZone 'Asia/Ho_Chi_Minh'
```

## 4. So với danh sách bài tập

```powershell
.\scripts\Try-Assignments.ps1 -Mode List -SemesterId $hocKyId
```

Đếm TODO/IN_PROGRESS/COMPLETED và so với các trường tương ứng. Ba số này phải cộng bằng tổng. Bài COMPLETED có deadline cũ vẫn chỉ nằm trong đã hoàn thành, không quá hạn. `overdue + notDue = pending`; “sắp hạn” nằm trong “còn hạn”, không cộng thêm lần nữa.

Nếu cần tạo bài để thử, dùng app như bình thường hoặc script `Try-Assignments.ps1` hiện có. Không có bước seed/reset bắt buộc.

## 5. Kiểm tra cập nhật bằng app

Nếu frontend đang chạy thì dùng tab hiện có. Nếu chưa chạy và muốn sửa dữ liệu qua giao diện, mở frontend ở terminal riêng:

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
npx expo start --web --port 8092
```

1. Chọn đúng học kỳ, tạo một bài TODO có hạn đã qua; đọc lại thống kê: tổng/todo/quá hạn tăng 1.
2. Đổi bài đó sang IN_PROGRESS: todo giảm 1, inProgress tăng 1; quá hạn không đổi.
3. Đổi sang COMPLETED: completed tăng 1; pending/quá hạn giảm 1; phần trăm thay đổi. Deadline không bị tự dời.
4. Mở lại TODO rồi dời deadline sang ngày mai: quá hạn giảm, sắp hạn tăng.
5. Dời ra sau hơn 7 ngày: còn hạn vẫn giữ nhưng sắp hạn giảm.
6. Xóa bài thử: tổng và các nhóm tương ứng giảm. Đọc lại API, không cần seed hoặc khởi động lại database.

Mỗi lần so deadline, chú ý `asOf` của lần đọc: thời gian tiếp tục chạy, bài rất sát hạn có thể chuyển nhóm trong lúc bạn thao tác. Phần trăm làm tròn số nguyên HALF_UP (1/3 = 33%, 2/3 = 67%, 1/8 = 13%). Kỳ trống trả 0 bài/0%, không phải đã hoàn thành 100%.

## 6. Lọc một môn và tách tài khoản

```powershell
.\scripts\Try-Courses.ps1 -Mode List -SemesterId $hocKyId
$monId = 'DÁN_ID_MÔN_VÀO_ĐÂY'
.\scripts\Try-AssignmentStatistics.ps1 -SemesterId $hocKyId -CourseId $monId
```

- Môn thuộc kỳ đang chọn: chỉ đếm bài môn đó.
- Môn của chính bạn nhưng ở kỳ khác: giao hai bộ lọc không có bài, trả 0.
- ID kỳ/môn không tồn tại hoặc thuộc tài khoản B: trả 404; không dùng số 0 để che lỗi quyền.
- Đăng nhập B và chọn kỳ B: chỉ thấy dữ liệu B. Script không nhận tham số userId để đọc thay chủ tài khoản.

Zone `Bad/Zone` phải báo 400 `INVALID_ASSIGNMENT_STATISTICS_FILTER`. Nếu backend tắt, script báo không đọc được; không in kết luận “0/0 bài”. Script cần `-SemesterId`; không chọn ngầm kỳ CURRENT.

## 7. Thử trong IntelliJ

Mở project `backend`, chạy backend như cấu hình sẵn. Mở [assignment-statistics.http](../backend/api/assignment-statistics.http), thay baseUrl/semesterId/courseId. Đặt accessToken trong HTTP Client **private environment** như các file API hiện có; không commit token thật. Chạy GET cả kỳ, lọc môn, đối chiếu GET assignments và các request lỗi trong file. Token đăng nhập hiện có chỉ dùng trong thời hạn của nó; đăng nhập lại nếu hết hạn.

Hợp đồng đầy đủ, ví dụ JSON và quy tắc DST: [ASSIGNMENT-STATISTICS.md](../backend/docs/ASSIGNMENT-STATISTICS.md).

## 8. Phạm vi nghiệm thu

Các tests mới dùng schema PostgreSQL riêng, tài khoản QA riêng và tự dọn schema. Clock cố định chỉ nằm trong test cho service thống kê, không đổi clock JWT hoặc thêm API ép thời gian vào sản phẩm.

**Kết quả ngày 29/10/2026: 723 tests backend/Maven verify qua (37 mới: 8 window, 10 service, 19 HTTP/PostgreSQL/PowerShell), không lỗi/bỏ qua. TypeScript và 557 tests frontend hồi quy qua, không lỗi/bỏ qua.** Kiểm tra: kỳ trống; 5 bài/40%; ranh giới microsecond; DST 167/169 giờ; zone hồ sơ/zone chọn; bộ lọc kỳ/môn; cùng tên/mã khác kỳ; quyền A/B; GET không ghi; cập nhật trạng thái/deadline/xóa/chuyển môn; đối chiếu danh sách gốc; đồng thời; PowerShell 5.1 UTF-8, lỗi và đóng đúng phiên script.

Chạy lại bộ kiểm thử backend bằng `backend/scripts/Test-Local.ps1`. Kết quả XML/txt trong `backend/target/surefire-reports` được Git bỏ qua. API 7A.1 chưa nối vào UI nên không coi 37 tests này là nghiệm thu giao diện 7A.2/7A.3.

Không diễn giải trạng thái hiện tại thành lịch sử nộp đúng hạn/trễ hạn theo tháng. Giao diện Thống kê và lối bấm mở danh sách sẽ làm ở **7A.2**, nghiệm thu liên thông ở **7A.3**; 7A chưa hoàn tất chỉ vì đã có API. Các phần điện thoại/GPA đặc thù đã hoãn vẫn giữ nguyên.

Tên commit: **Bổ sung API thống kê tiến độ bài tập theo học kỳ**.

```powershell
cd 'D:\Video OBS\QuanLyHocTap'
git add .
git commit -m "Bổ sung API thống kê tiến độ bài tập theo học kỳ"
git push origin main
```
