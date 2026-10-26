import React, {useState} from 'react';
import {Pressable,ScrollView,TextInput,View} from 'react-native';
import {Badge,Button,Card,Icon,Row,Segments,Sheet,StateView,T} from '../../../shared/components';
import {useNavigationScope} from '../../../navigation/Navigation';
import {useApp} from '../../../store/model';
import {C,F,S} from '../../../shared/theme';
import {useServerSemesterGrades} from '../api/useServerGrades';
import {gradeNumber,serverGradeView} from '../serverGradeView';
import {gradePresentation} from '../gradePresentation';
import GradeStatus from '../GradeStatus';
import {ServerCourseGradeDialog} from './ServerGradePanel';

export function ServerSemesterGradesSheet({semesterId,onClose}:{semesterId:string;onClose:()=>void}){
  return <Sheet title="Điểm học kỳ đã lưu" onClose={onClose}><ServerGradesScreen fixedSemesterId={semesterId}/></Sheet>;
}
export default function ServerGradesScreen({fixedSemesterId}:{fixedSemesterId?:string}={}){
  const {semesters,courseCatalog,academicSemesterId,setAcademicSemesterId,setScheduleMode,courseConnection,semesterConnection}=useApp();
  const [filter,setFilter]=useState('Tất cả'),[query,setQuery]=useState(''),[opened,setOpened]=useState<string|null>(null);
  const semester=fixedSemesterId?semesters.find(s=>s.id===fixedSemesterId):semesters.find(s=>s.id===academicSemesterId)??semesters[0];
  const courses=courseCatalog.filter(c=>c.semesterId===semester?.id);
  const read=useServerSemesterGrades(semester?{semesterId:semester.id,semesterVersion:semester.version??-1,courses}:null,useNavigationScope().active);
  const reload=()=>{void Promise.allSettled([read.reload(),courseConnection?.reload(),semesterConnection?.reload()]);};
  if(!semester)return <StateView title={fixedSemesterId?'Không tìm thấy học kỳ':'Chưa có bảng điểm'} message="Tạo học kỳ và thêm môn học để bắt đầu theo dõi điểm." actionLabel="Quản lý học kỳ và môn" onAction={()=>setScheduleMode('Môn & học kỳ')}/>;
  const filtered=read.value?.courses.filter(c=>{const r=serverGradeView(c.result);return `${c.code} ${c.name}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())&&(filter==='Tất cả'||(filter==='Không đạt'?r.failed:filter==='Đủ điểm'?r.complete:!r.complete));})??[];
  return <>
    <Row between><View style={S.grow}><T style={{fontFamily:F.extra,fontSize:26,lineHeight:38}}>Điểm số & GPA</T><T style={S.small}>Điểm đã lưu trong tài khoản</T></View><Button label={read.loading?'Đang tải':'Tải lại'} disabled={read.loading} secondary icon="refresh-outline" onPress={reload}/></Row>
    {!fixedSemesterId&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:9}}>{semesters.map(s=><Pressable key={s.id} accessibilityRole="button" accessibilityLabel={`Xem điểm ${s.name} ${s.academicYear}`} onPress={()=>{setAcademicSemesterId(s.id);setOpened(null);}} style={{padding:14,borderRadius:18,backgroundColor:s.id===semester.id?C.primary:C.card}}><T style={{fontFamily:F.bold,color:s.id===semester.id?'white':C.ink}}>{s.name}</T><T style={{fontSize:11,color:s.id===semester.id?'white':C.muted}}>{s.academicYear}</T></Pressable>)}</ScrollView>}
    {read.error?<StateView kind="error" title="Chưa tải được điểm học kỳ" message={read.error.message} actionLabel="Thử lại" onAction={reload}/>
      :!read.loaded||!read.value?<StateView kind="loading" title="Đang tải điểm học kỳ" message="Đang đọc kết quả các môn đã lưu trong tài khoản."/>
      :<>
        <Card style={{backgroundColor:C.soft,gap:10}}><T style={{fontFamily:F.bold}}>GPA · {semester.name}</T><T style={{fontFamily:F.extra,fontSize:37,lineHeight:52,color:C.primary}}>{gradeNumber(read.value.summary.gpa,2)}<T style={S.small}> /4</T></T><T style={S.small}>{read.value.summary.calculatedCourses}/{read.value.summary.registeredCourses} môn đủ tổng kết · {read.value.summary.calculatedCredits} tín chỉ tính GPA</T>
          {read.value.summary.excludedCourses>0&&<T style={S.small}>{read.value.summary.excludedCourses} môn chưa được tính do thiếu cấu hình, thiếu điểm hoặc chưa đủ điều kiện thi.</T>}
          {read.value.summary.gpa===null&&<T style={S.small}>Chưa đủ dữ liệu tính GPA; điểm chưa nhập không được xem là 0.</T>}
        </Card>
        {!read.value.courses.length?<StateView title="Học kỳ chưa có môn học" message="Thêm môn vào học kỳ này để theo dõi kết quả." actionLabel="Thêm môn học" onAction={()=>setScheduleMode('Môn & học kỳ')}/>:<>
          <Row style={{backgroundColor:C.card,borderRadius:16,paddingHorizontal:14,borderWidth:1,borderColor:C.line}}><Icon name="search-outline"/><TextInput accessibilityLabel="Tìm môn trong bảng điểm" placeholder="Tìm tên hoặc mã môn" value={query} onChangeText={setQuery} placeholderTextColor={C.muted} style={{flex:1,paddingVertical:15,color:C.ink,fontFamily:F.regular}}/></Row>
          <Segments values={['Tất cả','Đủ điểm','Chưa đủ','Không đạt']} value={filter} onChange={setFilter}/>
          {filtered.map(c=>{const r=serverGradeView(c.result),p=gradePresentation(r);return <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`Bảng điểm ${c.name}`} onPress={()=>setOpened(c.id)}><Card style={{gap:12}}><Row between><View style={S.grow}><T style={{fontFamily:F.bold,fontSize:16}}>{c.name}</T><T style={S.small}>{c.code} · {c.credits} tín chỉ</T></View><View style={{alignItems:'flex-end'}}><T style={{fontFamily:F.extra,fontSize:25,color:p.attention?p.color:C.primary}}>{gradeNumber(r.total,1)}</T><T style={S.small}>{r.letter??'Chưa tổng kết'}</T></View></Row><GradeStatus result={r}/><T style={{fontSize:12,color:C.primary}}>Xem bảng điểm →</T></Card></Pressable>;})}
          {!filtered.length&&<StateView title="Không có môn phù hợp" message="Thử đổi bộ lọc hoặc từ khóa tìm kiếm." actionLabel="Xóa bộ lọc" onAction={()=>{setQuery('');setFilter('Tất cả');}}/>}
        </>}
        <T style={S.small}>Bảng điểm hiển thị theo học kỳ đang chọn. Mở từng môn để xem đầy đủ điểm thành phần.</T>
      </>}
    {opened&&<ServerCourseGradeDialog key={opened} courseId={opened} onClose={()=>{setOpened(null);void read.reload().catch(()=>{});}}/>}
  </>;
}
