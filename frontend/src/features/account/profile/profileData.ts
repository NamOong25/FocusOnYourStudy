import { ApiError } from '../../../shared/api/http';
import type { AccountProfile } from '../api/types';

export type ProfileDraft = { fullName: string; school: string; major: string };
export type EditableProfile = AccountProfile & { version: number };
export type ProfileUpdate = ProfileDraft & { version: number };
export const profileFields = ['fullName', 'school', 'major'] as const;
export const profileDraft = (p: ProfileDraft): ProfileDraft => ({ fullName: p.fullName, school: p.school, major: p.major });
export const sameProfileFields = (a: ProfileDraft, b: ProfileDraft) => profileFields.every(k => a[k].trim() === b[k].trim());
export const profileVersion = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
export function editableProfile(p: AccountProfile): EditableProfile {
  if (!profileVersion(p.version)) throw new ApiError('Máy chủ chưa hỗ trợ cập nhật hồ sơ. Vui lòng tải lại hoặc thử lại sau.', 'PROFILE_EDIT_UNAVAILABLE');
  return { id: p.id, email: p.email, fullName: p.fullName, school: p.school, major: p.major, timeZone: p.timeZone, version: p.version };
}
export function profileUpdate(draft: ProfileDraft, version: number): ProfileUpdate {
  const fields: Record<string, string> = {};
  if (typeof draft.fullName !== 'string' || !draft.fullName.trim() || draft.fullName.trim().length > 60) fields.fullName = 'Họ tên cần từ 1 đến 60 ký tự.';
  if (typeof draft.school !== 'string' || draft.school.trim().length > 100) fields.school = 'Tên trường không quá 100 ký tự.';
  if (typeof draft.major !== 'string' || draft.major.trim().length > 100) fields.major = 'Ngành học không quá 100 ký tự.';
  if (!profileVersion(version)) fields.version = 'Tải lại hồ sơ trước khi lưu.';
  if (Object.keys(fields).length) throw new ApiError('Kiểm tra các ô được báo lỗi.', 'INVALID_PROFILE_INPUT', 400, fields);
  return { fullName: draft.fullName.trim(), school: draft.school.trim(), major: draft.major.trim(), version };
}
