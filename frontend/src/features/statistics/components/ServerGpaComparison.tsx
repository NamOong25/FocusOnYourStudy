import React, { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Badge, Card, Icon, Row, Sheet, StateView, T } from '../../../shared/components';
import { useNavigationScope } from '../../../navigation/Navigation';
import { useApp } from '../../../store/model';
import { C, F, S } from '../../../shared/theme';
import type { Semester } from '../../academics/academic';
import type { ServerSemesterGrades } from '../../grades/api/gradesReadApi';
import { useGpaCatalog } from '../../grades/api/useServerGpa';
import { useServerSemesterGrades } from '../../grades/api/useServerGrades';
import { ServerSemesterGradesSheet } from '../../grades/components/ServerGradesScreen';
import { orderedGpaSemesters, resolveGpaPair } from '../../grades/gpaComparison';
import { gradeNumber } from '../../grades/serverGradeView';
import { serverGpaDifference, semesterGpaCaption } from '../../grades/serverGpaView';

type Summary = ServerSemesterGrades['summary'];
type Slot = 'A' | 'B';
const separator = { borderTopWidth: 1, borderTopColor: C.line };

export default function ServerGpaComparison() {
  const catalog = useGpaCatalog();
  const { setScheduleMode } = useApp();
  const { width, fontScale } = useWindowDimensions();
  const [selected, setSelected] = useState<{ base?: string; target?: string }>({});
  const [picker, setPicker] = useState<Slot | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const { base, target } = resolveGpaPair(catalog.semesters, selected);
  const active = useNavigationScope().active && opened === null && catalog.ready;
  const query = (semester: Semester | undefined) => semester ? {
    semesterId: semester.id,
    semesterVersion: semester.version ?? -1,
    courses: catalog.courseCatalog.filter(course => course.semesterId === semester.id),
  } : null;
  const a = useServerSemesterGrades(query(base), active);
  const b = useServerSemesterGrades(query(target), active);
  const reload = () => { void Promise.allSettled([catalog.reloadCatalog(), a.reload(), b.reload()]); };
  const manage = () => setScheduleMode('Môn & học kỳ');

  if (catalog.error) return <StateView kind="error" title="Chưa tải được danh sách học kỳ" message={catalog.error.message} actionLabel="Thử lại" onAction={reload} />;
  if (!catalog.ready) return <StateView kind="loading" title="Đang đọc học kỳ" message="Đang tải danh mục trong tài khoản." />;
  if (!base) return <StateView title="Chưa có học kỳ để so sánh" message="Tạo học kỳ và thêm môn trước khi theo dõi GPA." actionLabel="Quản lý học kỳ" onAction={manage} />;

  const error = a.error ?? b.error;
  const selectedSemester = picker === 'A' ? base : target;
  const otherSemester = picker === 'A' ? target : base;
  const stack = width < 320 || fontScale >= 1.3;
  return <>
    <Row between style={{ flexWrap: 'wrap' }}>
      <View style={{ flexGrow: 1, flexShrink: 1 }}>
        <T accessibilityRole="header" style={{ fontFamily: F.extra, fontSize: 22 }}>So sánh GPA</T>
        <T style={S.small}>Chọn hai học kỳ để đối chiếu.</T>
      </View>
      {target && <Pressable accessibilityRole="button" accessibilityLabel="Đổi chiều so sánh GPA"
        onPress={() => setSelected({ base: target.id, target: base.id })}
        style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: C.lavender, backgroundColor: pressed ? C.soft : C.card })}>
        <Row style={{ gap: 6 }}><Icon name="swap-horizontal-outline" size={18} /><T style={{ fontFamily: F.bold, fontSize: 12, color: C.primary }}>Đổi chiều</T></Row>
      </Pressable>}
    </Row>
    {!target && <StateView title="Thêm học kỳ thứ hai để so sánh" message="Bạn có thể mở bảng điểm của học kỳ hiện có." actionLabel="Quản lý học kỳ" onAction={manage} />}
    <View style={{ flexDirection: stack ? 'column' : 'row', alignItems: 'stretch', gap: 10 }}>
      <ComparisonSemesterCard slot="A" semester={base} summary={a.value?.summary} error={!!a.error}
        onPick={target ? () => setPicker('A') : undefined} onOpen={() => setOpened(base.id)} />
      {target && <ComparisonSemesterCard slot="B" semester={target} summary={b.value?.summary} error={!!b.error}
        onPick={() => setPicker('B')} onOpen={() => setOpened(target.id)} />}
    </View>
    {error && <StateView kind="error" title="Chưa tải được GPA để so sánh" message={error.message} actionLabel="Thử lại" onAction={reload} />}
    {target && a.value && b.value && <ComparisonDifference base={a.value.summary} target={b.value.summary} />}
    {picker && target && <Sheet title={`Chọn học kỳ ${picker}`} onClose={() => setPicker(null)}>
      {orderedGpaSemesters(catalog.semesters).map(semester => {
        const disabled = semester.id === otherSemester?.id;
        const checked = semester.id === selectedSemester?.id;
        return <Pressable key={semester.id} accessibilityRole="radio" disabled={disabled}
          accessibilityLabel={`So sánh ${picker}: ${semester.name}, ${semester.academicYear}`}
          aria-checked={checked} accessibilityState={{ checked, disabled }}
          onPress={() => {
            setSelected(picker === 'A' ? { base: semester.id, target: target.id } : { base: base.id, target: semester.id });
            setPicker(null);
          }}>
          <Card style={{ backgroundColor: checked ? C.soft : C.canvas, opacity: disabled ? 0.55 : 1 }}>
            <Row>
              <Icon name={checked ? 'radio-button-on' : 'radio-button-off'} size={17} />
              <View style={S.grow}><T style={{ fontFamily: F.bold }}>{semester.name}</T><T style={S.small}>{semester.academicYear}{disabled && ' · Đang chọn ở kỳ còn lại'}</T></View>
            </Row>
          </Card>
        </Pressable>;
      })}
    </Sheet>}
    {opened && <ServerSemesterGradesSheet key={opened} semesterId={opened} onClose={() => setOpened(null)} />}
  </>;
}

