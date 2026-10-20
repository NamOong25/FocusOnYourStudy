import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Badge, Button, Card, Icon, IconTile, Progress, Row, Section, T, Empty } from '../components';
import { C, F, S } from '../theme';
import { formatGpa, summarizeGrades } from '../grades';
import { Task, dateKey, dateLabel, dueLabel, useApp } from '../model';

export default function Home({ onTask, onProfile }: { onTask: (t: Task) => void; onProfile: () => void }) {
  const { tasks, getClassesOn, exams, completed, focusCourse, setTab, studyPlan, courseCatalog, gradeBook, gradeRules } = useApp();
  const gradeSummary = summarizeGrades(courseCatalog, gradeBook, gradeRules, true);
  const pending = tasks.filter(t => t.status !== 'Hoàn thành').sort((a, b) => a.deadline.localeCompare(b.deadline));
  const todayClasses = getClassesOn(dateKey(new Date())).filter(c => !c.cancelled);
  const done = tasks.filter(t => t.status === 'Hoàn thành').length;
  const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const nextExam = [...exams].sort((a, b) => a.date.localeCompare(b.date))[0];
  const hour = new Date().getHours();
  return <>
    <Row between>
      <Pressable accessibilityRole="button" accessibilityLabel="Xem hồ sơ" onPress={onProfile} style={[S.row, S.grow, { gap: 11 }]}>
        <View><Image source={require('../../assets/avatar.png')} style={{ width: 46, height: 46, borderRadius: 23 }} /><View style={{ width: 10, height: 10, backgroundColor: '#00B894', borderRadius: 5, borderWidth: 2, borderColor: C.canvas, position: 'absolute', bottom: 1, right: 0 }} /></View>
        <View style={S.grow}><T style={S.small}>{hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'} ☀️</T><T style={{ fontFamily: F.bold, fontSize: 17, letterSpacing: -0.5 }}>Nguyễn Hoàng Nam</T></View>
      </Pressable><Badge label="Học kỳ 5" bg={C.track} icon="ribbon-outline" />
    </Row>
    <LinearGradient colors={['#6C5CE7', '#8875E9', '#A69AFC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 21, borderRadius: 24, gap: 19, boxShadow: '0px 12px 24px rgba(108,92,231,0.18)' }}>
      <Row between><Badge label="Trọng tâm hôm nay" color="#fff" bg="#FFFFFF30" icon="ellipse" /><Badge label={`GPA ${formatGpa(gradeSummary.gpa)} / 4.0`} color="#fff" bg="#FFFFFF30" /></Row>
      <Row><View style={S.grow}><T style={{ fontFamily: F.extra, color: '#fff', fontSize: 21, lineHeight: 30, letterSpacing: -0.6 }}>{focusCourse}</T><T style={{ color: '#F1EDFF', fontSize: 12, marginTop: 5 }}>Đã hoàn thành {completed} / 5 phiên Pomodoro</T></View><View style={{ width: 62, height: 70, borderRadius: 23, backgroundColor: '#FFFFFF25', justifyContent: 'center', padding: 4 }}><Image source={require('../../assets/books.png')} style={{ width: 54, height: 54, borderRadius: 15 }} /></View></Row>
      <View style={{ gap: 8 }}><Row between><T style={{ fontSize: 11, color: '#F7F4FF', fontFamily: F.medium }}>Mục tiêu tập trung hôm nay</T><T style={{ fontSize: 12, color: '#fff', fontFamily: F.bold }}>{Math.min(100, completed * 20)}%</T></Row><Progress value={completed * 20} white /></View>
      <Button label="Tiếp tục học ngay" icon="play" onPress={() => setTab('focus')} style={{ backgroundColor: '#fff' }} secondary />
    </LinearGradient>
    <Row style={{ gap: 10, alignItems: 'stretch' }}>
      {([
        { icon: 'clipboard-outline', color: C.primary, bg: C.soft, number: `${pending.length} bài`, label: 'Bài tập cần làm', tab: 'schedule' },
        { icon: 'calendar-outline', color: C.red, bg: C.redSoft, number: nextExam ? dueLabel(nextExam.date) : 'Chưa có', label: 'Lịch thi gần nhất', tab: 'stats' },
        { icon: 'checkmark-circle-outline', color: C.primary, bg: C.soft, number: `${percent}%`, label: 'Bài tập hoàn tất', tab: 'stats' },
      ] as const).map(item => <Pressable key={item.label} onPress={() => setTab(item.tab)} accessibilityRole="button" accessibilityLabel={item.label} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 32, paddingHorizontal: 12, paddingVertical: 15, minHeight: 126, gap: 6 }}><IconTile name={item.icon} size={30} color={item.color} bg={item.bg} /><T style={{ fontFamily: F.bold, color: item.color === C.red ? C.red : C.ink, fontSize: 16, lineHeight: 22, marginTop: 5 }}>{item.number}</T><T style={{ fontSize: 10, color: C.muted, lineHeight: 16 }}>{item.label}</T></Pressable>)}
    </Row>
    <Section title="Lịch học hôm nay" icon="calendar-outline" action="Chi tiết" onAction={() => setTab('schedule')} />
    {todayClasses.length ? todayClasses.map((item, index) => <Pressable key={item.id} onPress={() => setTab('schedule')} accessibilityRole="button"><Card style={{ padding: 13, borderRadius: 28 }}><Row style={{ gap: 12 }}><View style={{ backgroundColor: '#F0ECFF', width: 51, height: 54, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}><T style={{ fontSize: 9, color: C.primary, fontFamily: F.bold }}>{item.start < '12:00' ? 'SÁNG' : 'CHIỀU'}</T><T style={{ color: C.primary, fontFamily: F.extra, fontSize: 16 }}>{item.start}</T></View><View style={S.grow}><T numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 13 }}>{item.title}</T><Row style={{ gap: 4, marginTop: 4 }}><Icon name="business-outline" size={12} color={C.muted} /><T style={{ fontSize: 11, color: C.muted }}>{item.room}  ·  {item.end}</T></Row></View><Badge label={index === 0 ? 'Ca sáng' : 'Ca chiều'} bg={index === 0 ? C.greenSoft : C.track} color={index === 0 ? C.green : C.muted} /></Row></Card></Pressable>) : <Empty title="Hôm nay không có ca học" message="Dành một khoảng thời gian cho kế hoạch tự học nhé." />}
    <Section title="Bài tập sắp đến hạn" icon="documents-outline" action={`${pending.length} bài`} onAction={() => setTab('schedule')} />
    {pending.slice(0, 2).map((task, i) => <Pressable key={task.id} accessibilityRole="button" onPress={() => onTask(task)}><Card style={{ padding: 14, borderRadius: 27 }}><Row style={{ gap: 11 }}><IconTile name={i === 0 ? 'alert-outline' : 'document-text-outline'} bg={i === 0 ? C.redSoft : C.soft} color={i === 0 ? C.red : C.primary} /><View style={S.grow}><T numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 13 }}>{task.title}</T><T style={{ fontSize: 11, color: i === 0 ? C.red : C.muted, marginTop: 2 }}>{dueLabel(task.deadline)} · {dateLabel(task.deadline)}</T></View><Icon name="chevron-forward" size={17} color={C.muted} /></Row></Card></Pressable>)}
    {pending.length === 0 && <Empty title="Bạn đã hoàn thành tất cả!" message="Nghỉ ngơi một chút, rồi lên kế hoạch tiếp nhé." />}
    {studyPlan.length > 0 && <Card style={{ backgroundColor: C.greenSoft, gap: 10 }}><Row><Icon name="checkmark-circle-outline" color={C.green} /><T style={{ fontFamily: F.bold, color: C.green }}>Kế hoạch tự học đã chọn</T></Row>{studyPlan.map(p => <T key={p} style={{ fontSize: 12 }}>{p}</T>)}</Card>}
    <Pressable accessibilityRole="button" accessibilityLabel="Xem gợi ý từ Trợ lý AI" onPress={() => setTab('ai')}><LinearGradient colors={['#E6DFFF', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18, borderRadius: 22 }}><Row style={{ gap: 14 }}><Image source={require('../../assets/mentor.png')} style={{ width: 56, height: 56, borderRadius: 18 }} /><View style={S.grow}><T style={{ fontFamily: F.bold, fontSize: 12, color: C.primary }}>Một chút gợi ý cho hôm nay ✨</T><T style={{ fontSize: 12, lineHeight: 19, marginTop: 4 }}>Chia nhỏ bài tập thành những phiên học. Mỗi bước nhỏ đều đáng ghi nhận.</T></View><Icon name="chevron-forward" size={18} /></Row></LinearGradient></Pressable>
  </>;
}
