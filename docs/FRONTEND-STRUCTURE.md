# Cấu trúc mã nguồn frontend

Đợt sắp xếp theo yêu cầu ngày 20/10/2026. Mỗi chức năng chứa màn hình, form, thành phần riêng và phần xử lý liên quan. Phần dùng chung tách khỏi các chức năng để dễ tìm và mở rộng.

## Sơ đồ

```text
App.tsx                          Khung ứng dụng, ghép các màn và provider
src/
├── features/
│   ├── academics/               Học kỳ, môn học, form và CourseChoices
│   │   └── components/          SemesterPicker và AcademicYearPicker
│   ├── account/                 AccountScreen; account.ts kiểm tra form/hồ sơ mẫu
│   │   ├── api/                 Hợp đồng DTO và API đăng ký/đăng nhập/hồ sơ
│   │   ├── auth/                AuthProvider, useApiAction và ánh xạ hồ sơ hiển thị
│   │   └── components/          AuthForm, AuthHero, AccountProfile, PreferenceEditors
│   ├── assignments/             TaskForm và chi tiết bài tập
│   ├── assistant/               Trợ lý AI, đề xuất lịch, tài liệu/quiz mẫu
│   ├── dashboard/               HomeScreen
│   ├── exams/                   Danh sách/chi tiết và form lịch thi
│   ├── focus/                   FocusScreen và focus.ts (timer, lịch sử, số liệu)
│   │   └── components/          FocusGoalCard/Sheet, FocusStreakCard, FocusHistorySheet
│   ├── onboarding/              Màn bắt đầu và hướng dẫn thiết lập
│   ├── notifications/           NotificationsCenter, nguồn nhắc việc và trạng thái đọc
│   │   └── components/          NotificationBell và ReminderCard
│   ├── preview/                 Bảng thử trạng thái UI
│   ├── grades/                  Bảng điểm, editor, quy tắc, gpaComparison.ts và SemesterGradesSheet
│   ├── schedule/                Lịch học, chuỗi/ngoại lệ và kiểm tra trùng
│   ├── statistics/              StatsScreen và statistics.ts (tổng hợp dữ liệu)
│   │   └── components/          Bộ lọc/biểu đồ học; GpaComparisonScreen, GpaSemesterCard, GpaComparisonChart
│   └── study/                   Kế hoạch tự học, form và chi tiết buổi học
├── navigation/
│   ├── Navigation.tsx           Provider, scope, cuộn và xử lý Back
│   └── navigationState.ts       Route và quy tắc quay lại thuần TypeScript
├── shared/
│   ├── api/                     HTTP client, lỗi chuẩn hóa, timeout/hủy và URL môi trường
│   ├── forms/                   useFormChanges (so bản nháp) và UnsavedChanges (hộp xác nhận)
│   ├── feedback/                Thông báo và phạm vi thao tác chờ/lỗi/hủy
│   ├── components/
│   │   ├── ActionStatus.tsx         Đang xử lý, lỗi, thử lại và hủy
│   │   ├── NoticeToast.tsx          Thông báo kết quả dùng chung
│   │   ├── StateView.tsx            Trạng thái tải, lỗi và trống
│   │   ├── Badge.tsx                Nhãn trạng thái
│   │   ├── Button.tsx               Nút hành động
│   │   ├── Card.tsx                 Khung thẻ nội dung
│   │   ├── DateTimePicker.tsx       Chọn ngày/giờ và provider
│   │   ├── Empty.tsx                Nội dung khi danh sách trống
│   │   ├── Field.tsx                Ô nhập có nhãn
│   │   ├── Icon.tsx                 Biểu tượng và kiểu IconName
│   │   ├── IconButton.tsx           Nút chỉ có biểu tượng
│   │   ├── IconTile.tsx             Biểu tượng trong ô nền
│   │   ├── Link.tsx                 Nút dạng liên kết
│   │   ├── Progress.tsx             Thanh tiến độ
│   │   ├── Row.tsx                  Bố cục theo hàng
│   │   ├── Section.tsx              Tiêu đề khu vực và hành động
│   │   ├── Segments.tsx             Bộ chuyển nhóm/tab
│   │   ├── Sheet.tsx                Hộp thoại trượt và xử lý quay lại
│   │   ├── Typography.tsx           Component chữ T
│   │   └── index.ts                 Danh sách export công khai
│   ├── utils/
│   │   ├── dates.ts             Ngày địa phương, định dạng và kiểm tra
│   │   └── pickerDates.ts       Ô lịch, chuyển tháng và xử lý ngày/giờ
│   └── theme.ts                 Màu sắc, font và style dùng chung
└── store/
    └── model.tsx                PrototypeProvider, dữ liệu mẫu và timer
assets/                          Ảnh và tài nguyên tĩnh
docs/                            Thiết kế, checklist, lệnh Git và script QA
```

