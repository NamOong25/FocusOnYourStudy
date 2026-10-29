import { AssignmentSyncStatus } from '../assignments/components/AssignmentSyncStatus';
import { StudySyncStatus } from '../study/components/StudySyncStatus';
import React,{useState} from 'react';
import {Image,Pressable,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Badge,Button,Card,Empty,Icon,IconTile,Progress,Row,Section,Segments,Sheet,T} from '../../shared/components';
import {FlowScope} from '../../navigation/Navigation';
import {C,F,S} from '../../shared/theme';
import {courseResult} from '../grades/grades';
import {CourseGradeDialog} from '../grades/GradesScreen';
import GradeStatus from '../grades/GradeStatus';
import {StudentAvatar} from '../account/components';
import {useAuth} from '../account/auth/AuthProvider';
import {accountDisplayProfile} from '../account/auth/displayProfile';
import {ExamDialog} from '../exams/Exams';
import {ExamForm} from '../exams/ExamForm';
import SetupCard from '../onboarding/SetupCard';
import {SemesterSyncStatus} from '../academics/components/SemesterSyncStatus';
import {ClassItem,Task,dateKey,dateLabel,useApp} from '../../store/model';
import {dashboardData} from './dashboard';
import useDashboardClock from './useDashboardClock';
import DashboardSemesterPicker from './components/DashboardSemesterPicker';
import DashboardSummary from './components/DashboardSummary';
import ServerDashboardSummary from './components/ServerDashboardSummary';
import {ServerSemesterGradesSheet} from '../grades/components/ServerGradesScreen';
import NearestExamCard from './components/NearestExamCard';
import ServerExamOverview from '../exams/components/ServerExamOverview';
import HomeServerSchedule from './components/HomeServerSchedule';
import ServerDashboardPomodoro from './components/ServerDashboardPomodoro';
import {taskDeadlineLabel,taskIsOverdue} from '../assignments/assignments';

