import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../store/model';
import { applyReadReceipts, buildInAppReminders, markRemindersRead, type InAppReminder, type ReadReceipts } from './notifications';
import { useAuth } from '../account/auth/AuthProvider';
import { useScheduleOverview } from '../schedule/overview/useScheduleOverview';
import { dateKey } from '../../shared/utils/dates';
import { asApiError } from '../../shared/api/http';
import { buildServerClassReminders, mergeReminders, pruneKnownReceipts } from './serverClassReminders';

export default function useInAppNotifications(now: Date) {
  const { tasks, classes, classExceptions, exams, courseCatalog, semesters, courseConnection, semesterConnection } = useApp();
  const auth = useAuth(), schedule = useScheduleOverview(auth.hasSession ? { reminders: true, today: dateKey(now) } : null);
  const [receipts, setReceipts] = useState<ReadReceipts>({});
  const sources = useMemo(() => ({ tasks, classes, exceptions: classExceptions, exams, courses: courseCatalog }), [tasks, classes, classExceptions, exams, courseCatalog]);
  const base = useMemo(() => buildInAppReminders(auth.hasSession ? { ...sources, classes: [], exceptions: [] } : sources, now), [sources, now, auth.hasSession]);
  const metadataError = courseConnection?.error ?? semesterConnection?.error;
  const canBuild = auth.hasSession && schedule.loaded && !schedule.loading && !schedule.error && !!courseConnection?.loaded && !courseConnection.loading && !!semesterConnection?.loaded && !semesterConnection.loading && !metadataError;
  const saved = useMemo(() => {
    if (!canBuild) return { items: [], error: null };
    try { return { items: buildServerClassReminders(schedule, courseCatalog, semesters, now), error: null }; }
    catch (error) { return { items: [], error: asApiError(error) }; }
  }, [canBuild, schedule.rows, courseCatalog, semesters, now]);
  const ready = canBuild && !saved.error;
  const reminders = useMemo(() => mergeReminders(base, ready ? saved.items : []), [base, saved.items, ready]);
  useEffect(() => { setReceipts(current => pruneKnownReceipts(current, reminders, !auth.hasSession || ready)); }, [reminders, ready, auth.hasSession]);
  const items = applyReadReceipts(reminders, receipts);
  const reload = useCallback(() => Promise.all([schedule.reload(), courseConnection?.reload(), semesterConnection?.reload()]), [schedule.reload, courseConnection?.reload, semesterConnection?.reload]);
  return {
    items, sources, unread: items.filter(item => !item.read).length,
    schedule: auth.hasSession ? { ready, loading: schedule.loading || !!courseConnection?.loading || !!semesterConnection?.loading, error: schedule.error ?? metadataError ?? saved.error, reload } : null,
    markRead: (item: InAppReminder) => { if (items.some(current => current.id === item.id && current.revision === item.revision)) setReceipts(current => markRemindersRead(current, [item])); },
    markAllRead: () => { if (!auth.hasSession || ready) setReceipts(current => markRemindersRead(current, reminders)); },
  };
}
