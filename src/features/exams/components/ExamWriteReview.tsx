import React from 'react';
import { Button, Card, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { useApp } from '../../../store/model';
import { useExamWrites } from '../api/ExamWritesProvider';
import { examKinds, examFormats, type ServerExam } from '../api/examsApi';
import { examDate, examReminderText, examTiming } from '../examView';

export default function ExamWriteReview({ onReplace, onClose }: { onReplace: (exam: ServerExam) => void; onClose: () => void }) {
  const { manager, state } = useExamWrites(), { courseCatalog, semesters } = useApp();
  const pending = state.pending;
  if (!pending) return null;
  const accept = (next: () => void) => { if (manager.acknowledge()) next(); };
  return <Card style={{ backgroundColor: C.amberSoft, gap: 12 }}>
    <T accessibilityRole="alert" style={{ fontFamily: F.bold }}>{pending.reason === 'stale' ? 'Lịch đã thay đổi ở nơi khác' : pending.reason === 'gone' ? 'Lịch thi không còn tồn tại' : 'Cần kiểm tra kết quả lần ghi trước'}</T>
    <T style={S.small}>{pending.reason === 'uncertain' ? 'Yêu cầu có thể đã được lưu dù app chưa nhận được phản hồi. App giữ bản nháp và không tự gửi lại. Kiểm tra dữ liệu đã lưu trước khi quyết định.' : 'Bản nháp đang nhập vẫn được giữ. Đọc và xem bản mới trước khi thay thế; app không tự tăng version để ghi đè.'}</T>
    <Button label="Kiểm tra kết quả đã lưu" secondary loading={state.checking} disabled={state.busy} onPress={() => { void manager.check().catch(() => {}); }} />
    {!!state.error && <T accessibilityRole="alert" style={{ color: C.red }}>{state.error.message}</T>}
    {state.checked && <>
      <T style={{ fontFamily: F.bold }}>Dữ liệu vừa đọc từ tài khoản</T>
      {!state.checked.rows.length && <T style={S.small}>{pending.original ? 'Lịch này không còn truy cập được trong tài khoản. Bạn có thể đóng biểu mẫu; app không tạo lại lịch đã xóa.' : 'Chưa thấy lịch thi nào. Nếu lần gửi trước vừa bị gián đoạn, hãy kiểm tra lại trước khi tự quyết định gửi thêm.'}</T>}
      {state.checked.rows.map(exam => {
        const course = courseCatalog.find(c => c.id === exam.courseId), semester = semesters.find(s => s.id === course?.semesterId);
        return <Card key={exam.id} style={{ padding: 12, gap: 5 }}><T style={{ fontFamily: F.semi }}>{course?.name ?? 'Môn chưa được tải'}{semester ? ` · ${semester.name} ${semester.academicYear}` : ''}</T><T style={S.small}>{examKinds[exam.kind]} · {examFormats[exam.format]}</T><T style={S.small}>{examDate(exam)} · {examTiming(exam)} · {exam.timeZone}</T><T style={S.small}>{exam.room || 'Chưa có phòng'} · Phiên bản {exam.version}</T><T style={S.small}>{examReminderText(exam)}</T><T style={S.small}>{exam.notes || 'Chưa có ghi chú'}</T></Card>;
      })}
      {pending.original ? state.checked.current ? <Button label="Thay bản nháp bằng lịch vừa kiểm tra" secondary disabled={state.checking || state.busy} onPress={() => { const current = state.checked?.current; if (current) accept(() => onReplace(current)); }} />
        : <Button label="Đã kiểm tra, đóng biểu mẫu" secondary disabled={state.checking || state.busy} onPress={() => accept(onClose)} />
        : <><Button label="Đã thấy lịch đã lưu, đóng biểu mẫu" secondary disabled={state.checking || state.busy || !state.checked.rows.length} onPress={() => accept(onClose)} /><Button label="Đã kiểm tra, cho phép lưu lại" secondary disabled={state.checking || state.busy} onPress={() => accept(() => {})} /><T style={S.small}>Chỉ chọn lưu lại khi đã đối chiếu và xác định lịch cần tạo chưa có. Kiểm tra danh sách không tự gửi thêm yêu cầu.</T></>}
    </>}
  </Card>;
}
