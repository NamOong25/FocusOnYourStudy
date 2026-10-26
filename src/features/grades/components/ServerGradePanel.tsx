import React from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, Progress, Row, Sheet, StateView, T } from '../../../shared/components';
import { useNavigationScope } from '../../../navigation/Navigation';
import { useApp } from '../../../store/model';
import { C, F, S } from '../../../shared/theme';
import GradeStatus from '../GradeStatus';
import { gradePresentation } from '../gradePresentation';
import { useServerCourseGrades } from '../api/useServerGrades';
import { gradeKindLabels, gradeNumber, serverGradeView } from '../serverGradeView';

export function ServerCourseGradeDialog({courseId,onClose}:{courseId:string;onClose:()=>void}){
  const {courseCatalog}=useApp(),course=courseCatalog.find(c=>c.id===courseId);
  return <Sheet title="Bảng điểm môn học" onClose={onClose}>
    {course&&<><T style={{fontFamily:F.extra,fontSize:22,lineHeight:32}}>{course.name}</T><Badge label={`${course.code} · ${course.credits} tín chỉ`}/></>}
    <ServerGradePanel courseId={courseId}/>
  </Sheet>;
}
export default function ServerGradePanel({courseId}:{courseId:string}){
  const {courseCatalog,courseConnection,semesterConnection}=useApp(),course=courseCatalog.find(c=>c.id===courseId);
  const read=useServerCourseGrades(course??null,useNavigationScope().active);
  const reload=()=>{void Promise.allSettled([read.reload(),courseConnection?.reload(),semesterConnection?.reload()]);};
  if(!course)return <StateView title="Không tìm thấy môn học" message="Môn học có thể vừa bị xóa. Tải lại danh sách môn." actionLabel="Tải lại" onAction={reload}/>;
  if(read.error)return <StateView kind="error" title="Chưa tải được bảng điểm" message={read.error.message} actionLabel="Thử lại" onAction={reload}/>;
  if(!read.loaded||!read.value)return <StateView kind="loading" title="Đang tải bảng điểm" message="Đang đọc các cột điểm đã lưu trong tài khoản."/>;
  if(read.value.kind==='unconfigured')return <Card style={{gap:12}}><Badge label="Chưa có bảng điểm"/><T style={{fontFamily:F.bold}}>Môn này chưa có cấu hình điểm</T><T style={S.small}>Chưa có cột điểm được lưu. Điểm chưa nhập được để trống, không mặc định bằng 0.</T><T style={S.small}>Chức năng nhập và lưu điểm vào tài khoản sẽ được bổ sung tiếp.</T><Button label="Tải lại bảng điểm" secondary icon="refresh-outline" onPress={reload}/></Card>;
  const data=read.value,result=serverGradeView(data.result),presentation=gradePresentation(result);
  return <>
    <Row between><Badge label="Điểm đã lưu trong tài khoản" icon="cloud-done-outline"/><Button label={read.loading?'Đang tải':'Tải lại'} disabled={read.loading} secondary icon="refresh-outline" onPress={reload}/></Row>
    <Card style={{backgroundColor:presentation.attention?presentation.background:C.canvas,gap:12}}>
      <GradeStatus result={result} detail/>
      <Row between><View><T style={S.small}>Tổng kết / 10</T><T style={{fontFamily:F.extra,fontSize:37,lineHeight:52,color:presentation.attention?presentation.color:C.primary}}>{gradeNumber(result.total,1)}</T></View>
        <View style={{alignItems:'flex-end',gap:5}}><T style={{fontFamily:F.extra,fontSize:27,color:presentation.attention?presentation.color:C.primary}}>{result.letter??'—'}</T><T style={S.small}>{result.point===null?'Chưa quy đổi':`${gradeNumber(result.point,1)} / 4.0`}</T></View></Row>
      <Progress value={data.columnCount?data.enteredColumns/data.columnCount*100:0}/><T style={S.small}>{data.enteredColumns}/{data.columnCount} cột đã đủ điểm</T>
    </Card>
    <Row between><T style={{fontFamily:F.bold}}>Điểm thành phần</T><Badge label={data.assessment==='THEORY'?'Lý thuyết':'Thực hành'}/></Row>
    {!data.parts.length&&<T style={S.small}>Bảng điểm chưa có cột thành phần.</T>}
    {data.parts.map(p=><Card key={p.id} style={{gap:8}}>
      <Row between><View style={S.grow}><T style={{fontFamily:F.bold,fontSize:14}}>{p.name}</T><T style={S.small}>{gradeKindLabels[p.kind]} · Trọng số {gradeNumber(Number(p.weight.toFixed(2)))}%</T></View><T style={{fontFamily:F.extra,fontSize:22,color:p.effectiveScore===null?C.muted:C.ink}}>{gradeNumber(p.effectiveScore)}</T></Row>
      <T style={S.small}>Điểm đã nhập: {p.score===null?'Chưa nhập':gradeNumber(p.score)}</T>
      {p.project&&<><T style={{fontSize:12,lineHeight:20,color:C.primary}}>Bài tập lớn tính vào {p.project.target==='FINAL'?'cuối kỳ':'một cột thực hành'} · {gradeNumber(p.project.share)}% của cột</T>
        {p.project.share<100&&<T style={S.small}>Phần còn lại của cột: {p.remainderScore===null?'Chưa nhập':gradeNumber(p.remainderScore)}</T>}
        <T style={S.small}>Điểm cột sau quy đổi: {gradeNumber(p.effectiveScore)}</T></>}
    </Card>)}
    {!!data.result.missingGroups.length&&<Card style={{backgroundColor:C.amberSoft,gap:6}}><T style={{fontFamily:F.semi}}>Nhóm điểm còn thiếu</T><T style={S.small}>{data.result.missingGroups.map(g=>({REGULAR:'Thường kỳ',MIDTERM:'Giữa kỳ',FINAL:'Cuối kỳ',PRACTICAL_COLUMNS:'Các cột thực hành'}[g]??g)).join(' · ')}</T></Card>}
    {data.result.notices.map((notice,i)=><Card key={`${notice.code}-${i}`} style={{backgroundColor:C.canvas}}><T style={S.small}>{notice.message}</T></Card>)}
    <T style={S.small}>Đang xem các điểm đã lưu. Chức năng chỉnh sửa và lưu điểm vào tài khoản sẽ được bổ sung tiếp.</T>
  </>;
}
