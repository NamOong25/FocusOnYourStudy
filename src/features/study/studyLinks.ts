import type { StudySession } from './learning';
import type { FocusRecord } from '../focus/focus';

// Focus is still local. Reading or finishing a timer never invents a server status/version.
export function withLocalFocus(sessions: StudySession[], records: FocusRecord[]): StudySession[] {
  const totals = new Map<string, number>();
  for (const record of records) if (record.source === 'timer' && record.studySessionId)
    totals.set(record.studySessionId, (totals.get(record.studySessionId) ?? 0) + record.studySeconds);
  return sessions.map(session => ({ ...session, focusedSeconds: totals.get(session.id) ?? 0 }));
}
export function focusLinkInvalid(sessions: StudySession[], id: string, courseId: string, taskId?: string) {
  const session = sessions.find(item => item.id === id);
  return !session || session.courseId !== courseId || session.taskId !== taskId || session.status === 'Hoàn thành';
}
