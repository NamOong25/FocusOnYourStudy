import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {Badge,Button,Card,Icon,IconButton,Progress,Row,Sheet,StateView,T} from '../../../shared/components';
import {useNavigationScope} from '../../../navigation/Navigation';
import {useApp} from '../../../store/model';
import {C,F,S} from '../../../shared/theme';
import {resolveGpaPair,orderedGpaSemesters} from '../../grades/gpaComparison';
import {useGpaCatalog} from '../../grades/api/useServerGpa';
import {useServerSemesterGrades} from '../../grades/api/useServerGrades';
import {gradeNumber} from '../../grades/serverGradeView';
import {serverGpaDifference,semesterGpaCaption} from '../../grades/serverGpaView';
import {ServerSemesterGradesSheet} from '../../grades/components/ServerGradesScreen';

export default function ServerGpaComparison(){
  const catalog=useGpaCatalog(),{setScheduleMode}=useApp(),[selected,setSelected]=useState<{base?:string;target?:string}>({});
  const [picker,setPicker]=useState<'base'|'target'|null>(null),[opened,setOpened]=useState<string|null>(null);
  const {base,target}=resolveGpaPair(catalog.semesters,selected),active=useNavigationScope().active&&opened===null&&catalog.ready;
  const query=(s:typeof base)=>s?{semesterId:s.id,semesterVersion:s.version??-1,courses:catalog.courseCatalog.filter(c=>c.semesterId===s.id)}:null;
  const a=useServerSemesterGrades(query(base),active),b=useServerSemesterGrades(query(target),active);
  const reload=()=>{void Promise.allSettled([catalog.reloadCatalog(),a.reload(),b.reload()]);};
  if(opened)return <ServerSemesterGradesSheet semesterId={opened} onClose={()=>setOpened(null)}/>;
  if(catalog.error)return <StateView kind="error" title="Chưa tải được danh sách học kỳ" message={catalog.error.message} actionLabel="Thử lại" onAction={reload}/>;
  if(!catalog.ready)return <StateView kind="loading" title="Đang đọc học kỳ" message="Đang tải danh mục trong tài khoản."/>;
  if(!base)return <StateView title="Chưa có học kỳ để so sánh" message="Tạo học kỳ và thêm môn trước khi theo dõi GPA." actionLabel="Quản lý học kỳ" onAction={()=>setScheduleMode('Môn & học kỳ')}/>;
  const error=a.error??b.error,loaded=!!a.value&&(!target||!!b.value),difference=a.value&&b.value?serverGpaDifference(a.value.summary,b.value.summary):null;
  return <>
    <Row between><View style={S.grow}><T style={{fontFamily:F.extra,fontSize:26}}>So sánh GPA</T><T style={S.small}>Điểm từng học kỳ từ tài khoản</T></View><Button label="Cập nhật so sánh GPA" secondary disabled={a.loading||b.loading} onPress={reload}/></Row>
    {!target&&<StateView title="Thêm học kỳ thứ hai để so sánh" message="Bạn có thể mở điểm học kỳ đang có." actionLabel="Quản lý học kỳ" onAction={()=>setScheduleMode('Môn & học kỳ')}/>}
    {target&&<Card style={{gap:12}}><Row between><T style={{fontFamily:F.bold}}>Hai học kỳ đối chiếu</T><IconButton name="swap-vertical-outline" label="Đổi chiều so sánh GPA" onPress={()=>setSelected({base:target.id,target:base.id})}/></Row>
      {([{slot:'A',key:'base',semester:base},{slot:'B',key:'target',semester:target}] as const).map(item=><Pressable key={item.key} accessibilityRole="button" accessibilityLabel={`Chọn học kỳ ${item.slot} để so sánh`} onPress={()=>setPicker(item.key)}><Card style={{backgroundColor:C.canvas,padding:13}}><Row><Badge label={item.slot}/><View style={S.grow}><T style={{fontFamily:F.bold}}>{item.semester.name}</T><T style={S.small}>{item.semester.academicYear}</T></View><Icon name="chevron-down"/></Row></Card></Pressable>)}
    </Card>}
    {error?<StateView kind="error" title="Chưa tải được GPA để so sánh" message={error.message} actionLabel="Thử lại" onAction={reload}/>
      :!loaded||a.loading||b.loading?<StateView kind="loading" title="Đang đọc GPA các kỳ" message="Đang lấy snapshot của từng học kỳ; không dùng điểm mẫu."/>
      :<>
        {target&&<Card style={{backgroundColor:C.soft,gap:9}}><T style={{fontFamily:F.bold}}>Chênh lệch B − A</T><T testID="server-gpa-difference" style={{fontFamily:F.extra,fontSize:28,color:C.primary}}>{difference?`${difference.amount>0?'+':''}${difference.amount.toFixed(2)}`:'—'}<T style={S.small}> điểm GPA</T></T><T style={S.small}>{!difference?'Cần cả hai học kỳ có GPA để đối chiếu; điểm trống không phải 0.':difference.provisional?'So sánh tạm tính, ít nhất một kỳ còn môn chưa đủ kết quả.':'Tính từ GPA đã trả về của từng học kỳ.'}</T></Card>}
        {[{slot:'A',semester:base,report:a.value},{slot:'B',semester:target,report:b.value}].map(item=>item.semester&&item.report&&<Pressable key={item.slot} accessibilityRole="button" accessibilityLabel={`Mở bảng điểm kỳ ${item.slot}`} onPress={()=>setOpened(item.semester!.id)}><Card style={{gap:11}}><Badge label={item.slot}/><T style={{fontFamily:F.bold,fontSize:17}}>{item.semester.name} · {item.semester.academicYear}</T><T testID={`server-comparison-${item.slot}`} style={{fontFamily:F.extra,fontSize:32,color:C.primary}}>{gradeNumber(item.report.summary.gpa,2)} /4</T><Progress value={item.report.summary.gpa===null?0:item.report.summary.gpa/4*100}/><T style={S.small}>{semesterGpaCaption(item.report.summary)}</T><T style={S.small}>{item.report.summary.calculatedCredits} tín chỉ tính GPA · {item.report.summary.calculatedCourses}/{item.report.summary.registeredCourses} môn đủ kết quả</T><T style={{color:C.primary}}>Mở bảng điểm →</T></Card></Pressable>)}
      </>}
    <T style={S.small}>GPA học kỳ xét các lần học trong đúng kỳ đó, gồm môn F hoàn chỉnh; GPA tích lũy chọn lần đạt cao nhất riêng. Mỗi học kỳ là một snapshot độc lập; bấm cập nhật để đọc lại cả hai.</T>
    {picker&&target&&<Sheet title={`Chọn học kỳ ${picker==='base'?'A':'B'}`} onClose={()=>setPicker(null)}>{orderedGpaSemesters(catalog.semesters).map(s=>{const other=picker==='base'?target:base,current=picker==='base'?base:target,disabled=s.id===other.id;return <Pressable key={s.id} accessibilityRole="radio" accessibilityLabel={`So sánh ${picker==='base'?'A':'B'}: ${s.name}, ${s.academicYear}`} aria-checked={s.id===current.id} accessibilityState={{checked:s.id===current.id,disabled}} disabled={disabled} onPress={()=>{setSelected({base:picker==='base'?s.id:base.id,target:picker==='target'?s.id:target.id});setPicker(null);}}><Card style={{backgroundColor:s.id===current.id?C.soft:C.canvas,gap:5,opacity:disabled?0.5:1}}><T style={{fontFamily:F.bold}}>{s.name}</T><T style={S.small}>{s.academicYear}{disabled?' · Đang chọn ở ô còn lại':''}</T></Card></Pressable>;})}</Sheet>}
  </>;
}
