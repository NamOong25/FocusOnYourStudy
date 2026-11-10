import React, { useState } from 'react';
import { Button, Card, Link, Row, Sheet, StateView, T } from '../../shared/components';
import { C, S } from '../../shared/theme';
import { FlowScope, useNavigationScope } from '../../navigation/Navigation';
import { dateKey, parseDay } from '../../shared/utils/dates';
import { useApp } from '../../store/model';
import { queryKey, type ServerOccurrence, type ServerRule } from './api/scheduleApi';
import { useServerSchedule } from './api/useServerSchedule';
import ScheduleCalendar from './components/ScheduleCalendar';
import ScheduleHeader from './components/ScheduleHeader';
import { ScheduleDayList, ScheduleWeekGrid, type TimetableEntry } from './components/ScheduleTimetable';
import ServerClassDialog from './components/ServerClassDialog';
import ServerClassForm from './components/ServerClassForm';
import ServerRuleList from './components/ServerRuleList';
import { firstRuleDate } from './ruleDraft';
import { useFeedback } from '../../shared/feedback/FeedbackProvider';
import { scheduleWindow, type CalendarView } from './scheduleView';
import ServerExceptionFlow, { type ExceptionFlowRequest } from './components/ServerExceptionFlow';
import type { ExceptionSnapshot } from './api/classExceptionsApi';
import type { ExceptionMode } from './exceptionDraft';

