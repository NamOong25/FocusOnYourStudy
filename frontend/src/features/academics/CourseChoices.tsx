import { StateView } from '../../shared/components';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Icon, Row, T } from '../../shared/components';
import { useApp } from '../../store/model';
import { C, F, S } from '../../shared/theme';
import { SemesterSyncStatus } from './components/SemesterSyncStatus';
export function CourseChoices({ value, onChange, disabled = false, dropdown = false }: {
  value: string; onChange: (s: string) => void; disabled?: boolean; dropdown?: boolean;
}) {
  const { courseCatalog, semesters, setScheduleMode, courseConnection } = useApp();
  const [expanded, setExpanded] = useState(false);
  if (courseConnection && !courseConnection.loaded) return <SemesterSyncStatus />;
  if (!courseCatalog.length) return <StateView title="Chưa có môn học" message="Thêm học kỳ và môn học trước khi tạo bài tập hoặc lịch học. Nội dung đang nhập được giữ khi bạn quay lại." actionLabel="Đến Môn & học kỳ" onAction={() => setScheduleMode('Môn & học kỳ')} />;
  const options = () => courseCatalog.map(course => {
    const selected = value === course.id;
    const semester = semesters.find(s => s.id === course.semesterId);
    return <Pressable key={course.id} disabled={disabled} accessibilityLabel={`${course.name} · ${course.code}`}
      accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }} aria-checked={selected}
      onPress={() => { if (dropdown) setExpanded(false); onChange(course.id); }}
      style={{ minHeight: 48, padding: 12, backgroundColor: selected ? C.soft : C.canvas, borderRadius: 12 }}>
      <Row>
        <Icon name={selected ? 'radio-button-on' : 'radio-button-off'} size={19} />
        <View style={S.grow}>
          <T style={{ fontFamily: selected ? F.semi : F.regular, fontSize: 13 }}>{course.name}</T>
          <T style={{ fontSize: 10, color: C.muted }}>{course.code} · {semester?.name} · {semester?.academicYear}</T>
        </View>
      </Row>
    </Pressable>;
  });
  if (!dropdown) return <View style={{ gap: 6 }}>{options()}</View>;

  const course = courseCatalog.find(option => option.id === value);
  return <View style={{ gap: 7 }}>
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Môn học</T>
    <Pressable accessibilityRole="button" accessibilityLabel={course ? `Môn học, ${course.name}` : 'Chọn môn học'}
      accessibilityState={{ expanded, disabled }} disabled={disabled} onPress={() => setExpanded(open => !open)}
      style={{ minHeight: 52, justifyContent: 'center', padding: 12, borderWidth: 1, borderRadius: 14,
        borderColor: expanded ? C.primary : C.line, backgroundColor: C.canvas }}>
      <Row>
        <View style={S.grow}><T style={{ fontFamily: F.semi, fontSize: 13 }}>{course?.name ?? 'Chọn môn học'}</T></View>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} />
      </Row>
    </Pressable>
    {expanded && <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled"
      style={{ maxHeight: 216, borderWidth: 1, borderColor: C.line, borderRadius: 14 }}
      contentContainerStyle={{ gap: 4, padding: 4 }}>{options()}</ScrollView>}
  </View>;
}
