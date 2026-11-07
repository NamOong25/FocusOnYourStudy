import React,{useState} from 'react';
import {View} from 'react-native';
import {Badge,Button,Card,IconTile,Row,Sheet,StateView,T} from '../../../shared/components';
import {C,F,S} from '../../../shared/theme';
import {useApp} from '../../../store/model';
import {useAuth} from '../../account/auth/AuthProvider';
import {CourseChoices} from '../../academics/CourseChoices';
import {usePomodoro,usePomodoroClock} from '../api/PomodoroProvider';
import {pomodoroRemaining} from '../api/PomodoroManager';
import {newPomodoroRequestId} from '../api/pomodoroCommand';
import type {PomodoroAction} from '../api/pomodoroApi';
import FocusTimerFace from './FocusTimerFace';
import {useFeedback} from '../../../shared/feedback/FeedbackProvider';
import {asApiError} from '../../../shared/api/http';
import ServerFocusInsights from './ServerFocusInsights';

export default function ServerFocusScreen({onStudyPlan}:{onStudyPlan:()=>void}){
  const {manager,state}=usePomodoro(),clock=usePomodoroClock(),auth=useAuth(),{showNotice}=useFeedback();
  const app=useApp(),{courseCatalog,focusCourseId,focusTaskId,focusSessionId,tasks,studySessions,prepareFocus,setScheduleMode}=app;
  const [choose,setChoose]=useState(false),[cancel,setCancel]=useState<{id:string;version:number;name:string}|null>(null);
  const row=state.active?.row,course=courseCatalog.find(c=>c.id===focusCourseId),plan=studySessions.find(s=>s.id===focusSessionId),task=tasks.find(t=>t.id===(plan?.taskId??focusTaskId));
  const millis=pomodoroRemaining(state.active,clock),due=!!row&&row.status==='RUNNING'&&millis===0;
  const sources=[app.semesterConnection,app.courseConnection,app.assignmentConnection,app.studyConnection];
  const catalogReady=sources.every(source=>!source||source.loaded&&!source.loading&&!source.error);
  const ready=!!manager&&state.loaded&&!state.loading&&!state.busy&&!state.needsReload&&!state.error;
  const canWrite=ready&&!state.pending;
  const perform=(operation:()=>Promise<unknown>)=>{void Promise.resolve().then(operation).catch(e=>showNotice(asApiError(e).message));};
  const reload=()=>{if(manager)perform(()=>Promise.allSettled([manager.reload(),...sources.map(source=>source?.reload())]));};
  const change=(kind:PomodoroAction)=>{if(manager&&row)perform(()=>manager.change(kind,row.id,row.version));};
  const start=()=>{if(manager&&course)perform(()=>manager.start({clientRequestId:newPomodoroRequestId(),courseId:course.id,assignmentId:task?.id??null,studySessionId:plan?.id??null,timeZone:auth.profile?.timeZone??'Asia/Ho_Chi_Minh'}));};
  const label=!state.loaded?'ĐANG ĐỌC PHIÊN':state.busy?'ĐANG XÁC NHẬN':state.pending?'CHỜ ĐỐI CHIẾU':state.needsReload?'CHƯA ĐỒNG BỘ':due?'CHỜ XÁC NHẬN HOÀN TẤT':row?.status==='PAUSED'?'ĐANG TẠM DỪNG':row?'ĐANG TẬP TRUNG':'SẴN SÀNG TẬP TRUNG';
  const pendingName=state.pending?.kind==='start'?'bắt đầu':state.pending?.kind==='pause'?'tạm dừng':state.pending?.kind==='resume'?'tiếp tục':state.pending?.kind==='cancel'?'hủy phiên':'hoàn tất';
  return <>
    <Card style={{gap:12}}><Row style={{gap:12}}><IconTile name="flame-outline" size={48}/><View style={S.grow}><T style={{fontFamily:F.bold,fontSize:17}}>Một khoảng tập trung</T><T style={S.small}>Phiên 25 phút · Lưu trong tài khoản</T></View></Row></Card>
    {!!state.error&&<Card style={{gap:10}}><T accessibilityRole="alert" style={{color:C.red}}>{state.error.message}</T><T style={S.small}>Kiểm tra phiên đã lưu trước khi thao tác tiếp. Đồng hồ chưa được công nhận hoàn tất khi chưa có xác nhận.</T></Card>}
    {state.pending&&!state.busy&&<Card style={{backgroundColor:C.soft,gap:12}}><T style={{fontFamily:F.bold}}>Yêu cầu {pendingName} cần đối chiếu</T><T style={S.small}>Thông tin yêu cầu cũ được giữ trên thiết bị. Gửi lại sẽ dùng đúng yêu cầu đó.</T><Button label="Đối chiếu phiên đã lưu" secondary disabled={state.busy||state.loading} loading={state.loading} onPress={reload}/><Button label={`Gửi lại yêu cầu ${pendingName}`} disabled={!ready} onPress={()=>manager&&perform(()=>manager.retry())}/></Card>}
    {!state.loaded?<StateView title={state.error?'Chưa đọc được phiên học':'Đang kiểm tra phiên đã lưu'} message="Khôi phục phiên đang chạy hoặc tạm dừng trong tài khoản." kind={state.error?'error':'loading'}/>:<>
      {(row||course)&&<Card style={{gap:12}}><Row between><T style={{fontSize:10,color:C.muted,fontFamily:F.semi,letterSpacing:1}}>NỘI DUNG TẬP TRUNG</T>{!row&&<Button label="Chọn môn" secondary disabled={!canWrite||!catalogReady} onPress={()=>setChoose(true)}/>}</Row><T testID="server-pomodoro-course" style={{fontFamily:F.bold,fontSize:17}}>{row?.context.courseName??course?.name}</T><T style={S.small}>{row?.context.studyTitle??row?.context.assignmentTitle??plan?.title??task?.title??'Chọn một việc nhỏ và bắt đầu.'}</T>{row&&<T style={S.small}>{row.context.courseCode} · Học kỳ {row.context.semesterTerm===3?'hè':row.context.semesterTerm} · {row.context.semesterStartYear}–{row.context.semesterStartYear+1}</T>}</Card>}
      {row&&course&&row.context.courseId!==course.id&&<T style={S.small}>Phiên hiện tại vẫn thuộc {row.context.courseName}. Hoàn tất hoặc hủy phiên trước khi bắt đầu {course.name}.</T>}
      {!row&&!course?<StateView title="Chọn một môn để bắt đầu" message="Thêm học kỳ và môn học, sau đó quay lại Tập trung." actionLabel="Đến Môn & học kỳ" onAction={()=>setScheduleMode('Môn & học kỳ')}/>:<>
        <FocusTimerFace milliseconds={millis} label={label} stale={state.needsReload||!!state.pending} caption={row?.status==='PAUSED'?'Thời gian tạm dừng được loại trừ':due?'Đã hết giờ trên đồng hồ, đang chờ xác nhận phiên đã lưu.':row?'Giữ phiên khi đổi màn hình hoặc tải lại trang.':'Chọn nội dung rồi bắt đầu 25 phút học.'}/>
        <Row style={{gap:10,justifyContent:'center'}}>{row?<>
          <Button label={due?'Xác nhận hoàn tất':row.status==='RUNNING'?'Tạm dừng':'Tiếp tục'} loading={state.busy} disabled={!canWrite} icon={due?'checkmark':row.status==='RUNNING'?'pause':'play'} onPress={()=>change(due?'complete':row.status==='RUNNING'?'pause':'resume')}/>
          {!due&&<Button label="Hủy phiên" secondary disabled={!canWrite} onPress={()=>setCancel({id:row.id,version:row.version,name:row.context.courseName})}/>}
        </>:<Button label="Bắt đầu tập trung" icon="play" loading={state.busy} disabled={!canWrite||!catalogReady} onPress={start}/>}</Row>
      </>}
    </>}
    {!state.pending&&<Button label="Đối chiếu phiên đã lưu" secondary icon="refresh-outline" loading={state.loading} disabled={state.busy||state.loading} onPress={reload}/>}
    {!!state.notice&&<T accessibilityLiveRegion="polite" testID="server-pomodoro-notice" style={{color:C.primary,lineHeight:22}}>{state.notice}</T>}
    {state.last&&<Card style={{gap:9,backgroundColor:state.last.status==='COMPLETED'?C.greenSoft:C.canvas}}><Badge label={state.last.status==='COMPLETED'?'ĐÃ LƯU HOÀN TẤT':'ĐÃ LƯU HỦY PHIÊN'}/><T style={{fontFamily:F.bold}}>{state.last.context.courseName}</T><T style={S.small}>{state.last.status==='COMPLETED'?'25 phút học được công nhận.':'Phần học dở được giữ để tra cứu, không cộng vào phút học hoàn tất.'}</T></Card>}
    <T style={S.small}>Tạm dừng để học tiếp cùng phiên. Khi cần đổi nội dung, hãy hoàn tất hoặc hủy phiên hiện tại.</T>
    <ServerFocusInsights/>
    <Button label="Xem kế hoạch tự học" secondary icon="calendar-outline" onPress={onStudyPlan}/>
    {choose&&<Sheet title="Chọn môn để tập trung" onClose={()=>setChoose(false)}><CourseChoices disabled={!canWrite||!!row} value={focusCourseId} onChange={id=>{prepareFocus({courseId:id});setChoose(false);}}/></Sheet>}
    {cancel&&<Sheet title="Hủy phiên đang học?" onClose={()=>setCancel(null)}><T style={{lineHeight:23}}>Phiên {cancel.name} sẽ kết thúc. Phần học dở được giữ để tra cứu và không cộng vào phút học hoàn tất.</T>{(row?.id!==cancel.id||row.version!==cancel.version)&&<T accessibilityRole="alert" style={{color:C.red}}>Phiên đã thay đổi. Đóng bảng này và kiểm tra lại.</T>}<Button label="Giữ phiên học" secondary onPress={()=>setCancel(null)}/><Button label="Xác nhận hủy phiên" danger loading={state.busy} disabled={!canWrite||row?.id!==cancel.id||row.version!==cancel.version||due} onPress={()=>{if(manager){const target=cancel;setCancel(null);perform(()=>manager.change('cancel',target.id,target.version));}}}/></Sheet>}
  </>;
}
