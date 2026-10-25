import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../store/model';
import { applyReadReceipts, buildInAppReminders, markRemindersRead, type InAppReminder, type ReadReceipts } from './notifications';
import { useAuth } from '../account/auth/AuthProvider';
import { useScheduleOverview } from '../schedule/overview/useScheduleOverview';
import { dateKey } from '../../shared/utils/dates';
import { mergeReminders, pruneKnownReceipts } from './serverClassReminders';
import { projectServerReminders } from './serverExamReminders';
import { useServerAllExams } from '../exams/api/useServerExams';

export default function useInAppNotifications(now: Date) {
  const { tasks, classes, classExceptions, exams, courseCatalog, semesters, courseConnection, semesterConnection } = useApp();
  const auth = useAuth(), schedule = useScheduleOverview(auth.hasSession ? { reminders: true, today: dateKey(now) } : null);
  const savedExams = useServerAllExams(auth.hasSession);
  const [receipts, setReceipts] = useState<ReadReceipts>({});
  const sources = useMemo(() => ({ tasks, classes, exceptions: classExceptions, exams, courses: courseCatalog }), [tasks, classes, classExceptions, exams, courseCatalog]);
  const base = useMemo(() => buildInAppReminders(auth.hasSession ? { ...sources, classes: [], exceptions: [], exams: [] } : sources, now), [sources, now, auth.hasSession]);
  const metadataError = courseConnection?.error ?? semesterConnection?.error;
  const metadataReady = auth.hasSession && !!courseConnection?.loaded && !courseConnection.loading && !!semesterConnection?.loaded && !semesterConnection.loading && !metadataError;
  const saved = useMemo(() => projectServerReminders({ classes: schedule, exams: savedExams, courses: courseCatalog, semesters, metadataReady, metadataError: metadataError ?? null, now }),
    [schedule.rows, schedule.rules, schedule.loaded, schedule.loading, schedule.error, savedExams.value, savedExams.loaded, savedExams.loading, savedExams.error, courseCatalog, semesters, metadataReady, metadataError, now]);
  const ready = saved.ready;
  const reminders = useMemo(() => mergeReminders(base, saved.classItems, saved.examItems), [base, saved.classItems, saved.examItems]);
  useEffect(() => { setReceipts(current => pruneKnownReceipts(current, reminders, !auth.hasSession || saved.classesReady, !auth.hasSession || saved.examsReady)); }, [reminders, saved.classesReady, saved.examsReady, auth.hasSession]);
  const items = applyReadReceipts(reminders, receipts);
  const reload = useCallback(() => Promise.all([schedule.reload(), savedExams.reload(), courseConnection?.reload(), semesterConnection?.reload()]), [schedule.reload, savedExams.reload, courseConnection?.reload, semesterConnection?.reload]);
  return {
    items, sources, unread: items.filter(item => !item.read).length,
    schedule: auth.hasSession ? { ready, classesReady: saved.classesReady, examsReady: saved.examsReady,
      loading: schedule.loading || savedExams.loading || !!courseConnection?.loading || !!semesterConnection?.loading, error: saved.error, reload } : null,
    markRead: (item: InAppReminder) => { if (items.some(current => current.id === item.id && current.revision === item.revision)) setReceipts(current => markRemindersRead(current, [item])); },
    markAllRead: () => { if (!auth.hasSession || ready) setReceipts(current => markRemindersRead(current, reminders)); },
  };
}
