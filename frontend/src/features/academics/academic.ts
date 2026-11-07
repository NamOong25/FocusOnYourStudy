export type SemesterTerm = 1 | 2 | 3;
export const semesterOptions: { value: SemesterTerm; label: string }[] = [
  { value: 1, label: 'Học kỳ 1' },
  { value: 2, label: 'Học kỳ 2' },
  { value: 3, label: 'Học kỳ 3 (Hè)' },
];
export const semesterName = (term: SemesterTerm) => semesterOptions.find(option => option.value === term)!.label;
export type SemesterStatus = 'Đang học' | 'Sắp tới' | 'Đã kết thúc';
export type Semester = { id: string; term: SemesterTerm; name: string; academicYear: string; status: SemesterStatus; note: string; version?: number };
export type CourseStatus = 'Đang học' | 'Hoàn thành' | 'Dự kiến';
export type CourseColor = 'lavender' | 'mint' | 'peach' | 'blue';
export type Course = { id: string; semesterId: string; code: string; name: string; credits: number; teacher: string; room: string; status: CourseStatus; color: CourseColor; description: string; version?: number };
export const courseColors: Record<CourseColor, { bg: string; ink: string; label: string }> = {
  lavender: { bg: '#E8E2FF', ink: '#5341CD', label: 'Tím' },
  mint: { bg: '#DDF9ED', ink: '#008F70', label: 'Xanh lá' },
  peach: { bg: '#FFE8DD', ink: '#B65933', label: 'Cam đào' },
  blue: { bg: '#E5F3FF', ink: '#2879B5', label: 'Xanh dương' },
};
export const initialSemesters: Semester[] = [
  { id: 'sem-5', term: 1, name: 'Học kỳ 1', academicYear: '2026 – 2027', status: 'Đang học', note: 'Giữ nhịp học đều đặn, dành thời gian cho thực hành và các đồ án.' },
  { id: 'sem-4', term: 2, name: 'Học kỳ 2', academicYear: '2025 – 2026', status: 'Đã kết thúc', note: 'Một học kỳ đã hoàn thành. Những nền tảng để tiếp tục tiến bộ.' },
  { id: 'sem-6', term: 2, name: 'Học kỳ 2', academicYear: '2026 – 2027', status: 'Sắp tới', note: 'Chuẩn bị trước những môn học và mục tiêu cho hành trình tiếp theo.' },
];
export const initialCourses: Course[] = [
  { id: 'course-dsa', semesterId: 'sem-5', code: 'IT301', name: 'Cấu trúc dữ liệu & Giải thuật', credits: 4, teacher: 'ThS. Trần Mai', room: 'Lab 4', status: 'Đang học', color: 'lavender', description: 'Từ cấu trúc dữ liệu cơ bản đến cây, đồ thị và các kỹ thuật thiết kế giải thuật. Kết hợp lý thuyết với bài tập lập trình.' },
  { id: 'course-oop', semesterId: 'sem-5', code: 'IT302', name: 'Lập trình Hướng đối tượng', credits: 4, teacher: 'TS. Lê Văn Tuấn', room: 'A2.301', status: 'Đang học', color: 'blue', description: 'Làm quen với đóng gói, kế thừa, đa hình và thiết kế chương trình có cấu trúc qua các bài tập thực hành.' },
  { id: 'course-db', semesterId: 'sem-5', code: 'IT303', name: 'Cơ sở dữ liệu', credits: 3, teacher: 'ThS. Hoàng Linh', room: 'B1.204', status: 'Đang học', color: 'mint', description: 'Thiết kế mô hình dữ liệu, chuẩn hóa và truy vấn SQL. Áp dụng kiến thức vào bài tập lớn theo nhóm.' },
  { id: 'course-network', semesterId: 'sem-5', code: 'IT304', name: 'Mạng máy tính', credits: 3, teacher: 'TS. Phạm Đức Minh', room: 'C3.104', status: 'Đang học', color: 'peach', description: 'Khám phá cách dữ liệu đi qua mạng, các giao thức truyền thông và lập trình Socket.' },
  { id: 'course-math', semesterId: 'sem-5', code: 'MATH201', name: 'Toán rời rạc', credits: 3, teacher: 'ThS. Nguyễn Minh Anh', room: 'B202', status: 'Đang học', color: 'lavender', description: 'Nền tảng logic, tập hợp, tổ hợp và đồ thị cho các môn học chuyên ngành.' },
  { id: 'course-intro', semesterId: 'sem-4', code: 'IT101', name: 'Nhập môn lập trình', credits: 3, teacher: 'ThS. Phạm Thanh', room: 'A1.202', status: 'Hoàn thành', color: 'blue', description: 'Nền tảng tư duy lập trình và kỹ năng giải quyết bài toán bằng chương trình.' },
  { id: 'course-linear', semesterId: 'sem-4', code: 'MATH101', name: 'Đại số tuyến tính', credits: 3, teacher: 'TS. Nguyễn Hà', room: 'B1.102', status: 'Hoàn thành', color: 'mint', description: 'Ma trận, định thức, hệ phương trình và không gian vector.' },
];
