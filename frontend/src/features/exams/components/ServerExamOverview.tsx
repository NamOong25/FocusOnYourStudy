import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Button, Card, Segments, StateView, T } from '../../../shared/components';
import { C, S } from '../../../shared/theme';
import { useNavigationScope } from '../../../navigation/Navigation';
import { useApp } from '../../../store/model';
import { examQueryKey, type ExamQuery } from '../api/examsApi';
import { useServerExamList } from '../api/useServerExams';
import { projectExamOverview } from '../examOverview';
import { filterExams, type ExamPeriod } from '../examView';
import ServerExamCard from './ServerExamCard';
import ServerNearestExamCard from '../../dashboard/components/ServerNearestExamCard';

// A scoped read per surface; never copies API exams into preview state.
export default function ServerExamOverview({ query, now, nearest = false, active = true, period = 'Sắp tới', onPeriodChange, onOpen, onAdd, onViewAll }: {
  query: ExamQuery; now: Date; nearest?: boolean; active?: boolean;
  period?: ExamPeriod; onPeriodChange?: (period: ExamPeriod) => void;
  onOpen: (id: string) => void; onAdd: () => void; onViewAll?: () => void;
}) {
  const scope = useNavigationScope(), enabled = scope.active && active;
  const { courseCatalog, courseConnection, semesterConnection } = useApp();
  const source = useServerExamList(query, enabled), data = projectExamOverview(source, courseCatalog, query, now.getTime());
  const key = examQueryKey(query);
  const reloadParents = () => { void Promise.allSettled([courseConnection?.reload(), semesterConnection?.reload()]); };
  const reload = () => { void source.reload().catch(() => {}); reloadParents(); };
  useEffect(() => {
    if (!enabled) return;
    reloadParents();
    const native = AppState.addEventListener('change', state => { if (state === 'active') reloadParents(); });
    if (Platform.OS === 'web') window.addEventListener('focus', reloadParents);
    return () => { native.remove(); if (Platform.OS === 'web') window.removeEventListener('focus', reloadParents); };
  }, [enabled, key]);
  const visible = filterExams(data.rows, period, now.getTime());
  return <>
    <T style={S.small}>{nearest ? 'Theo học kỳ đang chọn. Ưu tiên kỳ thi đang diễn ra, sau đó đến lịch sắp tới.' : 'Lịch thi của đúng môn và học kỳ này.'} Ngày/giờ theo múi giờ ghi trên kỳ thi.</T>
    <Button label={nearest ? 'Cập nhật kỳ thi gần nhất' : 'Cập nhật lịch thi của môn'} secondary icon="refresh-outline" loading={source.loading} onPress={reload} />
    {!source.loaded ? <StateView kind={source.error ? 'error' : 'loading'} title={source.error ? 'Chưa tải được lịch thi' : 'Đang tải lịch thi'} message={source.error?.message ?? 'Đang đọc lịch thi đã lưu trong tài khoản.'} actionLabel={source.error ? 'Thử lại lịch thi' : undefined} onAction={reload} /> : <>
      {source.error && <Card style={{ backgroundColor: C.redSoft, gap: 7 }}><T accessibilityRole="alert" style={{ color: C.red }}>{source.error.message}</T><T style={S.small}>Chưa cập nhật được lịch thi. Dữ liệu bên dưới là bản đã tải của đúng học kỳ/môn đang xem; có thể đã thay đổi ở nơi khác.</T></Card>}
      {source.loading && <T accessibilityLiveRegion="polite" style={S.small}>Đang cập nhật lịch thi…</T>}
      {data.catalogueMismatch ? <StateView kind="error" title="Cần cập nhật môn và lịch thi" message="Thông tin liên kết đã thay đổi hoặc chưa tải đủ. Hãy cập nhật trước khi xem tiếp." actionLabel="Cập nhật môn và lịch thi" onAction={reload} /> : nearest ? <>
        {data.next && <ServerNearestExamCard exam={data.next} course={courseCatalog.find(c => c.id === data.next!.courseId)!} now={now.getTime()} stale={data.stale} onOpen={() => onOpen(data.next!.id)} />}
        {data.ready && !data.next && <StateView title="Chưa có lịch thi sắp tới trong học kỳ này" message="Kỳ thi đã kết thúc không xuất hiện ở thẻ gần nhất. Bạn có thể xem lịch đã qua hoặc thêm lịch mới." actionLabel="Thêm lịch thi cho học kỳ này" onAction={onAdd} />}
      </> : <>
        <Segments values={['Sắp tới', 'Đã qua', 'Tất cả']} value={period} onChange={value => onPeriodChange?.(value as ExamPeriod)} />
        {visible.map(exam => <ServerExamCard key={exam.id} exam={exam} course={courseCatalog.find(c => c.id === exam.courseId)!} now={now.getTime()} onOpen={() => onOpen(exam.id)} />)}
        {data.ready && !visible.length && <StateView title={data.rows.length ? 'Không có lịch thi ở mục này' : 'Môn này chưa có lịch thi'} message={data.rows.length ? 'Chọn Tất cả để xem các kỳ thi đã lưu của môn.' : 'Thêm lịch khi nhận thông báo từ giảng viên để chủ động ôn tập.'} actionLabel={data.rows.length ? 'Xem tất cả kỳ thi của môn' : undefined} onAction={() => onPeriodChange?.('Tất cả')} />}
        <Button label="Thêm lịch thi cho môn" secondary icon="add" onPress={onAdd} />
      </>}
    </>}
    {onViewAll && <Button label="Xem tất cả lịch thi của học kỳ" secondary onPress={onViewAll} />}
  </>;
}
