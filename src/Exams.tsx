import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Button, Card, Icon, IconButton, IconTile, Row, Section, Segments, Sheet, T } from './components';
import { reminderLabel } from './calendar';
import { ExamForm } from './examForms';
import { dateKey, dateLabel, dueLabel, useApp } from './model';
import { C, F, S } from './theme';

export default function ExamList() {
  const { exams, courseCatalog, setExams, setToast } = useApp(); const [filter, setFilter] = useState('Sắp tới'); const [create, setCreate] = useState(false); const [opened, setOpened] = useState<string | null>(null);
  const list = [...exams].filter(e => filter === 'Tất cả' || (filter === 'Sắp tới' ? new Date(`${e.date}T${e.end}:00`).getTime() >= Date.now() : new Date(`${e.date}T${e.end}:00`).getTime() < Date.now())).sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  return <>
    <Section title="Lịch thi của bạn" icon="calendar-outline" action="+ Thêm lịch" onAction={() => setCreate(true)} />
    <T style={S.small}>Chuẩn bị từng chút để bước vào kỳ thi vững vàng hơn.</T><Segments values={['Sắp tới','Đã qua','Tất cả']} value={filter} onChange={setFilter} />
    {list.map(exam => <Card key={exam.id} style={{ gap: 15 }}><Pressable accessibilityRole="button" accessibilityLabel={`Xem lịch thi ${exam.course}`} onPress={() => setOpened(exam.id)}><Row style={{ gap: 11 }}><IconTile name={exam.format === 'Thực hành' ? 'code-slash-outline' : 'reader-outline'} /><View style={S.grow}><T style={{ fontFamily: F.bold, fontSize: 16, lineHeight: 24 }}>{exam.course}</T><T style={{ fontSize: 11, color: C.muted }}>{courseCatalog.find(c => c.id === exam.courseId)?.code} · {exam.type}</T></View><Icon name="chevron-forward" size={17} /></Row></Pressable><Row between><Badge label={dueLabel(exam.date)} bg={exam.date <= dateKey(new Date()) ? C.redSoft : C.soft} color={exam.date <= dateKey(new Date()) ? C.red : C.primary} /><T style={{ fontSize: 11, color: C.muted }}>{dateLabel(exam.date)}/{exam.date.slice(0,4)}</T></Row><Row style={{ backgroundColor: C.canvas, borderRadius: 17, padding: 13 }}><Icon name="time-outline" size={17} /><View style={S.grow}><T style={{ fontFamily: F.semi, fontSize: 12 }}>{exam.time} – {exam.end}</T><T style={S.small}>Phòng {exam.room}</T></View></Row><Row between><T style={[S.small, S.grow]}>{exam.reminder ? `Trước ${exam.reminderMinutes.map(reminderLabel).join(' & ')}` : 'Chưa chọn nhắc'}</T><Button label={exam.reminder ? 'Đã chọn nhắc' : 'Chọn nhắc'} secondary icon="notifications-outline" style={{ minHeight: 42, paddingVertical: 8, paddingHorizontal: 12 }} onPress={() => { setExams(v => v.map(e => e.id === exam.id ? { ...e, reminder: !e.reminder, reminderMinutes: e.reminderMinutes.length ? e.reminderMinutes : [1440,180] } : e)); setToast('Đã đổi tùy chọn nhắc mẫu'); }} /></Row></Card>)}
    {!list.length && <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 25 }}><IconTile name="calendar-outline" size={53} /><T style={{ fontFamily: F.bold }}>Chưa có kỳ thi ở mục này</T><T style={[S.small, { textAlign: 'center' }]}>Thêm lịch ngay khi nhận thông báo để dành thời gian ôn tập.</T><Button label="Thêm kỳ thi mới" icon="add" onPress={() => setCreate(true)} /></Card>}
    {create && <ExamForm onClose={() => setCreate(false)} onSaved={id => { setCreate(false); setOpened(id); }} />}
    {opened && <ExamDialog key={opened} id={opened} onClose={() => setOpened(null)} />}
  </>;
}

export function ExamDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { exams, courseCatalog, semesters } = useApp(); const [editing, setEditing] = useState(false); const exam = exams.find(e => e.id === id);
  if (!exam) return null; const course = courseCatalog.find(c => c.id === exam.courseId); const semester = semesters.find(s => s.id === course?.semesterId);
  if (editing) return <ExamForm item={exam} onClose={() => setEditing(false)} onDeleted={onClose} />;
  return <Sheet title="Chi tiết lịch thi" onClose={onClose}>
    <Card style={{ backgroundColor: C.soft, gap: 12 }}><Row between><Badge label={exam.kind} bg="#FFFFFFAA" /><IconButton name="create-outline" label="Chỉnh sửa lịch thi" onPress={() => setEditing(true)} bg="#FFFFFFAA" /></Row><T style={{ fontFamily: F.extra, fontSize: 24, lineHeight: 34, letterSpacing: -0.5 }}>{exam.course}</T><T style={{ color: C.primary, fontSize: 12 }}>{course?.code} · {course?.credits} tín chỉ · {semester?.name}</T><Badge label={dueLabel(exam.date)} bg="#FFFFFFAA" icon="hourglass-outline" /></Card>
    <Row><Card style={[S.grow, { backgroundColor: C.canvas, gap: 6, padding: 14 }]}><Icon name="calendar-outline" /><T style={{ fontFamily: F.bold }}>{dateLabel(exam.date)}/{exam.date.slice(0,4)}</T><T style={S.small}>{exam.time} – {exam.end}</T></Card><Card style={[S.grow, { backgroundColor: C.canvas, gap: 6, padding: 14 }]}><Icon name="business-outline" /><T style={{ fontFamily: F.bold }}>{exam.room}</T><T style={S.small}>{exam.format}</T></Card></Row>
    <Card style={{ backgroundColor: C.canvas, gap: 10 }}><Row><Icon name="notifications-outline" /><T style={{ fontFamily: F.bold }}>Nhắc trước kỳ thi</T></Row><T style={{ fontSize: 13 }}>{exam.reminder ? exam.reminderMinutes.map(value => `Trước ${reminderLabel(value)}`).join(' · ') : 'Không chọn nhắc'}</T><T style={S.small}>Đây là tùy chọn mẫu trong giao diện; thông báo thiết bị sẽ được nối sau.</T></Card>
    <T style={{ fontFamily: F.bold }}>Chuẩn bị & ghi chú</T><T style={{ color: C.muted, fontSize: 13, lineHeight: 23 }}>{exam.notes || 'Chưa có ghi chú. Bạn có thể thêm nội dung ôn tập hoặc vật dụng cần mang.'}</T>
    <Button label="Sửa thông tin / nhắc lịch" secondary icon="create-outline" onPress={() => setEditing(true)} />
  </Sheet>;
}
