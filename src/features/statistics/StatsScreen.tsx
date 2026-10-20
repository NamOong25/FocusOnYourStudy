import { StateView } from '../../shared/components';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Badge, Button, Card, Field, Icon, IconTile, Progress, Row, Section, Segments, Sheet, T } from '../../shared/components';
import { NavigationScope } from '../../navigation/Navigation';
import ExamList from '../exams/Exams';
import Grades, { GpaForecast } from '../grades/GradesScreen';
import { formatGpa, summarizeGrades } from '../grades/grades';
import { C, F, S } from '../../shared/theme';
import { dateLabel, dueLabel, useApp } from '../../store/model';

const charts: Record<string, number[]> = { Tuần: [3.5, 2.6, 4.2, 5.2, 4.8, 4.4, 3.9], Tháng: [19, 25, 28, 22], 'Học kỳ': [52, 68, 85, 72, 94] };
export default function Stats() {
  const [view, setView] = useState('Tổng quan');
  return <><Segments values={['Tổng quan', 'Điểm & GPA']} value={view} onChange={setView} /><NavigationScope active={view === 'Tổng quan'}><View style={{display:view === 'Tổng quan'?'flex':'none',gap:16}}><StudyStats /></View></NavigationScope><NavigationScope active={view === 'Điểm & GPA'}><View style={{display:view === 'Điểm & GPA'?'flex':'none',gap:16}}><Grades /></View></NavigationScope></>;
}
function StudyStats() {
  const { tasks, courseCatalog, gradeBook, gradeRules, isEmptyWorkspace, setScheduleMode, semesters } = useApp(); const [period, setPeriod] = useState('Tuần'); const [forecast, setForecast] = useState(false); const [selectedBar, setSelectedBar] = useState(3);
  if (isEmptyWorkspace) return <StateView title="Chưa có thống kê tổng hợp" message="Hãy thêm môn, bài tập và các phiên học trước. Biểu đồ giờ học hiện chỉ có trong chế độ dữ liệu mẫu." actionLabel="Đến Môn & học kỳ" onAction={() => setScheduleMode('Môn & học kỳ')} />;
  const currentSemester = semesters.find(s => s.status === 'Đang học') ?? semesters[0];
  const series = charts[period]!; const total = series.reduce((a, b) => a + b, 0); const done = tasks.filter(t => t.status === 'Hoàn thành').length; const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const overdue = tasks.filter(t => t.status !== 'Hoàn thành' && new Date(`${t.deadline}T23:59:59`).getTime() < Date.now()).length;
  const summary = summarizeGrades(courseCatalog, gradeBook, gradeRules, true);
  return <>
    <Row between><View><T style={{ fontFamily: F.bold, fontSize: 18 }}>Từng ngày, tốt hơn một chút ✨</T><T style={S.small}>{currentSemester ? `${currentSemester.name} · Năm học ${currentSemester.academicYear}` : 'Chưa có học kỳ'}</T></View></Row>
    <LinearGradient colors={['#5341CD', '#7462E7', '#9681EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 25, padding: 22, gap: 23, boxShadow: '0px 12px 22px rgba(108,92,231,0.16)' }}>
      <Row between><Badge label="BỨC TRANH HỌC TẬP" color="#fff" bg="#FFFFFF25" icon="ribbon-outline" /><Icon name="trending-up-outline" color="#fff" /></Row>
      <Row between><View><T style={{ fontSize: 11, color: '#ECE7FF' }}>GPA tích lũy trong app</T><T style={{ fontFamily: F.extra, fontSize: 35, lineHeight: 50, color: '#fff' }}>{formatGpa(summary.gpa)}<T style={{ fontFamily: F.semi, color: '#DFD7FF', fontSize: 15 }}> / 4.0</T></T><T style={{ color: '#E5DEFF', fontSize: 10 }}>Từ điểm đã nhập · Quy tắc mẫu</T></View><View style={{ width: 117, gap: 5 }}><T style={{ color: '#ECE7FF', fontSize: 11 }}>Tín chỉ GPA đạt</T><T style={{ fontFamily: F.extra, fontSize: 27, lineHeight: 40, color: '#fff' }}>{summary.earnedCredits}<T style={{ color: '#DED7FF', fontSize: 12 }}>/{summary.scoredCredits} TC</T></T><Progress value={summary.scoredCredits ? summary.earnedCredits/summary.scoredCredits*100 : 0} white /><T style={{ color: '#ECE7FF', fontSize: 10 }}>{summary.excludedIncomplete} môn chưa có điểm tính GPA</T></View></Row>
      <Pressable onPress={() => setForecast(true)} accessibilityRole="button" style={{ backgroundColor: '#FFFFFF25', borderRadius: 18, padding: 14 }}><Row><Icon name="sparkles-outline" color="#fff" /><View style={S.grow}><T style={{ fontFamily: F.bold, fontSize: 12, color: '#fff' }}>Mình cần bao nhiêu điểm để đạt mục tiêu?</T><T style={{ color: '#F3EFFF', fontSize: 11, marginTop: 2 }}>Thử mô phỏng GPA học kỳ tiếp theo</T></View><Icon name="chevron-forward" color="#fff" size={17} /></Row></Pressable>
    </LinearGradient>
    <Section title="Thống kê học tập" icon="bar-chart-outline" /><Segments values={['Tuần', 'Tháng', 'Học kỳ']} value={period} onChange={v => { setPeriod(v); setSelectedBar(0); }} />
    <Row style={{ gap: 9, alignItems: 'stretch' }}>{[
      { label: 'Giờ học mẫu', value: `${total.toFixed(1)}h`, icon: 'time-outline' as const, color: C.primary, bg: C.soft, sub: period === 'Tuần' ? 'Trong tuần này' : `Trong ${period.toLowerCase()}` },
      { label: 'Hoàn thành', value: `${percent}%`, icon: 'checkmark-circle-outline' as const, color: C.green, bg: C.greenSoft, sub: `${done}/${tasks.length} bài tập` },
      { label: 'Trễ hạn', value: String(overdue), icon: 'alarm-outline' as const, color: overdue ? C.red : C.primary, bg: overdue ? C.redSoft : C.soft, sub: overdue ? 'Cần chú ý' : 'Giữ vững nhịp học' },
    ].map(m => <Card key={m.label} style={[S.grow, { padding: 12, gap: 5 }]}><IconTile name={m.icon} color={m.color} bg={m.bg} size={32} /><T style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>{m.label}</T><T style={{ fontFamily: F.bold, fontSize: 22 }}>{m.value}</T><T style={{ fontSize: 9, lineHeight: 16, color: C.muted }}>{m.sub}</T></Card>)}</Row>
    <Card style={{ gap: 18 }}><Row between><View style={S.grow}><T style={{ fontFamily: F.bold, fontSize: 14 }}>Thời gian học theo {period.toLowerCase()}</T><T style={S.small}>Chạm cột để xem thời lượng</T></View><Badge label={`${series[selectedBar]?.toFixed(1)} giờ`} /></Row><View style={{ height: 144, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, borderBottomWidth: 1, borderColor: C.line }}>{series.map((v, i) => <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${period === 'Tuần' ? ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật'][i] : `Khoảng ${i + 1}`}: ${v} giờ`} onPress={() => setSelectedBar(i)} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}><LinearGradient colors={i === selectedBar ? ['#5341CD', '#8E7CF2'] : ['#8875F1', '#B8ABFF']} style={{ height: v / Math.max(...series) * 124, width: '80%', maxWidth: 33, borderTopLeftRadius: 9, borderTopRightRadius: 9 }} /></Pressable>)}</View><Row style={{ gap: 10, marginTop: -10 }}>{series.map((_, i) => <T key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: i === selectedBar ? C.primary : C.muted }}>{period === 'Tuần' ? ['T2','T3','T4','T5','T6','T7','CN'][i] : period === 'Tháng' ? `Tuần ${i+1}` : `Th ${i+1}`}</T>)}</Row></Card>
    <Card style={{ gap: 16 }}><T style={{ fontFamily: F.bold, fontSize: 14 }}>Phân bổ môn học</T><Row style={{ gap: 22 }}><View style={{ width: 112, height: 112, alignItems: 'center', justifyContent: 'center' }}><Svg width={112} height={112} style={{ position: 'absolute' }}><Circle cx="56" cy="56" r="46" stroke={C.soft} strokeWidth="13" fill="none" />{[{ color: C.primary, amount: 0.4, offset: 0 }, { color: '#8270F0', amount: 0.35, offset: 0.4 }, { color: '#AD9BFF', amount: 0.25, offset: 0.75 }].map(v => <Circle key={v.color} cx="56" cy="56" r="46" stroke={v.color} fill="none" strokeWidth="13" strokeDasharray={`${v.amount * 289} 289`} strokeDashoffset={-v.offset * 289} transform="rotate(-90 56 56)" />)}</Svg><T style={{ fontFamily: F.extra, fontSize: 23 }}>{total.toFixed(0)}h</T><T style={{ fontSize: 9, color: C.muted }}>Dữ liệu mẫu</T></View><View style={[S.grow, { gap: 12 }]}>{[{ label: 'Cấu trúc dữ liệu', value: '40%', color: C.primary }, { label: 'Toán rời rạc', value: '35%', color: '#8270F0' }, { label: 'Môn học khác', value: '25%', color: '#AD9BFF' }].map(s => <Row key={s.label} between><View style={{ width: 7, height: 7, borderRadius: 5, backgroundColor: s.color }} /><T style={[S.grow, { fontSize: 11 }]}>{s.label}</T><T style={{ fontFamily: F.bold, fontSize: 11 }}>{s.value}</T></Row>)}</View></Row></Card>
    <ExamList />
    {forecast && <GpaForecast onClose={() => setForecast(false)} />}
  </>;
}
