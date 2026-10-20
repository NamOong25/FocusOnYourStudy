import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { Badge, Button, Card, Icon, IconButton, IconName, Row, Segments, Sheet, T } from './src/components';
import { C, F, S } from './src/theme';
import { ClassItem, PrototypeProvider, Tab, Task, dueLabel, useApp } from './src/model';
import { ClassForm, TaskForm } from './src/forms';
import Home from './src/screens/Home';
import Schedule from './src/screens/Schedule';
import Focus from './src/screens/Focus';
import Stats from './src/screens/Stats';
import Assistant from './src/screens/Assistant';
import Academics from './src/screens/Academics';
import TaskDialog from './src/TaskDialog';
import StudyPlan from './src/screens/StudyPlan';
import ClassDialog from './src/ClassDialog';
import Account from './src/screens/Account';

const tabs: { id: Tab; label: string; icon: IconName; activeIcon: IconName }[] = [
  { id: 'home', label: 'Trang chủ', icon: 'home-outline', activeIcon: 'home' },
  { id: 'schedule', label: 'Lịch học', icon: 'calendar-outline', activeIcon: 'calendar' },
  { id: 'focus', label: 'Tập trung', icon: 'timer-outline', activeIcon: 'timer' },
  { id: 'stats', label: 'Thống kê', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  { id: 'ai', label: 'Trợ lý AI', icon: 'sparkles-outline', activeIcon: 'sparkles' },
];
function AppShell() {
  const { tab, setTab, toast, tasks, exams } = useApp(); const inset = useSafeAreaInsets();
  const [taskForm, setTaskForm] = useState<Task | 'new' | null>(null); const [classForm, setClassForm] = useState<ClassItem | 'new' | null>(null);
  const [panel, setPanel] = useState<'profile' | 'notifications' | null>(null);
  const [read, setRead] = useState(false);
  const [classDate, setClassDate] = useState<string | undefined>();
  const [scheduleMode, setScheduleMode] = useState('Lịch & bài tập');
  const date = new Date();
  return <View style={styles.page}><StatusBar style="dark" /><View style={[styles.app, { paddingTop: inset.top }]}>
    <Row between style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Về Trang chủ" onPress={() => setTab('home')} style={[S.row, S.grow, { gap: 9 }]}><View style={{ backgroundColor: C.soft, width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}><Icon name="school-outline" size={23} /></View><View style={S.grow}><T style={{ color: C.primary, fontFamily: F.extra, fontSize: 16, letterSpacing: -0.6 }}>FocusYourStudy</T><T style={{ color: C.muted, fontSize: 9, lineHeight: 15 }}>{tab === 'home' ? 'Không ngừng tiến bộ mỗi ngày' : tab === 'focus' ? 'Không gian tập trung của bạn' : tabs.find(t => t.id === tab)?.label}</T></View></Pressable>
      <View><IconButton name="notifications-outline" label="Thông báo" onPress={() => { setPanel('notifications'); setRead(true); }} bg={C.canvas} color={C.ink} />{!read && <View style={{ position: 'absolute', top: 7, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: C.red, borderWidth: 1, borderColor: C.canvas }} />}</View><IconButton name="person-outline" label="Hồ sơ" bg={C.primary} color="#fff" onPress={() => setPanel('profile')} />
    </Row>
    <ScrollView key={`${tab}-${scheduleMode}`} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 9, paddingBottom: 125 + inset.bottom, gap: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {tab === 'home' && <Home onTask={setTaskForm} onProfile={() => setPanel('profile')} />}
      {tab === 'schedule' && <>
        <Segments values={['Lịch & bài tập', 'Môn & học kỳ', 'Tự học']} value={scheduleMode} onChange={setScheduleMode} />
        {scheduleMode === 'Lịch & bài tập' ? <Schedule onTask={setTaskForm} onNewTask={() => setTaskForm('new')} onClass={(item, date) => { setClassForm(item); setClassDate(date); }} onNewClass={() => setClassForm('new')} /> : scheduleMode === 'Môn & học kỳ' ? <Academics /> : <StudyPlan />}
      </>}
      {tab === 'focus' && <Focus onStudyPlan={() => { setScheduleMode('Tự học'); setTab('schedule'); }} />}
      {tab === 'stats' && <Stats />}
      {tab === 'ai' && <Assistant />}
      <T style={{ textAlign: 'center', color: '#91909F', fontSize: 9, lineHeight: 16, letterSpacing: 0.5 }}>FOCUSYOURSTUDY · BẢN GIAO DIỆN · DỮ LIỆU MẪU</T>
    </ScrollView>
    <View style={[styles.dockWrap, { bottom: Math.max(14, inset.bottom) }]}><View style={styles.dock}>{tabs.map(t => { const active = tab === t.id; const center = t.id === 'focus'; return <Pressable accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: active }} key={t.id} onPress={() => setTab(t.id)} style={({ pressed }) => ({ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 63, gap: 4, opacity: pressed ? 0.65 : 1 })}>{center ? <View style={{ marginTop: -18, width: 54, height: 54, borderRadius: 27, backgroundColor: active ? C.primary : C.purple, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#fff', boxShadow: '0px 5px 14px rgba(108,92,231,0.27)' }}><Icon name={t.icon} color="#fff" size={27} /></View> : <Icon name={active ? t.activeIcon : t.icon} color={active ? C.primary : '#686878'} size={21} />}<T style={{ fontFamily: active ? F.bold : F.medium, fontSize: 9, lineHeight: 14, color: active ? C.primary : '#686878' }}>{t.label}</T></Pressable>; })}</View></View>
    {!!toast && <View pointerEvents="none" style={{ position: 'absolute', bottom: 105 + inset.bottom, left: 24, right: 24, backgroundColor: '#29243E', borderRadius: 18, padding: 15 }}><T accessibilityLiveRegion="polite" style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>{toast}</T></View>}
    {taskForm === 'new' && <TaskForm onClose={() => setTaskForm(null)} />}
    {taskForm && taskForm !== 'new' && <TaskDialog key={taskForm.id} taskId={taskForm.id} onClose={() => setTaskForm(null)} />}
    {classForm === 'new' && <ClassForm onClose={() => setClassForm(null)} />}
    {classForm && classForm !== 'new' && <ClassDialog key={classForm.id + (classDate ?? '')} id={classForm.id} date={classDate} onClose={() => setClassForm(null)} />}
    {panel === 'profile' && <Account onClose={() => setPanel(null)} />}
    {panel === 'notifications' && <Sheet title="Góc nhắc nhở" onClose={() => setPanel(null)}><T style={S.small}>{date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long' })}</T>{tasks.filter(t => t.status !== 'Hoàn thành').slice(0,2).map(task => <Pressable key={task.id} onPress={() => { setPanel(null); setTaskForm(task); }}><Card><Row><Icon name="notifications-outline" /><View style={S.grow}><T style={{ fontFamily: F.bold, fontSize: 14 }}>{task.title}</T><T style={S.small}>{dueLabel(task.deadline)} · Đừng quên dành một phiên để hoàn thành.</T></View><Icon name="chevron-forward" size={16} /></Row></Card></Pressable>)}{exams[0] && <Card><T style={{ fontFamily: F.bold }}>Chuẩn bị cho {exams[0].course}</T><T style={S.small}>{dueLabel(exams[0].date)} · Bạn có thể xem chi tiết ở mục Thống kê.</T><Button label="Xem lịch thi" secondary onPress={() => { setPanel(null); setTab('stats'); }} /></Card>}<T style={S.small}>Đây là danh sách nhắc nhở trong ứng dụng. Thông báo trên thiết bị sẽ được triển khai ở giai đoạn sau.</T></Sheet>}
  </View></View>;
}
export default function App() {
  const [loaded, error] = useFonts({ Jakarta: PlusJakartaSans_400Regular, JakartaMedium: PlusJakartaSans_500Medium, JakartaSemi: PlusJakartaSans_600SemiBold, JakartaBold: PlusJakartaSans_700Bold, JakartaExtra: PlusJakartaSans_800ExtraBold });
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: C.canvas, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={C.primary} /></View>;
  return <SafeAreaProvider><PrototypeProvider><AppShell /></PrototypeProvider></SafeAreaProvider>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#EDEDF8', alignItems: 'center' },
  app: { flex: 1, backgroundColor: C.canvas, width: '100%', maxWidth: 520, overflow: 'hidden', ...(Platform.OS === 'web' ? { boxShadow: '0px 0px 70px rgba(82,64,146,0.05)' } : {}) },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, backgroundColor: C.canvas, gap: 6 },
  dockWrap: { position: 'absolute', left: 18, right: 18 },
  dock: { flexDirection: 'row', minHeight: 72, backgroundColor: '#fff', borderRadius: 32, paddingHorizontal: 5, paddingTop: 5, paddingBottom: 3, borderWidth: 1, borderColor: '#F4F0FF', boxShadow: '0px 7px 28px rgba(100,85,181,0.15)' },
});
