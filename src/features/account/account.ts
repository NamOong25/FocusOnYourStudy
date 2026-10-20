export type StudentProfile = {
  name: string; email: string; studentId: string; school: string;
  major: string; cohort: string; bio: string; avatar: 'photo' | 'violet' | 'mint' | 'peach';
};
export type AccountPreferences = {
  assignments: boolean; classes: boolean; exams: boolean;
  reminderMinutes: 5 | 15 | 30 | 60; quiet: boolean; quietStart: string; quietEnd: string;
  appearancePreview: 'light' | 'dark'; languagePreview: 'vi' | 'en';
};
export const initialProfile: StudentProfile = {
  name: 'Nguyễn Hoàng Nam', email: 'nam@example.com', studentId: 'SV2024001',
  school: 'Trường Đại học của bạn', major: 'Công nghệ thông tin', cohort: '2024 – 2028',
  bio: 'Mỗi ngày tiến bộ một chút. Học đều, nghỉ đủ và dành thời gian cho điều mình thích.', avatar: 'photo',
};
export const initialPreferences: AccountPreferences = {
  assignments: true, classes: true, exams: true, reminderMinutes: 15,
  quiet: true, quietStart: '22:00', quietEnd: '07:00', appearancePreview: 'light', languagePreview: 'vi',
};
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim()) && s.trim().length <= 254;
export const normalizeEmail = (s: string) => s.trim().toLowerCase();
export function initials(name: string) { return name.trim().split(/\s+/).filter(Boolean).slice(-2).map(n => n[0]).join('').toLocaleUpperCase() || 'FY'; }
export function validateProfile(profile: StudentProfile) {
  if (!profile.name.trim() || profile.name.trim().length > 60) return 'Họ tên cần từ 1 đến 60 ký tự.';
  if (!isEmail(profile.email)) return 'Nhập địa chỉ email hợp lệ.';
  if (profile.studentId.trim().length > 30) return 'Mã sinh viên không quá 30 ký tự.';
  if (profile.school.trim().length > 100 || profile.major.trim().length > 100) return 'Tên trường và ngành học không quá 100 ký tự.';
  if (profile.cohort.trim().length > 40) return 'Niên khóa không quá 40 ký tự.';
  if (profile.bio.trim().length > 160) return 'Giới thiệu không quá 160 ký tự.';
  return null;
}
export function validatePreferences(p: AccountPreferences) {
  if (![5, 15, 30, 60].includes(p.reminderMinutes)) return 'Chọn mốc nhắc hợp lệ.';
  if (p.quiet && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.quietStart) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(p.quietEnd))) return 'Giờ yên lặng dùng dạng HH:mm, ví dụ 22:00 và 07:00.';
  if (p.quiet && p.quietStart === p.quietEnd) return 'Giờ bắt đầu và kết thúc cần khác nhau.';
  return null;
}
export function validateCredentials(email: string, password: string, confirm?: string) {
  if (!isEmail(email)) return 'Nhập địa chỉ email hợp lệ.';
  return validatePassword(password, confirm);
}
export function validatePassword(password: string, confirm?: string) {
  if (password.length < 8 || password.length > 128 || !password.trim()) return 'Mật khẩu cần từ 8 đến 128 ký tự.';
  if (confirm !== undefined && confirm !== password) return 'Mật khẩu xác nhận chưa trùng khớp.';
  return null;
}
