import React,{useState} from 'react';
import {Pressable,StyleSheet,View} from 'react-native';
import {Badge,Button,Card,Empty,Icon,Row,Sheet,T} from '../../shared/components';
import {FlowScope} from '../../navigation/Navigation';
import {C,F,S} from '../../shared/theme';
import {courseResult} from '../grades/grades';
import {CourseGradeDialog} from '../grades/GradesScreen';
import GradeStatus from '../grades/GradeStatus';
import {useAuth} from '../account/auth/AuthProvider';
import {ExamDialog} from '../exams/Exams';
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
import HomeAgenda from './components/HomeAgenda';
import HomeDeadlines from './components/HomeDeadlines';
import HomeWeekStrip from './components/HomeWeekStrip';
import ServerDashboardPomodoro from './components/ServerDashboardPomodoro';

type Panel={kind:'semester'|'grades'|'deadlines'}|{kind:'exam'|'grade';id:string}|null;
export default function Home({onTask,onClass,onStudyPlan}:{onTask:(t:Task)=>void;onClass:(item:ClassItem,date?:string)=>void;onStudyPlan:(date?:string)=>void}){
  const {tasks,getClassesOn,exams,setTab,studySessions,courseCatalog,gradeBook,gradeRules,setScheduleMode,semesters,semesterConnection,prepareFocus,setAcademicSemesterId}=useApp();
  const auth=useAuth();
  const [selectedId,setSelectedId]=useState<string|null>(null),[panel,setPanel]=useState<Panel>(null),now=useDashboardClock();
  const [selectedDay,setSelectedDay]=useState<string|null>(null);
  const today=dateKey(now),monday=addDays(now,-((now.getDay()+6)%7));
  const week=Array.from({length:7},(_,index)=>addDays(monday,index));
  const day=selectedDay&&week.some(date=>dateKey(date)===selectedDay)?selectedDay:today;
  const semester=semesters.find(s=>s.id===selectedId)??semesters.find(s=>s.status==='Đang học')??semesters[0];
  const data=dashboardData({semesterId:semester?.id??'',catalog:courseCatalog,tasks,exams,sessions:studySessions,classes:auth.hasSession?[]:getClassesOn(today),book:gradeBook,rules:gradeRules,now});
  const featuredTask=data.pending[0];
  const classes=day===today?data.classes:auth.hasSession?[]:getClassesOn(day).filter(item=>!item.cancelled&&data.courses.some(course=>course.id===item.courseId));
  const startFocus=()=>{
    const session=data.todaySessions.find(s=>s.status!=='Hoàn thành');
    const task=featuredTask;
    const courseId=session?.courseId??task?.courseId??data.courses[0]?.id;
    if(courseId)prepareFocus({courseId,sessionId:session?.id,taskId:session?session.taskId:task?.id});
    else setTab('focus');
  };
  const openSchedule=(mode:'Môn & học kỳ'|'Bài tập'|'Kỳ thi')=>{setPanel(null);if(semester)setAcademicSemesterId(semester.id);setScheduleMode(mode);};
  const manage=()=>openSchedule('Môn & học kỳ');
  const focusButton=<Button label="Bắt đầu tập trung" icon="play" style={styles.focus} onPress={startFocus}/>;
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
    <HomeAgenda semesterId={semester.id} courses={data.courses} now={now} day={day} weekStart={dateKey(monday)} classes={classes}
      sessions={data.sessions} onClass={onClass} onStudyPlan={onStudyPlan}/>
    <HomeDeadlines semesterId={semester.id} courses={data.courses} task={featuredTask} previewExam={data.nextExam}
      now={now} today={today} connected={auth.hasSession} active={panel===null} onTask={onTask}
      onExam={id=>setPanel({kind:'exam',id})} onViewAll={()=>setPanel({kind:'deadlines'})}/>
    {auth.hasSession
      ? <ServerDashboardSummary semester={semester} data={data} active={panel===null} onGrades={()=>setPanel({kind:'grades'})} onCourse={id=>setPanel({kind:'grade',id})}>{focusButton}</ServerDashboardSummary>
      : <><DashboardSummary data={data} onGrades={()=>setPanel({kind:'grades'})}/>{focusButton}</>}
    {!auth.hasSession&&data.summary.excludedIncomplete>0&&<T style={S.small}>{data.summary.excludedIncomplete} môn chưa có điểm tính GPA (thiếu điểm, chặn thi hoặc chỉ xét đạt/không đạt). Không tự tính điểm thiếu thành 0.</T>}
    {!auth.hasSession&&data.failed.length>0&&<Card style={{backgroundColor:C.redSoft,gap:12}}><Row><Icon name="alert-circle-outline" color={C.red}/><T style={[S.grow,{fontFamily:F.bold,color:C.red}]}>Môn học cần chú ý</T></Row>{data.failed.map(c=><Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`Dashboard: cảnh báo điểm ${c.name}`} onPress={()=>setPanel({kind:'grade',id:c.id})} style={{paddingVertical:8,gap:7}}><Row between><T style={[S.grow,{fontFamily:F.bold,fontSize:13,color:C.red}]}>{c.name}</T><Icon name="chevron-forward" size={17} color={C.red}/></Row><GradeStatus result={courseResult(gradeBook[c.id],gradeRules)}/></Pressable>)}</Card>}
    </>}
    {!data.courses.length&&auth.hasSession&&<><ServerDashboardPomodoro/>{focusButton}</>}
    {panel?.kind==='semester'&&<DashboardSemesterPicker semesters={semesters} selectedId={semester.id} onSelect={id=>{setSelectedId(id);setPanel(null);}} onClose={()=>setPanel(null)} onManage={manage}/>}
    {panel?.kind==='deadlines'&&<Sheet title="Hạn nộp & lịch thi" onClose={()=>setPanel(null)}>
      <Button label="Xem tất cả bài tập" icon="documents-outline" onPress={()=>openSchedule('Bài tập')}/>
      <Button label="Xem lịch thi học kỳ" icon="calendar-outline" secondary onPress={()=>openSchedule('Kỳ thi')}/>
    </Sheet>}
    {panel?.kind==='exam'&&<ExamDialog id={panel.id} onClose={()=>setPanel(null)}/>}
    {panel?.kind==='grade'&&<CourseGradeDialog courseId={panel.id} onClose={()=>setPanel({kind:'grades'})}/>}
    {panel?.kind==='grades'&&(auth.hasSession?<ServerSemesterGradesSheet semesterId={semester.id} onClose={()=>setPanel(null)}/>:<Sheet title="Điểm của học kỳ đang xem" onClose={()=>setPanel(null)}><Badge label={`${semester.name} · ${semester.academicYear}`}/><T style={S.small}>GPA và cảnh báo dùng cùng dữ liệu với bảng điểm môn học.</T>{data.courses.map(c=><Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`Dashboard: bảng điểm ${c.name}`} onPress={()=>setPanel({kind:'grade',id:c.id})}><Card style={{backgroundColor:C.canvas,gap:8}}><Row between><T style={[S.grow,{fontFamily:F.bold,fontSize:14}]}>{c.name}</T><Icon name="chevron-forward" size={16}/></Row><GradeStatus result={courseResult(gradeBook[c.id],gradeRules)}/></Card></Pressable>)}</Sheet>)}
    </>:<><SetupCard/>{auth.hasSession&&<><ServerDashboardPomodoro/>{focusButton}</>}</>}
  </FlowScope>;
}

const styles=StyleSheet.create({
  heading:{fontFamily:F.extra,fontSize:32,lineHeight:42,letterSpacing:-1,color:C.ink},
  semester:{...S.row,minHeight:44,borderRadius:13,paddingHorizontal:10,paddingVertical:4,backgroundColor:C.soft,borderWidth:1,borderColor:C.line},
  semesterName:{fontFamily:F.bold,fontSize:12,lineHeight:18,color:C.primary},
  semesterYear:{fontSize:10,lineHeight:15,color:C.muted},
  focus:{borderRadius:15,minHeight:50},
});
