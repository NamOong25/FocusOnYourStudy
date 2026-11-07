import React, { useState } from 'react';
import { Badge, Button, Card, Icon, Row, Sheet, StateView, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { useNavigationScope } from '../../../navigation/Navigation';
import { useApp } from '../../../store/model';
import useCurrentTime from '../../../shared/hooks/useCurrentTime';
import { useServerExam } from '../api/useServerExams';
import { examFormats, examKinds, type ServerExam } from '../api/examsApi';
import ExamApiForm from './ExamApiForm';
import { useExamWrites } from '../api/ExamWritesProvider';
import { examDate, examProgress, examReminderText, examTiming } from '../examView';

export default function ServerExamDialog({ id, onClose, onRefreshList }: { id: string; onClose: () => void; onRefreshList: () => void }) {
  const { active } = useNavigationScope(), source = useServerExam(id, active), { courseCatalog, semesters } = useApp(), now = useCurrentTime();
  const [editing, setEditing] = useState<ServerExam | null>(null), { state: writes } = useExamWrites();
  const exam = source.value, course = courseCatalog.find(c => c.id === exam?.courseId), semester = semesters.find(s => s.id === course?.semesterId);
  const reload = () => { void source.reload().catch(() => {}); };
  if (editing) return <ExamApiForm original={editing} onClose={() => { setEditing(null); reload(); onRefreshList(); }} onSaved={() => { setEditing(null); reload(); onRefreshList(); }} onDeleted={() => { onClose(); onRefreshList(); }} />;
  return <Sheet title="Chi tiết lịch thi" onClose={onClose}>
    {!source.loaded || !exam ? <StateView kind={source.error ? 'error' : 'loading'} title={source.error?.code === 'EXAM_NOT_FOUND' ? 'Lịch thi không còn tồn tại' : source.error ? 'Chưa tải được chi tiết' : 'Đang tải chi tiết lịch thi'} message={source.error?.message ?? 'Đang lấy thông tin mới nhất trong tài khoản.'} actionLabel={source.error ? 'Thử tải lại chi tiết' : undefined} onAction={reload} secondaryLabel={source.error ? 'Quay lại và cập nhật danh sách' : undefined} onSecondary={() => { onClose(); onRefreshList(); }} /> : <>
      {source.error && <Card style={{ backgroundColor: C.redSoft, gap: 6 }}><T accessibilityRole="alert" style={{ color: C.red }}>{source.error.message}</T><T style={S.small}>Đang hiển thị chi tiết đã tải gần nhất. Tải lại để kiểm tra thay đổi.</T></Card>}
      <Button label="Tải lại chi tiết lịch thi" secondary icon="refresh-outline" loading={source.loading} onPress={reload} />
      <Card style={{ backgroundColor: C.soft, gap: 12 }}><Badge label={examKinds[exam.kind]} bg="#FFFFFFAA" /><T style={{ fontFamily: F.extra, fontSize: 24, lineHeight: 34, letterSpacing: -0.5 }}>{course?.name ?? 'Môn chưa được tải'}</T><T style={{ color: C.primary, fontSize: 12 }}>{course ? `${course.code} · ${course.credits} tín chỉ` : 'Cập nhật danh sách môn để xem tên'}{semester ? ` · ${semester.name} · ${semester.academicYear}` : ''}</T><Badge label={examProgress(exam, now.getTime())} bg="#FFFFFFAA" icon="hourglass-outline" /></Card>
      <Card style={{ backgroundColor: C.canvas, gap: 8 }}><Row><Icon name="calendar-outline" /><T style={{ fontFamily: F.bold }}>{examDate(exam)}</T></Row><T style={{ fontFamily: F.semi }}>{examTiming(exam)}</T><T style={S.small}>Múi giờ: {exam.timeZone}</T></Card>
      <Card style={{ backgroundColor: C.canvas, gap: 7 }}><Row><Icon name="business-outline" /><T style={{ fontFamily: F.bold }}>{exam.room || 'Chưa có phòng thi'}</T></Row><T style={S.small}>{examFormats[exam.format]}</T></Card>
      <Card style={{ backgroundColor: C.canvas, gap: 10 }}><Row><Icon name="notifications-outline" /><T style={{ fontFamily: F.bold }}>Nhắc trước kỳ thi</T></Row><T style={{ fontSize: 13 }}>{examReminderText(exam)}</T><T style={S.small}>Đây là cấu hình nhắc đã lưu. Thông báo trên thiết bị sẽ được bổ sung sau.</T></Card>
      <T style={{ fontFamily: F.bold }}>Chuẩn bị & ghi chú</T><T style={{ color: C.muted, fontSize: 13, lineHeight: 23 }}>{exam.notes || 'Chưa có ghi chú.'}</T>
      <Button label={writes.pending ? 'Kiểm tra lần ghi lịch thi trước' : 'Chỉnh sửa hoặc xóa lịch thi'} secondary icon="create-outline" disabled={source.loading || !!source.error || writes.busy || writes.checking || !course} onPress={() => setEditing(exam)} />
    </>}
  </Sheet>;
}