export default function ServerSchedule() {
  const { semesters, academicSemesterId, setAcademicSemesterId, courseCatalog, courseConnection, setScheduleMode, scheduleDestination, consumeScheduleDestination } = useApp();
  const [view, setView] = useState<CalendarView>('Theo tuần'), [selected, setSelected] = useState(() => new Date());
  const [choose, setChoose] = useState(false), [detail, setDetail] = useState<{ key: string; item: ServerOccurrence } | null>(null);
  const [editor, setEditor] = useState<{ original?: ServerRule; date: string; semesterId: string } | null>(null), [manage, setManage] = useState(false);
  const [occurrenceFlow, setOccurrenceFlow] = useState<ExceptionFlowRequest | null>(null);
  const { showNotice } = useFeedback();
  const scope = useNavigationScope(), range = scheduleWindow(selected, view);
  const semester = semesters.find(s => s.id === academicSemesterId);
  const query = semester ? { semesterId: semester.id, from: range.from, to: range.to } : null;
  const key = query ? queryKey(query) : '', source = useServerSchedule(query, scope.active);
  React.useLayoutEffect(() => {
    if (!scope.active || !scheduleDestination) return;
    source.invalidate();
    setSelected(parseDay(scheduleDestination.date)); setView('Theo ngày'); setChoose(false); setDetail(null); setEditor(null); setManage(false); setOccurrenceFlow(null);
    consumeScheduleDestination(scheduleDestination.key);
  }, [scope.active, scheduleDestination, consumeScheduleDestination, source.invalidate]);
  const day = dateKey(selected), rows = source.rows;
  const entries = rows.map((item): TimetableEntry => {
    const course = courseCatalog.find(c => c.id === item.courseId);
    return { id: `${item.scheduleId}:${item.date}`, date: item.date, start: item.startTime, end: item.endTime,
      title: course?.name ?? 'Môn chưa được tải', code: course?.code, room: item.room, color: course?.color,
      status: item.cancelled ? 'Đã nghỉ' : item.changed ? 'Đã điều chỉnh' : undefined, onOpen: () => setDetail({ key, item }) };
  });
  const name = (item: ServerOccurrence) => courseCatalog.find(c => c.id === item.courseId)?.name ?? 'Môn chưa được tải';
  const reload = () => { setDetail(null); void Promise.all([source.reload(), courseConnection?.reload()]).catch(() => {}); };
  const stale = !!source.error || source.loading || source.busy;
  const openDay = (date: Date) => { setSelected(date); setView('Theo ngày'); };
  const edit = (rule?: ServerRule) => { if (!semester || stale || source.needsReload) return; setManage(false); setDetail(null); setEditor({ original: rule, date: dateKey(selected), semesterId: semester.id }); };
  const saved = (rule: ServerRule) => { setEditor(null); setDetail(null); const course = courseCatalog.find(c => c.id === rule.courseId); if (course) setAcademicSemesterId(course.semesterId); setSelected(parseDay(firstRuleDate(rule))); showNotice('Đã lưu chuỗi lịch vào tài khoản.'); };
  const startException = (mode: ExceptionMode, item: ServerOccurrence) => { if (stale || source.needsReload || !source.loaded) return; setDetail(null); setOccurrenceFlow({ mode, target: { scheduleId: item.scheduleId, date: item.date }, expectedVersion: item.scheduleVersion }); };
  const exceptionDone = (snapshot: ExceptionSnapshot, mode: ExceptionMode) => { setOccurrenceFlow(null); setDetail(null); const course = courseCatalog.find(c => c.id === snapshot.rule.courseId); if (course) setAcademicSemesterId(course.semesterId); setSelected(parseDay(snapshot.occurrence.date)); showNotice(mode === 'review' ? 'Đã kiểm tra buổi học hiện tại.' : mode === 'cancel' ? 'Đã lưu nghỉ đúng một buổi học.' : mode === 'restore' ? 'Đã khôi phục buổi theo lịch gốc hiện tại.' : 'Đã lưu thay đổi đúng một buổi học.'); };
  return <FlowScope onClose={() => { if (!source.busy) { setChoose(false); setDetail(null); setEditor(null); setManage(false); setOccurrenceFlow(null); } }}>
    <ScheduleHeader semester={semester} onChoose={() => setChoose(true)} />
    {!semester ? <StateView title="Chưa có học kỳ để xem lịch" message="Tạo học kỳ và thêm môn học trong Môn & học kỳ để bắt đầu." actionLabel="Đến Môn & học kỳ" onAction={() => setScheduleMode('Môn & học kỳ')} /> : <>
      <ScheduleCalendar selected={selected} view={view} onSelect={setSelected} onView={setView} hasEvent={date => source.loaded && rows.some(row => row.date === date)} />
      {source.needsReload && <Card style={{backgroundColor:C.amberSoft,gap:10}}><T accessibilityRole="alert" style={S.small}>{source.pendingOccurrence ? 'Lần thay đổi buổi học chưa rõ kết quả. Kiểm tra đúng chuỗi và ngày vừa ghi trước khi tiếp tục.' : 'Lần ghi trước chưa xác định được kết quả. Mở Quản lý chuỗi lịch và kiểm tra dữ liệu trước khi tiếp tục lưu.'}</T>{source.pendingOccurrence && <Button label="Kiểm tra buổi vừa thay đổi" secondary disabled={source.busy} onPress={() => { setDetail(null); setManage(false); setOccurrenceFlow({ mode:'review', target:source.pendingOccurrence! }); }} />}</Card>}
      {!source.loaded ? <StateView kind={source.error ? 'error' : 'loading'} title={source.error ? 'Chưa tải được lịch học' : 'Đang tải lịch học'} message={source.error?.message ?? 'Đang lấy lịch đã lưu trong học kỳ và khoảng ngày bạn đang xem.'} actionLabel={source.error ? 'Thử tải lại lịch' : undefined} onAction={reload} /> : <>
        {source.error && <Card style={{ backgroundColor: C.redSoft, gap: 6 }}><T accessibilityRole="alert" style={{ color: C.red }}>{source.error.message}</T><T style={S.small}>Đang giữ lịch đã tải gần nhất cho đúng học kỳ và khoảng ngày này. Tải lại để xem bản mới nhất.</T></Card>}
        {source.loading && <T accessibilityLiveRegion="polite" style={S.small}>Đang cập nhật lịch…</T>}
        {view === 'Theo tuần'
          ? <ScheduleWeekGrid days={range.days} selected={day} entries={entries} disabled={stale} onDay={openDay} />
          : <ScheduleDayList date={day} entries={entries.filter(entry => entry.date === day)} disabled={stale} />}
        {!!entries.length && <T style={S.small}>Giờ theo múi giờ của từng buổi. Bấm vào buổi học để xem chi tiết.</T>}
      </>}
      <Row>
        <Button label="Thêm chuỗi lịch học" icon="add" style={S.grow} disabled={stale || !source.loaded || source.needsReload || !!courseConnection?.needsReload} onPress={() => edit()} />
        <Button label="Quản lý chuỗi lịch" secondary style={S.grow} disabled={source.busy} onPress={() => setManage(true)} />
      </Row>
      {source.loaded && !source.loading && !source.busy && !courseConnection?.loading && !courseConnection?.busy && <Link label="Tải lại lịch học" onPress={reload} />}
    </>}
    {choose && <Sheet title="Học kỳ xem lịch" onClose={() => setChoose(false)}>{semesters.map(s => <Button key={s.id} secondary={s.id !== semester?.id} label={`${s.name} · ${s.academicYear}`} onPress={() => { setAcademicSemesterId(s.id); setChoose(false); setDetail(null); }} />)}</Sheet>}
    {source.confirmedWrite && source.error && <T style={S.small}>Lần lưu/xóa đã được xác nhận. Chưa tải lại được lịch; không cần gửi lại thao tác ghi.</T>}
    {detail?.key === key && <ServerClassDialog key={`${key}:${detail.item.scheduleId}:${detail.item.date}`} item={detail.item} title={name(detail.item)} blocked={stale || source.needsReload || !source.loaded} onClose={() => setDetail(null)} onReload={reload} onEdit={edit} onException={startException} />}
    {manage && semester && <ServerRuleList semesterId={semester.id} source={source} onEdit={edit} onClose={() => setManage(false)} />}
    {editor && <ServerClassForm key={editor.original?.id ?? 'new'} source={source} original={editor.original} initialDate={editor.date} semesterId={editor.semesterId} onClose={() => setEditor(null)} onSaved={saved} onDeleted={() => { setEditor(null); setDetail(null); showNotice('Đã xóa cả chuỗi lịch và các ngoại lệ của chuỗi.'); }} />}
    {occurrenceFlow && <ServerExceptionFlow key={`${occurrenceFlow.target.scheduleId}:${occurrenceFlow.target.date}:${occurrenceFlow.mode}`} request={occurrenceFlow} source={source} onClose={() => { if (!source.busy) setOccurrenceFlow(null); }} onComplete={exceptionDone} />}
  </FlowScope>;
}
