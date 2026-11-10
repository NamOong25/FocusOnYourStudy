import { AssignmentSyncStatus } from '../assignments/components/AssignmentSyncStatus';
import React,{useState} from 'react';
import {Pressable,StyleSheet,View} from 'react-native';
import {Badge,Button,Card,Empty,Icon,IconTile,Progress,Row,Section,Segments,Sheet,T} from '../../shared/components';
import {FlowScope} from '../../navigation/Navigation';
import {C,F,S} from '../../shared/theme';
import {courseResult} from '../grades/grades';
import {CourseGradeDialog} from '../grades/GradesScreen';
import GradeStatus from '../grades/GradeStatus';
import {useAuth} from '../account/auth/AuthProvider';
import {ExamDialog} from '../exams/Exams';
import {ExamForm} from '../exams/ExamForm';
import SetupCard from '../onboarding/SetupCard';
import {SemesterSyncStatus} from '../academics/components/SemesterSyncStatus';
import {ClassItem,Task,useApp} from '../../store/model';
import {addDays,dateKey,dateLabel,parseDay} from '../../shared/utils/dates';
import {dashboardData} from './dashboard';
import useDashboardClock from './useDashboardClock';
import DashboardSemesterPicker from './components/DashboardSemesterPicker';
import DashboardSummary from './components/DashboardSummary';
import ServerDashboardSummary from './components/ServerDashboardSummary';
import {ServerSemesterGradesSheet} from '../grades/components/ServerGradesScreen';
import NearestExamCard from './components/NearestExamCard';
import ServerExamOverview from '../exams/components/ServerExamOverview';
import HomeAgenda from './components/HomeAgenda';
import HomeWeekStrip from './components/HomeWeekStrip';
import ServerDashboardPomodoro from './components/ServerDashboardPomodoro';
import {taskDeadlineLabel,taskDeadlineTime,taskIsOverdue} from '../assignments/assignments';

