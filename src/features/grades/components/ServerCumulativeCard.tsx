import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {Badge,Button,Card,Icon,Row,Sheet,StateView,T} from '../../../shared/components';
import {useNavigationScope} from '../../../navigation/Navigation';
import {C,F,S} from '../../../shared/theme';
import {useCumulativeGpa} from '../api/useServerGpa';
import type {CumulativeGroup,CumulativeUse} from '../api/cumulativeGpaApi';
import {gradeNumber,serverGradeView} from '../serverGradeView';
import GradeStatus from '../GradeStatus';
import {gradePresentation} from '../gradePresentation';
import {ServerCourseGradeDialog} from './ServerGradePanel';
import {useAuth} from '../../account/auth/AuthProvider';

const reasons={HIGHEST_PASS:'Chọn tổng kết đạt cao nhất',LATEST_COMPLETE_F:'Chưa có lần đạt · Tính lần F hoàn chỉnh gần nhất',NO_COMPLETE_RESULT:'Chưa có lần đủ kết quả',REVIEW_REQUIRED:'Cần đối chiếu trước khi tính'};
const uses:Record<CumulativeUse,string>={SELECTED:'Được tính vào tích lũy',PENDING_RESULT:'Chưa đủ kết quả',GROUP_REQUIRES_REVIEW:'Chưa tính · Cần đối chiếu',NOT_SELECTED_LOWER_PASS:'Không chọn · Có lần đạt cao hơn',NOT_SELECTED_OLDER_TIE:'Không chọn · Cùng điểm, có lần gần hơn',NOT_SELECTED_FAILED_ATTEMPT:'Giữ lịch sử F · Đã có lần đạt',NOT_SELECTED_OLDER_F:'Giữ lịch sử F cũ'};
const issues:Record<string,string>={CREDIT_VARIANTS:'Cùng mã có số tín chỉ khác nhau',ASSESSMENT_VARIANTS:'Các lần học có loại LT/TH khác nhau',AMBIGUOUS_PERIOD:'Có nhiều lần trong cùng học kỳ'};
export default function ServerCumulativeCard(){
  const [expanded,setExpanded]=useState(false);
  const auth=useAuth(),owner=`${auth.revision}:${auth.profile?.id??''}`;
  const read=useCumulativeGpa(useNavigationScope().active),[selection,setSelection]=useState<{owner:string;group:CumulativeGroup}|null>(null);
  const opened=selection?.owner===owner?selection.group:null,setOpened=(group:CumulativeGroup|null)=>setSelection(group?{owner,group}:null);
  const current=opened?(read.value?.groups.find(g=>g.key===opened.key)??opened):null;
  return <>
    <Card style={{backgroundColor:C.soft,gap:12}}>
      <Row between><View style={S.grow}><T style={{fontFamily:F.bold,fontSize:18}}>GPA tích lũy trong app</T><T style={S.small}>Theo các môn đã nhập</T></View><Button label="Cập nhật tích lũy" secondary disabled={read.loading} onPress={()=>{void read.reload();}}/></Row>
      {read.error?<StateView kind="error" title="Chưa tải được GPA tích lũy" message={read.error.message} actionLabel="Thử lại" onAction={()=>{void read.reload();}}/>
        :!read.loaded||!read.value?<StateView kind="loading" title="Đang đọc GPA tích lũy" message="Đang đối chiếu các lần học đã lưu trong tài khoản."/>
        :<>
          <T testID="server-cumulative-gpa" style={{fontFamily:F.extra,fontSize:36,color:C.primary}}>{gradeNumber(read.value.summary.gpa,2)}<T style={S.small}> /4</T></T>
          <T style={S.small}>{read.value.summary.earnedCredits} tín chỉ đạt · {read.value.summary.calculatedCredits} tín chỉ tính GPA · {read.value.summary.calculatedGroups}/{read.value.summary.registeredGroups} nhóm đã tính</T>
          <Badge label={read.value.summary.state==='COMPLETE'?'Đủ kết quả trong dữ liệu đã nhập':read.value.summary.gpa===null?'Chưa đủ dữ liệu':'Tạm tính · Còn dữ liệu cần bổ sung'} bg={C.card}/>
          {(read.value.summary.pendingAttempts>0||read.value.summary.reviewGroups>0)&&<T style={S.small}>{read.value.summary.pendingAttempts} lần học chưa đủ kết quả · {read.value.summary.reviewGroups} nhóm cần đối chiếu.</T>}
          {!read.value.groups.length&&<T style={S.small}>Chưa có môn học để tính tích lũy. Điểm thiếu không được xem là 0.</T>}
          {read.value.groups.length>0&&<Button label={expanded?'Thu gọn các môn tích lũy':'Xem các môn tính tích lũy'} secondary onPress={()=>setExpanded(!expanded)}/>}
          {expanded&&read.value.groups.map(g=>{const selected=g.attempts.find(a=>a.id===g.selectedCourseId),presentation=selected?gradePresentation(serverGradeView(selected.result)):null;return <Pressable key={g.key} accessibilityRole="button" accessibilityLabel={`Lịch sử tích lũy ${g.code} ${g.credits} tín chỉ`} onPress={()=>setOpened(g)}><Card style={{backgroundColor:presentation?.attention?presentation.background:C.card,padding:13,gap:6}}><Row between><View style={S.grow}><T style={{fontFamily:F.bold}}>{g.code} · {g.credits} tín chỉ</T><T style={S.small}>{selected?.name??g.attempts[0]?.name}</T></View><Icon name="chevron-forward"/></Row><T style={S.small}>{reasons[g.reason]} · {g.attempts.length} lần học</T><T style={{color:g.included?(presentation?.attention?presentation.color:C.primary):C.amber,fontFamily:F.bold}}>{selected?`${gradeNumber(selected.result.total,1)}/10 · ${gradeNumber(selected.result.gradePoint,1)}/4`:'Chưa tính vào GPA'}</T></Card></Pressable>;})}
        </>}
      <T style={S.small}>Lấy lần đạt cao nhất theo mã và tín chỉ. Đây là quy tắc app bạn đã chọn, chưa phải GPA chính thức/toàn khóa của trường.</T>
    </Card>
    {current&&<CumulativeHistory group={current} stale={!!read.error||!read.value||!read.value.groups.some(g=>g.key===current.key)} onClose={()=>setOpened(null)}/>}
  </>;
}
function CumulativeHistory({group,stale,onClose}:{group:CumulativeGroup;stale:boolean;onClose:()=>void}){
  const [courseId,setCourseId]=useState<string|null>(null);
  if(courseId)return <ServerCourseGradeDialog courseId={courseId} onClose={()=>setCourseId(null)}/>;
  return <Sheet title="Lịch sử điểm tích lũy" onClose={onClose} scrollKey={group.key}>
    <T style={{fontFamily:F.extra,fontSize:23}}>{group.code} · {group.credits} tín chỉ</T><Badge label={reasons[group.reason]}/>
    {stale&&<T style={{color:C.amber}}>Chưa cập nhật được lịch sử; đang giữ bản vừa xem. Đóng và tải lại trước khi đối chiếu.</T>}
    {group.issues.map(issue=><T key={issue} style={{color:C.amber}}>{issues[issue]??issue}</T>)}
    {!!group.otherCredits.length&&<T style={S.small}>Biến thể tín chỉ cùng mã: {group.otherCredits.join(', ')}. Các nhóm cần đối chiếu chưa được tính.</T>}
    {group.attempts.map(a=>{const result=serverGradeView(a.result),p=gradePresentation(result);return <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={`Xem lần học ${a.name} ${a.semesterName} ${a.academicYear}`} onPress={()=>setCourseId(a.id)}><Card style={{backgroundColor:p.attention?p.background:a.use==='SELECTED'?C.soft:C.canvas,gap:10}}><T style={{fontFamily:F.bold}}>{a.name}</T><T style={S.small}>{a.semesterName} · {a.academicYear}</T><Badge label={uses[a.use]} bg={C.card}/><Row between><GradeStatus result={serverGradeView(a.result)}/><T style={{fontFamily:F.extra,fontSize:22,color:p.attention?p.color:C.primary}}>{gradeNumber(a.result.total,1)} /10</T></Row><T style={S.small}>Mở bảng điểm để xem hoặc chỉnh sửa →</T></Card></Pressable>;})}
    <T style={S.small}>Lịch sử F và lần đạt thấp hơn vẫn được giữ. Nhãn ở đây giải thích phép tính của app, không xác nhận nghiệp vụ đăng ký học lại/cải thiện tại trường.</T>
  </Sheet>;
}
