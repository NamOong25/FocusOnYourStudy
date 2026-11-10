import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {Badge,Button,Card,Icon,Row,Sheet,SheetFlow,StateView,T} from '../../../shared/components';
import {FlowScope,useNavigationScope} from '../../../navigation/Navigation';
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
  const auth=useAuth(),owner=`${auth.revision}:${auth.profile?.id??''}`;
  const read=useCumulativeGpa(useNavigationScope().active);
  const [selection,setSelection]=useState<{owner:string;group?:CumulativeGroup}|null>(null);
  const open=selection?.owner===owner;
  const group=open?selection.group:undefined;
  const currentGroup=group&&read.value?.groups.find(item=>item.key===group.key);
  const current=currentGroup??group;
  const summary=read.value?.summary;
  const close=()=>setSelection(null);
  const overview=()=>setSelection({owner});
  const reload=()=>{void read.reload();};
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Xem chi tiết GPA tích lũy"
      accessibilityHint={summary ? `${gradeNumber(summary.gpa,2).replace('.',',')} trên 4, ${summary.earnedCredits} tín chỉ đạt` : undefined}
      onPress={overview} style={({pressed})=>[S.card,S.grow,{padding:12,gap:5,backgroundColor:pressed?C.canvas:C.card}]}>
      <Row style={{gap:3}}><T style={[S.grow,{fontFamily:F.bold}]}>GPA tích lũy</T><Icon name="chevron-forward" size={15}/></Row>
      {summary ? <>
        <T testID="server-cumulative-gpa" style={{fontFamily:F.extra,fontSize:28,color:C.primary}}>{gradeNumber(summary.gpa,2).replace('.',',')}<T style={S.small}> / 4</T></T>
        <T style={S.small}>{summary.earnedCredits} tín chỉ đạt</T>
        {summary.state!=='COMPLETE'&&<T style={S.small}>{summary.gpa===null?'Chưa đủ dữ liệu':'GPA tạm tính'}</T>}
      </> : <T style={S.small}>{read.error?'Chạm để thử lại':'Đang tải GPA…'}</T>}
    </Pressable>
    {open&&<FlowScope onClose={close}><SheetFlow>
      {current ? <CumulativeHistory key={current.key} group={current} stale={!!read.error||!currentGroup} onClose={close} onBack={overview}/>
        : <Sheet title="GPA tích lũy" onClose={close}>
          {read.error ? <StateView kind="error" title="Chưa tải được GPA tích lũy" message={read.error.message} actionLabel="Thử lại" onAction={reload}/>
            : !summary || !read.value ? <StateView kind="loading" title="Đang đọc GPA tích lũy" message="Đang đối chiếu các lần học đã lưu trong tài khoản."/>
              : <>
                <Card style={{backgroundColor:C.soft,gap:8}}>
                  <T style={{fontFamily:F.extra,fontSize:28,color:C.primary}}>{gradeNumber(summary.gpa,2).replace('.',',')}<T style={S.small}> / 4</T></T>
                  <T style={S.small}>{summary.earnedCredits} tín chỉ đạt · {summary.calculatedCredits} tín chỉ tính GPA · {summary.calculatedGroups}/{summary.registeredGroups} nhóm đã tính</T>
                  <Badge label={summary.state==='COMPLETE'?'Đủ kết quả trong dữ liệu đã nhập':summary.gpa===null?'Chưa đủ dữ liệu':'Tạm tính · Còn dữ liệu cần bổ sung'} bg={C.card}/>
                  {(summary.pendingAttempts>0||summary.reviewGroups>0)&&<T style={S.small}>{summary.pendingAttempts} lần học chưa đủ kết quả · {summary.reviewGroups} nhóm cần đối chiếu.</T>}
                </Card>
                {read.value.groups.length>0 ? <>
                  <T accessibilityRole="header" style={S.title}>Lịch sử các lần học</T>
                  {read.value.groups.map(item=><CumulativeGroupRow key={item.key} group={item} onPress={()=>setSelection({owner,group:item})}/>)}
                </> : <T style={S.small}>Chưa có môn học để tính tích lũy.</T>}
              </>}
          <T style={S.small}>App lấy lần đạt cao nhất theo mã và tín chỉ từ các môn bạn đã nhập. GPA chính thức được xem trên cổng thông tin của trường.</T>
        </Sheet>}
    </SheetFlow></FlowScope>}
  </>;
}

