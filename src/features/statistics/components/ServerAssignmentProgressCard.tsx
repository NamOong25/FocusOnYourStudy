import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { FlowScope } from '../../../navigation/Navigation';
import { Button, Card, Icon, IconButton, Row, StateView, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { useApp } from '../../../store/model';
import { useAuth } from '../../account/auth/AuthProvider';
import { assignmentGroup, createAssignmentStatisticsLink, statisticsTimeLabel, type AssignmentStatisticsGroup } from '../../assignments/assignmentStatisticsLink';
import { useAssignmentStatistics } from '../api/useAssignmentStatistics';
import { StatisticsFilterButton } from './ServerStatisticsFilters';
import { AssignmentProgressFilters } from './AssignmentProgressFilters';

export default function ServerAssignmentProgressCard() {
  const app = useApp(), auth = useAuth(), zone = auth.profile?.timeZone ?? 'Asia/Ho_Chi_Minh';
  const [semesterId, setSemesterId] = useState(() => app.semesters.find(s => s.id === app.academicSemesterId)?.id ?? app.semesters.find(s => s.status === 'Đang học')?.id ?? app.semesters[0]?.id ?? '');
  const [courseId, setCourseId] = useState(''), [sheet, setSheet] = useState<'semester' | 'course' | null>(null);
  const semester = app.semesters.find(s => s.id === semesterId), course = app.courseCatalog.find(c => c.id === courseId && c.semesterId === semesterId);
  const catalogError = app.semesterConnection?.error ?? app.courseConnection?.error;
  const catalogLoading = !app.semesterConnection?.loaded || !app.courseConnection?.loaded || !!app.semesterConnection.loading || !!app.courseConnection.loading;
  const missing = !!semesterId && !semester || !!courseId && !course;
  const revision = JSON.stringify([app.assignmentConnection?.loaded, app.assignmentConnection?.busy, app.assignmentConnection?.needsReload,
    app.tasks.map(t => [t.id, t.version, t.courseId, t.status, t.dueAt]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))]);
  const enabled = !catalogLoading && !catalogError && !missing && !!semester && !app.assignmentConnection?.busy;
  const { state, reload } = useAssignmentStatistics({ semesterId, ...(courseId ? { courseId } : {}), timeZone: zone }, revision, enabled);
  const data = enabled && state.loaded && !state.loading && !state.error ? state.value : null;
  const retryCatalog = () => { void Promise.allSettled([app.semesterConnection?.reload(), app.courseConnection?.reload()]); };
  const retry = () => { void reload().catch(() => {}); };
  const manage = () => { if (semester) app.setAcademicSemesterId(semester.id); app.setScheduleMode('Môn & học kỳ'); };
  const open = (group: AssignmentStatisticsGroup) => {
    if (!data) return;
    app.openAssignmentStatistics(createAssignmentStatisticsLink(data, group));
    // The destination hides stale rows until this canonical list read finishes.
    void Promise.allSettled([app.assignmentConnection?.reload(), app.courseConnection?.reload(), app.semesterConnection?.reload()]);
  };
  return <FlowScope onClose={() => setSheet(null)}><Card style={{ gap: 16 }}>
    <Row between style={{ gap: 8 }}><T accessibilityRole="header" style={[S.grow, { fontFamily: F.bold, fontSize: 18 }]}>Tiến độ bài tập</T><IconButton label="Cập nhật tiến độ bài tập" name="refresh-outline" disabled={!enabled || state.loading} onPress={retry} /></Row>
    <T style={S.small}>Toàn bộ bài của học kỳ đang chọn. Không lọc theo tuần/tháng của biểu đồ thời gian học.</T>
    <StatisticsFilterButton label="Học kỳ tiến độ bài tập" value={semester ? `${semester.name} · ${semester.academicYear}` : semesterId ? 'Học kỳ không còn trong danh sách' : 'Chọn học kỳ'} onPress={() => setSheet('semester')} />
    {!!semester && <StatisticsFilterButton label="Môn học tiến độ bài tập" value={course?.name ?? (courseId ? 'Môn không còn trong học kỳ' : 'Tất cả môn trong học kỳ')} onPress={() => setSheet('course')} />}
    {catalogError ? <StateView kind="error" title="Chưa tải được học kỳ/môn" message={catalogError.message} actionLabel="Thử lại học kỳ/môn" onAction={retryCatalog} />
      : catalogLoading ? <StateView kind="loading" title="Đang tải học kỳ/môn" message="Đọc danh sách trước khi chọn phạm vi bài tập." />
        : !app.semesters.length ? <StateView title="Chưa có học kỳ để thống kê bài tập" message="Tạo học kỳ và môn, sau đó thêm bài tập đầu tiên." actionLabel="Tạo học kỳ và môn" onAction={manage} />
          : !semester || missing ? <StateView kind="error" title="Chọn lại phạm vi bài tập" message="Học kỳ hoặc môn đã thay đổi. Chọn lại học kỳ/môn hiện có để xem dữ liệu đúng." actionLabel="Tải lại học kỳ/môn" onAction={retryCatalog} />
            : state.error ? <><StateView kind="error" title="Chưa tải được tiến độ bài tập" message={state.error.message} actionLabel="Thử lại tiến độ bài tập" onAction={retry} /><Button label="Tải lại học kỳ/môn" secondary onPress={retryCatalog} /></>
              : !data ? <StateView kind="loading" title="Đang tải tiến độ bài tập" message="Đọc số liệu đã lưu trong tài khoản." />
                : <>
                  {data.totalAssignments ? <>
                    <Row style={{ alignItems: 'baseline', flexWrap: 'wrap', gap: 10 }}><T testID="server-assignment-progress-percent" style={{ fontFamily: F.extra, fontSize: 36, color: C.primary }}>{data.completionPercent}%</T><T testID="server-assignment-progress-count" style={S.small}>{data.completedAssignments}/{data.totalAssignments} bài hoàn thành</T></Row>
                    <View accessibilityRole="progressbar" accessibilityLabel="Tiến độ hoàn thành bài tập" accessibilityValue={{ min: 0, max: 100, now: data.completionPercent }} aria-valuemin={0} aria-valuemax={100} aria-valuenow={data.completionPercent} style={{ height: 8, borderRadius: 8, overflow: 'hidden', backgroundColor: C.track }}><View style={{ height: '100%', width: `${data.completionPercent}%`, backgroundColor: C.primary }} /></View>
                    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Theo trạng thái</T>
                    {(['TODO', 'IN_PROGRESS', 'COMPLETED'] as const).map(group => <ProgressRow key={group} group={group} count={group === 'TODO' ? data.todoAssignments : group === 'IN_PROGRESS' ? data.inProgressAssignments : data.completedAssignments} onPress={() => open(group)} />)}
                    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Theo hạn nộp · Chỉ bài chưa hoàn thành</T>
                    <ProgressRow group="OVERDUE" count={data.overdueAssignments} onPress={() => open('OVERDUE')} />
                    <ProgressRow group="DUE_SOON" count={data.dueSoonAssignments} onPress={() => open('DUE_SOON')} />
                    <T style={S.small}>Sắp hạn nằm trong nhóm còn hạn, tính đến cùng giờ sau 7 ngày lịch. Bài đã hoàn thành không tính quá hạn.</T>
                  </> : <StateView title="Chưa có bài tập trong phạm vi này" message="Khi có bài đã lưu, tiến độ sẽ xuất hiện tại đây." />}
                  <T testID="server-assignment-progress-reference" style={[S.small, { fontSize: 10 }]}>Tính tại {statisticsTimeLabel(data.asOf, data.timeZone)} · {data.timeZone}</T>
                  <Button label="Đến danh sách bài tập theo thống kê" secondary icon="clipboard-outline" onPress={() => open('ALL')} />
                </>}
    {sheet && <AssignmentProgressFilters kind={sheet} semesterId={semesterId} courseId={courseId} onSelect={id => { if (sheet === 'semester') { setSemesterId(id); setCourseId(''); } else setCourseId(id); setSheet(null); }} onClose={() => setSheet(null)} />}
  </Card></FlowScope>;
}
function ProgressRow({ group, count, onPress }: { group: AssignmentStatisticsGroup; count: number; onPress: () => void }) {
  const label = assignmentGroup(group).label, color = group === 'OVERDUE' ? C.red : group === 'COMPLETED' ? C.green : C.primary;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Xem bài tập ${label.toLowerCase()}: ${count} bài`} onPress={onPress} style={{ minHeight: 50, padding: 13, borderRadius: 14, backgroundColor: group === 'OVERDUE' ? C.redSoft : C.canvas }}><Row between><T style={[S.grow, { fontSize: 13, color }]}>{label}</T><T style={{ fontFamily: F.bold, fontSize: 16, color }}>{count}</T><Icon name="chevron-forward" size={16} color={color} /></Row></Pressable>;
}
