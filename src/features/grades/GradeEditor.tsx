import React,{useRef,useState} from 'react';
import {Linking} from 'react-native';
import {Badge,Button,Card,Row,Segments,Sheet,T} from '../../shared/components';
import {Assessment,CourseGrades,GradeKind,GradePart,assessmentTemplate,changePartKind,courseResult,emptyGrades,gradeColumnNote,gradeScales,isFinalPart,partKind,rebalanceGradeParts,validateAssessment,validateGradeDraft} from './grades';
import GradeColumnCard,{DraftPart} from './GradeColumnCard';
import GradeStatus from './GradeStatus';
import {useApp} from '../../store/model';
import {C,F,S} from '../../shared/theme';
import {useFormChanges} from '../../shared/forms/useFormChanges';

const number=(s:string)=>/^\d+(?:[.,]\d+)?$/.test(s.trim())?Number(s.trim().replace(',','.')):NaN;
const parsePart=(p:DraftPart):GradePart=>({...p,score:p.score.trim()===''?null:number(p.score),project:p.project?{target:p.project.target,share:p.project.share.trim()===''?null:number(p.project.share),remainderScore:p.project.remainderScore.trim()===''?null:number(p.project.remainderScore)}:undefined});
const toDraft=(p:GradePart):DraftPart=>({...p,kind:partKind(p),score:p.score===null?'':String(p.score),project:p.project?{target:p.project.target,share:p.project.share===null?'':String(p.project.share),remainderScore:p.project.remainderScore===null?'':String(p.project.remainderScore)}:undefined});
const regularKind=(p:DraftPart)=>['Điểm thường kỳ','Kiểm tra thường kỳ'].includes(p.kind);

