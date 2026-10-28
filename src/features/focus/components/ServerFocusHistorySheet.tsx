import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Button, Card, Row, Sheet, StateView, T } from '../../../shared/components';
import { DateField } from '../../../shared/components/DateTimePicker';
import { C, F, S } from '../../../shared/theme';
import { useApp } from '../../../store/model';
import { historyKey, pomodoroDay, shiftPomodoroDay, validPomodoroDate, type PomodoroHistoryQuery } from '../api/pomodoroInsightsApi';
import { usePomodoroInsightsApi, usePomodoroRead } from '../api/usePomodoroInsights';
import { uuid, type PomodoroSession } from '../api/pomodoroApi';

const dateTime = (value: string, timeZone: string) => new Intl.DateTimeFormat('vi-VN', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
const snapshotLabel = (c: PomodoroSession['context']) => `${c.courseName} · ${c.courseCode} · Học kỳ ${c.semesterTerm === 3 ? 'hè' : c.semesterTerm} · ${c.semesterStartYear}–${c.semesterStartYear + 1} (lịch sử)`;
function HistoryRow({ row, timeZone, onCourse }: { row: PomodoroSession; timeZone: string; onCourse: () => void }) {
  const [detail, setDetail] = useState(false), complete = row.status === 'COMPLETED';
  return <Card style={{ gap: 10, backgroundColor: complete ? C.greenSoft : C.canvas }}>
    <Row between><Badge label={complete ? 'Hoàn tất' : 'Đã hủy'}/><T style={{ color: complete ? C.green : C.amber, fontFamily: F.bold }}>{complete ? `${row.creditedStudyMillis / 60000} phút` : 'Không cộng tiến độ'}</T></Row>
    <T style={{ fontFamily: F.bold, fontSize: 16 }}>{row.context.courseName}</T>
    <T style={S.small}>{row.context.studyTitle ?? row.context.assignmentTitle ?? 'Tập trung theo môn'}</T>
    <T style={S.small}>Kết thúc: {dateTime(row.endedAt!, timeZone)}</T>
    {!complete && <T style={S.small}>Đã học dở {Math.floor(row.elapsedMillis / 60000)} phút {Math.floor(row.elapsedMillis / 1000) % 60} giây · Không tính vào phút học hoàn tất.</T>}
    {detail && <View style={{ gap: 8 }}><T style={S.small}>Bắt đầu: {dateTime(row.startedAt, timeZone)}</T><T style={S.small}>Tạm dừng: {Math.floor(row.pausedMillis / 60000)} phút {Math.floor(row.pausedMillis / 1000) % 60} giây (đã loại trừ)</T><T style={S.small}>{row.context.courseCode} · Học kỳ {row.context.semesterTerm === 3 ? 'hè' : row.context.semesterTerm} · {row.context.semesterStartYear}–{row.context.semesterStartYear + 1}</T>{row.context.assignmentTitle && <T style={S.small}>Bài tập: {row.context.assignmentTitle}</T>}{row.context.studyTitle && <T style={S.small}>Buổi tự học: {row.context.studyTitle}</T>}<T style={S.small}>Ghi nhận: {dateTime(row.finalizedAt!, timeZone)}</T>{row.timeZone !== timeZone && <T style={S.small}>Múi giờ khi bắt đầu: {row.timeZone}</T>}<T style={S.small}>Tên môn và nội dung được giữ theo thời điểm bắt đầu phiên.</T><Button label={`Lọc lịch sử môn ${row.context.courseName}`} secondary onPress={onCourse}/></View>}
    <Button label={detail ? 'Thu gọn phiên học' : 'Xem chi tiết phiên học'} secondary onPress={() => setDetail(v => !v)}/>
  </Card>;
}
function Choice<T extends string>({ values, value, onChange }: { values: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{values.map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: value === option.value }} onPress={() => onChange(option.value)} style={{ paddingHorizontal: 13, minHeight: 44, borderRadius: 15, justifyContent: 'center', backgroundColor: value === option.value ? C.primary : C.canvas }}><T style={{ fontSize: 12, color: value === option.value ? 'white' : C.muted }}>{option.label}</T></Pressable>)}</View>;
}
export default function ServerFocusHistorySheet({ timeZone, today, revision, onClose }: { timeZone: string; today: string; revision: string; onClose: () => void }) {
  const api = usePomodoroInsightsApi(), { courseCatalog, semesters } = useApp();
  const [range, setRange] = useState<'all' | 'today' | 'week' | 'custom'>('all'), [status, setStatus] = useState<'all' | 'COMPLETED' | 'CANCELLED'>('all');
  const [from, setFrom] = useState(today), [to, setTo] = useState(today), [page, setPage] = useState(0), [course, setCourse] = useState<{ id: string; name: string; label: string } | null>(null), [showCourses, setShowCourses] = useState(false);
  const [applied, setApplied] = useState<{ from: string; to: string } | null>(null), [rangeError, setRangeError] = useState('');
  useEffect(() => setPage(0), [revision, today, timeZone]);
  const query: PomodoroHistoryQuery = { page, size: 10, timeZone, ...(status === 'all' ? {} : { status }), ...(course ? { courseId: course.id } : {}),
    ...(range === 'today' ? { fromDate: today, toDate: today } : range === 'week' ? { fromDate: validPomodoroDate(today) ? shiftPomodoroDay(today, -6) : '', toDate: today } : range === 'custom' && applied ? { fromDate: applied.from, toDate: applied.to } : {}) };
  const { state, reload } = usePomodoroRead(api.history, historyKey, query, revision, range !== 'custom' || !!applied);
  const data = state.loaded && !state.loading && !state.error ? state.value : null;
  const filterCourse = (id: string, name: string, label: string) => { setCourse({ id, name, label }); setPage(0); setShowCourses(false); };
  const resetPage = () => { if (page !== 0) setPage(0); else void reload().catch(() => {}); };
  const options = new Map(courseCatalog.filter(c => uuid(c.id)).map(c => { const semester = semesters.find(s => s.id === c.semesterId); return [c.id, { id: c.id, name: c.name, label: `${c.name} · ${c.code}${semester ? ` · ${semester.name} · ${semester.academicYear}` : ''}` }]; }));
  for (const row of data?.items ?? []) if (!options.has(row.context.courseId)) options.set(row.context.courseId, { id: row.context.courseId, name: row.context.courseName, label: snapshotLabel(row.context) });
  if (course && !options.has(course.id)) options.set(course.id, course);
  let previousDay = '';
  return <Sheet title="Lịch sử tập trung" onClose={onClose} scrollKey={`${range}:${status}:${course?.id ?? 'all'}:${applied?.from}:${applied?.to}:${page}`}>
    <T style={S.small}>Lịch sử toàn tài khoản · {timeZone}. Ngày được tính theo giờ kết thúc phiên; phiên hủy giữ để tra cứu.</T>
    <Choice value={range} values={[{ value: 'all', label: 'Mọi ngày' }, { value: 'today', label: 'Hôm nay' }, { value: 'week', label: '7 ngày gần đây' }, { value: 'custom', label: 'Chọn khoảng ngày' }]} onChange={v => { setRange(v); setPage(0); }}/>
    {range === 'custom' && <><DateField label="Từ ngày" value={from} onChange={setFrom}/><DateField label="Đến hết ngày" value={to} onChange={setTo}/><Button label="Áp dụng khoảng ngày" secondary onPress={() => { if (!validPomodoroDate(from) || !validPomodoroDate(to) || from > to) { setRangeError('Chọn ngày bắt đầu không sau ngày kết thúc.'); return; } setRangeError(''); setApplied({ from, to }); setPage(0); }}/>{!!rangeError && <T accessibilityRole="alert" style={{ color: C.red }}>{rangeError}</T>}{applied && <T style={S.small}>Đang lọc: {applied.from.split('-').reverse().join('/')} – {applied.to.split('-').reverse().join('/')}.</T>}</>}
    <Choice value={status} values={[{ value: 'all', label: 'Tất cả trạng thái' }, { value: 'COMPLETED', label: 'Đã hoàn tất' }, { value: 'CANCELLED', label: 'Đã hủy' }]} onChange={v => { setStatus(v); setPage(0); }}/>
    <Button label={course ? `Môn: ${course.label}` : 'Môn: Tất cả môn học'} secondary onPress={() => setShowCourses(v => !v)}/>
    {showCourses && <View style={{ gap: 8 }}><Button label="Chọn tất cả môn học" secondary onPress={() => { setCourse(null); setPage(0); setShowCourses(false); }}/>{[...options.values()].map(c => <Button key={c.id} label={`Chọn môn ${c.label}`} secondary onPress={() => filterCourse(c.id, c.name, c.label)}/>)}</View>}
    {range === 'custom' && !applied ? <StateView title="Chọn khoảng ngày để xem" message="Chọn ngày bắt đầu, kết thúc rồi nhấn áp dụng."/>
      : state.error ? <StateView kind="error" title="Chưa tải được lịch sử" message={state.error.message} actionLabel="Thử lại lịch sử" onAction={() => { void reload().catch(() => {}); }}/>
        : !data ? <StateView kind="loading" title="Đang tải lịch sử" message="Lấy các phiên đã hoàn tất hoặc đã hủy trong tài khoản."/>
          : <><Row between><T style={{ fontFamily: F.bold }}>{data.totalElements} phiên phù hợp</T><T style={S.small}>{data.totalPages ? `Trang ${data.page + 1}/${data.totalPages}` : '0 phiên'}</T></Row>
            {data.items.length ? data.items.map(row => { const day = pomodoroDay(new Date(row.endedAt!), timeZone), heading = day !== previousDay; previousDay = day; return <View key={row.id} style={{ gap: 10 }}>{heading && <T style={{ fontFamily: F.bold, marginTop: 5 }}>{day.split('-').reverse().join('/')}</T>}<HistoryRow row={row} timeZone={timeZone} onCourse={() => filterCourse(row.context.courseId, row.context.courseName, snapshotLabel(row.context))}/></View>; }) : <StateView title={data.totalElements ? 'Trang này không còn phiên' : 'Chưa có phiên phù hợp'} message={data.totalElements ? 'Danh sách đã thay đổi. Về trang đầu để xem lại.' : 'Thử đổi bộ lọc hoặc hoàn tất một phiên tập trung.'}/>}
            <Row style={{ gap: 10 }}><Button label="Trang trước" secondary disabled={page === 0} onPress={() => setPage(p => p - 1)}/><Button label="Trang sau" secondary disabled={page + 1 >= data.totalPages} onPress={() => setPage(p => p + 1)}/></Row>
          </>}
    <Button label="Tải lại lịch sử từ trang đầu" secondary icon="refresh-outline" disabled={state.loading || range === 'custom' && !applied} onPress={resetPage}/>
  </Sheet>;
}
