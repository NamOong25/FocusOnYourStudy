import React,{useEffect,useRef,useState} from 'react';
import {Badge,Button,Card,Row,Segments,Sheet,StateView,T} from '../../../shared/components';
import {FlowScope,useNavigationScope} from '../../../navigation/Navigation';
import {useApp} from '../../../store/model';
import {useFeedback} from '../../../shared/feedback/FeedbackProvider';
import {asApiError,type ApiError} from '../../../shared/api/http';
import {C,F,S} from '../../../shared/theme';
import {useServerCourseGrades} from '../api/useServerGrades';
import {useGradeConfigurationWrites} from '../api/GradeConfigurationWritesProvider';
import type {CourseRef,ServerGradeDetail} from '../api/gradesReadApi';
import {changeConfigurationAssessment,configurationDraftKey,draftFromDetail,draftFromInput,inputFromDraft,newConfigurationPart,scoredConfigurationColumns,suggestedConfiguration,type ConfigurationDraft} from '../gradeConfigurationDraft';
import {gradeKindLabels,gradeNumber} from '../serverGradeView';
import GradeConfigurationColumn from './GradeConfigurationColumn';
import GradeConfigurationReview from './GradeConfigurationReview';

export default function ServerGradeConfigurationEditor({courseId,onClose}:{courseId:string;onClose:()=>void}){
  const {courseCatalog,courseConnection,semesterConnection}=useApp(),{state}=useGradeConfigurationWrites();
  const pending=state.pending?.course.id===courseId?state.pending:null,course=courseCatalog.find(c=>c.id===courseId);
  const [initial,setInitial]=useState<ServerGradeDetail|null>(()=>pending?.original??null);
  const read=useServerCourseGrades(course??null,useNavigationScope().active&&initial===null);
  useEffect(()=>{if(initial===null&&read.value)setInitial(read.value);},[initial,read.value]);
  const reload=()=>{void Promise.allSettled([read.reload(),courseConnection?.reload(),semesterConnection?.reload()]);};
  if(initial&&(course||pending))return <ConfigurationForm course={course??pending!.course} name={course?.name??'Bảng điểm cần kiểm tra'} initial={initial} onClose={onClose}/>;
  return <Sheet title="Cấu hình cột điểm" onClose={onClose}>
    {!course?<StateView kind="error" title="Không tìm thấy môn học" message="Tải lại danh sách để chọn môn còn trong tài khoản." actionLabel="Tải lại" onAction={reload}/>
      :read.error?<StateView kind="error" title="Chưa mở được cấu hình" message={read.error.message} actionLabel="Thử lại" onAction={reload}/>
        :<StateView kind="loading" title="Đang tải cấu hình" message="Đang đọc bộ cột và các điểm đã lưu của môn."/>}
  </Sheet>;
}
function ConfigurationForm({course,name,initial,onClose}:{course:CourseRef;name:string;initial:ServerGradeDetail;onClose:()=>void}){
  const {manager,state}=useGradeConfigurationWrites(),{showNotice}=useFeedback();
  const pending=state.pending?.course.id===course.id?state.pending:null;
  const [base,setBase]=useState(initial),[draft,setDraft]=useState<ConfigurationDraft>(()=>pending?.input?draftFromInput(pending.input):draftFromDetail(initial));
  const [error,setError]=useState<ApiError|null>(null),[confirmDelete,setConfirmDelete]=useState(false);
  const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{manager?.clearError();},[manager,course.id]);
  const scored=scoredConfigurationColumns(base),hasScores=scored.size>0,busy=state.busy||state.checking,blocked=!manager||busy||!!state.pending;
  const dirty=configurationDraftKey(draft)!==configurationDraftKey(draftFromDetail(base));
  const guardClose=()=>{if(manager?.state.busy||manager?.state.checking){showNotice('Đang xử lý cấu hình. Đợi kết quả trước khi đóng nhé.');return;}onClose();};
  const change=(next:ConfigurationDraft)=>{if(!manager||manager.state.busy||manager.state.checking||manager.state.pending)return;setDraft(next);setError(null);manager.clearError();setConfirmDelete(false);};
  const save=async()=>{
    if(!manager||blocked)return;setError(null);
    try{const input=inputFromDraft(draft);const saved=await manager.save(course,input,base);if(!alive.current)return;showNotice(saved.state==='DRAFT'?'Đã lưu bộ cột đang thiết lập vào tài khoản.':'Đã lưu cấu hình cột điểm vào tài khoản.');onClose();}
    catch(e){if(alive.current)setError(asApiError(e));}
  };
  const remove=async()=>{
    if(!manager||blocked||base.kind!=='configured')return;setError(null);
    try{await manager.remove(course,base);if(!alive.current)return;showNotice('Đã xóa cấu hình bảng điểm của môn.');onClose();}
    catch(e){if(alive.current)setError(asApiError(e));}
  };
  const replace=(detail:ServerGradeDetail)=>{setBase(detail);setDraft(draftFromDetail(detail));setError(null);setConfirmDelete(false);};
  return <FlowScope onClose={guardClose}><Sheet title="Cấu hình cột điểm" onClose={guardClose} dirty={!busy&&dirty&&!pending} scrollKey={course.id}>
    <T style={{fontFamily:F.extra,fontSize:21,lineHeight:30}}>{name}</T><Badge label={`${course.credits} tín chỉ · Bộ cột của môn học`} icon="list-outline"/>
    <T style={S.small}>Chọn loại học phần và bộ cột theo đề cương. Có thể lưu bộ cột đang thiết lập, kể cả khi chưa đủ nhóm. Trọng số được cập nhật sau khi lưu.</T>
    {state.pending?<>
      <GradeConfigurationReview courseId={course.id} onReplace={replace} onKeepDraft={()=>{setBase({kind:'unconfigured',courseId:course.id});setError(null);}} onClose={onClose}/>
      {pending?<Card style={{backgroundColor:C.canvas,gap:7}}><T style={{fontFamily:F.bold}}>Bản nháp của bạn</T><T style={S.small}>{draft.assessment==='THEORY'?'Lý thuyết':'Thực hành'} · {draft.parts.length} cột</T>{draft.parts.map(p=><T key={p.id} style={S.small}>{p.name} · {gradeKindLabels[p.kind]}{p.project?` · ${p.project.target==='PRACTICE'?'Một cột thực hành':'Cuối kỳ'} ${p.project.share}%`:''}</T>)}</Card>
        :<Card style={{backgroundColor:C.amberSoft}}><T style={S.small}>Có cấu hình môn khác cần kiểm tra. Đóng biểu mẫu này và mở lần lưu cần kiểm tra trong màn Điểm & GPA.</T></Card>}
    </>:<>
    {busy&&<StateView kind="loading" title="Đang xử lý cấu hình" message="Đợi kết quả trước khi đóng hoặc thực hiện thao tác khác."/>}
    <T style={{fontFamily:F.bold}}>Loại học phần</T>
    {hasScores||blocked?<Badge label={draft.assessment==='THEORY'?'Lý thuyết':'Thực hành'}/>:<Segments values={['Lý thuyết','Thực hành']} value={draft.assessment==='THEORY'?'Lý thuyết':'Thực hành'} onChange={value=>change(changeConfigurationAssessment(draft,value==='Lý thuyết'?'THEORY':'PRACTICAL'))}/>}
    {hasScores&&<T style={S.small}>Bảng điểm đã có điểm số, nên giữ loại học phần. Cột có điểm được khóa loại, cách quy BTL và thao tác xóa; tên và thứ tự vẫn sửa được.</T>}
    <Row between><T style={{fontFamily:F.bold}}>Các cột điểm</T><Badge label={`${draft.parts.length}/10 cột`}/></Row>
    {!draft.parts.length&&<Card style={{gap:12,backgroundColor:C.canvas}}><T style={S.small}>Chưa có cột. Dùng bộ đề xuất rồi chỉnh theo môn, hoặc tự thêm từng cột.</T><Button label={`Thêm bộ cột ${draft.assessment==='THEORY'?'lý thuyết':'thực hành'} đề xuất`} secondary disabled={blocked} onPress={()=>change(suggestedConfiguration(draft.assessment,course.credits))}/></Card>}
    {draft.parts.map((part,i)=><GradeConfigurationColumn key={part.id} part={part} index={i+1} count={draft.parts.length} assessment={draft.assessment} scored={scored.has(part.id)} disabled={blocked}
      onChange={next=>change({...draft,parts:draft.parts.map(p=>p.id===part.id?next:p)})}
      onRemove={()=>change({...draft,parts:draft.parts.filter(p=>p.id!==part.id)})}
      onMove={delta=>{const parts=[...draft.parts],j=i+delta;if(j<0||j>=parts.length)return;[parts[i],parts[j]]=[parts[j]!,parts[i]!];change({...draft,parts});}}/>)}
    <Button label="Thêm cột điểm" secondary icon="add-outline" disabled={blocked||draft.parts.length>=10} onPress={()=>change({...draft,parts:[...draft.parts,newConfigurationPart(draft.assessment==='THEORY'?'REGULAR':'PRACTICE_REGULAR',draft.assessment==='THEORY'?'Điểm thường kỳ':'Thường kỳ thực hành')]})}/>
    {hasScores&&<T style={S.small}>Thêm hoặc xóa cột chưa có điểm có thể thay đổi trọng số và kết quả tổng kết khi lưu.</T>}
    {base.kind==='configured'&&!!base.parts.length&&<Card style={{backgroundColor:C.canvas,gap:6}}><T style={{fontFamily:F.semi}}>Trọng số đã lưu trước chỉnh sửa</T>{base.parts.map(p=><T key={p.id} style={S.small}>{p.name} · {gradeNumber(Number(p.weight.toFixed(2)))}%</T>)}</Card>}
    {!state.pending&&(error??state.error)&&<T accessibilityRole="alert" style={{color:C.red,lineHeight:22}}>{Object.values((error??state.error)!.fields).join(' · ')||(error??state.error)!.message}</T>}
    <Button label="Lưu cấu hình cột điểm" icon="checkmark-outline" loading={state.busy} disabled={blocked} onPress={()=>{void save();}}/>
    <T style={S.small}>Lưu bộ cột và cách quy BTL cho môn học. Nhập điểm số tại Nhập / chỉnh sửa điểm trong bảng điểm môn.</T>
    {base.kind==='configured'&&<>
      <Button label="Xóa cấu hình bảng điểm" secondary disabled={blocked||hasScores} onPress={()=>setConfirmDelete(true)}/>
      {hasScores&&<T style={S.small}>Muốn xóa toàn bộ bảng điểm, cần xử lý các điểm đã nhập trước.</T>}
      {confirmDelete&&<Card style={{backgroundColor:C.redSoft,gap:10}}><T style={{fontFamily:F.bold}}>Xóa bộ cột đang lưu?</T><T style={S.small}>Các cột của môn này và thay đổi chưa lưu sẽ được bỏ. Cấu hình hiện tại chưa có điểm số.</T><Button label="Xác nhận xóa cấu hình" danger disabled={blocked} onPress={()=>{void remove();}}/><Button label="Giữ lại bảng điểm" secondary disabled={blocked} onPress={()=>setConfirmDelete(false)}/></Card>}
    </>}
    </>}
  </Sheet></FlowScope>;
}
