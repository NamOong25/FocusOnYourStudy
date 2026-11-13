import { useEffect } from 'react';
import { FeedbackProvider } from './src/shared/feedback/FeedbackProvider';
import { ActionScope, useActionState } from './src/shared/feedback/ActionScope';
import { ActionStatus, NoticeToast } from './src/shared/components';
import { BrandLogo } from './src/shared/components/BrandLogo';
import WelcomeScreen from './src/features/onboarding/WelcomeScreen';
import { FlowScope, NavigationProvider, NavigationScope, RememberedScrollView, useBackAction } from './src/navigation/Navigation';
import { ScheduleMode, routeLabel, viewKey } from './src/navigation/navigationState';
import ExamList from './src/features/exams/Exams';
import { ExamWritesProvider } from './src/features/exams/api/ExamWritesProvider';
import { GradeConfigurationWritesProvider } from './src/features/grades/api/GradeConfigurationWritesProvider';
import {PomodoroProvider} from './src/features/focus/api/PomodoroProvider';
import {PomodoroProgressProvider} from './src/features/focus/api/PomodoroProgressProvider';
import LearningNavigation from './src/navigation/components/LearningNavigation';
import { AssignmentSyncStatus } from './src/features/assignments/components/AssignmentSyncStatus';
import AssignmentsScreen from './src/features/assignments/AssignmentsScreen';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { Icon, IconButton, IconName, Row, T } from './src/shared/components';
import { C, F, S } from './src/shared/theme';
import { ClassItem, PrototypeProvider, Tab, Task, useApp } from './src/store/model';
import { ClassForm } from './src/features/schedule/ClassForm';
import { TaskForm } from './src/features/assignments/TaskForm';
import useCurrentTime from './src/shared/hooks/useCurrentTime';
import Home from './src/features/dashboard/HomeScreen';
import Schedule from './src/features/schedule/ScheduleScreen';
import Focus from './src/features/focus/FocusScreen';
import Stats from './src/features/statistics/StatsScreen';
import Assistant from './src/features/assistant/AssistantScreen';
import Academics from './src/features/academics/AcademicsScreen';
import { SemesterSyncStatus } from './src/features/academics/components/SemesterSyncStatus';
import TaskDialog from './src/features/assignments/TaskDialog';
import ClassDialog from './src/features/schedule/ClassDialog';
import Account from './src/features/account/AccountScreen';
import { AuthProvider, useAuth } from './src/features/account/auth/AuthProvider';
import SessionGate from './src/features/account/components/SessionGate';
import { ReminderPreferencesProvider } from './src/features/account/preferences/ReminderPreferencesProvider';
import PasswordRecoveryScreen from './src/features/account/components/PasswordRecoveryScreen';
import { readPasswordResetLink, type ResetLink } from './src/features/account/password/passwordResetData';
import NotificationsCenter from './src/features/notifications/NotificationsCenter';
import NotificationBell from './src/features/notifications/components/NotificationBell';
import useInAppNotifications from './src/features/notifications/useInAppNotifications';

