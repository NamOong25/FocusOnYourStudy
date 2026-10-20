import React, { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Button, Card, Field, Icon, IconTile, Row, Segments, Sheet, T } from './components';
import { CourseChoices } from './forms';
import { AiProposal, PlanDraft, PlanInput, generateProposal, validatePlanInput, validateProposal } from './aiPlanner';
import { addDays, dateKey, dateLabel, isValidDate, today, uid, useApp } from './model';
import { endTime, StudySession } from './learning';
import ConflictPanel from './ConflictPanel';
import { C, F, S } from './theme';

export default function AIPlanFlow({ variant, request = '', onClose, onStudyPlan }: { variant: 'deadline' | 'free' | 'adjust'; request?: string; onClose: () => void; onStudyPlan: () => void }) {
  const context = useApp(); const { tasks, exams, studySessions, courseCatalog, applyAiProposal } = context;
  const pending = tasks.filter(t => t.status !== 'Hoàn thành').sort((a, b) => a.deadline.localeCompare(b.deadline));
  const eligible = studySessions.filter(s => s.status === 'Đã lên lịch' && s.focusedSeconds === 0);
  const initial = variant === 'adjust' ? eligible[0] : undefined;
  const [original, setOriginal] = useState<StudySession | undefined>(initial);
  const [courseId, setCourseId] = useState(initial?.courseId ?? (variant === 'deadline' ? pending[0]?.courseId : undefined) ?? courseCatalog[0]?.id ?? '');
  const [target, setTarget] = useState(variant === 'deadline' && pending.length ? 'Bài tập' : 'Tự học');
  const [taskId, setTaskId] = useState(initial?.taskId ?? (variant === 'deadline' ? pending[0]?.id : undefined) ?? '');
  const [examId, setExamId] = useState('');
  const [goal, setGoal] = useState((request || initial?.title || 'Ôn kiến thức và luyện bài tập').slice(0, 120));
  const [from, setFrom] = useState(dateKey(today)); const [to, setTo] = useState(dateKey(addDays(today, 6)));
  const [start, setStart] = useState('17:00'), [end, setEnd] = useState('22:00'); const [duration, setDuration] = useState(String(initial?.duration ?? 45)); const [count, setCount] = useState(variant === 'adjust' ? '1' : '2');
  const [proposal, setProposal] = useState<AiProposal | null>(null); const [step, setStep] = useState<'input' | 'review' | 'done'>('input');
  const [error, setError] = useState(''); const [editId, setEditId] = useState(''); const applying = useRef(false);
  const adjusting = variant === 'adjust'; const task = tasks.find(t => t.id === taskId), exam = exams.find(e => e.id === examId);
  const title = step === 'done' ? 'Kế hoạch đã được duyệt' : step === 'review' ? 'Xem trước & duyệt kế hoạch' : adjusting ? 'Điều chỉnh một buổi học' : variant === 'free' ? 'Tìm lịch theo giờ rảnh' : 'Lập kế hoạch học tập';
  const issues = proposal && step === 'review' ? validateProposal(proposal, context) : [];
  const selected = proposal?.drafts.filter(d => d.selected) ?? [];
  const update = (id: string, patch: Partial<PlanDraft>) => { setProposal(p => p && ({ ...p, drafts: p.drafts.map(d => d.id === id ? { ...d, ...patch } : d) })); setError(''); };
  const generate = () => {
    if (adjusting && !original) { setError('Chọn buổi chưa học để điều chỉnh.'); return; }
    if (!adjusting && (target === 'Bài tập' && !taskId || target === 'Kỳ thi' && !examId)) { setError('Chọn bài tập hoặc lịch thi phù hợp với môn học.'); return; }
    const input: PlanInput = { courseId, taskId: adjusting ? original?.taskId : target === 'Bài tập' ? taskId : undefined, examId: !adjusting && target === 'Kỳ thi' ? examId : undefined, goal, from, to, start, end, duration: /^\d+$/.test(duration) ? Number(duration) : NaN, count: Number(count), original: adjusting ? original : undefined };
    const invalid = validatePlanInput(input, context); if (invalid) { setError(invalid); return; }
    const next = generateProposal(`ai-${uid()}`, input, context); setProposal(next); setStep('review'); setError(''); setEditId(''); applying.current = false;
  };
  return <Sheet title={title} onClose={onClose} scrollKey={step}>
    <Badge label="ĐỀ XUẤT MẪU · CHƯA KẾT NỐI AI" icon="sparkles-outline" />
    {step === 'input' && <>
      <Card style={{ backgroundColor: C.soft, gap: 8 }}><T style={{ fontFamily: F.extra, fontSize: 21, lineHeight: 30 }}>{adjusting ? 'Đổi lịch, vẫn giữ nhịp học.' : 'Một kế hoạch vừa sức với bạn.'}</T><T style={{ fontSize: 12, lineHeight: 20, color: C.primary }}>Bạn chọn mục tiêu và giờ rảnh. Mọi buổi học đều được xem, sửa và duyệt trước khi lưu.</T></Card>
      {adjusting ? <><T style={{ fontFamily: F.bold }}>Chọn buổi chưa bắt đầu</T>{!eligible.length && <T style={S.small}>Chưa có buổi phù hợp. Chỉ điều chỉnh buổi đã lên lịch, chưa bắt đầu và chưa ghi thời gian tập trung.</T>}{eligible.map(s => <Pressable key={s.id} accessibilityRole="radio" accessibilityLabel={`Điều chỉnh: ${s.title}`} accessibilityState={{ checked: original?.id === s.id }} aria-checked={original?.id === s.id} onPress={() => { setOriginal(s); setCourseId(s.courseId); setTaskId(s.taskId ?? ''); setGoal(s.title.slice(0, 120)); setDuration(String(s.duration)); }}><Card style={{ backgroundColor: original?.id === s.id ? C.soft : C.canvas, gap: 5 }}><T style={{ fontFamily: F.semi, fontSize: 13 }}>{s.title}</T><T style={S.small}>{dateLabel(s.date)} · {s.start} – {endTime(s.start, s.duration)}</T></Card></Pressable>)}</> : <><T style={{ fontFamily: F.bold }}>Môn học</T><CourseChoices value={courseId} onChange={id => { setCourseId(id); setTaskId(''); setExamId(''); }} /><T style={{ fontFamily: F.bold }}>Mục tiêu gắn với</T><Segments values={['Bài tập', 'Kỳ thi', 'Tự học']} value={target} onChange={v => { setTarget(v); setError(''); }} />
        {target === 'Bài tập' && <>{pending.filter(t => t.courseId === courseId).map(t => <Target key={t.id} title={t.title} detail={`Hạn nộp ${dateLabel(t.deadline)}/${t.deadline.slice(0, 4)}`} selected={taskId === t.id} onPress={() => setTaskId(t.id)} />)}{!pending.some(t => t.courseId === courseId) && <T style={S.small}>Môn này chưa có bài cần làm. Chọn môn khác hoặc Tự học.</T>}</>}
        {target === 'Kỳ thi' && <>{exams.filter(e => e.courseId === courseId).map(e => <Target key={e.id} title={`${e.kind}: ${e.course}`} detail={`${dateLabel(e.date)} · ${e.time}`} selected={examId === e.id} onPress={() => setExamId(e.id)} />)}{!exams.some(e => e.courseId === courseId) && <T style={S.small}>Chưa có lịch thi cho môn này.</T>}</>}
      </>}
      {((adjusting || target === 'Bài tập') && task) && <Badge label={`Không sau hạn nộp ${dateLabel(task.deadline)}`} icon="flag-outline" />}
      {!adjusting && target === 'Kỳ thi' && exam && <Badge label={`Kết thúc trước ${exam.time} · ${dateLabel(exam.date)}`} icon="flag-outline" />}
      <Field label="Mục tiêu học tập" value={goal} onChange={setGoal} multiline />{request && <T style={S.small}>Câu hỏi được dùng làm mục tiêu mẫu, chưa được AI phân tích.</T>}
      <Field label="Từ ngày (YYYY-MM-DD)" value={from} onChange={setFrom} /><Field label="Đến ngày (YYYY-MM-DD)" value={to} onChange={setTo} />
      <T style={{ fontFamily: F.bold }}>Khung giờ rảnh mỗi ngày</T><Row style={{ alignItems: 'flex-start' }}><View style={S.grow}><Field label="Rảnh từ (HH:mm)" value={start} onChange={setStart} /></View><View style={S.grow}><Field label="Rảnh đến (HH:mm)" value={end} onChange={setEnd} /></View></Row>
      <Field label="Mỗi buổi (phút)" value={duration} onChange={setDuration} numeric /><Segments values={['25', '45', '60', '90']} value={duration} onChange={setDuration} />
      {!adjusting && <><T style={{ fontFamily: F.bold }}>Số buổi muốn lên lịch</T><Segments values={['1', '2', '3', '4', '5', '6']} value={count} onChange={setCount} /></>}
      {!!error && <T accessibilityRole="alert" style={{ color: C.red }}>{error}</T>}<Button label="Tạo đề xuất mẫu" icon="sparkles-outline" onPress={generate} />
      <T style={S.small}>Tối đa 14 ngày mỗi lần; tự chừa ít nhất 10 phút giữa các buổi được đề xuất. Ngày/giờ đang nhập dạng chuỗi trong bản giao diện.</T>
    </>}
    {step === 'review' && proposal && <>
      <Card style={{ backgroundColor: C.soft, gap: 7 }}><T style={{ fontFamily: F.bold }}>Bạn là người quyết định</T><T style={S.small}>{proposal.drafts.length}/{proposal.input.count} buổi tìm được · {selected.length} buổi đang chọn. Chưa có thay đổi nào được lưu.</T><T style={{ fontSize: 12, color: C.primary }}>{proposal.input.from} → {proposal.input.to} · {proposal.input.start}–{proposal.input.end}</T></Card>
      {adjusting && original && <Card style={{ backgroundColor: C.amberSoft, gap: 6 }}><T style={{ fontFamily: F.bold }}>Buổi gốc</T><T style={S.small}>{original.title} · {dateLabel(original.date)} · {original.start}–{endTime(original.start, original.duration)}</T><T style={S.small}>Chỉ buổi này được thay khi bạn duyệt; không thêm bản sao.</T></Card>}
      {!proposal.drafts.length && <Card style={{ alignItems: 'center', gap: 12 }}><IconTile name="calendar-outline" /><T style={{ fontFamily: F.bold }}>Chưa tìm được khoảng phù hợp</T><T style={[S.small, { textAlign: 'center' }]}>Thử mở rộng giờ rảnh, giảm thời lượng hoặc đổi khoảng ngày trước deadline.</T></Card>}
      {!!proposal.drafts.length && proposal.drafts.length < proposal.input.count && <T style={{ color: C.amber, fontSize: 12 }}>Lịch hiện chỉ đủ chỗ cho {proposal.drafts.length} buổi. Bạn có thể duyệt số buổi này hoặc đổi điều kiện.</T>}
      {proposal.drafts.map((d, i) => { const rowIssues = issues.filter(issue => issue.id === d.id); return <Card key={d.id} style={{ gap: 12, backgroundColor: d.selected ? '#fff' : C.canvas }}><Row between><Pressable accessibilityRole="checkbox" accessibilityLabel={`Duyệt buổi ${i + 1}`} accessibilityState={{ checked: d.selected }} aria-checked={d.selected} onPress={() => update(d.id, { selected: !d.selected })} style={[S.row, { minHeight: 44 }]}><Icon name={d.selected ? 'checkbox' : 'square-outline'} /><T style={{ fontFamily: F.bold }}>Buổi {i + 1}</T></Pressable><Badge label={!d.selected ? 'Bỏ qua' : rowIssues.length ? 'Cần sửa' : 'Có thể duyệt'} color={rowIssues.length ? C.red : C.green} bg={rowIssues.length ? C.redSoft : C.greenSoft} /></Row><T style={{ fontFamily: F.bold }}>{d.title}</T><T style={S.small}>{courseCatalog.find(c => c.id === d.courseId)?.name}</T><Row><Icon name="calendar-outline" size={17} /><T style={{ fontSize: 12 }}>{isValidDate(d.date) ? `${dateLabel(d.date)}/${d.date.slice(0, 4)}` : 'Ngày cần sửa'} · {/^([01]\d|2[0-3]):[0-5]\d$/.test(d.start) && Number.isInteger(d.duration) ? `${d.start}–${endTime(d.start, d.duration)}` : 'Giờ cần sửa'}</T></Row>
        {editId === d.id && <><Field label={`Tên buổi ${i + 1}`} value={d.title} onChange={v => update(d.id, { title: v })} /><Field label={`Ngày buổi ${i + 1} (YYYY-MM-DD)`} value={d.date} onChange={v => update(d.id, { date: v })} /><Field label={`Giờ buổi ${i + 1} (HH:mm)`} value={d.start} onChange={v => update(d.id, { start: v })} /><Field label={`Thời lượng buổi ${i + 1}`} value={Number.isFinite(d.duration) ? String(d.duration) : ''} onChange={v => update(d.id, { duration: /^\d+$/.test(v) ? Number(v) : NaN })} numeric /></>}
        <Button label={`${editId === d.id ? 'Thu gọn' : 'Chỉnh sửa'} buổi ${i + 1}`} secondary icon="create-outline" onPress={() => setEditId(editId === d.id ? '' : d.id)} />{rowIssues.map((issue, j) => <View key={j} style={{ gap: 8 }}><T accessibilityRole="alert" style={{ fontSize: 12, color: C.red }}>{issue.message}</T><ConflictPanel conflicts={issue.conflicts} candidate={d.title} /></View>)}
      </Card>; })}
      {issues.filter(i => i.id === 'all').map((i, n) => <T key={n} accessibilityRole="alert" style={{ color: C.red }}>{i.message}</T>)}{!!error && <T accessibilityRole="alert" style={{ color: C.red }}>{error}</T>}
      <Button label={adjusting ? 'Duyệt thay đổi buổi học' : 'Chấp nhận kế hoạch mẫu'} icon="checkmark" disabled={issues.length > 0 || !selected.length} onPress={() => { if (applying.current) return; applying.current = true; const result = applyAiProposal(proposal); if (!result.ok) { setError(result.message); applying.current = false; return; } setStep('done'); }} />
      <Button label="Đổi điều kiện đề xuất" secondary onPress={() => { setStep('input'); setError(''); }} /><Button label="Hủy đề xuất" secondary onPress={onClose} />
    </>}
    {step === 'done' && <><Card style={{ backgroundColor: C.greenSoft, alignItems: 'center', gap: 14, padding: 26 }}><IconTile name="checkmark-circle-outline" color={C.green} bg="#FFFFFFAA" size={66} /><T style={{ fontFamily: F.extra, fontSize: 23, color: C.green, textAlign: 'center' }}>{adjusting ? 'Đã cập nhật buổi học' : `Đã thêm ${selected.length} buổi tự học`}</T><T style={[S.small, { textAlign: 'center' }]}>Bài tập giữ deadline và trạng thái riêng. Bạn có thể sửa lịch hoặc bắt đầu Pomodoro từ buổi đã duyệt.</T></Card><Button label="Xem lịch tự học" icon="calendar-outline" onPress={() => { onClose(); onStudyPlan(); }} /><Button label="Quay lại trợ lý" secondary onPress={onClose} /><T style={S.small}>Dữ liệu chỉ giữ trong phiên dùng thử, tải lại app sẽ trở về mẫu.</T></>}
  </Sheet>;
}
function Target({ title, detail, selected, onPress }: { title: string; detail: string; selected: boolean; onPress: () => void }) { return <Pressable accessibilityRole="radio" accessibilityLabel={`Mục tiêu: ${title}`} accessibilityState={{ checked: selected }} aria-checked={selected} onPress={onPress}><Card style={{ backgroundColor: selected ? C.soft : C.canvas, gap: 5 }}><Row><Icon name={selected ? 'radio-button-on' : 'radio-button-off'} size={18} /><T style={[S.grow, { fontFamily: F.semi, fontSize: 13 }]}>{title}</T></Row><T style={S.small}>{detail}</T></Card></Pressable>; }
