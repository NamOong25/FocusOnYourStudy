import StudySessionDialog from './StudyDialog';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Badge, Button, Card, Icon, IconButton, IconTile, Progress, Row, Section, Segments, Sheet, T } from './components';
import { TaskForm } from './forms';
import { SampleAttachment, TaskExtras, sampleDocuments } from './learning';
import { TaskStatus, dateLabel, dueLabel, uid, useApp } from './model';
import { StudySessionForm } from './studyForms';
import { StudySessionCard } from './studyComponents';
import { C, F, S } from './theme';

export default function TaskDialog({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { tasks, taskExtras, updateTaskExtras, saveTask, studySessions, prepareFocus } = useApp();
  const [mode, setMode] = useState<'detail' | 'edit' | 'session' | 'attach' | 'preview'>('detail');
  const [section, setSection] = useState('Tổng quan'); const [draft, setDraft] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>(); const [preview, setPreview] = useState<SampleAttachment | null>(null);
  const task = tasks.find(t => t.id === taskId); if (!task) return null;
  const extras: TaskExtras = taskExtras[taskId] ?? { checklist: [], attachments: [] };
  const linked = studySessions.filter(s => s.taskId === taskId).sort((a,b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
  const done = extras.checklist.filter(c => c.done).length;
  const addCheck = () => { if (!draft.trim()) return; updateTaskExtras(taskId, { ...extras, checklist: [...extras.checklist, { id: uid(), title: draft.trim(), done: false }] }); setDraft(''); };
  if (mode === 'edit') return <TaskForm item={task} onClose={() => setMode('detail')} onDeleted={onClose} />;
  if (mode === 'session') return sessionId ? <StudySessionDialog id={sessionId} onClose={() => setMode('detail')} onTask={() => { setSection('Buổi học'); setMode('detail'); }} /> : <StudySessionForm initialTaskId={taskId} onClose={() => setMode('detail')} onDeleted={() => setMode('detail')} />;
  if (mode === 'attach') return <Sheet title="Gắn tài liệu mẫu" onClose={() => setMode('detail')}><Badge label="Thư viện minh họa · Chưa tải tệp thật" /><T style={S.small}>Chọn tài liệu để thử danh sách và màn đọc. Tệp thật, lưu trữ và quyền truy cập sẽ được nối sau.</T>{sampleDocuments.map(doc => { const attached = extras.attachments.some(d => d.id === doc.id); return <Card key={doc.id} style={{ gap: 12 }}><Row><IconTile name="document-text-outline" /><View style={S.grow}><T style={{ fontFamily: F.bold, fontSize: 14 }}>{doc.name}</T><T style={S.small}>{doc.description}</T></View></Row><Button label={attached ? `Đã gắn ${doc.name}` : `Gắn ${doc.name}`} disabled={attached} secondary onPress={() => { updateTaskExtras(taskId, { ...extras, attachments: [...extras.attachments, doc] }); setSection('Tài liệu'); setMode('detail'); }} /></Card>; })}</Sheet>;
  if (mode === 'preview' && preview) return <Sheet title="Xem tài liệu" onClose={() => setMode('detail')}><Badge label="Tài liệu mẫu" icon="document-text-outline" /><T style={{ fontFamily: F.bold, fontSize: 19 }}>{preview.name}</T><T style={S.small}>{preview.description}</T><Card style={{ backgroundColor: C.canvas }}><T style={{ fontSize: 14, lineHeight: 25 }}>{preview.content}</T></Card><Button label="Về danh sách tài liệu" secondary onPress={() => setMode('detail')} /></Sheet>;
  return <Sheet title="Chi tiết bài tập" onClose={onClose} scrollKey={`task-${taskId}-${section}`}>
    <LinearGradient colors={['#E8E1FF', '#F4F0FF']} style={{ padding: 18, borderRadius: 24, gap: 13 }}>
      <Row between><Badge label={`Ưu tiên ${task.priority.toLowerCase()}`} color={task.priority === 'Cao' ? C.red : C.primary} bg={task.priority === 'Cao' ? C.redSoft : C.soft} icon="flag-outline" /><IconButton name="create-outline" label="Chỉnh sửa bài tập" bg="#FFFFFFCC" onPress={() => setMode('edit')} /></Row>
      <T style={{ fontFamily: F.extra, fontSize: 23, lineHeight: 33, letterSpacing: -0.5 }}>{task.title}</T><T style={{ color: C.primary, fontFamily: F.semi, fontSize: 12 }}>{task.course}</T>
      <Row style={{ backgroundColor: '#FFFFFF99', borderRadius: 15, padding: 12 }}><Icon name="calendar-outline" color={task.status === 'Hoàn thành' ? C.green : C.red} /><View style={S.grow}><T style={{ color: C.muted, fontSize: 10 }}>HẠN NỘP BÀI</T><T style={{ fontFamily: F.bold, fontSize: 14 }}>{dateLabel(task.deadline)}/{task.deadline.slice(0,4)}</T></View><Badge label={task.status === 'Hoàn thành' ? 'Đã hoàn thành' : dueLabel(task.deadline)} bg={task.status === 'Hoàn thành' ? C.greenSoft : C.redSoft} color={task.status === 'Hoàn thành' ? C.green : C.red} /></Row>
    </LinearGradient>
    <Segments values={['Chưa làm', 'Đang làm', 'Hoàn thành']} value={task.status} onChange={v => saveTask({ ...task, status: v as TaskStatus })} />
    <Segments values={['Tổng quan', 'Việc nhỏ', 'Tài liệu', 'Buổi học']} value={section} onChange={setSection} />
    {section === 'Tổng quan' && <>
      <T style={{ fontFamily: F.bold, fontSize: 16 }}>Yêu cầu & ghi chú</T><T style={{ color: C.muted, fontSize: 13, lineHeight: 23 }}>{task.notes || 'Chưa có ghi chú. Bạn có thể bổ sung ở phần chỉnh sửa bài tập.'}</T>
      <Card style={{ backgroundColor: C.canvas, gap: 12 }}><Row between><T style={{ fontFamily: F.bold, fontSize: 13 }}>Từng việc nhỏ, gần đích hơn</T><Badge label={`${done}/${extras.checklist.length}`} /></Row><Progress value={extras.checklist.length ? done / extras.checklist.length * 100 : 0} /><T style={S.small}>{extras.checklist.length ? `${done} việc nhỏ đã hoàn thành · ${linked.length} buổi học được lên lịch` : 'Chia bài tập thành những bước nhỏ và dành thời gian cho từng bước.'}</T><Button label="Xem việc nhỏ" secondary onPress={() => setSection('Việc nhỏ')} /></Card>
      <Button label="Lên lịch học cho bài này" icon="calendar-outline" onPress={() => { setSessionId(undefined); setMode('session'); }} /><Button label="Tập trung vào bài này" icon="timer-outline" secondary onPress={() => { prepareFocus({ courseId: task.courseId, taskId }); }} />
    </>}
    {section === 'Việc nhỏ' && <>
      <Row between><T style={{ fontFamily: F.bold }}>Checklist thực hiện</T><Badge label={`${done}/${extras.checklist.length} việc`} /></Row>
      {extras.checklist.map(item => <Card key={item.id} style={{ padding: 11, backgroundColor: C.canvas }}><Row><Pressable accessibilityRole="checkbox" accessibilityLabel={item.title} accessibilityState={{ checked: item.done }} aria-checked={item.done} onPress={() => updateTaskExtras(taskId, { ...extras, checklist: extras.checklist.map(c => c.id === item.id ? { ...c, done: !c.done } : c) })} style={[S.row, S.grow, { minHeight: 44, gap: 10 }]}><Icon name={item.done ? 'checkmark-circle' : 'ellipse-outline'} color={item.done ? C.green : C.primary} size={23} /><T style={[S.grow, { fontSize: 13, color: item.done ? C.muted : C.ink, textDecorationLine: item.done ? 'line-through' : 'none' }]}>{item.title}</T></Pressable><IconButton name="close" label={`Xóa việc ${item.title}`} bg="transparent" color={C.muted} onPress={() => updateTaskExtras(taskId, { ...extras, checklist: extras.checklist.filter(c => c.id !== item.id) })} /></Row></Card>)}
      <Row style={{ backgroundColor: C.canvas, borderRadius: 16, padding: 8 }}><TextInput accessibilityLabel="Việc nhỏ mới" placeholder="Thêm một bước cần làm…" placeholderTextColor={C.muted} value={draft} onChangeText={setDraft} onSubmitEditing={addCheck} style={{ flex: 1, minWidth: 0, padding: 9, fontFamily: F.regular, color: C.ink, fontSize: 13 }} /><IconButton name="add" label="Thêm việc nhỏ" onPress={addCheck} /></Row>
      <T style={S.small}>Checklist giúp chia nhỏ công việc. Bạn chủ động chọn trạng thái bài tập khi đã hoàn tất yêu cầu.</T>
    </>}
    {section === 'Tài liệu' && <>
      <Section title="Tài liệu của bài" action="+ Gắn mẫu" onAction={() => setMode('attach')} />
      {extras.attachments.map(doc => <Card key={doc.id} style={{ backgroundColor: C.canvas, padding: 13 }}><Row><IconTile name="document-text-outline" size={39} /><Pressable accessibilityRole="button" accessibilityLabel={`Đọc ${doc.name}`} onPress={() => { setPreview(doc); setMode('preview'); }} style={[S.grow, { gap: 3, minHeight: 44, justifyContent: 'center' }]}><T style={{ fontFamily: F.bold, fontSize: 13 }}>{doc.name}</T><T style={{ fontSize: 10, color: C.muted }}>{doc.description}</T></Pressable><IconButton name="close" label={`Gỡ ${doc.name}`} bg="transparent" color={C.muted} onPress={() => updateTaskExtras(taskId, { ...extras, attachments: extras.attachments.filter(a => a.id !== doc.id) })} /></Row></Card>)}
      {extras.attachments.length === 0 && <Card style={{ backgroundColor: C.canvas, gap: 11 }}><IconTile name="folder-open-outline" /><T style={{ fontFamily: F.bold }}>Chưa gắn tài liệu</T><T style={S.small}>Thử gắn một tài liệu mẫu để xem bố cục danh sách và nội dung.</T><Button label="Chọn tài liệu mẫu" secondary onPress={() => setMode('attach')} /></Card>}
      <T style={S.small}>Đang dùng thư viện minh họa; chưa tải tệp từ thiết bị hoặc gửi lên máy chủ.</T>
    </>}
    {section === 'Buổi học' && <>
      <Section title="Dành thời gian cho bài" action="+ Lên lịch" onAction={() => { setSessionId(undefined); setMode('session'); }} />
      <T style={S.small}>Một bài có thể cần nhiều buổi học. Hoàn thành buổi học không tự đánh dấu hoàn thành bài tập.</T>
      {linked.map(session => <View key={session.id} style={{ gap: 7 }}><Badge label={`${dateLabel(session.date)}/${session.date.slice(0,4)}`} bg={C.canvas} color={C.muted} /><StudySessionCard session={session} onOpen={() => { setSessionId(session.id); setMode('session'); }} onFocus={() => { prepareFocus({ courseId: session.courseId, taskId, sessionId: session.id }); }} /></View>)}
      {!linked.length && <Card style={{ backgroundColor: C.canvas, gap: 11 }}><IconTile name="calendar-outline" /><T style={{ fontFamily: F.bold }}>Chưa có buổi học nào</T><T style={S.small}>Bắt đầu bằng một khoảng ngắn để đọc đề hoặc phác thảo ý tưởng.</T><Button label="Thêm buổi học đầu tiên" onPress={() => { setSessionId(undefined); setMode('session'); }} /></Card>}
    </>}
  </Sheet>;
}