function ComparisonSemesterCard({ slot, semester, summary, error, onPick, onOpen }: {
  slot: Slot; semester: Semester; summary?: Summary; error: boolean; onPick?: () => void; onOpen: () => void;
}) {
  return <Card style={[S.grow, { padding: 11, gap: 9, backgroundColor: slot === 'B' ? C.soft : C.card }]}>
    <Badge label={`KỲ ${slot}`} bg={slot === 'B' ? C.card : C.soft} />
    <Pressable accessibilityRole={onPick ? 'button' : undefined} onPress={onPick}
      accessibilityLabel={onPick ? `Chọn học kỳ ${slot} để so sánh` : undefined}
      accessibilityHint={onPick ? `${semester.name}, ${semester.academicYear}` : undefined}
      style={({ pressed }) => ({ minHeight: 44, padding: 7, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: pressed ? C.canvas : C.card })}>
      <Row style={{ gap: 2 }}>
        <T style={[S.grow, { fontFamily: F.bold, fontSize: 13 }]}>{semester.name}</T>
        {onPick && <Icon name="chevron-down" size={14} />}
      </Row>
    </Pressable>
    <T style={S.small}>{semester.academicYear}</T>
    <View accessibilityLiveRegion="polite" style={[S.grow, separator, { paddingTop: 8, gap: 3 }]}>
      {summary ? <>
        <T testID={`server-comparison-${slot}`} style={{ fontFamily: F.extra, fontSize: 28, color: C.primary }}>
          {gradeNumber(summary.gpa, 2).replace('.', ',')}<T style={S.small}> / 4</T>
        </T>
        <T style={S.small}>{summary.calculatedCredits} tín chỉ tính GPA</T>
        {summary.state !== 'COMPLETE' && <T style={S.small}>{semesterGpaCaption(summary)}</T>}
      </> : <T style={S.small}>{error ? 'Chưa tải được GPA' : 'Đang tải GPA…'}</T>}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Mở bảng điểm kỳ ${slot}`} onPress={onOpen}
      style={({ pressed }) => [separator, { minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.65 : 1 }]}>
      <Row style={{ gap: 3 }}>
        <T style={[S.grow, { fontFamily: F.bold, fontSize: 12, color: C.primary }]}>Xem bảng điểm</T>
        <Icon name="chevron-forward" size={14} />
      </Row>
    </Pressable>
  </Card>;
}

function ComparisonDifference({ base, target }: { base: Summary; target: Summary }) {
  const difference = serverGpaDifference(base, target);
  const amount = difference?.amount ?? 0;
  const color = amount > 0 ? C.green : amount < 0 ? C.red : C.primary;
  const description = !difference ? 'Cần cả hai học kỳ có GPA để đối chiếu.'
    : amount > 0 ? 'GPA kỳ B cao hơn kỳ A.'
      : amount < 0 ? 'GPA kỳ B thấp hơn kỳ A.' : 'GPA hai kỳ bằng nhau.';
  return <Card style={{ backgroundColor: C.soft, padding: 16, gap: 7 }}>
    <Row between style={{ flexWrap: 'wrap' }}>
      <T accessibilityRole="header" style={{ fontFamily: F.bold }}>Kỳ B so với kỳ A</T>
      {difference?.provisional && <Badge label="Tạm tính" bg={C.card} />}
    </Row>
    <Row style={{ flexWrap: 'wrap', gap: 6 }}>
      <T testID="server-gpa-difference" style={{ fontFamily: F.extra, fontSize: 32, color }}>
        {difference ? (amount > 0 ? '+' : '') + gradeNumber(amount, 2).replace('.', ',') : '—'}
      </T>
      {amount !== 0 && <Icon name={amount > 0 ? 'arrow-up-outline' : 'arrow-down-outline'} size={17} color={color} />}
      <T style={S.small}>điểm GPA</T>
    </Row>
    <T style={S.small}>{description}</T>
    {difference?.provisional && <T style={S.small}>Ít nhất một học kỳ còn môn chưa đủ kết quả.</T>}
  </Card>;
}
