import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Badge, Button, Card, Icon, IconButton, IconTile, Progress, Row, Segments, Sheet, T } from '../../shared/components';
import { CourseChoices } from '../academics/CourseChoices';
import { C, F, S } from '../../shared/theme';
import { useApp } from '../../store/model';

const modes = ["Tập trung 25′", "Nghỉ ngắn 5′", "Nghỉ dài 15′"];
export default function Focus({ onStudyPlan }: { onStudyPlan: () => void }) {
  const { mode, setMode, seconds, running, toggleTimer, resetTimer, completed, focusCourse, focusCourseId, prepareFocus, focusTaskId, focusSessionId, tasks, studySessions, history, timerProgress, setTab } = useApp();
  const focusedSession = studySessions.find(s => s.id === focusSessionId); const focusedTask = tasks.find(t => t.id === focusTaskId);
  const [choose, setChoose] = useState(false); const [showHistory, setShowHistory] = useState(false);
  const radius = 121, circumference = 2 * Math.PI * radius;
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0'); const secs = (seconds % 60).toString().padStart(2, '0');
  return <>
    <Card><Row style={{ gap: 12 }}><IconTile name="flame-outline" size={48} /><View style={S.grow}><T style={{ fontFamily: F.bold, fontSize: 17 }}>Giữ nhịp học mỗi ngày</T><T style={S.small}>Một phiên học, một bước tiến</T></View><Badge label={`${completed * 25} phút`} icon="time-outline" /></Row></Card>
    <Card style={{ gap: 12 }}><Row between><T style={{ fontSize: 10, color: C.muted, fontFamily: F.semi, letterSpacing: 1 }}>MÔN HỌC ĐANG TẬP TRUNG</T><IconButton name="swap-horizontal" label="Đổi môn học" onPress={() => setChoose(true)} bg={C.canvas} /></Row><Row style={{ gap: 12 }}><IconTile name="git-network-outline" size={49} /><View style={S.grow}><T style={{ fontFamily: F.bold, fontSize: 17, lineHeight: 25 }}>{focusCourse}</T><T style={{ fontSize: 12, lineHeight: 20, color: C.muted, marginTop: 3 }}>{focusedSession?.title ?? focusedTask?.title ?? 'Chọn một việc nhỏ, tập trung làm hết mình.'}</T></View></Row></Card>
    <Segments values={modes} value={modes[mode]!} onChange={v => setMode(modes.indexOf(v))} />
    <View style={{ alignItems: 'center', paddingVertical: 24 }}>
      <View style={{ width: 286, height: 286, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={286} height={286} style={{ position: 'absolute' }} viewBox="0 0 286 286"><Circle cx="143" cy="143" r={radius} stroke={C.track} strokeWidth="12" fill="none" /><Circle cx="143" cy="143" r={radius} stroke={C.purple} strokeWidth="12" fill="none" strokeDasharray={`${circumference}`} strokeDashoffset={circumference * (1 - Math.max(0.008, timerProgress))} strokeLinecap="round" transform="rotate(-90 143 143)" /></Svg>
        <View style={{ gap: 12, alignItems: 'center' }}><Badge label={mode > 0 ? 'THẢ LỎNG MỘT CHÚT' : running ? 'ĐANG HỌC SÂU' : 'SẴN SÀNG TẬP TRUNG'} icon="ellipse" /><T accessibilityLiveRegion="none" style={{ fontFamily: F.extra, fontSize: 53, lineHeight: 70, letterSpacing: -2, fontVariant: ['tabular-nums'] }}>{minutes}:{secs}</T><T style={{ fontSize: 13, color: C.muted }}>Phiên thứ {completed + 1} / {Math.max(5, completed + 1)}</T></View>
      </View>
    </View>
    <Row style={{ justifyContent: 'center', gap: 22, marginBottom: 4 }}><IconButton name="refresh-outline" label="Đặt lại đồng hồ" onPress={resetTimer} bg="#fff" /><Button label={running ? 'Tạm dừng' : seconds === 0 ? 'Học lại' : 'Bắt đầu'} icon={running ? 'pause' : 'play'} onPress={toggleTimer} style={{ minWidth: 145, minHeight: 64, boxShadow: '0px 8px 22px rgba(108,92,231,0.22)' }} /><IconButton name="list-outline" label="Lịch sử phiên học" onPress={() => setShowHistory(true)} bg="#fff" /></Row>
    <Row style={{ alignItems: 'stretch', gap: 12, marginTop: 10 }}><Card style={[S.grow, { gap: 10 }]}><Row between><T style={S.small}>Mục tiêu ngày</T><Icon name="ribbon-outline" size={18} /></Row><T style={{ fontFamily: F.extra, fontSize: 27 }}>{completed} / 5 <T style={S.small}>phiên</T></T><Progress value={completed * 20} /><T style={{ fontSize: 11, color: C.muted }}>{completed >= 5 ? 'Bạn đã đạt mục tiêu!' : `Còn ${5 - completed} phiên để đạt mục tiêu`}</T></Card><Card style={[S.grow, { gap: 10 }]}><Row between><T style={S.small}>Tổng thời gian</T><Icon name="time-outline" size={18} /></Row><T style={{ fontFamily: F.extra, fontSize: 27 }}>{completed * 25}<T style={S.small}> phút</T></T><T style={{ fontSize: 12, color: C.green }}>Cứ từng bước nhỏ</T><T style={{ fontSize: 11, color: C.muted }}>Đếm phiên học đã hoàn tất</T></Card></Row>
    <Card style={{ backgroundColor: '#EAE4FF' }}><Row style={{ gap: 12 }}><IconTile name="sparkles" bg={C.primary} color="#fff" /><View style={S.grow}><T style={{ fontFamily: F.bold, color: C.primary, fontSize: 13 }}>Nghỉ ngơi cũng là một phần của học tập</T><T style={{ fontSize: 12, lineHeight: 21, marginTop: 5 }}>Sau mỗi phiên, hãy nhìn xa và vận động nhẹ để bắt đầu phiên tiếp theo thoải mái hơn.</T></View></Row></Card>
    <Button label="Lên kế hoạch với Trợ lý AI" secondary icon="sparkles-outline" onPress={() => setTab('ai')} />
    <Button label="Xem kế hoạch tự học" secondary icon="calendar-outline" onPress={onStudyPlan} />
    {(focusedTask || focusedSession) && <T style={S.small}>Phiên Pomodoro chỉ ghi thời gian cho nội dung đã chọn. Hoàn thành một buổi học không tự hoàn thành bài tập.</T>}
    {focusedSession && <Card style={{ backgroundColor: C.soft, gap: 9 }}><Row between><T style={{ fontFamily: F.bold, fontSize: 13 }}>Tiến độ buổi tự học</T><Badge label={focusedSession.status} bg="#FFFFFFAA" /></Row><Progress value={focusedSession.focusedSeconds / (focusedSession.duration * 60) * 100} /><T style={{ fontSize: 12 }}>{Math.floor(focusedSession.focusedSeconds / 60)} / {focusedSession.duration} phút từ các phiên đã hoàn tất</T></Card>}
    {choose && <Sheet title="Chọn môn để tập trung" onClose={() => setChoose(false)}><CourseChoices value={focusCourseId} onChange={v => { prepareFocus({ courseId: v }); setChoose(false); }} /><T style={S.small}>Đổi môn sẽ bắt đầu một phiên mới và bỏ liên kết buổi/bài đang chọn.</T></Sheet>}
    {showHistory && <Sheet title="Lịch sử phiên học" onClose={() => setShowHistory(false)}><Badge label="Dữ liệu mẫu: 3 phiên khởi đầu" /><T style={S.small}>Các phiên hoàn tất trong lần dùng thử này sẽ xuất hiện bên dưới.</T>{history.length ? history.map((h, i) => <Card key={`${h}-${i}`}><Row><Icon name="checkmark-circle-outline" color={C.green} /><T style={[S.grow, { fontSize: 13 }]}>{h}</T></Row></Card>) : <T>Chưa hoàn thành phiên mới nào.</T>}</Sheet>}
  </>;
}
