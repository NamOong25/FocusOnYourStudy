import React,{useState} from 'react';
import {Button,Card,T} from '../../../shared/components';
import {useApp} from '../../../store/model';
import {C,F,S} from '../../../shared/theme';
import {asApiError,type ApiError} from '../../../shared/api/http';
import {useGradeConfigurationWrites} from '../api/GradeConfigurationWritesProvider';
import type {ServerGradeDetail} from '../api/gradesReadApi';
import {gradeKindLabels} from '../serverGradeView';

export function GradeConfigurationPendingNotice({onOpen}:{onOpen:(id:string)=>void}){
  const {state}=useGradeConfigurationWrites(),{courseCatalog}=useApp();const pending=state.pending;
  if(!pending)return null;
  return <Card style={{backgroundColor:C.amberSoft,gap:10}}><T style={{fontFamily:F.bold}}>{pending.operation==='scores'?'Có lần lưu điểm cần kiểm tra':'Có cấu hình bảng điểm cần kiểm tra'}</T><T style={S.small}>{courseCatalog.find(c=>c.id===pending.course.id)?.name??'Môn của lần lưu trước'} · Bản nháp được giữ, chưa tự gửi lại.</T><Button label="Mở lần lưu cần kiểm tra" secondary onPress={()=>onOpen(pending.course.id)}/></Card>;
}
export default function GradeConfigurationReview({courseId,onReplace,onKeepDraft,onClose}:{courseId:string;onReplace:(detail:ServerGradeDetail)=>void;onKeepDraft:()=>void;onClose:()=>void}){
  const {manager,state}=useGradeConfigurationWrites(),{courseConnection,semesterConnection}=useApp();
  const [loading,setLoading]=useState(false),[error,setError]=useState<ApiError|null>(null);const pending=state.pending;
  if(!pending||pending.course.id!==courseId||pending.operation==='scores')return null;
  const check=async()=>{
    if(!manager||loading||state.checking)return;setLoading(true);setError(null);
    try{const [courses]=await Promise.all([courseConnection?.reload()??Promise.resolve([]),semesterConnection?.reload()??Promise.resolve([])]);await manager.check(courses.find(c=>c.id===courseId)??pending.course);}
    catch(e){setError(asApiError(e));}finally{setLoading(false);}
  };
  const accept=(next:()=>void)=>{if(!loading&&manager?.acknowledge())next();};
  const current=state.checked?.current;
  return <Card style={{backgroundColor:C.amberSoft,gap:12}}>
    <T accessibilityRole="alert" style={{fontFamily:F.bold}}>{pending.reason==='uncertain'?'Cần kiểm tra kết quả lần lưu trước':pending.reason==='protected'?'Có cột đã được nhập điểm':pending.reason==='gone'?'Bảng điểm đã bị xóa hoặc thay thế':'Bảng điểm đã thay đổi ở nơi khác'}</T>
    <T style={S.small}>{pending.reason==='uncertain'?'Yêu cầu có thể đã được lưu dù ứng dụng chưa nhận được phản hồi. Bản nháp được giữ; hãy kiểm tra trước khi quyết định lưu lại.':'Bản nháp của bạn được giữ nguyên. Đọc và đối chiếu bản mới trước khi thay thế; các thay đổi chưa được tự ghi đè.'}</T>
    <Button label="Kiểm tra cấu hình đã lưu" secondary loading={loading||state.checking} disabled={state.busy} onPress={()=>{void check();}}/>
    {(error??state.error)&&<T accessibilityRole="alert" style={{color:C.red}}>{(error??state.error)!.message}</T>}
    {state.checked&&<>
      <T style={{fontFamily:F.bold}}>Dữ liệu vừa đọc từ tài khoản</T>
      {!state.checked.courseExists?<><T style={S.small}>Môn học không còn truy cập được trong tài khoản. Không tạo lại bảng điểm từ bản nháp cũ.</T><Button label="Đã kiểm tra, đóng biểu mẫu" secondary disabled={loading||state.checking||state.busy} onPress={()=>accept(onClose)}/></>
        :current?.kind==='configured'?<>
          <T style={S.small}>{current.assessment==='THEORY'?'Lý thuyết':'Thực hành'} · {current.parts.length} cột</T>
          {current.parts.map(p=><T key={p.id} style={S.small}>{p.name} · {gradeKindLabels[p.kind]}{p.project?` · ${p.project.target==='PRACTICE'?'Một cột thực hành':'Cuối kỳ'} ${p.project.share}%`:''}{p.score!==null||p.remainderScore!==null?' · Đã có điểm':''}</T>)}
          <Button label="Thay bản nháp bằng cấu hình vừa kiểm tra" secondary disabled={loading||state.checking||state.busy} onPress={()=>accept(()=>onReplace(current))}/>
        </>:<>
          <T style={S.small}>Môn hiện chưa có bảng điểm đã lưu.</T>
          {pending.operation==='create'?<><Button label="Đã kiểm tra, quay lại bản nháp" secondary disabled={loading||state.checking||state.busy} onPress={()=>accept(onKeepDraft)}/><T style={S.small}>Sau khi đối chiếu, bạn có thể tự bấm lưu lại. Kiểm tra không tự gửi thêm yêu cầu.</T></>:<Button label="Đã kiểm tra, đóng biểu mẫu" secondary disabled={loading||state.checking||state.busy} onPress={()=>accept(onClose)}/>}
        </>}
    </>}
  </Card>;
}