type Panel={kind:'semester'|'grades'|'new-exam'}|{kind:'exam'|'grade';id:string}|null;
export default function Home({onTask,onClass,onStudyPlan}:{onTask:(t:Task)=>void;onClass:(item:ClassItem,date?:string)=>void;onStudyPlan:(date?:string)=>void}){
  const {tasks,getClassesOn,exams,setTab,aiSessionIds,studySessions,courseCatalog,gradeBook,gradeRules,setScheduleMode,semesters,semesterConnection,prepareFocus,setAcademicSemesterId}=useApp();
  const auth=useAuth();
  const [selectedId,setSelectedId]=useState<string|null>(null),[filter,setFilter]=useState('Cần làm'),[panel,setPanel]=useState<Panel>(null),now=useDashboardClock();
  const [selectedDay,setSelectedDay]=useState<string|null>(null);
  const today=dateKey(now),monday=addDays(now,-((now.getDay()+6)%7));
  const week=Array.from({length:7},(_,index)=>addDays(monday,index));
  const day=selectedDay&&week.some(date=>dateKey(date)===selectedDay)?selectedDay:today;
  const semester=semesters.find(s=>s.id===selectedId)??semesters.find(s=>s.status==='Đang học')??semesters[0];
  const data=dashboardData({semesterId:semester?.id??'',catalog:courseCatalog,tasks,exams,sessions:studySessions,classes:auth.hasSession?[]:getClassesOn(today),book:gradeBook,rules:gradeRules,now});
  const list=filter==='Quá hạn'?data.overdue:filter==='7 ngày tới'?data.soon:data.pending;
  const accepted=data.sessions.filter(s=>aiSessionIds.includes(s.id)).sort((a,b)=>`${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
  const featuredTask=data.pending.find(task=>task.deadline===day)??(day===today?(data.overdue[0]??data.soon[0]):undefined);
  const featuredLate=!!featuredTask&&taskIsOverdue(featuredTask,now);
  const classes=day===today?data.classes:auth.hasSession?[]:getClassesOn(day).filter(item=>!item.cancelled&&data.courses.some(course=>course.id===item.courseId));
  const startFocus=()=>{
    const session=data.todaySessions.find(s=>s.status!=='Hoàn thành');
    const task=day===today?featuredTask:undefined;
    const courseId=session?.courseId??task?.courseId??data.pending[0]?.courseId??data.courses[0]?.id;
    if(courseId)prepareFocus({courseId,sessionId:session?.id,taskId:session?session.taskId:task?.id});
    else setTab('focus');
  };
  const manage=()=>{setPanel(null);if(semester)setAcademicSemesterId(semester.id);setScheduleMode('Môn & học kỳ');};
  if(semesterConnection&&!semesterConnection.loaded)return <SemesterSyncStatus statusOnly/>;
  return <FlowScope onClose={()=>setPanel(null)}>
    <SemesterSyncStatus statusOnly/>
    <Row between style={{alignItems:'flex-end',flexWrap:'wrap'}}>
      <View style={{gap:2}}><T accessibilityRole="header" style={styles.heading}>{day===today?'Hôm nay':`Ngày ${dateLabel(day)}`}</T>
        <T style={S.small}>{parseDay(day).toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long'})}</T></View>
      {!!semester&&<Pressable testID="dashboard-semester" accessibilityRole="button" accessibilityLabel="Đổi học kỳ trên Trang chủ" onPress={()=>setPanel({kind:'semester'})} style={styles.semester}>
        <View><T style={styles.semesterName}>{semester.name}</T><T style={styles.semesterYear}>{semester.academicYear}</T></View><Icon name="chevron-down" size={14}/>
      </Pressable>}
    </Row>
    {semester?<>
    <HomeWeekStrip days={week} today={today} selected={day} onSelect={date=>setSelectedDay(date===today?null:date)}/>
    {!data.courses.length?<Empty title="Học kỳ này chưa có môn học" message="Thêm môn để xem lịch học, bài tập và GPA của học kỳ." actionLabel="Thêm môn cho học kỳ" onAdd={manage}/>:<>
    {featuredTask&&<Pressable accessibilityRole="button" accessibilityLabel={`Dashboard: hạn nộp ${featuredTask.title}`} onPress={()=>onTask(featuredTask)}
      style={({pressed})=>[styles.featured,featuredLate&&styles.featuredLate,pressed&&{opacity:0.72}]}>
      <IconTile name={featuredLate?'alert-outline':'document-text-outline'} size={38} bg={featuredLate?C.redSoft:'#FFE9B8'} color={featuredLate?C.red:C.amber}/>
      <View style={S.grow}><T style={[styles.eyebrow,featuredLate&&{color:C.red}]}>{featuredLate?'ĐÃ QUÁ HẠN':featuredTask.deadline===today?'HẠN NỘP HÔM NAY':'HẠN NỘP SẮP TỚI'}</T>
        <T style={styles.taskTitle}>{featuredTask.title}</T><T style={S.small}>Hạn nộp {featuredTask.deadline===today?taskDeadlineTime(featuredTask):taskDeadlineLabel(featuredTask,false)}</T></View>
      <Icon name="chevron-forward" size={17} color={featuredLate?C.red:C.amber}/>
    </Pressable>}
    <Button label="Bắt đầu tập trung" icon="play" style={styles.focus} onPress={startFocus}/>
    <HomeAgenda semesterId={semester.id} courses={data.courses} now={now} day={day} weekStart={dateKey(monday)} classes={classes}
      sessions={data.sessions} onClass={onClass} onStudyPlan={onStudyPlan}/>
    {auth.hasSession?<ServerDashboardSummary semester={semester} data={data} active={panel===null} onGrades={()=>setPanel({kind:'grades'})} onCourse={id=>setPanel({kind:'grade',id})}/>:<DashboardSummary data={data} onGrades={()=>setPanel({kind:'grades'})}/>}
    {!auth.hasSession&&data.summary.excludedIncomplete>0&&<T style={S.small}>{data.summary.excludedIncomplete} môn chưa có điểm tính GPA (thiếu điểm, chặn thi hoặc chỉ xét đạt/không đạt). Không tự tính điểm thiếu thành 0.</T>}
    {!auth.hasSession&&data.failed.length>0&&<Card style={{backgroundColor:C.redSoft,gap:12}}><Row><Icon name="alert-circle-outline" color={C.red}/><T style={[S.grow,{fontFamily:F.bold,color:C.red}]}>Môn học cần chú ý</T></Row>{data.failed.map(c=><Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`Dashboard: cảnh báo điểm ${c.name}`} onPress={()=>setPanel({kind:'grade',id:c.id})} style={{paddingVertical:8,gap:7}}><Row between><T style={[S.grow,{fontFamily:F.bold,fontSize:13,color:C.red}]}>{c.name}</T><Icon name="chevron-forward" size={17} color={C.red}/></Row><GradeStatus result={courseResult(gradeBook[c.id],gradeRules)}/></Pressable>)}</Card>}
    <Section title="Lịch thi gần nhất" icon="calendar-outline"/>
    {auth.hasSession ? <ServerExamOverview query={{semesterId:semester.id}} now={now} nearest active={panel===null} onOpen={id=>setPanel({kind:'exam',id})} onAdd={()=>setPanel({kind:'new-exam'})} onViewAll={()=>{setAcademicSemesterId(semester.id);setScheduleMode('Kỳ thi');}}/> : <NearestExamCard exam={data.nextExam} now={now} onOpen={id=>setPanel({kind:'exam',id})} onAdd={()=>setPanel({kind:'new-exam'})}/>}
    <Section title="Việc cần xử lý" icon="documents-outline"/>
    <AssignmentSyncStatus statusOnly/>
    <View style={{gap:7}}><Row between><T testID="dashboard-task-count" style={S.small}>{data.done}/{data.tasks.length} bài tập hoàn tất</T><T testID="dashboard-task-percent" style={styles.semesterName}>{data.tasks.length?`${data.percent}%`:'—'}</T></Row><Progress value={data.percent}/></View>
    <Row style={{flexWrap:'wrap',gap:8}}><Badge label={`${data.overdue.length} quá hạn`} color={data.overdue.length?C.red:C.muted} bg={data.overdue.length?C.redSoft:C.track}/><Badge label={`${data.soon.length} bài trong 7 ngày tới`}/></Row>
    <Segments values={['Cần làm','Quá hạn','7 ngày tới']} value={filter} onChange={setFilter}/>
    {!list.length&&<Empty title={!data.tasks.length?'Chưa có bài tập':!data.pending.length?'Bạn đã hoàn thành các bài tập':filter==='Quá hạn'?'Không có bài tập quá hạn':'Chưa có bài đến hạn trong 7 ngày'} message={!data.tasks.length?'Ghi bài tập cho môn học, rồi quay lại đây để xem tiến độ.':'Danh sách tự cập nhật theo deadline và trạng thái bạn đã lưu.'} actionLabel="Đến danh sách bài tập" onAdd={()=>setScheduleMode('Bài tập')}/>}
    {list.map(task=>{const late=taskIsOverdue(task,now);return <Pressable key={task.id} accessibilityRole="button" accessibilityLabel={`Dashboard: bài tập ${task.title}`} onPress={()=>onTask(task)}><Card style={{padding:15,borderColor:late?C.red:C.line,gap:10}}><Row><IconTile name={late?'alert-outline':'document-text-outline'} bg={late?C.redSoft:C.soft} color={late?C.red:C.primary} size={36}/><View style={[S.grow,{gap:4}]}><T style={{fontFamily:F.bold,fontSize:14,lineHeight:22}}>{task.title}</T><T style={S.small}>{task.course}</T></View><Icon name="chevron-forward" size={17}/></Row><Badge label={`${late?'Trễ hạn':'Hạn'} · ${taskDeadlineLabel(task)}`} color={late?C.red:C.primary} bg={late?C.redSoft:C.soft}/><T style={{fontSize:10,color:C.muted}}>{task.status} · Ưu tiên {task.priority.toLowerCase()}</T></Card></Pressable>;})}
    <Section title="Tự học" icon="timer-outline" action="Xem kế hoạch" onAction={()=>onStudyPlan(day)}/>
    {accepted.length>0&&<Card style={{backgroundColor:C.greenSoft,gap:10}}><T style={{fontFamily:F.bold,color:C.green}}>Kế hoạch tự học đã chọn</T>{accepted.slice(0,3).map(s=><View key={s.id}><T style={{fontFamily:F.semi,fontSize:12}}>{s.title}</T><T style={S.small}>{dateLabel(s.date)} · {s.start} · {s.duration} phút · {s.status}</T></View>)}<Button label={`Xem ${accepted.length} buổi đã duyệt trong lịch tự học`} secondary onPress={onStudyPlan}/></Card>}
    <Button label="Gợi ý từ Trợ lý AI" secondary icon="sparkles-outline" onPress={()=>setTab('ai')}/>
    </>}
    {auth.hasSession&&<ServerDashboardPomodoro/>}
    {panel?.kind==='semester'&&<DashboardSemesterPicker semesters={semesters} selectedId={semester.id} onSelect={id=>{setSelectedId(id);setFilter('Cần làm');setPanel(null);}} onClose={()=>setPanel(null)} onManage={manage}/>}
    {panel?.kind==='exam'&&<ExamDialog id={panel.id} onClose={()=>setPanel(null)}/>}
    {panel?.kind==='new-exam'&&<ExamForm initialCourseId={data.courses[0]?.id} onClose={()=>setPanel(null)} onSaved={id=>setPanel({kind:'exam',id})}/>}
    {panel?.kind==='grade'&&<CourseGradeDialog courseId={panel.id} onClose={()=>setPanel({kind:'grades'})}/>}
    {panel?.kind==='grades'&&(auth.hasSession?<ServerSemesterGradesSheet semesterId={semester.id} onClose={()=>setPanel(null)}/>:<Sheet title="Điểm của học kỳ đang xem" onClose={()=>setPanel(null)}><Badge label={`${semester.name} · ${semester.academicYear}`}/><T style={S.small}>GPA và cảnh báo dùng cùng dữ liệu với bảng điểm môn học.</T>{data.courses.map(c=><Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`Dashboard: bảng điểm ${c.name}`} onPress={()=>setPanel({kind:'grade',id:c.id})}><Card style={{backgroundColor:C.canvas,gap:8}}><Row between><T style={[S.grow,{fontFamily:F.bold,fontSize:14}]}>{c.name}</T><Icon name="chevron-forward" size={16}/></Row><GradeStatus result={courseResult(gradeBook[c.id],gradeRules)}/></Card></Pressable>)}</Sheet>)}
    </>:<><SetupCard/>{auth.hasSession&&<ServerDashboardPomodoro/>}</>}
  </FlowScope>;
}

const styles=StyleSheet.create({
  heading:{fontFamily:F.extra,fontSize:32,lineHeight:42,letterSpacing:-1,color:C.ink},
  semester:{...S.row,minHeight:44,borderRadius:13,paddingHorizontal:10,paddingVertical:4,backgroundColor:'#fff',borderWidth:1,borderColor:C.line},
  semesterName:{fontFamily:F.bold,fontSize:12,lineHeight:18,color:C.primary},
  semesterYear:{fontSize:10,lineHeight:15,color:C.muted},
  featured:{...S.row,gap:11,padding:13,borderRadius:16,backgroundColor:C.amberSoft,borderWidth:1,borderColor:'#F4DCA7'},
  featuredLate:{backgroundColor:'#FFF0ED',borderColor:C.redSoft},
  eyebrow:{fontFamily:F.bold,fontSize:10,lineHeight:15,letterSpacing:0.5,color:C.amber},
  taskTitle:{fontFamily:F.extra,fontSize:16,lineHeight:23},
  focus:{borderRadius:15,minHeight:50},
});
