import React,{useEffect,useRef,useState} from 'react';
import {View} from 'react-native';
import {Badge,Button,Card,Field,Row,Sheet,StateView,T} from '../../../shared/components';
import {FlowScope,useNavigationScope} from '../../../navigation/Navigation';
import {useApp} from '../../../store/model';
import {useFeedback} from '../../../shared/feedback/FeedbackProvider';
import {asApiError,type ApiError} from '../../../shared/api/http';
import {C,F,S} from '../../../shared/theme';
import {useServerCourseGrades} from '../api/useServerGrades';
import {useGradeConfigurationWrites} from '../api/GradeConfigurationWritesProvider';
import type {CourseRef,ServerGradeDetail} from '../api/gradesReadApi';
import {draftFromScores,draftFromScoreInput,hasRemainder,inputFromScoresDraft,scoreBasis,scoresDraftKey,type ConfiguredGrade,type GradeScoresDraft} from '../gradeScoresDraft';
import {gradeKindLabels,gradeNumber,serverGradeView} from '../serverGradeView';
import GradeStatus from '../GradeStatus';
import GradeScoresReview from './GradeScoresReview';

export default function ServerGradeScoresEditor({courseId,onClose,onConfigure}:{courseId:string;onClose:()=>void;onConfigure:()=>void}){
  const {courseCatalog,courseConnection,semesterConnection}=useApp(),{state}=useGradeConfigurationWrites();
  const pending=state.pending?.course.id===courseId&&state.pending.operation==='scores'?state.pending:null,course=courseCatalog.find(c=>c.id===courseId);
  const [initial,setInitial]=useState<ServerGradeDetail|null>(()=>pending?.original??null);
  const read=useServerCourseGrades(course??null,useNavigationScope().active&&initial===null);
  useEffect(()=>{if(initial===null&&read.loaded&&!read.loading&&!read.error&&read.value)setInitial(read.value);},[initial,read.loaded,read.loading,read.error,read.value]);
  const reload=()=>{setInitial(null);void Promise.allSettled([read.reload(),courseConnection?.reload(),semesterConnection?.reload()]);};
  let malformed:ApiError|null=null;
  if(initial?.kind==='configured'){try{scoreBasis(initial);}catch(e){malformed=asApiError(e);}}
  if(initial?.kind==='configured'&&!malformed&&(course||pending))return <ScoresForm course={course??pending!.course} name={course?.name??'Điểm cần kiểm tra'} initial={initial} onClose={onClose} onConfigure={onConfigure}/>;
  return <Sheet title="Nhập điểm môn học" onClose={onClose}>
    {malformed?<StateView kind="error" title="Bảng điểm chưa hợp lệ" message={malformed.message} actionLabel="Tải lại" onAction={reload}/>
      :initial?.kind==='unconfigured'?<StateView title="Thiết lập bộ cột trước khi nhập điểm" message="Chọn loại học phần và các cột đúng đề cương. Điểm chưa nhập sẽ được để trống." actionLabel="Thiết lập bảng điểm" onAction={onConfigure}/>
        :!course?<StateView kind="error" title="Không tìm thấy môn học" message="Tải lại danh sách để chọn môn trong tài khoản." actionLabel="Tải lại" onAction={reload}/>
          :read.error?<StateView kind="error" title="Chưa mở được bảng điểm" message={read.error.message} actionLabel="Thử lại" onAction={reload}/>
            :<StateView kind="loading" title="Đang tải điểm đã lưu" message="Đang đọc đúng bộ cột và điểm mới nhất của môn."/>}
  </Sheet>;
}
function ScoresForm({course,name,initial,onClose,onConfigure}:{course:CourseRef;name:string;initial:ConfiguredGrade;onClose:()=>void;onConfigure:()=>void}){
  const {manager,state}=useGradeConfigurationWrites(),{showNotice}=useFeedback();
  const pending=state.pending?.course.id===course.id&&state.pending.operation==='scores'?state.pending:null;
  const [base,setBase]=useState(initial),[draft,setDraft]=useState<GradeScoresDraft>(()=>pending?.scoreInput?draftFromScoreInput(pending.scoreInput):draftFromScores(initial));
  const [error,setError]=useState<ApiError|null>(null),[clear,setClear]=useState(false);const alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{manager?.clearError();},[manager,course.id]);
  const busy=state.busy||state.checking,blocked=!manager||busy||!!state.pending,dirty=scoresDraftKey(draft)!==scoresDraftKey(draftFromScores(base));
  const guardClose=()=>{if(manager?.state.busy||manager?.state.checking){showNotice('Đang xử lý điểm. Đợi kết quả trước khi đóng nhé.');return;}onClose();};
  const change=(next:GradeScoresDraft)=>{if(!manager||manager.state.busy||manager.state.checking||manager.state.pending)return;setDraft(next);setError(null);setClear(false);manager.clearError();};
  const save=async()=>{
    if(!manager||blocked||!base.parts.length)return;setError(null);
    try{await manager.saveScores(course,inputFromScoresDraft(draft,base),base);if(!alive.current)return;showNotice('Đã lưu điểm vào tài khoản.');onClose();}
    catch(e){if(alive.current)setError(asApiError(e));}
  };
  const replace=(current:ConfiguredGrade)=>{setBase(current);setDraft(draftFromScores(current));setError(null);setClear(false);};
  const issue=error??state.error,result=serverGradeView(base.result);
  return <FlowScope onClose={guardClose}><Sheet title="Nhập điểm môn học" onClose={guardClose} dirty={!busy&&dirty} scrollKey={'scores-'+course.id}>
    <T style={{fontFamily:F.extra,fontSize:21,lineHeight:30}}>{name}</T><Badge label={`${base.assessment==='THEORY'?'Lý thuyết':'Thực hành'} · ${base.parts.length} cột`}/>
    <T style={S.small}>Nhập điểm đã công bố, từ 0 đến 10, tối đa 4 số thập phân. Để trống khi chưa có điểm; điểm 0 là kết quả thật. Để trống một điểm đang có rồi lưu sẽ xóa điểm đó.</T>
    {state.pending?<>
      <GradeScoresReview courseId={course.id} onReplace={replace} onClose={onClose}/>
      {!pending&&<Card style={{backgroundColor:C.amberSoft}}><T style={S.small}>Có lần lưu bảng điểm khác cần kiểm tra. Đóng biểu mẫu và mở lần lưu cần kiểm tra trong màn Điểm & GPA.</T></Card>}
    </>:<>
      {busy&&<StateView kind="loading" title="Đang lưu điểm" message="Đợi kết quả trước khi đóng hoặc thực hiện thao tác khác."/>}
      <Card style={{backgroundColor:C.canvas,gap:8}}><T style={{fontFamily:F.semi}}>Kết quả lần lưu gần nhất</T><GradeStatus result={result}/><Row between><T style={{fontFamily:F.extra,fontSize:25,color:C.primary}}>{gradeNumber(result.total,1)} /10</T><T style={S.small}>{result.letter??'Chưa quy đổi'}{result.point===null?'':` · ${result.point.toFixed(1)} /4`}</T></Row><T style={S.small}>Lưu điểm để cập nhật tổng kết.</T></Card>
      {!base.parts.length&&<StateView title="Bảng điểm chưa có cột" message="Thiết lập bộ cột theo đề cương trước khi nhập điểm." actionLabel="Thiết lập bộ cột" onAction={onConfigure}/>}
      {base.assessment==='THEORY'&&base.parts.filter(p=>['REGULAR','REGULAR_TEST'].includes(p.kind)).length===1&&<T style={S.small}>Với một cột thường kỳ, nhập điểm trung bình thường kỳ đã được công bố.</T>}
      {base.parts.map((p,i)=>{
        const item=draft.parts.find(v=>v.id===p.id)!;const set=(field:'score'|'remainderScore',text:string)=>change({parts:draft.parts.map(v=>v.id===p.id?{...v,[field]:text}:v)});
        return <Card key={p.id} style={{backgroundColor:C.canvas,gap:12}}>
          <Row between><T style={{fontFamily:F.bold,fontSize:15,flex:1}}>{p.name}</T><Badge label={`Cột ${i+1}`}/></Row><T style={S.small}>{gradeKindLabels[p.kind]} · Trọng số {Number(p.weight.toFixed(2))}%</T>
          <Field label={p.kind==='PROJECT'?'Điểm bài tập lớn / 10':'Điểm / 10'} accessibilityLabel={`Điểm cột ${i+1}`} value={item.score} onChange={text=>set('score',text)} placeholder="Chưa có điểm" numeric maxLength={16} disabled={blocked}/>
          {issue?.fields[`parts[${i}].score`]&&<T accessibilityRole="alert" style={{color:C.red}}>{issue.fields[`parts[${i}].score`]}</T>}
          {p.project&&<T style={S.small}>{p.project.target==='PRACTICE'?'BTL thay một cột thực hành, chỉ tính một lần.':p.project.share===100?'BTL là toàn bộ điểm cuối kỳ.':`BTL chiếm ${p.project.share}% cột cuối kỳ; phần còn lại chiếm ${Number((100-p.project.share).toFixed(4))}%.`}</T>}
          {hasRemainder(p)&&<>
            <Field label="Điểm phần còn lại của cuối kỳ / 10" accessibilityLabel={`Phần còn lại cột ${i+1}`} value={item.remainderScore} onChange={text=>set('remainderScore',text)} placeholder="Chưa có điểm" numeric maxLength={16} disabled={blocked}/>
            {issue?.fields[`parts[${i}].remainderScore`]&&<T accessibilityRole="alert" style={{color:C.red}}>{issue.fields[`parts[${i}].remainderScore`]}</T>}
          </>}
        </Card>;
      })}
      {issue&&<T accessibilityRole="alert" style={{color:C.red,lineHeight:22}}>{issue.message}</T>}
      <Button label="Lưu điểm môn học" icon="checkmark-outline" loading={state.busy} disabled={blocked||!dirty||!base.parts.length} onPress={()=>{void save();}}/>
      {draft.parts.some(p=>p.score.trim()||p.remainderScore.trim())&&<Button label="Xóa điểm trong bản nháp" secondary disabled={blocked} onPress={()=>setClear(true)}/>}
      {clear&&<Card style={{backgroundColor:C.amberSoft,gap:10}}><T style={{fontFamily:F.bold}}>Để trống tất cả điểm trong bản nháp?</T><T style={S.small}>Các điểm đã lưu chỉ bị xóa khi bạn bấm Lưu điểm môn học.</T><Button label="Để trống toàn bộ bản nháp" secondary disabled={blocked} onPress={()=>change({parts:draft.parts.map(p=>({id:p.id,score:'',remainderScore:''}))})}/><Button label="Giữ bản nháp hiện tại" secondary disabled={blocked} onPress={()=>setClear(false)}/></Card>}
      <T style={S.small}>Điểm cột sau quy đổi BTL, tổng kết và trạng thái môn được cập nhật khi lưu. Biểu mẫu này giữ nguyên loại, tên và thứ tự cột đã thiết lập.</T>
    </>}
  </Sheet></FlowScope>;
}