## Tìm file để chỉnh sửa

| Việc cần sửa | File chính |
| --- | --- |
| Trang chủ | `src/features/dashboard/HomeScreen.tsx` |
| Tạo/chỉnh sửa bài tập | `src/features/assignments/TaskForm.tsx` |
| Chi tiết bài tập | `src/features/assignments/TaskDialog.tsx` |
| Môn và học kỳ | `src/features/academics/AcademicsScreen.tsx` và `forms.tsx` cùng thư mục |
| Lịch học | `src/features/schedule/ScheduleScreen.tsx`, `ClassForm.tsx`, `ClassDialog.tsx` |
| Lịch thi | `src/features/exams/Exams.tsx` và `ExamForm.tsx` |
| Tự học | `src/features/study/StudyPlanScreen.tsx`, `StudyForm.tsx`, `StudyDialog.tsx` |
| Điểm và công thức GPA | `src/features/grades/GradesScreen.tsx`, `GradeEditor.tsx`, `grades.ts` |
| Pomodoro | `src/features/focus/FocusScreen.tsx`, `focus.ts` và `components/`; store giữ state timer xuyên các tab |
| Thống kê | `src/features/statistics/StatsScreen.tsx`, `statistics.ts` và `components/`; nhận phiên Pomodoro và bài tập từ store |
| So sánh GPA | `src/features/statistics/components/GpaComparisonScreen.tsx` và các thẻ/biểu đồ GPA; xử lý trong `src/features/grades/gpaComparison.ts`, bảng điểm học kỳ ở `SemesterGradesSheet.tsx` |
| Thông báo trong app | `src/features/notifications/NotificationsCenter.tsx`, `notifications.ts`, `useInAppNotifications.ts` và `components/`; AppShell giữ hook xuyên các tab |
| AI, tài liệu, trắc nghiệm | `src/features/assistant/` |
| Hồ sơ và cài đặt | `src/features/account/` |
| Nút, thẻ, hộp thoại toàn app | Các file `Button.tsx`, `Card.tsx`, `Sheet.tsx`… trong `src/shared/components/` |

## Quy tắc khi thêm mã