export function GradeEditor({courseId,onClose}:{courseId:string;onClose:()=>void}){
  const {courseCatalog,semesters,gradeBook,gradeRules,setGradeRules,saveGrades,setToast}=useApp();
  const record=gradeBook[courseId]??emptyGrades(),course=courseCatalog.find(c=>c.id===courseId);
  const [parts,setParts]=useState(()=>record.parts.map(toDraft)),[assessment,setAssessment]=useState<Assessment>(record.assessment??'custom');
  const [pendingMode,setPendingMode]=useState<'theory'|'practical'|null>(null),[error,setError]=useState(''),[clearing,setClearing]=useState(false),[splitConfirm,setSplitConfirm]=useState(false);
  const [resetConfirm,setResetConfirm]=useState(false),sequence=useRef(0);
  const dirty=useFormChanges({assessment,parts:parts.map(({id,...part})=>part)});
  const newId=()=>`column-${Date.now()}-${++sequence.current}`;
  if(!course)return null;
  const supported=assessment==='theory'||assessment==='practical';
  const rules={...gradeRules,scale:'iuh' as const,decimals:1 as const};
  const parsed:CourseGrades={...record,assessment,practicalCredits:assessment==='practical'?course.credits:record.practicalCredits,parts:rebalanceGradeParts(parts.map(parsePart),assessment)};
  const validation=validateAssessment(parsed),draftError=validateGradeDraft(parsed),result=courseResult(parsed,rules),previous=courseCatalog.find(c=>c.id===record.previousCourseId),columnNote=gradeColumnNote(parsed);
  const regular=parts.filter(regularKind),columnCount=course.credits>=3?3:2;
  const changeKind=(id:string,kind:GradeKind)=>{setParts(items=>items.map(p=>{
    if(p.id!==id)return p;
    const changed=toDraft(changePartKind(parsePart(p),kind,assessment));
    // Keep partially typed input and a user-supplied display name when changing role.
    return {...p,kind,name:p.name===p.kind||/^(Điểm thường kỳ|Thường kỳ thực hành) \d+$/.test(p.name)?kind:p.name,project:kind==='Bài tập lớn'?(p.project??changed.project):undefined};
  }));setError('');};
  const addColumn=()=>{if(parts.length>=10)return;const kind=assessment==='practical'?'Thường kỳ thực hành':'Điểm thường kỳ';setParts(items=>[...items,{id:newId(),name:kind,kind,weight:0,score:''}]);setError('');};
  const restoreSuggestions=()=>{setParts(assessmentTemplate(assessment,course.credits).parts.map(toDraft));setResetConfirm(false);setSplitConfirm(false);setError('');};
  const save=()=>{
    if(!supported){setError('Chọn loại học phần Lý thuyết hoặc Thực hành và xác nhận bộ cột trước khi lưu.');return;}
    if(draftError){setError(draftError);return;}
    setGradeRules(rules);saveGrades(courseId,parsed);setToast(validation?'Đã lưu bản đang nhập; bổ sung đủ cột để tính tổng kết':'Đã lưu điểm và cấu hình cột điểm');onClose();
  };
  const splitRegular=()=>{if(parts.length-regular.length+columnCount>10){setError('Tối đa 10 cột điểm. Xóa bớt cột trước khi tách nhóm thường kỳ.');setSplitConfirm(false);return;}setParts(items=>[...Array.from({length:columnCount},(_,i)=>({id:newId(),name:`Điểm thường kỳ ${i+1}`,kind:'Điểm thường kỳ' as const,weight:20/columnCount,score:''})),...items.filter(p=>!regularKind(p))]);setSplitConfirm(false);setError('');};
  const mergeRegular=()=>{const complete=regular.length>0&&regular.every(p=>p.score.trim()!==''&&Number.isFinite(number(p.score)));const mean=complete?regular.reduce((s,p)=>s+number(p.score),0)/regular.length:null;setParts(items=>[{id:newId(),name:'Điểm thường kỳ',kind:'Điểm thường kỳ',weight:20,score:mean===null?'':String(Math.round((mean+Number.EPSILON)*10)/10)},...items.filter(p=>!regularKind(p))]);setError('');};
  return <Sheet title="Nhập điểm môn học" onClose={onClose} dirty={dirty}>
    <Card style={{backgroundColor:C.soft,gap:6}}><Badge label={`${course.code} · ${course.credits} tín chỉ`} bg="#FFFFFFAA"/><T style={{fontFamily:F.extra,fontSize:21,lineHeight:30}}>{course.name}</T><T style={{fontSize:11,color:C.primary}}>Quy đổi IUH · Thang 10 · Để trống khi chưa có điểm</T></Card>
    <T style={{fontFamily:F.bold}}>Loại học phần</T><Segments values={['Lý thuyết','Thực hành']} value={assessment==='theory'?'Lý thuyết':assessment==='practical'?'Thực hành':''} onChange={v=>{const mode=v==='Lý thuyết'?'theory':'practical';if(mode!==assessment){setPendingMode(mode);setError('');}}}/>
    {pendingMode&&<Card style={{backgroundColor:C.amberSoft,gap:12}}><T style={{fontFamily:F.bold}}>Đổi sang {pendingMode==='theory'?'Lý thuyết':'Thực hành'}</T><T style={S.small}>Tạo lại bộ cột sẽ xóa điểm trong bản nháp này. Điểm đã lưu chỉ thay đổi khi bạn bấm Lưu điểm môn học.</T><Button label="Áp dụng bộ cột mới" onPress={()=>{setAssessment(pendingMode);setParts(assessmentTemplate(pendingMode,course.credits).parts.map(toDraft));setPendingMode(null);setError('');setSplitConfirm(false);}}/><Button label="Giữ bộ cột hiện tại" secondary onPress={()=>setPendingMode(null)}/></Card>}
    {!supported?<Card style={{backgroundColor:C.amberSoft,gap:8}}><T style={{fontFamily:F.bold}}>Bảng điểm đang dùng cấu hình trước</T><T style={S.small}>Các điểm cũ được giữ nguyên. Chọn một trong hai loại phía trên để tạo bộ cột mới; app không tự đổi loại hoặc xóa điểm đã lưu.</T></Card>:<>
    <Card style={{backgroundColor:C.soft,gap:8}}><T style={{fontFamily:F.bold}}>Bộ cột đề xuất · Có thể chỉnh sửa</T><T style={S.small}>Thêm, xóa, đổi loại hoặc sửa tên từng cột cho đúng bảng điểm của môn. Các thay đổi chỉ được ghi nhận khi bấm Lưu.</T></Card>
    <T style={S.small}>{assessment==='theory'?'Tổng kết = thường kỳ × 20% + giữa kỳ × 30% + cuối kỳ × 50%. Các cột thường kỳ chia đều nhóm 20%. Giữa kỳ và cuối kỳ mỗi nhóm một cột; BTL có thể thay hoặc góp vào cuối kỳ.':`Tổng kết = trung bình cộng ${parts.length} cột đang có. Gợi ý IUH cho ${course.credits} tín chỉ là ${course.credits>=3?5:3} cột. Đổi một cột sang BTL để thay cột đó; chỉ thêm cột khi môn thực sự có thêm điểm.`}</T>
    {assessment==='theory'&&regular.length===1&&<T style={S.small}>Cột thường kỳ hiện nhập điểm trung bình đã công bố. Bạn có thể tách thành {columnCount} cột để app tính trung bình.</T>}
    <Row between><T style={{fontFamily:F.bold}}>Điểm thành phần</T><Badge label={`${parts.length}/10 cột · Tự tính trọng số`} bg={C.track} color={C.muted}/></Row>
    {parts.length===0&&<Card style={{backgroundColor:C.canvas,gap:8}}><T style={{fontFamily:F.bold}}>Chưa có cột điểm</T><T style={S.small}>Bấm Thêm cột điểm hoặc Khôi phục bộ cột đề xuất. Bạn vẫn có thể lưu bản trống.</T></Card>}
    {parts.map((part,index)=><GradeColumnCard key={part.id} part={part} value={parsed.parts[index]!} index={index+1} assessment={assessment} aggregate={assessment==='theory'&&regularKind(part)&&regular.length===1} onKindChange={kind=>changeKind(part.id,kind)} onChange={patch=>{setParts(items=>items.map(p=>p.id===part.id?{...p,...patch}:p));setError('');}} onDelete={()=>{setParts(items=>items.filter(p=>p.id!==part.id));setError('');setSplitConfirm(false);}}/>)}
    <Button label="Thêm cột điểm" icon="add" secondary disabled={parts.length>=10} onPress={addColumn}/>
    {parts.length>=10&&<T style={S.small}>Đã đủ 10 cột. Xóa một cột trước khi thêm cột khác.</T>}
    {assessment==='theory'&&<>{regular.length===1?<Button label={`Nhập ${columnCount} cột thường kỳ riêng`} secondary disabled={parts.length-1+columnCount>10} onPress={()=>setSplitConfirm(true)}/>:regular.length>1?<Button label="Gộp thành trung bình thường kỳ" secondary onPress={mergeRegular}/>:null}<Button label="Dùng bài tập lớn cho cuối kỳ" secondary disabled={parts.some(p=>p.kind==='Bài tập lớn')||!parsed.parts.some(isFinalPart)} onPress={()=>{const final=parsed.parts.find(isFinalPart);if(final)changeKind(final.id,'Bài tập lớn');}}/>{splitConfirm&&<Card style={{backgroundColor:C.amberSoft,gap:10}}><T style={S.small}>Thay ô trung bình thường kỳ bằng {columnCount} ô trống trong bản nháp. Các điểm giữa kỳ/cuối kỳ và BTL được giữ lại.</T><Button label={`Tạo ${columnCount} cột thường kỳ`} onPress={splitRegular}/><Button label="Giữ trung bình hiện tại" secondary onPress={()=>setSplitConfirm(false)}/></Card>}</>}
    <Button label="Khôi phục bộ cột đề xuất" secondary onPress={()=>setResetConfirm(true)}/>
    {resetConfirm&&<Card style={{backgroundColor:C.amberSoft,gap:10}}><T style={S.small}>Thay các cột và điểm trong bản nháp bằng bộ cột gợi ý trống? Điểm đã lưu được giữ nguyên cho đến khi bấm Lưu.</T><Button label="Xác nhận khôi phục cột đề xuất" onPress={restoreSuggestions}/><Button label="Giữ bản đang nhập" secondary onPress={()=>setResetConfirm(false)}/></Card>}
    {columnNote&&<Card style={{backgroundColor:C.amberSoft}}><T style={S.small}>{columnNote}</T></Card>}
    <Card style={{backgroundColor:result.failed?C.redSoft:result.passed?C.greenSoft:C.canvas,gap:10}}><Row between><T style={{fontFamily:F.bold}}>Kết quả tính từ điểm đã nhập</T><T testID="grade-editor-total" style={{fontFamily:F.extra,fontSize:24,color:result.failed?C.red:result.passed?C.green:C.muted}}>{result.total===null?'—':result.total.toFixed(1)}</T></Row><GradeStatus result={result} detail/>{result.complete&&<T style={S.small}>{result.letter} · {result.point?.toFixed(1)}/4</T>}</Card>
    <Card style={{backgroundColor:C.canvas,gap:8}}><T style={{fontFamily:F.bold}}>Lần học · Tự nhận diện</T>{previous?<><Badge label={`${courseResult(gradeBook[previous.id],rules).failed?'Học lại':courseResult(gradeBook[previous.id],rules).passed?'Học cải thiện':'Lần học tiếp theo'} · ${previous.code}`}/><T style={S.small}>{semesters.find(s=>s.id===previous.semesterId)?.name}, {semesters.find(s=>s.id===previous.semesterId)?.academicYear}. Ghép cùng mã môn và tín chỉ.</T></>:<T style={S.small}>Chưa có lần học trước cùng mã môn và số tín chỉ.</T>}</Card>
    </>}
    {!!error&&<T accessibilityRole="alert" style={{color:C.red}}>{error}</T>}<Button label="Lưu điểm môn học" icon="checkmark" onPress={save} actionLabel="Đang lưu" disabled={!supported}/>
    <Button label={clearing?'Xác nhận xóa điểm đã nhập':'Xóa điểm đã nhập'} secondary onPress={()=>{if(!clearing){setClearing(true);return;}setParts(items=>items.map(p=>({...p,score:'',project:p.project?{...p.project,remainderScore:''}:undefined})));setClearing(false);setError('');}}/>
    <T style={S.small}>Công thức và thang quy đổi dựa trên tài liệu IUH năm 2023. Vai trò/tỷ lệ BTL dùng theo đề cương hoặc thông báo của môn, không suy từ tên môn. Nhập điểm thành phần đã được công bố; app chưa đồng bộ bảng điểm trường và chưa lưu dữ liệu lâu dài.</T>
  </Sheet>;
}