type Panel={kind:'semester'|'grades'|'new-exam'}|{kind:'exam'|'grade';id:string}|null;
export default function Home({onTask,onClass,onProfile,onStudyPlan}:{onTask:(t:Task)=>void;onClass:(item:ClassItem,date?:string)=>void;onProfile:()=>void;onStudyPlan:()=>void}){
  const {tasks,getClassesOn,exams,setTab,aiSessionIds,studySessions,courseCatalog,gradeBook,gradeRules,profile,previewSignedIn,setScheduleMode,semesters,semesterConnection,prepareFocus,setAcademicSemesterId}=useApp();
  const auth=useAuth(),displayProfile=auth.hasSession?accountDisplayProfile(auth.profile):profile;
  const displayName=auth.hasSession?displayProfile.name:previewSignedIn?profile.name:'Bạn học';
  const [selectedId,setSelectedId]=useState<string|null>(null),[filter,setFilter]=useState('Cần làm'),[panel,setPanel]=useState<Panel>(null),now=useDashboardClock();
  const semester=semesters.find(s=>s.id===selectedId)??semesters.find(s=>s.status==='Đang học')??semesters[0];
  const data=dashboardData({semesterId:semester?.id??'',catalog:courseCatalog,tasks,exams,sessions:studySessions,classes:getClassesOn(dateKey(now)),book:gradeBook,rules:gradeRules,now});
  const list=filter==='Quá hạn'?data.overdue:filter==='7 ngày tới'?data.soon:data.pending;
  const accepted=data.sessions.filter(s=>aiSessionIds.includes(s.id)).sort((a,b)=>`${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
  const hour=now.getHours(),time=`${String(hour).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const manage=()=>{setPanel(null);if(semester)setAcademicSemesterId(semester.id);setScheduleMode('Môn & học kỳ');};
  if(semesterConnection&&!semesterConnection.loaded)return <>{auth.hasSession&&<ServerDashboardPomodoro/>}<SemesterSyncStatus/></>;
  if(!semester)return <>{auth.hasSession&&<ServerDashboardPomodoro/>}<SemesterSyncStatus/><SetupCard/></>;
  return <FlowScope onClose={()=>setPanel(null)}>
    <SemesterSyncStatus/><AssignmentSyncStatus/><StudySyncStatus/>
    <Pressable accessibilityRole="button" accessibilityLabel="Xem hồ sơ" onPress={onProfile} style={[S.row,{gap:11}]}><StudentAvatar profile={displayProfile} size={46}/><View style={S.grow}><T style={S.small}>{hour<12?'Chào buổi sáng':hour<18?'Chào buổi chiều':'Chào buổi tối'} ☀️</T><T style={{fontFamily:F.bold,fontSize:18}}>{displayName}</T></View><T style={{fontSize:11,color:C.muted}}>{dateLabel(data.today)}</T></Pressable>
    <Pressable testID="dashboard-semester" accessibilityRole="button" accessibilityLabel="Đổi học kỳ trên Trang chủ" onPress={()=>setPanel({kind:'semester'})} style={{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:20,padding:15}}><Row><IconTile name="calendar-outline" size={39}/><View style={[S.grow,{gap:4}]}><T style={{fontSize:10,color:C.muted}}>BẠN ĐANG XEM</T><T style={{fontFamily:F.bold,fontSize:16}}>{semester.name}</T><T style={{fontSize:12,color:C.muted}}>Năm học {semester.academicYear}</T></View><Icon name="chevron-down" size={19}/></Row></Pressable>
    {auth.hasSession&&<ServerDashboardPomodoro/>}
    {!data.courses.length?<Empty title="Học kỳ này chưa có môn học" message="Thêm môn vào học kỳ vừa chọn để bắt đầu xem lịch, công việc và điểm." actionLabel="Thêm môn cho học kỳ" onAdd={manage}/>:<>
    <LinearGradient colors={['#6650DF','#8A76ED','#A89AF7']} start={{x:0,y:0}} end={{x:1,y:1}} style={{padding:21,borderRadius:25,gap:16}}><Row between><Badge label="NHỊP HỌC CỦA BẠN" color="#fff" bg="#FFFFFF25"/><Image source={require('../../../assets/books.png')} style={{width:46,height:46,borderRadius:15}}/></Row><T style={{fontFamily:F.extra,fontSize:23,lineHeight:33,color:'#fff'}}>{data.overdue.length?`${data.overdue.length} bài đang chờ bạn xử lý`:data.pending.length?'Mỗi việc nhỏ, một bước tiến':'Một khoảng thảnh thơi để học tốt hơn'}</T><T style={{fontSize:12,lineHeight:20,color:'#F3EFFF'}}>{data.courses.length} môn · {data.courses.reduce((s,c)=>s+c.credits,0)} tín chỉ · {data.pending.length} bài chưa hoàn thành</T><View style={{gap:8}}><Row between><T style={{fontSize:11,color:'#F5F0FF'}}>Tiến độ bài tập trong học kỳ</T><T style={{fontFamily:F.bold,color:'#fff',fontSize:12}}>{data.done}/{data.tasks.length}</T></Row><Progress value={data.percent} white/></View><Button label="Tiếp tục học ngay" icon="play" secondary style={{backgroundColor:'#fff'}} onPress={()=>{const session=data.todaySessions.find(s=>s.status!=='Hoàn thành'),courseId=session?.courseId??data.pending[0]?.courseId??data.courses[0]!.id;prepareFocus({courseId,sessionId:session?.id,taskId:session?.taskId});}}/></LinearGradient>
    {auth.hasSession?<ServerDashboardSummary semester={semester} data={data} active={panel===null} onGrades={()=>setPanel({kind:'grades'})} onCourse={id=>setPanel({kind:'grade',id})}/>:<DashboardSummary data={data} onGrades={()=>setPanel({kind:'grades'})}/>}
    {!auth.hasSession&&data.summary.excludedIncomplete>0&&<T style={S.small}>{data.summary.excludedIncomplete} môn chưa có điểm tính GPA (thiếu điểm, chặn thi hoặc chỉ xét đạt/không đạt). Không tự tính điểm thiếu thành 0.</T>}
    {!auth.hasSession&&data.failed.length>0&&<Card style={{backgroundColor:C.redSoft,gap:12}}><Row><Icon name="alert-circle-outline" color={C.red}/><T style={[S.grow,{fontFamily:F.bold,color:C.red}]}>Môn học cần chú ý</T></Row>{data.failed.map(c=><Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`Dashboard: cảnh báo điểm ${c.name}`} onPress={()=>setPanel({kind:'grade',id:c.id})} style={{paddingVertical:8,gap:7}}><Row between><T style={[S.grow,{fontFamily:F.bold,fontSize:13,color:C.red}]}>{c.name}</T><Icon name="chevron-forward" size={17} color={C.red}/></Row><GradeStatus result={courseResult(gradeBook[c.id],gradeRules)}/></Pressable>)}</Card>}
    <Section title="Lịch thi gần nhất" icon="calendar-outline"/>
    {auth.hasSession ? <ServerExamOverview query={{semesterId:semester.id}} now={now} nearest active={panel===null} onOpen={id=>setPanel({kind:'exam',id})} onAdd={()=>setPanel({kind:'new-exam'})} onViewAll={()=>{setAcademicSemesterId(semester.id);setScheduleMode('Kỳ thi');}}/> : <NearestExamCard exam={data.nextExam} now={now} onOpen={id=>setPanel({kind:'exam',id})} onAdd={()=>setPanel({kind:'new-exam'})}/>}
    {auth.hasSession?<HomeServerSchedule semesterId={semester.id} now={now}/>:<>
    <Section title="Lịch học hôm nay" icon="time-outline"/>
    <T style={S.small}>{now.toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})} · Theo học kỳ đang chọn</T>
    {data.classes.length?data.classes.map(item=>{const state=time>=item.end?'Đã học':time>=item.start?'Đang học':'Sắp học';return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Dashboard: ca học ${item.title} ${item.start}`} onPress={()=>onClass(item,data.today)}><Card style={{padding:15,gap:11}}><Row><View style={{backgroundColor:C.soft,padding:10,borderRadius:15,gap:3}}><T style={{fontFamily:F.bold,color:C.primary}}>{item.start}</T><T style={{fontSize:10,color:C.muted}}>{item.end}</T></View><View style={[S.grow,{gap:5}]}><T style={{fontFamily:F.bold,fontSize:14,lineHeight:21}}>{item.title}</T><T style={S.small}>Phòng {item.room}</T></View><Icon name="chevron-forward" size={17}/></Row><Row between><T style={S.small}>{item.changed?'Buổi học đã điều chỉnh':'Theo lịch lặp'}</T><Badge label={state} bg={state==='Đang học'?C.greenSoft:C.track} color={state==='Đang học'?C.green:C.muted}/></Row></Card></Pressable>;}):<Empty title="Hôm nay không có ca học" message="Không có buổi học trong học kỳ này hôm nay, hoặc buổi học đã được nghỉ."/>}
    </>}
    <Section title="Việc cần xử lý" icon="documents-outline"/>
    <Row style={{flexWrap:'wrap',gap:8}}><Badge label={`${data.overdue.length} quá hạn`} color={data.overdue.length?C.red:C.muted} bg={data.overdue.length?C.redSoft:C.track}/><Badge label={`${data.soon.length} bài trong 7 ngày tới`}/></Row>
    <Segments values={['Cần làm','Quá hạn','7 ngày tới']} value={filter} onChange={setFilter}/>
    {!list.length&&<Empty title={!data.tasks.length?'Chưa có bài tập':!data.pending.length?'Bạn đã hoàn thành các bài tập':filter==='Quá hạn'?'Không có bài tập quá hạn':'Chưa có bài đến hạn trong 7 ngày'} message={!data.tasks.length?'Ghi bài tập cho môn học, rồi quay lại đây để xem tiến độ.':'Danh sách tự cập nhật theo deadline và trạng thái bạn đã lưu.'} actionLabel="Đến danh sách bài tập" onAdd={()=>setScheduleMode('Bài tập')}/>}
    {list.map(task=>{const late=taskIsOverdue(task,now);return <Pressable key={task.id} accessibilityRole="button" accessibilityLabel={`Dashboard: bài tập ${task.title}`} onPress={()=>onTask(task)}><Card style={{padding:15,borderColor:late?C.red:C.line,gap:10}}><Row><IconTile name={late?'alert-outline':'document-text-outline'} bg={late?C.redSoft:C.soft} color={late?C.red:C.primary} size={36}/><View style={[S.grow,{gap:4}]}><T style={{fontFamily:F.bold,fontSize:14,lineHeight:22}}>{task.title}</T><T style={S.small}>{task.course}</T></View><Icon name="chevron-forward" size={17}/></Row><Badge label={`${late?'Trễ hạn':'Hạn'} · ${taskDeadlineLabel(task)}`} color={late?C.red:C.primary} bg={late?C.redSoft:C.soft}/><T style={{fontSize:10,color:C.muted}}>{task.status} · Ưu tiên {task.priority.toLowerCase()}</T></Card></Pressable>;})}
    <Section title="Tự học hôm nay" icon="timer-outline" action="Xem kế hoạch" onAction={onStudyPlan}/>
    {data.todaySessions.length?data.todaySessions.map(session=><Card key={session.id} style={{gap:10,backgroundColor:C.canvas}}><Row between><Badge label={`${session.start} · ${session.duration} phút`}/><T style={{fontSize:10,color:C.muted}}>{session.status}</T></Row><T style={{fontFamily:F.bold,fontSize:14,lineHeight:22}}>{session.title}</T>{session.status!=='Hoàn thành'&&<Button label={`Tập trung: ${session.title}`} secondary onPress={()=>prepareFocus({courseId:session.courseId,sessionId:session.id,taskId:session.taskId})}/>}</Card>):<Empty title="Chưa có buổi tự học hôm nay" message="Dành một khoảng thời gian ngắn cho môn cần ôn tập." actionLabel="Lên kế hoạch tự học" onAdd={onStudyPlan}/>}
    {accepted.length>0&&<Card style={{backgroundColor:C.greenSoft,gap:10}}><T style={{fontFamily:F.bold,color:C.green}}>Kế hoạch tự học đã chọn</T>{accepted.slice(0,3).map(s=><View key={s.id}><T style={{fontFamily:F.semi,fontSize:12}}>{s.title}</T><T style={S.small}>{dateLabel(s.date)} · {s.start} · {s.duration} phút · {s.status}</T></View>)}<Button label={`Xem ${accepted.length} buổi đã duyệt trong lịch tự học`} secondary onPress={onStudyPlan}/></Card>}
    <Button label="Gợi ý từ Trợ lý AI" secondary icon="sparkles-outline" onPress={()=>setTab('ai')}/>
    </>}
    {panel?.kind==='semester'&&<DashboardSemesterPicker semesters={semesters} selectedId={semester.id} onSelect={id=>{setSelectedId(id);setFilter('Cần làm');setPanel(null);}} onClose={()=>setPanel(null)} onManage={manage}/>}
    {panel?.kind==='exam'&&<ExamDialog id={panel.id} onClose={()=>setPanel(null)}/>}
    {panel?.kind==='new-exam'&&<ExamForm initialCourseId={data.courses[0]?.id} onClose={()=>setPanel(null)} onSaved={id=>setPanel({kind:'exam',id})}/>}
    {panel?.kind==='grade'&&<CourseGradeDialog courseId={panel.id} onClose={()=>setPanel({kind:'grades'})}/>}
    {panel?.kind==='grades'&&(auth.hasSession?<ServerSemesterGradesSheet semesterId={semester.id} onClose={()=>setPanel(null)}/>:<Sheet title="Điểm của học kỳ đang xem" onClose={()=>setPanel(null)}><Badge label={`${semester.name} · ${semester.academicYear}`}/><T style={S.small}>GPA và cảnh báo dùng cùng dữ liệu với bảng điểm môn học.</T>{data.courses.map(c=><Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`Dashboard: bảng điểm ${c.name}`} onPress={()=>setPanel({kind:'grade',id:c.id})}><Card style={{backgroundColor:C.canvas,gap:8}}><Row between><T style={[S.grow,{fontFamily:F.bold,fontSize:14}]}>{c.name}</T><Icon name="chevron-forward" size={16}/></Row><GradeStatus result={courseResult(gradeBook[c.id],gradeRules)}/></Card></Pressable>)}</Sheet>)}
  </FlowScope>;
}