- Mã chỉ phục vụ một chức năng đặt trong thư mục chức năng đó. Tên màn chính kết thúc bằng `Screen.tsx`; form và hộp thoại dùng tên mô tả cụ thể.
- Chỉ đưa vào `shared/` khi thành phần/tiện ích thực sự dùng chung, không phụ thuộc dữ liệu của một chức năng riêng. Bộ chọn môn thuộc `academics/` vì đọc danh sách môn.
- Mỗi component dùng chung nằm trong file mang tên riêng. `Typography.tsx` xuất component chữ `T`; `Icon.tsx` xuất thêm kiểu `IconName`. `SheetContent` là chi tiết nội bộ nên vẫn ở cạnh `Sheet`.
- Các màn import UI qua `shared/components/index.ts`; file này chỉ liệt kê export. Bên trong component, import trực tiếp từ file lân cận để tránh phụ thuộc vòng qua index.
- Form bài tập không xuất lại form lịch học/lịch thi hoặc bộ chọn môn.
- Ưu tiên file cùng chức năng nằm gần nhau. Khi một chức năng lớn hơn mới tách thêm `components/`, `hooks/` hoặc `types/` bên trong; không tạo thư mục rỗng trước.
- State liên kết nhiều màn hiện vẫn ở `store/model.tsx`. Đây là state prototype, còn gộp dữ liệu mẫu và timer; UI 4C đã tách reducer timer và các hàm lịch sử/mục tiêu/chuỗi sang `focus/focus.ts`. Chưa tách thành store theo từng lĩnh vực.
- `study/learning.ts` hiện chứa kiểu buổi học cùng checklist/tài liệu mẫu liên quan bài tập, giữ nguyên logic cũ. Có thể tách tiếp theo mô hình API khi nối backend.
- Khi làm Spring Boot: thêm lớp gọi HTTP thực tế và API của từng chức năng; xử lý lưu/đồng bộ ở đợt backend. Chưa tạo thư mục services/API rỗng trong đợt này.

## Phạm vi và kiểm tra

Đổi vị trí/tên file, cập nhật import và đường dẫn ảnh; không thay màn hình, hành vi hoặc dependency. Năm script kiểm tra logic được cập nhật theo đường dẫn mới và giữ cấu trúc thư mục khi biên dịch tạm. Tài liệu các đợt UI cũ lưu mô tả tại thời điểm thực hiện; dùng sơ đồ này để tìm đường dẫn hiện tại.

Lệnh kiểm tra:

```powershell
npm run typecheck
node docs/qa-ai-unit.cjs
node docs/qa-calendar-unit.cjs
node docs/qa-grades-unit.cjs
node docs/qa-picker-unit.cjs
node docs/qa-navigation-unit.cjs
npm run build:web
npx expo export --platform android --output-dir .expo/native-check
```

Với Metro đang chạy ở cổng 8092 và Playwright/Chrome đã cài, chạy thêm `node docs/qa-smoke.cjs` và `node docs/qa-navigation.cjs`. Có thể thiết lập `PLAYWRIGHT_MODULE`/`CHROME_PATH` như các đợt trước. Kết quả ở `.expo/`, không commit.

Tên commit của đợt sắp xếp: **Tổ chức thư mục frontend và tách component dùng chung**. Đợt mới nhất xem `GIT-COMMITS.md`. Lệnh push ở `GIT-COMMITS.md`. Checklist UI 3C/3D và backend vẫn chưa đánh dấu hoàn thành.

## Kết quả kiểm tra sau khi sắp xếp (20/10/2026)

- TypeScript: qua; web export và Android Hermes export: qua.
- Năm bộ kiểm tra logic có sẵn: AI 31, lịch 18, điểm 35, bộ chọn 24, điều hướng 19 kiểm tra đều qua.
- `qa-smoke.cjs` và `qa-navigation.cjs`: qua ở chiều rộng 320/390/430/1280; không ghi nhận lỗi runtime/console hoặc tràn ngang. Luồng bài tập, lịch, Pomodoro, AI và quay lại giữ trạng thái vẫn hoạt động.
- Đối chiếu 43 file ứng dụng trước/sau: phần triển khai giữ nguyên khi loại các import/re-export và đường dẫn ảnh đã chuyển vị trí.
- Android mới kiểm tra bundle; chưa kiểm tra trên điện thoại thật trong đợt này.

## Cập nhật tách component dùng chung (20/10/2026)

