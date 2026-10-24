import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Button, Card, Icon, IconTile, Row, Section, Sheet, StateView, T } from '../../shared/components';
import { C, F, S } from '../../shared/theme';
import { FlowScope, useNavigationScope } from '../../navigation/Navigation';
import { dateKey, dateLabel } from '../../shared/utils/dates';
import { useApp } from '../../store/model';
import { queryKey, type ServerOccurrence, type ServerRule } from './api/scheduleApi';
import { useServerSchedule } from './api/useServerSchedule';
import ScheduleCalendar from './components/ScheduleCalendar';
import ServerClassDialog from './components/ServerClassDialog';
import ServerClassForm from './components/ServerClassForm';
import ServerRuleList from './components/ServerRuleList';
import { firstRuleDate } from './ruleDraft';
import { parseDay } from '../../shared/utils/dates';
import { useFeedback } from '../../shared/feedback/FeedbackProvider';
import { scheduleWindow, type CalendarView } from './scheduleView';

export default function ServerSchedule() {
  const { semesters, academicSemesterId, setAcademicSemesterId, courseCatalog, courseConnection, setScheduleMode } = useApp();
  const [view, setView] = useState<CalendarView>('Theo ngày'), [selected, setSelected] = useState(() => new Date());
  const [choose, setChoose] = useState(false), [detail, setDetail] = useState<{ key: string; item: ServerOccurrence } | null>(null);
  const [editor, setEditor] = useState<{ original?: ServerRule; date: string; semesterId: string } | null>(null), [manage, setManage] = useState(false);
  const { showNotice } = useFeedback();
  const scope = useNavigationScope(), range = scheduleWindow(selected, view);
  const semester = semesters.find(s => s.id === academicSemesterId);
  const query = semester ? { semesterId: semester.id, from: range.from, to: range.to } : null;
  const key = query ? queryKey(query) : '', source = useServerSchedule(query, scope.active);
  const rows = source.rows, forDay = (date: string) => rows.filter(row => row.date === date);
  const name = (item: ServerOccurrence) => courseCatalog.find(c => c.id === item.courseId)?.name ?? 'Môn chưa được tải';
  const reload = () => { setDetail(null); void Promise.all([source.reload(), courseConnection?.reload()]).catch(() => {}); };
  const stale = !!source.error || source.loading || source.busy;
  const edit = (rule?: ServerRule) => { if (!semester || stale || source.needsReload) return; setManage(false); setDetail(null); setEditor({ original: rule, date: dateKey(selected), semesterId: semester.id }); };
  const saved = (rule: ServerRule) => { setEditor(null); setDetail(null); const course = courseCatalog.find(c => c.id === rule.courseId); if (course) setAcademicSemesterId(course.semesterId); setSelected(parseDay(firstRuleDate(rule))); showNotice('Đã lưu chuỗi lịch vào tài khoản.'); };
  return <FlowScope onClose={() => { if (!source.busy) { setChoose(false); setDetail(null); setEditor(null); setManage(false); } }}>
    <Row between style={{ flexWrap: 'wrap', rowGap: 8 }}><T style={{ fontFamily: F.extra, fontSize: 23 }}>Thời khóa biểu</T><Badge label="Lịch trong tài khoản" icon="cloud-done-outline" /></Row>
    <Button label={semester ? `${semester.name} · ${semester.academicYear}` : 'Chọn học kỳ xem lịch'} secondary icon="calendar-outline" onPress={() => setChoose(true)} disabled={!semesters.length} />
    {!semester ? <StateView title="Chưa có học kỳ để xem lịch" message="Tạo học kỳ và thêm môn học trong Môn & học kỳ để bắt đầu." actionLabel="Đến Môn & học kỳ" onAction={() => setScheduleMode('Môn & học kỳ')} /> : <>
      <Button label="Thêm chuỗi lịch học" icon="add-circle-outline" disabled={stale || !source.loaded || source.needsReload || !!courseConnection?.needsReload} onPress={() => edit()} />
      <Button label="Quản lý chuỗi lịch" secondary icon="repeat-outline" disabled={source.busy} onPress={() => setManage(true)} />
      {source.needsReload && <Card style={{backgroundColor:C.amberSoft}}><T accessibilityRole="alert" style={S.small}>Lần ghi trước chưa xác định được kết quả. Mở Quản lý chuỗi lịch và kiểm tra dữ liệu trước khi tiếp tục lưu.</T></Card>}
      <ScheduleCalendar selected={selected} view={view} onSelect={setSelected} onView={setView} hasEvent={date => source.loaded && forDay(date).length > 0} />
      <Button label="Tải lại lịch học" secondary icon="refresh-outline" loading={source.loading} disabled={source.busy || !!courseConnection?.loading || !!courseConnection?.busy} onPress={reload} />
      <T style={S.small}>Ngày và giờ theo múi giờ ghi trên từng buổi. Buổi nghỉ vẫn hiện để bạn theo dõi.</T>
      {!source.loaded ? <StateView kind={source.error ? 'error' : 'loading'} title={source.error ? 'Chưa tải được lịch học' : 'Đang tải lịch học'} message={source.error?.message ?? 'Đang lấy lịch đã lưu trong học kỳ và khoảng ngày bạn đang xem.'} actionLabel={source.error ? 'Thử tải lại lịch' : undefined} onAction={reload} /> : <>
        {source.error && <Card style={{ backgroundColor: C.redSoft, gap: 6 }}><T accessibilityRole="alert" style={{ color: C.red }}>{source.error.message}</T><T style={S.small}>Đang giữ lịch đã tải gần nhất cho đúng học kỳ và khoảng ngày này. Tải lại để xem bản mới nhất.</T></Card>}
        {source.loading && <T accessibilityLiveRegion="polite" style={S.small}>Đang cập nhật lịch…</T>}
        <Section title={view === 'Theo tuần' ? 'Lịch học trong tuần' : `Lịch học ${dateLabel(dateKey(selected))}`} icon="calendar-outline" />
        {range.days.map(date => <View key={dateKey(date)} style={{ gap: 12 }}>
          {view === 'Theo tuần' && <T style={{ fontFamily: F.bold, color: C.primary }}>{date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}</T>}
          {!forDay(dateKey(date)).length ? <Card><T style={S.small}>Chưa có buổi học trong ngày này của học kỳ đã chọn.</T></Card> : forDay(dateKey(date)).map(item => <Pressable key={`${item.scheduleId}:${item.date}`} disabled={stale} accessibilityRole="button" accessibilityLabel={`Xem buổi học ${name(item)}`} accessibilityState={{ disabled: stale }} onPress={() => setDetail({ key, item })}>
            <Card style={{ gap: 12, backgroundColor: item.cancelled ? '#FFF6F4' : C.card }}><Row style={{ gap: 12 }}><IconTile name="school-outline" /><View style={S.grow}><Badge label={item.cancelled ? 'Đã nghỉ' : item.changed ? 'Đã điều chỉnh' : item.startTime < '12:00' ? 'Ca sáng' : 'Ca chiều'} bg={item.cancelled ? C.redSoft : item.changed ? C.amberSoft : C.track} color={item.cancelled ? C.red : item.changed ? C.amber : C.muted} /><T style={{ fontFamily: F.bold, fontSize: 15, lineHeight: 23, marginTop: 4, color: item.cancelled ? C.muted : C.ink, textDecorationLine: item.cancelled ? 'line-through' : 'none' }}>{name(item)}</T><T style={S.small}>GV: {item.teacher || 'Chưa có thông tin'}</T></View><Icon name="chevron-forward" size={18} color={C.muted} /></Row><Row between style={{ backgroundColor: C.canvas, padding: 10, borderRadius: 13 }}><T style={{ fontSize: 12 }}>{item.startTime} – {item.endTime}</T><T style={{ fontSize: 12, flexShrink: 1, textAlign: 'right' }}>{item.room || 'Chưa có phòng'}</T></Row><T style={{ fontSize: 10, color: C.muted }}>{item.timeZone}{item.cancelled ? ' · Giờ dự kiến trước khi nghỉ' : ''}</T></Card>
          </Pressable>)}
        </View>)}
      </>}
    </>}
    {choose && <Sheet title="Học kỳ xem lịch" onClose={() => setChoose(false)}>{semesters.map(s => <Button key={s.id} secondary={s.id !== semester?.id} label={`${s.name} · ${s.academicYear}`} onPress={() => { setAcademicSemesterId(s.id); setChoose(false); setDetail(null); }} />)}</Sheet>}
    {source.confirmedWrite && source.error && <T style={S.small}>Lần lưu/xóa đã được xác nhận. Chưa tải lại được lịch; không cần gửi lại thao tác ghi.</T>}
    {detail?.key === key && <ServerClassDialog key={`${key}:${detail.item.scheduleId}:${detail.item.date}`} item={detail.item} title={name(detail.item)} onClose={() => setDetail(null)} onReload={reload} onEdit={edit} />}
    {manage && semester && <ServerRuleList semesterId={semester.id} source={source} onEdit={edit} onClose={() => setManage(false)} />}
    {editor && <ServerClassForm key={editor.original?.id ?? 'new'} source={source} original={editor.original} initialDate={editor.date} semesterId={editor.semesterId} onClose={() => setEditor(null)} onSaved={saved} onDeleted={() => { setEditor(null); setDetail(null); showNotice('Đã xóa cả chuỗi lịch và các ngoại lệ của chuỗi.'); }} />}
  </FlowScope>;
}
