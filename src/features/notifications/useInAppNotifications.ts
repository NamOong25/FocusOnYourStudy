import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../store/model';
import { applyReadReceipts, buildInAppReminders, markRemindersRead, type InAppReminder, type ReadReceipts, type ReminderWithRead } from './notifications';
import { useAuth } from '../account/auth/AuthProvider';
import { useScheduleOverview } from '../schedule/overview/useScheduleOverview';
import { dateKey } from '../../shared/utils/dates';
import { mergeReminders, pruneKnownReceipts } from './serverClassReminders';
import { projectServerReminders } from './serverExamReminders';
import { useServerAllExams } from '../exams/api/useServerExams';
import { describeReminders } from './api/notificationDescriptors';
import { useNotificationReads } from './api/useNotificationReads';
import { asApiError } from '../../shared/api/http';

export default function useInAppNotifications(now: Date) {
  const { tasks, classes, classExceptions, exams, courseCatalog, semesters, assignmentConnection, courseConnection, semesterConnection } = useApp();
  const auth = useAuth(), schedule = useScheduleOverview(auth.hasSession ? { reminders: true, today: dateKey(now) } : null);
  const savedExams = useServerAllExams(auth.hasSession);
  const [receipts, setReceipts] = useState<ReadReceipts>({}),[refreshNonce,setRefreshNonce]=useState(0);
  const sources = useMemo(() => ({ tasks, classes, exceptions: classExceptions, exams, courses: courseCatalog }), [tasks, classes, classExceptions, exams, courseCatalog]);
  const base = useMemo(() => buildInAppReminders(auth.hasSession ? { ...sources, classes: [], exceptions: [], exams: [] } : sources, now), [sources, now, auth.hasSession]);
  const metadataError = courseConnection?.error ?? semesterConnection?.error;
  const metadataReady = auth.hasSession && !!courseConnection?.loaded && !courseConnection.loading && !!semesterConnection?.loaded && !semesterConnection.loading && !metadataError;
  const saved = useMemo(() => projectServerReminders({ classes: schedule, exams: savedExams, courses: courseCatalog, semesters, metadataReady, metadataError: metadataError ?? null, now }),
    [schedule.rows, schedule.rules, schedule.loaded, schedule.loading, schedule.error, savedExams.value, savedExams.loaded, savedExams.loading, savedExams.error, courseCatalog, semesters, metadataReady, metadataError, now]);
  const tasksReady=!!assignmentConnection?.loaded && !assignmentConnection.loading && !assignmentConnection.error;
  const ready = saved.ready && tasksReady;
  const reminders = useMemo(() => mergeReminders(base, saved.classItems, saved.examItems), [base, saved.classItems, saved.examItems]);
  useEffect(() => { if(!auth.hasSession)setReceipts(current => pruneKnownReceipts(current, reminders,true,true)); }, [reminders,auth.hasSession]);
  const described=useMemo(()=>{
    if(!auth.hasSession || !ready)return {frame:null,error:null};
    try{return {frame:describeReminders(reminders,{tasks,courses:courseCatalog,semesters,exams:savedExams.value ?? [],rows:schedule.rows},now),error:null};}
    catch(error){return {frame:null,error:asApiError(error)};}
  },[auth.hasSession,ready,reminders,tasks,courseCatalog,semesters,savedExams.value,schedule.rows,now]);
  const persisted=useNotificationReads(described.frame,refreshNonce),state=persisted.state;
  const confirmed=ready && !described.error && state.loaded && !state.loading && !state.needsReload && !state.sourceMismatch && !state.error;
  const items: ReminderWithRead[]=auth.hasSession ? reminders.map(item=>{
    const row=state.rows[item.id],known=confirmed && row?.localRevision===item.revision;
    return {...item,read:!!known && row.state.read,readKnown:!!known};
  }) : applyReadReceipts(reminders,receipts);
  const reload = useCallback(async()=>{
    try {await Promise.all([assignmentConnection?.reload(),schedule.reload(),savedExams.reload(),courseConnection?.reload(),semesterConnection?.reload()]);}
    finally{setRefreshNonce(n=>n+1);}
  },[assignmentConnection?.reload,schedule.reload,savedExams.reload,courseConnection?.reload,semesterConnection?.reload]);
  const markSeen=(seen:InAppReminder[])=>{
    if(auth.hasSession){if(confirmed && !state.busy)void persisted.mark(seen.map(item=>({id:item.id,localRevision:item.revision}))).catch(()=>{});}
    else setReceipts(current=>markRemindersRead(current,seen.filter(item=>items.some(x=>x.id===item.id && x.revision===item.revision))));
  };
  return {
    items,sources,unread:items.filter(item=>item.readKnown!==false && !item.read).length,
    readState:auth.hasSession ? {ready:confirmed,loading:state.loading,busy:state.busy,error:described.error ?? state.error,needsReload:state.needsReload,message:state.message} : null,
    schedule:auth.hasSession ? {ready,classesReady:saved.classesReady,examsReady:saved.examsReady,tasksReady,
      loading:schedule.loading || savedExams.loading || !!assignmentConnection?.loading || !!courseConnection?.loading || !!semesterConnection?.loading,
      error:assignmentConnection?.error ?? saved.error,reload} : null,
    markRead:(item:InAppReminder)=>markSeen([item]),
    markAllRead:(seen:InAppReminder[])=>markSeen(seen),
  };
}