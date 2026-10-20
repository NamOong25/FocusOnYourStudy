import React from 'react';
import { Pressable, View } from 'react-native';
import { Icon, Row, T } from '../../shared/components';
import { useApp } from '../../store/model';
import { C, F, S } from '../../shared/theme';
export function CourseChoices({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  const { courseCatalog, semesters } = useApp();
  return <View style={{ gap: 6 }}>{courseCatalog.map(c => <Pressable key={c.id} accessibilityLabel={`${c.name} · ${c.code}`} onPress={() => onChange(c.id)} accessibilityRole="radio" accessibilityState={{ checked: value === c.id }} aria-checked={value === c.id} style={{ minHeight: 48, padding: 12, backgroundColor: value === c.id ? C.soft : C.canvas, borderRadius: 12 }}><Row><Icon name={value === c.id ? 'radio-button-on' : 'radio-button-off'} size={19} /><View style={S.grow}><T style={{ fontFamily: value === c.id ? F.semi : F.regular, fontSize: 13 }}>{c.name}</T><T style={{ fontSize: 10, color: C.muted }}>{c.code} · {semesters.find(s => s.id === c.semesterId)?.name}</T></View></Row></Pressable>)}{!courseCatalog.length && <T style={S.small}>Thêm môn học trước khi tạo bài tập hoặc ca học.</T>}</View>;
}