const tabs: { id: Tab; label: string; icon: IconName; activeIcon: IconName }[] = [
  { id: 'home', label: 'Trang chủ', icon: 'home-outline', activeIcon: 'home' },
  { id: 'schedule', label: 'Lịch học', icon: 'calendar-outline', activeIcon: 'calendar' },
  { id: 'focus', label: 'Tập trung', icon: 'timer-outline', activeIcon: 'timer' },
  { id: 'stats', label: 'Thống kê', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  { id: 'ai', label: 'Trợ lý AI', icon: 'sparkles-outline', activeIcon: 'sparkles' },
];
function AppShell() {
  const auth = useAuth();
  const { tab, setTab, setScheduleMode, route, routeTrail, goBackRoute, assignmentDestination, semesterConnection, courseConnection, assignmentConnection, openSavedSchedule } = useApp(); const inset = useSafeAreaInsets();
  const current = viewKey(route), polished = current === 'home' || current === 'focus'; const visited = useRef(new Set<string>()); visited.current.add(current);
  const [taskForm, setTaskForm] = useState<Task | 'new' | null>(null); const [classForm, setClassForm] = useState<ClassItem | 'new' | null>(null);
  const [taskOrigin, setTaskOrigin] = useState(current), [classOrigin, setClassOrigin] = useState(current), [panelOrigin, setPanelOrigin] = useState(current);
  const [panel, setPanel] = useState<'profile' | 'notifications' | null>(auth.notice || auth.profileError ? 'profile' : null);
  const [classDate, setClassDate] = useState<string | undefined>();
  const action = useActionState();
  const previousPage = useRef(current);
  useEffect(() => {
    if (previousPage.current === current) return;
    previousPage.current = current;
    action?.cancel();
  }, [current, action?.cancel]);
  const date = useCurrentTime(); const canBack = routeTrail.length > 1;
  const notifications = useInAppNotifications(date);
  useBackAction(canBack, goBackRoute, 0);
  const openTask = (task: Task | 'new') => { setTaskOrigin(current); setTaskForm(task); };
  const openClass = (item: ClassItem | 'new', date?: string) => { setClassOrigin(current); setClassForm(item); setClassDate(date); };
  const openPanel = (value: 'profile' | 'notifications') => { setPanelOrigin(current); setPanel(value); };
  const closeTaskFlow = () => setTaskForm(null);
  const renderPage = (key: string) => {
    if (auth.hasSession && (!semesterConnection?.loaded || !courseConnection?.loaded)) return <SemesterSyncStatus />;
    if (auth.hasSession && !assignmentConnection?.loaded) return <AssignmentSyncStatus />;
    if (key === 'home') return <Home onTask={openTask} onClass={openClass} />;
    if (key === 'focus') return <Focus />;
    if (key === 'stats') return <Stats />;
    if (key === 'ai') return <Assistant />;
    return <><LearningNavigation value={key as ScheduleMode} onChange={setScheduleMode} />{key === 'Thời khóa biểu' ? <Schedule onClass={openClass} onNewClass={() => openClass('new')} /> : key === 'Bài tập' ? <AssignmentsScreen key={assignmentDestination?.key ?? 'regular'} initialStatisticsLink={assignmentDestination?.link} onTask={openTask} onNewTask={() => openTask('new')} /> : key === 'Kỳ thi' ? <ExamList /> : <Academics />}</>;
  };
  return <View style={styles.page}><StatusBar style="dark" /><View style={[styles.app, polished && styles.polishedSurface, { paddingTop: inset.top }]}>
    <Row between style={[styles.header, polished && styles.polishedSurface]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Về Trang chủ" onPress={() => setTab('home')} style={[S.row, S.grow, { gap: 10 }]}><BrandLogo /><View style={S.grow}><T style={{ color: C.primary, fontFamily: F.extra, fontSize: 16, letterSpacing: -0.6 }}>FocusYourStudy</T>{!polished && <T style={{ color: C.muted, fontSize: 9, lineHeight: 15 }}>{tabs.find(t => t.id === tab)?.label}</T>}</View></Pressable>
      <NotificationBell quiet={notifications.quiet} unread={notifications.unread} pending={!!notifications.schedule && !notifications.schedule.ready || !!notifications.readState && !notifications.readState.ready} onPress={() => { openPanel('notifications'); if (notifications.schedule) void notifications.schedule.reload().catch(() => {}); }} /><IconButton name="person-outline" label="Hồ sơ" bg={C.primary} color="#fff" onPress={() => openPanel('profile')} />
    </Row>

    {canBack && <Pressable accessibilityRole="button" accessibilityLabel="Quay lại màn trước" onPress={goBackRoute} style={[S.row, { marginHorizontal: 20, marginBottom: 8, minHeight: 40, gap: 7 }]}><Icon name="arrow-back" size={18} /><T style={{fontSize:12,color:C.primary,fontFamily:F.semi}}>Quay lại {routeLabel(routeTrail[routeTrail.length - 2]!)}</T></Pressable>}
    {[...visited.current].map(key => <NavigationScope key={key} active={current === key}><RememberedScrollView memoryKey={'page-' + key + (key === 'Bài tập' ? ':' + (assignmentDestination?.key ?? 'regular') : '')} testID={'page-' + key} active={current === key} style={{ flex: 1, display: current === key ? 'flex' : 'none' }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 9, paddingBottom: 125 + inset.bottom, gap: key === 'home' ? 14 : 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{renderPage(key)}</RememberedScrollView></NavigationScope>)}
    <View style={{ position: 'absolute', bottom: 100 + inset.bottom, left: 10, right: 10 }}><ActionStatus /></View>
    <NoticeToast bottom={105 + inset.bottom} />
    <View style={[styles.dockWrap, { bottom: Math.max(14, inset.bottom) }]}><View style={styles.dock}>{tabs.map(t => { const active = tab === t.id; const center = t.id === 'focus'; return <Pressable accessibilityRole="tab" accessibilityLabel={t.label} aria-selected={active} accessibilityState={{ selected: active }} key={t.id} onPress={() => setTab(t.id)} style={({ pressed }) => ({ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 63, gap: 4, opacity: pressed ? 0.65 : 1 })}>{center ? <View style={{ marginTop: -18, width: 54, height: 54, borderRadius: 27, backgroundColor: active ? C.primary : C.purple, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#fff', boxShadow: '0px 5px 14px rgba(108,92,231,0.27)' }}><Icon name={t.icon} color="#fff" size={27} /></View> : <Icon name={active ? t.activeIcon : t.icon} color={active ? C.primary : '#686878'} size={21} />}<T style={{ fontFamily: active ? F.bold : F.medium, fontSize: 9, lineHeight: 14, color: active ? C.primary : '#686878' }}>{t.label}</T></Pressable>; })}</View></View>
    <NavigationScope active={current === taskOrigin}><FlowScope onClose={closeTaskFlow}>
      {taskForm === 'new' && <TaskForm onClose={() => setTaskForm(null)} />}
      {taskForm && taskForm !== 'new' && <TaskDialog key={taskForm.id} taskId={taskForm.id} onClose={() => setTaskForm(null)} />}
    </FlowScope></NavigationScope>
    <NavigationScope active={current === classOrigin}><FlowScope onClose={() => setClassForm(null)}>
      {classForm === 'new' && <ClassForm onClose={() => setClassForm(null)} />}
      {classForm && classForm !== 'new' && <ClassDialog key={classForm.id + (classDate ?? '')} id={classForm.id} date={classDate} onClose={() => setClassForm(null)} />}
    </FlowScope></NavigationScope>
    <NavigationScope active={current === panelOrigin && !taskForm}><FlowScope onClose={() => setPanel(null)}>
      {panel === 'profile' && <Account onClose={() => setPanel(null)} />}
      {panel === 'notifications' && <NotificationsCenter quiet={notifications.quiet} readState={notifications.readState} schedule={notifications.schedule} onSavedClass={target => { setPanel(null); openSavedSchedule(target.semesterId, target.date); }} items={notifications.items} unread={notifications.unread} sources={notifications.sources} now={date} onRead={notifications.markRead} onReadAll={notifications.markAllRead} onClose={() => setPanel(null)} />}
    </FlowScope></NavigationScope>
  </View></View>;
}
function Workspace() {
  const auth = useAuth();
  return <FeedbackProvider key={auth.revision}><SessionGate><NavigationProvider>
    {auth.hasSession
      ? <PrototypeProvider empty><ReminderPreferencesProvider><PomodoroProvider><PomodoroProgressProvider><GradeConfigurationWritesProvider><ExamWritesProvider><ActionScope><AppShell /></ActionScope></ExamWritesProvider></GradeConfigurationWritesProvider></PomodoroProgressProvider></PomodoroProvider></ReminderPreferencesProvider></PrototypeProvider>
      : <WelcomeScreen />}
  </NavigationProvider></SessionGate></FeedbackProvider>;
}
export default function App() {
  const [recovery, setRecovery] = useState<{ id: number; link: ResetLink | null } | null>(null);
  const recoveryId = useRef(0);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const readLink = () => {
      const entry = readPasswordResetLink(window.location.hash);
      if (!entry) return;
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + entry.remainingHash);
      setRecovery({ id: ++recoveryId.current, link: entry.link });
    };
    readLink();
    window.addEventListener('hashchange', readLink);
    return () => window.removeEventListener('hashchange', readLink);
  }, []);
  const [loaded, error] = useFonts({ Jakarta: PlusJakartaSans_400Regular, JakartaMedium: PlusJakartaSans_500Medium, JakartaSemi: PlusJakartaSans_600SemiBold, JakartaBold: PlusJakartaSans_700Bold, JakartaExtra: PlusJakartaSans_800ExtraBold });
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: C.canvas, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={C.primary} /></View>;
  return <SafeAreaProvider><AuthProvider>{recovery
    ? <PasswordRecoveryScreen key={recovery.id} link={recovery.link} onClose={() => setRecovery(null)}
      clearLink={() => setRecovery(current => current?.id === recovery.id ? { ...current, link: null } : current)} />
    : <Workspace />}</AuthProvider></SafeAreaProvider>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#EDEDF8', alignItems: 'center' },
  app: { flex: 1, backgroundColor: C.canvas, width: '100%', maxWidth: 520, overflow: 'hidden', ...(Platform.OS === 'web' ? { boxShadow: '0px 0px 70px rgba(82,64,146,0.05)' } : {}) },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, backgroundColor: C.canvas, gap: 6 },
  polishedSurface: { backgroundColor: '#FBF8F5' },
  dockWrap: { position: 'absolute', left: 18, right: 18 },
  dock: { flexDirection: 'row', minHeight: 72, backgroundColor: '#fff', borderRadius: 32, paddingHorizontal: 6, paddingTop: 5, paddingBottom: 3, borderWidth: 1, borderColor: '#F0EDFC', boxShadow: '0px 10px 30px rgba(83,65,205,0.12)' },
});
