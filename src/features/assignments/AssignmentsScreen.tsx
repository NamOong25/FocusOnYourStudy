import { AssignmentSyncStatus } from './components/AssignmentSyncStatus';
import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {FlowScope} from '../../navigation/Navigation';
import {Badge,Button,Empty,Field,IconButton,Row,Section,Segments,Sheet,T} from '../../shared/components';
import {C,F,S} from '../../shared/theme';
import {useApp} from '../../store/model';
import {DeadlineFilter,Task,TaskStatus,filterAssignments} from './assignments';
import AssignmentCard from './components/AssignmentCard';
import DeadlineFilters from './components/DeadlineFilters';
import useCurrentTime from '../../shared/hooks/useCurrentTime';

export default function AssignmentsScreen({onTask,onNewTask}:{onTask:(task:Task)=>void;onNewTask:()=>void}){
  const {tasks,courseCatalog,semesters,academicSemesterId}=useApp();
  const [status,setStatus]=useState<TaskStatus|'Tất cả'>('Tất cả'),[filter,setFilter]=useState(''),[choose,setChoose]=useState<'course'|'semester'|null>(null);
  const [semesterId,setSemesterId]=useState(academicSemesterId);
  const [query,setQuery]=useState(''),[deadlineFilter,setDeadlineFilter]=useState<DeadlineFilter>('Tất cả'),now=useCurrentTime();
  const list=filterAssignments(tasks.filter(task=>!semesterId||courseCatalog.some(course=>course.id===task.courseId&&course.semesterId===semesterId)),courseCatalog,{query,status,courseId:filter,deadline:deadlineFilter},now);
  const hasFilters=!!semesterId||!!query.trim()||!!filter||status!=='Tất cả'||deadlineFilter!=='Tất cả';
  const reset=()=>{setSemesterId('');setQuery('');setFilter('');setStatus('Tất cả');setDeadlineFilter('Tất cả');};
  const selectedCourse=courseCatalog.find(c=>c.id===filter);
  return <FlowScope onClose={()=>setChoose(null)}>
    <View style={{gap:6}}><T style={{fontFamily:F.extra,fontSize:25,lineHeight:35}}>Bài tập & Deadline</T><T style={S.small}>Theo dõi việc cần nộp, mở chi tiết và lên buổi tự học cho từng bài.</T></View>
    <AssignmentSyncStatus/>
    <Button label={semesterId?`Học kỳ bài tập: ${semesters.find(s=>s.id===semesterId)?.name??'Kỳ đã xóa'} · ${semesters.find(s=>s.id===semesterId)?.academicYear??''}`:'Học kỳ bài tập: Tất cả học kỳ'} secondary icon="calendar-outline" onPress={()=>setChoose('semester')}/>
    <Button label="Thêm bài tập mới" icon="add-circle-outline" onPress={onNewTask}/>
    <Row style={{alignItems:'flex-end'}}><View style={S.grow}><Field label="Tìm bài tập" value={query} onChange={setQuery} placeholder="Tên bài, tên môn hoặc mã môn…"/></View>{!!query&&<IconButton name="close" label="Xóa tìm kiếm bài tập" onPress={()=>setQuery('')}/>}</Row>
    <DeadlineFilters value={deadlineFilter} onChange={setDeadlineFilter}/>
    <T style={S.small}>{deadlineFilter==='Sắp hạn'?'Chưa hoàn thành · Từ hiện tại đến cùng giờ sau 7 ngày.':deadlineFilter==='Quá hạn'?'Chưa hoàn thành · Đã qua ngày và giờ hạn nộp.':deadlineFilter==='Hôm nay'?'Tất cả bài đến hạn hôm nay, gồm cả bài đã hoàn thành; kết hợp bộ lọc trạng thái bên dưới.':'Hạn nộp được sắp xếp theo ngày và giờ · Giờ theo thiết bị.'}</T>
    <Section title={`${list.length} bài tập`} icon="clipboard-outline" action="Lọc môn" onAction={()=>setChoose('course')}/>
    {filter&&<Row><View style={S.grow}><Badge label={selectedCourse?.name??'Môn đã xóa'}/><T style={S.small}>{selectedCourse?.code} · {semesters.find(s=>s.id===selectedCourse?.semesterId)?.name}</T></View><Button label="Bỏ lọc môn" secondary onPress={()=>setFilter('')}/></Row>}
    <Segments values={['Tất cả','Chưa làm','Đang làm','Hoàn thành']} value={status} onChange={v=>setStatus(v as TaskStatus|'Tất cả')}/>
    {list.map(task=><AssignmentCard key={task.id} task={task} now={now} onPress={()=>onTask(task)}/>)}
    {!list.length&&<Empty title={!tasks.length?'Chưa có bài tập':hasFilters?'Không tìm thấy bài tập phù hợp':'Chưa có bài tập ở mục này'} message={!tasks.length?'Thêm bài tập đầu tiên để theo dõi hạn nộp và tiến độ.':hasFilters?'Thử từ khóa khác hoặc xóa tìm kiếm và bộ lọc. Các điều kiện đang được kết hợp với nhau.':'Thêm bài tập mới để bắt đầu.'} actionLabel={tasks.length&&hasFilters?'Xóa tìm kiếm và bộ lọc':'Thêm bài tập đầu tiên'} onAdd={tasks.length&&hasFilters?reset:onNewTask}/>}
    {choose==='course'&&<Sheet title="Lọc theo môn học" onClose={()=>setChoose(null)}><Button label="Tất cả môn" secondary={!!filter} onPress={()=>{setFilter('');setChoose(null);}}/>{courseCatalog.filter(c=>!semesterId||c.semesterId===semesterId).map(c=>{const semester=semesters.find(s=>s.id===c.semesterId);return <View key={c.id} style={{gap:4}}><Button label={`${c.name} · ${c.code}`} secondary={filter!==c.id} onPress={()=>{setFilter(c.id);setChoose(null);}}/><T style={[S.small,{paddingHorizontal:10}]}>{semester?.name} · {semester?.academicYear}</T></View>;})}</Sheet>}
    {choose==='semester'&&<Sheet title="Chọn học kỳ bài tập" onClose={()=>setChoose(null)}><Button label="Bài tập tất cả học kỳ" secondary={!!semesterId} onPress={()=>{setSemesterId('');setFilter('');setChoose(null);}}/>{semesters.map(s=><Button key={s.id} label={`Bài tập ${s.name} · ${s.academicYear}`} secondary={semesterId!==s.id} onPress={()=>{setSemesterId(s.id);setFilter('');setChoose(null);}}/>)}</Sheet>}
  </FlowScope>;
}
