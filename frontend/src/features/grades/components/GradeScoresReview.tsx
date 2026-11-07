import React,{useState} from 'react';
import {Button,Card,T} from '../../../shared/components';
import {useApp} from '../../../store/model';
import {C,F,S} from '../../../shared/theme';
import {asApiError,type ApiError} from '../../../shared/api/http';
import {useGradeConfigurationWrites} from '../api/GradeConfigurationWritesProvider';
import type {ConfiguredGrade} from '../gradeScoresDraft';
import {hasRemainder,matchingSavedScores} from '../gradeScoresDraft';
import {gradeNumber} from '../serverGradeView';

export default function GradeScoresReview({courseId,onReplace,onClose}:{courseId:string;onReplace:(current:ConfiguredGrade)=>void;onClose:()=>void}){
  const {manager,state}=useGradeConfigurationWrites(),{courseConnection,semesterConnection}=useApp();
  const [loading,setLoading]=useState(false),[error,setError]=useState<ApiError|null>(null);const pending=state.pending;
  if(!pending||pending.course.id!==courseId||pending.operation!=='scores')return null;
  const check=async()=>{
    if(!manager||loading||state.checking)return;setLoading(true);setError(null);
    try{const [courses]=await Promise.all([courseConnection?.reload()??Promise.resolve([]),semesterConnection?.reload()??Promise.resolve([])]);await manager.check(courses.find(c=>c.id===courseId)??pending.course);}
    catch(e){setError(asApiError(e));}finally{setLoading(false);}
  };
  const accept=(next:()=>void)=>{if(!loading&&manager?.acknowledge())next();};
  const current=state.checked?.current,blocked=loading||state.checking||state.busy;
  return <Card style={{backgroundColor:C.amberSoft,gap:12}}>
    <T accessibilityRole="alert" style={{fontFamily:F.bold}}>{pending.reason==='uncertain'?'Cần kiểm tra kết quả lần lưu điểm':'Điểm hoặc bộ cột đã thay đổi'}</T>
    <T style={S.small}>{pending.reason==='uncertain'?'Điểm có thể đã được lưu dù app chưa nhận được phản hồi. Bản nháp được giữ và chưa tự gửi lại.':'Bản đang sửa đã cũ. Đọc và đối chiếu điểm mới trước khi tiếp tục; app không tự ghi đè hoặc chuyển điểm sang bộ cột khác.'}</T>
    <Button label="Kiểm tra điểm đã lưu" secondary loading={loading||state.checking} disabled={state.busy} onPress={()=>{void check();}}/>
    {(error??state.error)&&<T accessibilityRole="alert" style={{color:C.red}}>{(error??state.error)!.message}</T>}
    {state.checked&&<>
      <T style={{fontFamily:F.bold}}>Điểm vừa đọc từ tài khoản</T>
      {current?.kind==='configured'?<>
        {current.parts.map(p=><T key={p.id} style={S.small}>{p.name}: {p.score===null?'Chưa nhập':gradeNumber(p.score)}{hasRemainder(p)?` · Phần còn lại: ${p.remainderScore===null?'Chưa nhập':gradeNumber(p.remainderScore)}`:''}</T>)}
        {matchingSavedScores(current,pending.original,pending.scoreInput)&&<T style={{color:C.green,fontFamily:F.semi}}>Các điểm vừa đọc khớp với lần gửi của bạn.</T>}
        <Button label="Thay bản nháp bằng điểm vừa kiểm tra" secondary disabled={blocked} onPress={()=>accept(()=>onReplace(current))}/>
        <Button label="Đã kiểm tra, đóng biểu mẫu điểm" secondary disabled={blocked} onPress={()=>accept(onClose)}/>
      </>:<><T style={S.small}>{state.checked.courseExists?'Môn hiện chưa có bảng điểm. Không đưa điểm từ bản nháp cũ vào một bộ cột mới.':'Môn không còn truy cập được trong tài khoản.'}</T><Button label="Đã kiểm tra, đóng biểu mẫu điểm" secondary disabled={blocked} onPress={()=>accept(onClose)}/></>}
    </>}
    <T style={{fontFamily:F.bold}}>Bản nháp đã gửi</T>
    {pending.scoreInput?.parts.map(p=><T key={p.id} style={S.small}>{pending.original.kind==='configured'?pending.original.parts.find(c=>c.id===p.id)?.name??p.id:p.id}: {p.score===null?'Chưa nhập':gradeNumber(p.score)}{p.remainderScore!==null?` · Phần còn lại: ${gradeNumber(p.remainderScore)}`:''}</T>)}
  </Card>;
}
