import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Card, Icon, IconButton, Row, Sheet, StateView, T } from '../../../shared/components';
import { FlowScope } from '../../../navigation/Navigation';
import { C, F, S } from '../../../shared/theme';
import { useApp } from '../../../store/model';
import { orderedGpaSemesters, resolveGpaPair, semesterGpaReport } from '../../grades/gpaComparison';
import SemesterGradesSheet from '../../grades/SemesterGradesSheet';
import { GpaSemesterCard } from './GpaSemesterCard';
import { GpaComparisonChart, GpaDifferenceCard } from './GpaComparisonChart';

import {useAuth} from '../../account/auth/AuthProvider';
import ServerGpaComparison from './ServerGpaComparison';

export default function GpaComparisonScreen(){return useAuth().hasSession?<ServerGpaComparison/>:<PreviewGpaComparison/>;}
function PreviewGpaComparison() {
  const { semesters, courseCatalog, gradeBook, gradeRules, setScheduleMode } = useApp();
  const [selected, setSelected] = useState<{ base?: string; target?: string }>({});
  const [picker, setPicker] = useState<'base' | 'target' | null>(null), [openedSemester, setOpenedSemester] = useState<string | null>(null);
  const pair = resolveGpaPair(semesters, selected);
  const manage = () => setScheduleMode('Môn & học kỳ');
  if (!pair.base) return <StateView title="Chưa có học kỳ để so sánh" message="Tạo học kỳ và nhập điểm các môn để theo dõi GPA giữa các chặng học." actionLabel="Quản lý học kỳ" onAction={manage} />;
  const base = semesterGpaReport(pair.base, courseCatalog, gradeBook, gradeRules);
  const target = pair.target ? semesterGpaReport(pair.target, courseCatalog, gradeBook, gradeRules) : undefined;
  const close = () => { setPicker(null); setOpenedSemester(null); };
  return <FlowScope onClose={close}>
    <View style={{ gap: 5 }}><T accessibilityRole="header" style={{ fontFamily: F.extra, fontSize: 26, lineHeight: 37, letterSpacing: -0.6 }}>So sánh GPA</T><T style={S.small}>Nhìn lại kết quả giữa hai học kỳ</T></View>
    {!target ? <>
      <StateView title="Thêm học kỳ thứ hai để so sánh" message="Bạn đã có một học kỳ. Có thể xem và nhập điểm học kỳ này trong lúc bổ sung học kỳ tiếp theo." actionLabel="Quản lý học kỳ" onAction={manage} />
      <GpaSemesterCard report={base} slot="A" onOpen={() => setOpenedSemester(base.semester.id)} />
    </> : <>
      <Card style={{ gap: 12 }}><Row between><T style={{ fontFamily: F.bold, fontSize: 15 }}>Hai học kỳ đối chiếu</T><IconButton label="Đổi chiều so sánh GPA" name="swap-vertical-outline" onPress={() => setSelected({ base: target.semester.id, target: base.semester.id })} /></Row>
        {[{ slot: 'A', key: 'base' as const, report: base, label: 'Học kỳ gốc' }, { slot: 'B', key: 'target' as const, report: target, label: 'Học kỳ đối chiếu' }].map(item => <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={`Chọn học kỳ ${item.slot} để so sánh`} onPress={() => setPicker(item.key)} style={{ minHeight: 86, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 13, backgroundColor: C.canvas }}><Row style={{ gap: 10 }}><Badge label={item.slot} bg={item.slot === 'A' ? C.soft : C.greenSoft} color={item.slot === 'A' ? C.primary : C.green} /><View style={[S.grow, { gap: 3 }]}><T style={{ color: C.muted, fontSize: 10 }}>{item.label}</T><T style={{ fontFamily: F.bold, fontSize: 14 }}>{item.report.semester.name}</T><T style={S.small}>{item.report.semester.academicYear}</T></View><Icon name="chevron-down" size={16} /></Row></Pressable>)}
      </Card>
      <GpaDifferenceCard base={base} target={target} />
      <Row style={{ alignItems: 'stretch', gap: 12 }}><GpaSemesterCard report={base} slot="A" onOpen={() => setOpenedSemester(base.semester.id)} /><GpaSemesterCard report={target} slot="B" onOpen={() => setOpenedSemester(target.semester.id)} /></Row>
      <T style={S.small}>Chạm thẻ học kỳ để mở bảng điểm và sửa điểm từng môn.</T>
      <GpaComparisonChart base={base} target={target} onOpen={setOpenedSemester} />
    </>}
    <Card style={{ backgroundColor: C.canvas, gap: 8 }}><T style={{ fontFamily: F.bold, fontSize: 13 }}>Cùng cách tính với bảng điểm</T><T style={S.small}>GPA học kỳ dùng điểm các môn của kỳ đó. GPA tạm tính chỉ gồm môn đã đủ kết quả, có thể thay đổi khi nhập thêm. Môn đạt/không đạt không tham gia GPA; tín chỉ hiển thị ở đây là tín chỉ GPA.</T><T style={S.small}>Mỗi lần học được tính trong học kỳ diễn ra lần đó. Quy tắc chọn lần học lại dùng cho GPA tích lũy được giữ ở phần Điểm & GPA.</T></Card>
    {picker && target && <Sheet title={`Chọn học kỳ ${picker === 'base' ? 'A' : 'B'}`} onClose={() => setPicker(null)}><T style={S.small}>Hai ô cần chọn hai học kỳ khác nhau. Dùng nút đổi chiều để hoán đổi A và B.</T>{orderedGpaSemesters(semesters).map(semester => {
      const selectedId = picker === 'base' ? base.semester.id : target.semester.id;
      const otherId = picker === 'base' ? target.semester.id : base.semester.id;
      const disabled = semester.id === otherId;
      return <Pressable key={semester.id} disabled={disabled} accessibilityRole="radio" accessibilityLabel={`So sánh ${picker === 'base' ? 'A' : 'B'}: ${semester.name}, ${semester.academicYear}`} accessibilityState={{ checked: selectedId === semester.id, disabled }} onPress={() => { setSelected({ base: picker === 'base' ? semester.id : base.semester.id, target: picker === 'target' ? semester.id : target.semester.id }); setPicker(null); }} style={{ minHeight: 84, padding: 15, borderRadius: 17, borderWidth: 1, borderColor: selectedId === semester.id ? C.primary : C.line, backgroundColor: selectedId === semester.id ? C.soft : C.canvas, opacity: disabled ? 0.5 : 1, gap: 5 }}><Row><Icon name={selectedId === semester.id ? 'radio-button-on' : 'radio-button-off'} /><View style={S.grow}><T style={{ fontFamily: F.bold, fontSize: 14 }}>{semester.name}</T><T style={S.small}>{semester.academicYear}</T></View></Row>{disabled && <T style={S.small}>Đang được chọn ở ô còn lại</T>}</Pressable>;
    })}</Sheet>}
    {openedSemester && <SemesterGradesSheet key={openedSemester} semesterId={openedSemester} onClose={() => setOpenedSemester(null)} />}
  </FlowScope>;
}