- Đã thay `ui.tsx` bằng 15 file theo tên component; bộ chọn ngày/giờ giữ ở `DateTimePicker.tsx`. `index.ts` chỉ xuất component/kiểu; các file nội bộ import trực tiếp lẫn nhau.
- TypeScript, web export và Android Hermes export: qua. Đối chiếu cấu trúc JavaScript của 15 component sau biên dịch: giữ nguyên phần triển khai so với bản trước khi tách.
- `qa-smoke.cjs` và `qa-navigation.cjs`: qua ở 320/390/430/1280px; không ghi nhận lỗi runtime/console hoặc tràn ngang. Luồng hộp thoại, bộ chọn, AI và quay lại giữ trạng thái vẫn hoạt động. Lượt mở trình duyệt đầu hết thời gian chờ Metro; chạy lại sau khi bundle hoàn tất đã qua.
- Chưa kiểm tra trên điện thoại thật; đợt này chỉ tổ chức mã nguồn, không thêm chức năng.


Từ UI 3C, xem `UI-POLISH-3C.md` cho luồng khởi tạo trống và các file trạng thái dùng chung. `Button.actionLabel` chỉ đánh dấu các thao tác cần chờ mẫu; API thật sẽ thay cơ chế mô phỏng ở giai đoạn backend.


Quy ước kỳ 1/2 chính, kỳ 3 hè tùy chọn theo từng năm ở `SEMESTERS.md`. Hai bộ chọn thuộc chức năng academics; không đặt vào thư mục UI dùng chung.

## Cập nhật phiên đăng nhập — 2C.2

- `features/account/auth/SessionManager.ts`: trạng thái phiên, khôi phục, gộp refresh, logout và chống hồi sinh hồ sơ cũ.
- `sessionTypes.ts`: hợp đồng store/coordinator/state; `sessionPlatform.web.ts`: dấu localStorage và Web Locks/BroadcastChannel; `sessionPlatform.ts`: SecureStore và hàng đợi native.
- `AuthProvider.tsx`: nối manager với React, lifecycle/foreground; không lưu token trong prototype store.
- `components/SessionGate.tsx`: khôi phục/lỗi/thử lại; `LogoutForm.tsx`: xác nhận đăng xuất; `AccountScreen.tsx`/Welcome hiển thị bước hoàn tất khi mất mạng.
- `App.tsx`: remount vùng prototype/navigation khi danh tính đổi; vùng học tập tài khoản vẫn chưa nối backend. API refresh/logout ở `api/accountApi.ts`, HTTP hỗ trợ 204 ở `shared/api/http.ts`.
- Có Expo SecureStore dependency/plugin mới. Hướng dẫn và kiểm tra: `FRONTEND-AUTH-2C2.md`. Native chưa nghiệm thu máy thật.

## Cập nhật học kỳ — 3C.1

- `features/academics/api/semestersApi.ts`: GET/POST/PUT/DELETE, chuyển kiểu Việt/API và kiểm tra dữ liệu phản hồi.
- `api/SemesterManager.ts`: trạng thái tài nguyên, gộp GET, chặn ghi trùng, reload sau ghi và ngăn phản hồi tài khoản cũ.
- `api/useServerSemesters.ts`: vòng đời React, nối auth và thông báo. `store/model.tsx` dùng nguồn này khi đăng nhập, giữ preview riêng khi là khách.
- `components/SemesterApiForm.tsx`: form thật, xóa/xung đột và quyết định nạp dữ liệu mới. `SemesterSyncStatus.tsx`: tải/lỗi/thử lại/phạm vi dữ liệu thật.
- `SessionManager.authorized`: cấp Bearer trong RAM, refresh một lần khi cần, ngăn kết quả phiên cũ. `shared/api/http.ts` hỗ trợ PUT/DELETE; không đặt API học kỳ trong component dùng chung.
- `forms.tsx` chọn form thật hoặc form mẫu. API môn sẽ bổ sung ở 3C.2; các state học tập còn lại chưa lưu backend.

Hướng dẫn kiểm tra: `FRONTEND-SEMESTERS-3C1.md`.
