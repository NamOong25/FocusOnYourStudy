import type { StudentProfile } from '../account';
import type { AccountProfile } from '../api/types';

export function accountDisplayProfile(profile: AccountProfile | null): StudentProfile {
  return { name: profile?.fullName ?? 'Bạn học', email: profile?.email ?? '', school: profile?.school ?? '',
    major: profile?.major ?? '', avatar: 'violet', studentId: '', cohort: '', bio: '' };
}
