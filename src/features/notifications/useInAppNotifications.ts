import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../store/model';
import { applyReadReceipts, buildInAppReminders, markRemindersRead, pruneReadReceipts, type InAppReminder, type ReadReceipts } from './notifications';

export default function useInAppNotifications(now: Date) {
  const { tasks, classes, classExceptions, exams, courseCatalog } = useApp();
  const [receipts, setReceipts] = useState<ReadReceipts>({});
  const sources = useMemo(() => ({ tasks, classes, exceptions: classExceptions, exams, courses: courseCatalog }), [tasks, classes, classExceptions, exams, courseCatalog]);
  const reminders = useMemo(() => buildInAppReminders(sources, now), [sources, now]);
  useEffect(() => { setReceipts(current => pruneReadReceipts(current, reminders)); }, [reminders]);
  const items = applyReadReceipts(reminders, receipts);
  return {
    items, sources, unread: items.filter(item => !item.read).length,
    markRead: (item: InAppReminder) => setReceipts(current => markRemindersRead(current, [item])),
    markAllRead: () => setReceipts(current => markRemindersRead(current, reminders)),
  };
}
