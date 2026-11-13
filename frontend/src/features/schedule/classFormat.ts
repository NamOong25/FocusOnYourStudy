export type LessonType = 'THEORY' | 'PRACTICE';
export type MeetingPlatform = 'NONE' | 'ZOOM' | 'TEAMS';
export type ClassFormat = {
  lessonType?: LessonType;
  meetingPlatform?: MeetingPlatform;
  meetingId?: string;
  meetingPasscode?: string;
};

export const meetingPlatforms = { ZOOM: 'Zoom', TEAMS: 'Teams' } as const;
export function classFormatInput(format: ClassFormat) {
  const lessonType = format.lessonType ?? 'THEORY';
  const meetingPlatform = format.meetingPlatform ?? 'NONE';
  const meetingId = meetingPlatform === 'NONE' ? '' : (format.meetingId ?? '').trim();
  const meetingPasscode = meetingPlatform === 'ZOOM' ? (format.meetingPasscode ?? '').trim() : '';
  if (meetingPlatform !== 'NONE' && (!meetingId || meetingId.length > 100)) throw new Error('Nhập ID cuộc họp từ 1 đến 100 ký tự.');
  if (meetingPlatform === 'ZOOM' && (!meetingPasscode || meetingPasscode.length > 100)) throw new Error('Nhập mật khẩu Zoom từ 1 đến 100 ký tự.');
  return { lessonType, meetingPlatform, meetingId, meetingPasscode };
}
