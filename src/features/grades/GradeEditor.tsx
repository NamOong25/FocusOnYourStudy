import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Button, Card, Field, Icon, IconButton, Row, Segments, Sheet, T } from '../../shared/components';
import { CourseGrades, courseResult, emptyGrades, gradeScales, requiredRemaining, validateGrades, validateRetake } from './grades';
import { uid, useApp } from '../../store/model';
import { C, F, S } from '../../shared/theme';

type DraftPart = { id: string; name: string; weight: string; score: string };
const number = (s: string) => /^\d+(?:[.,]\d+)?$/.test(s.trim()) ? Number(s.trim().replace(',','.')) : NaN;
export function GradeEditor({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const { courseCatalog, semesters, gradeBook, gradeRules, saveGrades, setToast } = useApp();
  const record = gradeBook[courseId] ?? emptyGrades();
  const [parts, setParts] = useState<DraftPart[]>(() => record.parts.map(p=>({ id:p.id, name:p.name, weight:String(p.weight), score:p.score===null?'':String(p.score) })));
  const [previousId, setPreviousId] = useState(record.previousCourseId ?? ''); const [retake, setRetake] = useState(!!record.previousCourseId);
  const [error, setError] = useState(''); const [clearing, setClearing] = useState(false); const [target, setTarget] = useState('8.0');
  const course = courseCatalog.find(c=>c.id===courseId); if (!course) return null;
  const parsed: CourseGrades = { previousCourseId: retake ? previousId || undefined : undefined, parts: parts.map(p=>({ id:p.id, name:p.name.trim(), weight:number(p.weight), score:p.score.trim()===''?null:number(p.score) })) };
  const validation = validateGrades(parsed.parts); const result = courseResult(parsed,gradeRules);
  const totalWeight = parsed.parts.reduce((sum,p)=>sum+(Number.isFinite(p.weight)?p.weight:0),0);
  const prediction = requiredRemaining(parsed,number(target));
  const update = (id:string, field:keyof DraftPart, value:string) => setParts(v=>v.map(p=>p.id===id?{...p,[field]:value}:p));
  const save = () => {
    if (validation) { setError(validation); return; }
    if (retake && !previousId) { setError('Chọn lần học trước để liên kết học lại.'); return; }
    const invalidRetake = validateRetake(courseId,parsed.previousCourseId,courseCatalog,gradeBook);
    if (invalidRetake) { setError(invalidRetake); return; }
    saveGrades(courseId,parsed); setToast('Đã lưu điểm và trọng số trong bản giao diện'); onClose();
  };
  return <Sheet title="Nhập điểm môn học" onClose={onClose}>
    <Card style={{ backgroundColor:C.soft,gap:6 }}><Badge label={`${course.code} · ${course.credits} tín chỉ`} bg="#FFFFFFAA" /><T style={{ fontFamily:F.extra,fontSize:21,lineHeight:30 }}>{course.name}</T><T style={{ fontSize:11,color:C.primary }}>Thang 10 · Để trống nếu chưa có điểm</T></Card>
    <Row between><T style={{ fontFamily:F.bold }}>Điểm thành phần</T><Badge label={`Trọng số ${Number(totalWeight.toFixed(2))}%`} color={Math.abs(totalWeight-100)<0.000001?C.green:C.red} bg={Math.abs(totalWeight-100)<0.000001?C.greenSoft:C.redSoft} /></Row>
    {parts.map((part,index)=><Card key={part.id} style={{ backgroundColor:C.canvas,padding:13,gap:11 }}><Row><View style={S.grow}><Field label={`Thành phần ${index+1}`} accessibilityLabel={`Tên thành phần ${index+1}`} value={part.name} onChange={v=>update(part.id,'name',v)} /></View><IconButton name="close" label={`Xóa thành phần ${index+1}`} bg="transparent" color={C.muted} onPress={()=>setParts(v=>v.filter(p=>p.id!==part.id))} /></Row><Row style={{ alignItems:'flex-start' }}><View style={S.grow}><Field label="Điểm / 10" accessibilityLabel={`Điểm thành phần ${index+1}`} value={part.score} onChange={v=>update(part.id,'score',v)} placeholder="Chưa nhập" numeric /></View><View style={S.grow}><Field label="Trọng số (%)" accessibilityLabel={`Trọng số thành phần ${index+1} (%)`} value={part.weight} onChange={v=>update(part.id,'weight',v)} numeric /></View></Row></Card>)}
    <Button label="Thêm thành phần điểm" icon="add" secondary disabled={parts.length>=10} onPress={()=>setParts(v=>[...v,{id:uid(),name:'',weight:'',score:''}])} />
    <Card style={{ backgroundColor:result.complete?C.greenSoft:C.canvas,gap:8 }}><Row between><T style={{ fontFamily:F.bold }}>Kết quả xem trước</T><T style={{ fontFamily:F.extra,fontSize:24,color:result.complete?C.green:C.muted }}>{result.total===null?'—':result.total.toFixed(gradeRules.decimals)}</T></Row><T style={{ fontSize:12,color:C.muted }}>{validation ?? (result.complete?`${result.letter} · ${result.point?.toFixed(1)}/4 · ${result.passed?'Đạt theo thang mẫu':'Chưa đạt theo thang mẫu'}`:`Chưa đủ dữ liệu · ${result.entered}/${result.count} thành phần đã nhập`)}</T></Card>
    {!validation && !result.complete && <Card style={{ backgroundColor:C.soft,gap:12 }}><T style={{ fontFamily:F.bold,fontSize:14 }}>Mình cần bao nhiêu điểm nữa?</T><Field label="Điểm tổng kết mục tiêu (0–10)" value={target} onChange={setTarget} numeric />{prediction ? <><T style={{ fontSize:13 }}>{prediction.needed>10?'Mục tiêu vượt khả năng đạt từ các phần còn lại.':prediction.needed<=0?'Các điểm đã có đủ đóng góp để đạt mục tiêu; vẫn cần nhập đủ điểm còn thiếu.':`${prediction.missingCount===1?'Điểm phần còn thiếu':'Trung bình có trọng số các phần còn thiếu'} cần khoảng ${prediction.needed.toFixed(2)}/10.`}</T><T style={{ fontSize:10,color:C.muted,lineHeight:17 }}>Còn {prediction.weight}% trọng số. Tính từ tổng chưa làm tròn, chưa xét điều kiện điểm liệt hoặc điểm tối thiểu từng phần.</T></> : <T style={S.small}>Nhập mục tiêu hợp lệ từ 0 đến 10.</T>}</Card>}
    <T style={{ fontFamily:F.bold }}>Liên kết học lại / cải thiện</T><Segments values={['Lần học riêng','Học lại']} value={retake?'Học lại':'Lần học riêng'} onChange={v=>setRetake(v==='Học lại')} />
    {retake && <><T style={S.small}>Chọn đúng lần học trước, cùng số tín chỉ và khác học kỳ. App không tự gộp môn theo tên hoặc mã.</T>{courseCatalog.filter(c=>c.id!==courseId&&c.semesterId!==course.semesterId&&c.credits===course.credits).map(c=><Pressable key={c.id} accessibilityRole="radio" accessibilityLabel={`Học lại từ ${c.name}`} accessibilityState={{checked:previousId===c.id}} aria-checked={previousId===c.id} onPress={()=>setPreviousId(c.id)} style={{minHeight:48,padding:12,borderRadius:14,backgroundColor:previousId===c.id?C.soft:C.canvas}}><Row><Icon name={previousId===c.id?'radio-button-on':'radio-button-off'} size={18}/><View style={S.grow}><T style={{fontFamily:F.semi,fontSize:12}}>{c.name}</T><T style={{fontSize:10,color:C.muted}}>{c.code} · {semesters.find(s=>s.id===c.semesterId)?.name} · {semesters.find(s=>s.id===c.semesterId)?.academicYear}</T></View></Row></Pressable>)}</>}
    {!!error&&<T accessibilityRole="alert" style={{color:C.red}}>{error}</T>}<Button label="Lưu điểm môn học" icon="checkmark" onPress={save} actionLabel="Đang lưu"/>
    <Button label={clearing?'Xác nhận xóa điểm đã nhập':'Xóa điểm đã nhập'} secondary onPress={()=>{if(!clearing){setClearing(true);return;} setParts(v=>v.map(p=>({...p,score:''})));setClearing(false);setError('');}}/>
    <T style={S.small}>Xóa điểm chỉ làm trống các ô trong form; bấm Lưu để áp dụng. Quy tắc quy đổi hiện là mẫu, chưa theo quy chế trường của bạn.</T>
  </Sheet>;
}

export function GradeRulesDialog({onClose}:{onClose:()=>void}) {
  const {gradeRules,setGradeRules,setToast}=useApp();const [rules,setRules]=useState(gradeRules);
  return <Sheet title="Quy tắc điểm mẫu" onClose={onClose}><Badge label="Quy tắc mẫu · Cần đối chiếu quy chế" icon="information-circle-outline"/><T style={S.small}>Chọn cách quy đổi để thử giao diện. Chưa bao gồm điểm liệt, môn miễn/đạt-không đạt hoặc quy tắc riêng của trường.</T><T style={{fontFamily:F.bold}}>Thang quy đổi từ 10 sang 4</T><Segments values={['Có điểm cộng','Không điểm cộng']} value={rules.scale==='expanded'?'Có điểm cộng':'Không điểm cộng'} onChange={v=>setRules(r=>({...r,scale:v==='Có điểm cộng'?'expanded':'simple'}))}/><Card style={{backgroundColor:C.canvas,gap:9}}>{gradeScales[rules.scale].map((band,i)=>{const upper=i===0?'10':`< ${gradeScales[rules.scale][i-1]!.min}`;return <Row key={band.letter} between><T style={{fontSize:12}}>{band.min} đến {upper}</T><Badge label={`${band.letter} · ${band.point.toFixed(1)}`} /></Row>;})}</Card><T style={{fontFamily:F.bold}}>Làm tròn tổng kết trước quy đổi</T><Segments values={['1 chữ số','2 chữ số']} value={`${rules.decimals} chữ số`} onChange={v=>setRules(r=>({...r,decimals:v.startsWith('1')?1:2}))}/><T style={{fontFamily:F.bold}}>GPA tích lũy khi có học lại</T><Segments values={['Điểm cao nhất','Lần học mới nhất']} value={rules.retake==='highest'?'Điểm cao nhất':'Lần học mới nhất'} onChange={v=>setRules(r=>({...r,retake:v==='Điểm cao nhất'?'highest':'latest'}))}/><T style={S.small}>Chỉ gộp các lần bạn đã liên kết. Điểm cao nhất chọn theo thang 4; bằng nhau chọn lần sau. Lần mới chưa đủ điểm không thay thế kết quả đã có. GPA từng kỳ vẫn giữ kết quả học trong kỳ đó. Tín chỉ đạt tính một lần theo kết quả được chọn, điểm thiếu loại khỏi GPA thay vì tính là 0.</T><Button label="Áp dụng quy tắc mẫu" icon="checkmark" onPress={()=>{setGradeRules(rules);setToast('Đã áp dụng quy tắc mẫu cho các màn điểm');onClose();}} actionLabel="Đang lưu"/></Sheet>;
}