export function GradeRulesDialog({onClose}:{onClose:()=>void}){
  const {gradeRules,setGradeRules,setToast}=useApp();
  return <Sheet title="Cách tính điểm IUH" onClose={onClose}><Badge label="IUH · Tài liệu năm 2023 · Đối chiếu K19"/><T style={S.small}>Lý thuyết: thường kỳ 20%, giữa kỳ 30%, cuối kỳ 50%. Giữa kỳ 0 bị chặn thi; cuối kỳ dưới 3,0 thì tổng kết lý thuyết bằng điểm cuối kỳ, xếp F. Tổng kết từ 4,0 là đạt với môn tính điểm chữ.</T><T style={S.small}>Thực hành: trung bình cộng 3 cột nếu 1–2 tín chỉ; 5 cột khi từ 3 tín chỉ. BTL thay một cột thực hành vẫn giữ trọng số 1/3 hoặc 1/5. Nếu BTL làm cuối kỳ, phải quy vào đúng cột cuối kỳ, không tính thêm lần nữa.</T><T style={S.small}>BTL góp một phần cuối kỳ: cần tỷ lệ theo đề cương; app chưa có tỷ lệ thì không tính tổng kết. Các môn đặc thù, tích hợp hoặc chỉ xét đạt/không đạt cần cấu hình riêng, không tự đổi sang môn lý thuyết/thực hành.</T><Button label="Xem tài liệu IUH năm 2023" secondary onPress={()=>void Linking.openURL('https://fce.iuh.edu.vn/wp-content/uploads/2023/10/2023_FCE_faculty_manual.pdf#page=55')}/><Card style={{backgroundColor:C.canvas,gap:9}}>{gradeScales.iuh.map((band,i)=><Row key={band.letter} between><T style={{fontSize:12}}>{band.min} đến {i===0?'10':`< ${gradeScales.iuh[i-1]!.min}`}</T><Badge label={`${band.letter} · ${band.point.toFixed(1)}`}/></Row>)}</Card><T style={S.small}>Tổng kết làm tròn 1 chữ số trước quy đổi. GPA tính từ các môn đã nhập trong app; lịch sử học lại và điều kiện chương trình còn cần đối chiếu bảng điểm trường.</T><Button label="Áp dụng quy đổi IUH" onPress={()=>{setGradeRules({...gradeRules,scale:'iuh',decimals:1});setToast('Đã áp dụng thang quy đổi IUH');onClose();}} actionLabel="Đang lưu"/></Sheet>;
}
