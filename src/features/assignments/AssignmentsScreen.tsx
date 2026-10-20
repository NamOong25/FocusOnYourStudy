import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {FlowScope} from '../../navigation/Navigation';
import {Badge,Button,Card,Empty,Icon,Row,Section,Segments,Sheet,T} from '../../shared/components';
import {C,F,S} from '../../shared/theme';
import {Task,TaskStatus,dateLabel,dueLabel,useApp} from '../../store/model';

export default function AssignmentsScreen({onTask,onNewTask}:{onTask:(task:Task)=>void;onNewTask:()=>void}){
  const {tasks,courseCatalog,semesters}=useApp();
  const [status,setStatus]=useState<TaskStatus|'Tất cả'>('Tất cả'),[filter,setFilter]=useState(''),[choose,setChoose]=useState(false);
  const list=tasks.filter(t=>(status==='Tất cả'||t.status===status)&&(!filter||t.courseId===filter)).sort((a,b)=>a.deadline.localeCompare(b.deadline));
  const selectedCourse=courseCatalog.find(c=>c.id===filter);
  return <FlowScope onClose={()=>setChoose(false)}>
    <View style={{gap:6}}><T style={{fontFamily:F.extra,fontSize:25,lineHeight:35}}>Bài tập & Deadline</T><T style={S.small}>Theo dõi việc cần nộp, mở chi tiết và lên buổi tự học cho từng bài.</T></View>
    <Button label="Thêm bài tập mới" icon="add-circle-outline" onPress={onNewTask}/>
    <Section title={`${list.length} bài tập`} icon="clipboard-outline" action="Lọc môn" onAction={()=>setChoose(true)}/>
    {filter&&<Row><View style={S.grow}><Badge label={selectedCourse?.name??'Môn đã xóa'}/><T style={S.small}>{selectedCourse?.code} · {semesters.find(s=>s.id===selectedCourse?.semesterId)?.name}</T></View><Button label="Bỏ lọc môn" secondary onPress={()=>setFilter('')}/></Row>}
    <Segments values={['Tất cả','Chưa làm','Đang làm','Hoàn thành']} value={status} onChange={v=>setStatus(v as TaskStatus|'Tất cả')}/>
    {list.map(task=><Pressable key={task.id} accessibilityRole="button" accessibilityLabel={`Mở bài tập ${task.title}`} onPress={()=>onTask(task)}><Card style={{gap:11}}><Row between><Badge label={`Ưu tiên ${task.priority.toLowerCase()}`} bg={task.priority==='Cao'?C.redSoft:C.soft} color={task.priority==='Cao'?C.red:C.primary} icon="flag-outline"/><T style={{color:task.status==='Hoàn thành'?C.green:C.red,fontFamily:F.semi,fontSize:11}}>{task.status==='Hoàn thành'?'Đã hoàn thành':dueLabel(task.deadline)}</T></Row><T style={{fontFamily:F.bold,fontSize:17,lineHeight:25}}>{task.title}</T><T style={{fontSize:11,color:C.primary}}>{task.course}</T><T numberOfLines={2} style={{fontSize:12,lineHeight:20,color:C.muted}}>{task.notes||'Chưa có ghi chú'}</T><Row between><Row><Icon name="calendar-outline" size={14}/><T style={S.small}>Hạn nộp: {dateLabel(task.deadline)}</T></Row><Badge label={task.status}/></Row></Card></Pressable>)}
    {!list.length&&<Empty title={tasks.length?'Chưa có bài tập ở mục này':'Chưa có bài tập'} message={tasks.length?'Thử đổi trạng thái hoặc bỏ lọc môn để xem các bài khác.':'Thêm bài tập đầu tiên để theo dõi hạn nộp và tiến độ.'} onAdd={onNewTask}/>}
    {choose&&<Sheet title="Lọc theo môn học" onClose={()=>setChoose(false)}><Button label="Tất cả môn" secondary={!!filter} onPress={()=>{setFilter('');setChoose(false);}}/>{courseCatalog.map(c=>{const semester=semesters.find(s=>s.id===c.semesterId);return <View key={c.id} style={{gap:4}}><Button label={`${c.name} · ${c.code}`} secondary={filter!==c.id} onPress={()=>{setFilter(c.id);setChoose(false);}}/><T style={[S.small,{paddingHorizontal:10}]}>{semester?.name} · {semester?.academicYear}</T></View>;})}</Sheet>}
  </FlowScope>;
}
