import React from 'react';
import { Pressable, View } from 'react-native';
import { Button, Icon, Row, Sheet, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { useApp } from '../../../store/model';

export function AssignmentProgressFilters({ kind, semesterId, courseId, onSelect, onClose }: {
  kind: 'semester' | 'course'; semesterId: string; courseId: string; onSelect: (id: string) => void; onClose: () => void;
}) {
  const app = useApp(), connection = kind === 'semester' ? app.semesterConnection : app.courseConnection;
  const options = kind === 'semester' ? app.semesters.map(s => ({ id: s.id, label: `${s.name} · ${s.academicYear}`, hint: s.status }))
    : [{ id: '', label: 'Tất cả môn trong học kỳ', hint: '' }, ...app.courseCatalog.filter(c => c.semesterId === semesterId).map(c => ({ id: c.id, label: c.name, hint: c.code }))];
  const selected = kind === 'semester' ? semesterId : courseId;
  return <Sheet title={kind === 'semester' ? 'Chọn học kỳ tiến độ bài tập' : 'Chọn môn tiến độ bài tập'} onClose={onClose}>
    {options.map(option => <Pressable key={option.id} accessibilityRole="radio" accessibilityLabel={option.label + (option.hint ? `, ${option.hint}` : '')} accessibilityState={{ checked: selected === option.id }} aria-checked={selected === option.id} onPress={() => onSelect(option.id)} style={{ padding: 15, minHeight: 58, borderRadius: 16, backgroundColor: selected === option.id ? C.soft : C.canvas }}><Row><Icon name={selected === option.id ? 'radio-button-on' : 'radio-button-off'} /><View style={S.grow}><T style={{ fontFamily: F.semi, fontSize: 13, lineHeight: 21 }}>{option.label}</T>{!!option.hint && <T style={S.small}>{option.hint}</T>}</View></Row></Pressable>)}
    {!!connection?.error && <><T accessibilityRole="alert" style={{ color: C.red }}>{connection.error.message}</T><Button label="Thử tải lựa chọn bài tập" secondary onPress={() => { void connection.reload().catch(() => {}); }} /></>}
    {connection?.loading && <T style={S.small}>Đang tải lựa chọn…</T>}
    {!options.length && !connection?.loading && <T style={S.small}>Chưa có học kỳ. Thêm học kỳ tại Môn & học kỳ để bắt đầu.</T>}
  </Sheet>;
}
