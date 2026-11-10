import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { FlowScope } from '../../navigation/Navigation';
import { Button, Card, Empty, Icon, IconButton, Row, StateView, T } from '../../shared/components';
import { useActionState } from '../../shared/feedback/ActionScope';
import { C, F, S } from '../../shared/theme';
import { useApp } from '../../store/model';
import { type DeadlineFilter, type Task, type TaskStatus, filterAssignments } from './assignments';
import { assignmentGroup, filterStatisticsAssignments, statisticsTimeLabel, type AssignmentStatisticsLink } from './assignmentStatisticsLink';
import { AssignmentSyncStatus } from './components/AssignmentSyncStatus';
import AssignmentCard from './components/AssignmentCard';
import AssignmentFiltersSheet from './components/AssignmentFiltersSheet';
import DeadlineFilters from './components/DeadlineFilters';
import useCurrentTime from '../../shared/hooks/useCurrentTime';

export default function AssignmentsScreen({ onTask, onNewTask, initialStatisticsLink }: { onTask: (task: Task) => void; onNewTask: () => void; initialStatisticsLink?: AssignmentStatisticsLink }) {
  const app = useApp(), { tasks, courseCatalog, semesters, academicSemesterId, assignmentConnection } = app;
  const action = useActionState();
  const initial = initialStatisticsLink ? assignmentGroup(initialStatisticsLink.group) : null;
  const [reference, setReference] = useState(initialStatisticsLink ?? null);
  const [status, setStatus] = useState<TaskStatus | 'Tất cả'>(initial?.status ?? 'Tất cả');
  const [filter, setFilter] = useState(initialStatisticsLink?.courseId ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [semesterId, setSemesterId] = useState(initialStatisticsLink?.semesterId ?? academicSemesterId);
  const [query, setQuery] = useState(''), [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>(initial?.deadline ?? 'Tất cả'), now = useCurrentTime();
  const filters = { query, status, courseId: filter, deadline: deadlineFilter };
  let list: Task[] = [], linkError = '';
  try { list = reference ? filterStatisticsAssignments(tasks, courseCatalog, filters, reference)
    : filterAssignments(tasks.filter(task => !semesterId || courseCatalog.some(course => course.id === task.courseId && course.semesterId === semesterId)), courseCatalog, filters, now); }
  catch { linkError = 'Danh sách hoặc hạn nộp chưa hợp lệ để đối chiếu. Tải lại bài tập hoặc trở lại Thống kê.'; }
  const pendingRead = !!reference && [assignmentConnection, app.courseConnection, app.semesterConnection].some(c => c && (c.loading || !c.loaded));
  const failedRead = !!reference && (!!assignmentConnection?.error || !!assignmentConnection?.needsReload || !!app.courseConnection?.error || !!app.semesterConnection?.error);
  const invalidScope = !!reference && (!semesters.some(s => s.id === semesterId) || !!filter && !courseCatalog.some(c => c.id === filter && c.semesterId === semesterId));
  const showRows = (!assignmentConnection || assignmentConnection.loaded) && !pendingRead && !failedRead && !linkError && !invalidScope;
  const filterCount = Number(!!semesterId) + Number(!!filter) + Number(status !== 'Tất cả');
  const hasFilters = filterCount > 0 || !!query.trim() || deadlineFilter !== 'Tất cả';
  const reset = () => { setReference(null); setSemesterId(''); setQuery(''); setFilter(''); setStatus('Tất cả'); setDeadlineFilter('Tất cả'); };
  const changeSemester = (id: string) => {
    if (id === semesterId) return;
    setReference(null); setSemesterId(id); setFilter('');
  };
  const semester = semesters.find(item => item.id === semesterId);
  const course = courseCatalog.find(item => item.id === filter);
  const filterSummary = [
    semesterId && (semester ? `${semester.name} · ${semester.academicYear}` : 'Kỳ đã xóa'),
    filter && (course?.name ?? 'Môn đã xóa'),
    status !== 'Tất cả' && status,
  ].filter(Boolean).join('  ·  ');
  const backToStats = () => { if (app.routeTrail[app.routeTrail.length - 2]?.tab === 'stats') app.goBackRoute(); else app.setTab('stats'); };
  return <>
    <View style={{ gap: 10 }}>
      <Row between>
        <T accessibilityRole="header" style={[S.grow, { fontFamily: F.extra, fontSize: 22, lineHeight: 29, letterSpacing: -0.5 }]}>Bài tập & Deadline</T>
        <Button label="+ Bài tập" onPress={onNewTask} style={{ minHeight: 44, paddingHorizontal: 13, paddingVertical: 8 }} />
      </Row>
      <Row>
        <Row style={[S.grow, { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, paddingLeft: 12 }]}>
          <Icon name="search-outline" size={17} color={C.muted} />
          <TextInput accessibilityLabel="Tìm bài tập" value={query} onChangeText={setQuery}
            placeholder="Tìm bài tập, môn…" placeholderTextColor={C.muted} editable={!action?.busy}
            returnKeyType="search" style={[S.grow, { minHeight: 44, paddingVertical: 8, paddingRight: 8, fontFamily: F.regular, fontSize: 14, color: C.ink }]} />
          {!!query && <IconButton name="close" label="Xóa tìm kiếm bài tập" bg="transparent" onPress={() => setQuery('')} />}
        </Row>
        <Button label={filterCount ? `Bộ lọc (${filterCount})` : 'Bộ lọc'} icon="options-outline" secondary onPress={() => setFiltersOpen(true)}
          style={{ minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14 }} />
      </Row>
      <DeadlineFilters value={deadlineFilter} onChange={setDeadlineFilter} />
    </View>
    {!!reference && <Card style={{ gap: 9, backgroundColor: C.soft }}><T style={{ fontFamily: F.semi, color: C.primary }}>Từ Thống kê · {assignmentGroup(reference.group).label}</T>
      <T testID="assignment-statistics-reference" style={S.small}>Hạn nộp đối chiếu tại {statisticsTimeLabel(reference.asOf, reference.timeZone)} · {reference.timeZone}. Danh sách dùng trạng thái bài đã lưu mới nhất; thời gian không tự trôi khỏi mốc này.</T>
      <Button label="Về Thống kê để cập nhật mốc" secondary onPress={backToStats} />
    </Card>}
    {!reference && <AssignmentSyncStatus statusOnly />}
    {showRows && <Row between>
      <T style={{ fontFamily: F.bold, fontSize: 13 }} accessibilityLiveRegion="polite">{list.length} bài tập</T>
      {!!filterSummary && <T style={[S.small, S.grow, { textAlign: 'right' }]} numberOfLines={2}>{filterSummary}</T>}
    </Row>}
    {!!reference && !showRows && <StateView kind={pendingRead && !failedRead ? 'loading' : 'error'}
      title={pendingRead && !failedRead ? 'Đang tải danh sách để đối chiếu' : 'Chưa thể đối chiếu danh sách'}
      message={linkError || (invalidScope && !pendingRead ? 'Kỳ hoặc môn đã thay đổi. Trở lại Thống kê và chọn lại phạm vi.' : assignmentConnection?.error?.message ?? 'Đọc lại dữ liệu đã lưu trước khi hiển thị danh sách.')}
      actionLabel={!pendingRead || failedRead ? 'Tải lại bài tập để đối chiếu' : undefined}
      onAction={() => { void Promise.all([assignmentConnection?.reload(), app.courseConnection?.reload(), app.semesterConnection?.reload()]).catch(() => {}); }} />}
    {!reference && !!linkError && <StateView kind="error" title="Chưa thể hiển thị bài tập" message={linkError} />}
    {showRows && list.map(task => <AssignmentCard key={task.id} task={task} now={reference ? new Date(reference.asOf) : now} reference={reference ?? undefined} onPress={() => onTask(task)} />)}
    {showRows && !list.length && <Empty title={!tasks.length ? 'Chưa có bài tập' : hasFilters ? 'Không tìm thấy bài tập phù hợp' : 'Chưa có bài tập ở mục này'} message={!tasks.length ? 'Thêm bài tập đầu tiên để theo dõi hạn nộp và tiến độ.' : hasFilters ? 'Thử từ khóa khác hoặc xóa tìm kiếm và bộ lọc. Các điều kiện đang được kết hợp với nhau.' : 'Thêm bài tập mới để bắt đầu.'} actionLabel={tasks.length && hasFilters ? 'Xóa tìm kiếm và bộ lọc' : 'Thêm bài tập đầu tiên'} onAdd={tasks.length && hasFilters ? reset : onNewTask} />}
    {filtersOpen && <FlowScope onClose={() => setFiltersOpen(false)}>
      <AssignmentFiltersSheet semesters={semesters} semesterId={semesterId} courses={courseCatalog} courseId={filter}
        status={status} resultCount={showRows ? list.length : undefined} onSemester={changeSemester} onCourse={setFilter} onStatus={setStatus}
        onReset={reset} onClose={() => setFiltersOpen(false)} hasFilters={hasFilters} />
    </FlowScope>}
  </>;
}