function CumulativeGroupRow({group,onPress}:{group:CumulativeGroup;onPress:()=>void}){
  const selected=group.attempts.find(attempt=>attempt.id===group.selectedCourseId);
  const presentation=selected?gradePresentation(serverGradeView(selected.result)):null;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Lịch sử tích lũy ${group.code} ${group.credits} tín chỉ`} onPress={onPress}>
    <Card style={{backgroundColor:presentation?.attention?presentation.background:C.card,padding:13,gap:6}}>
      <Row between>
        <View style={S.grow}><T style={{fontFamily:F.bold}}>{group.code} · {group.credits} tín chỉ</T><T style={S.small}>{selected?.name??group.attempts[0]?.name}</T></View>
        <Icon name="chevron-forward"/>
      </Row>
      <T style={S.small}>{reasons[group.reason]} · {group.attempts.length} lần học</T>
      <T style={{color:group.included?(presentation?.attention?presentation.color:C.primary):C.amber,fontFamily:F.bold}}>
        {selected?`${gradeNumber(selected.result.total,1)}/10 · ${gradeNumber(selected.result.gradePoint,1)}/4`:'Chưa tính vào GPA'}
      </T>
    </Card>
  </Pressable>;
}

function CumulativeHistory({group,stale,onClose,onBack}:{group:CumulativeGroup;stale:boolean;onClose:()=>void;onBack:()=>void}){
  const [courseId,setCourseId]=useState<string|null>(null);
  if(courseId)return <ServerCourseGradeDialog courseId={courseId} onClose={()=>setCourseId(null)}/>;
  return <Sheet title="Lịch sử điểm tích lũy" onClose={onClose} onBack={onBack} scrollKey={group.key}>
    <T style={{fontFamily:F.extra,fontSize:23}}>{group.code} · {group.credits} tín chỉ</T><Badge label={reasons[group.reason]}/>
    {stale&&<T style={{color:C.amber}}>Chưa cập nhật được lịch sử; đang giữ bản vừa xem. Đóng và tải lại trước khi đối chiếu.</T>}
    {group.issues.map(issue=><T key={issue} style={{color:C.amber}}>{issues[issue]??issue}</T>)}
    {!!group.otherCredits.length&&<T style={S.small}>Biến thể tín chỉ cùng mã: {group.otherCredits.join(', ')}. Các nhóm cần đối chiếu chưa được tính.</T>}
    {group.attempts.map(a=>{const result=serverGradeView(a.result),p=gradePresentation(result);return <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={`Xem lần học ${a.name} ${a.semesterName} ${a.academicYear}`} onPress={()=>setCourseId(a.id)}><Card style={{backgroundColor:p.attention?p.background:a.use==='SELECTED'?C.soft:C.canvas,gap:10}}><T style={{fontFamily:F.bold}}>{a.name}</T><T style={S.small}>{a.semesterName} · {a.academicYear}</T><Badge label={uses[a.use]} bg={C.card}/><Row between><GradeStatus result={serverGradeView(a.result)}/><T style={{fontFamily:F.extra,fontSize:22,color:p.attention?p.color:C.primary}}>{gradeNumber(a.result.total,1)} /10</T></Row><T style={S.small}>Mở bảng điểm để xem hoặc chỉnh sửa →</T></Card></Pressable>;})}
    <T style={S.small}>Lịch sử F và lần đạt thấp hơn vẫn được giữ. Nhãn ở đây giải thích phép tính của app, không xác nhận nghiệp vụ đăng ký học lại/cải thiện tại trường.</T>
  </Sheet>;
}
