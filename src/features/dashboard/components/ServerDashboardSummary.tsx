import React from 'react';
import {Pressable,View} from 'react-native';
import {Button,Card,Icon,Row,T} from '../../../shared/components';
import {useNavigationScope} from '../../../navigation/Navigation';
import {C,F,S} from '../../../shared/theme';
import type {Semester} from '../../academics/academic';
import type {dashboardData} from '../dashboard';
import {useGpaCatalog} from '../../grades/api/useServerGpa';
import {useServerSemesterGrades} from '../../grades/api/useServerGrades';
import {gradeNumber,serverGradeView} from '../../grades/serverGradeView';
import {semesterGpaCaption} from '../../grades/serverGpaView';
import {gradePresentation} from '../../grades/gradePresentation';
import GradeStatus from '../../grades/GradeStatus';
import DashboardSummary from './DashboardSummary';
export default function ServerDashboardSummary({semester,data,active,onGrades,onCourse}:{semester:Semester;data:ReturnType<typeof dashboardData>;active:boolean;onGrades:()=>void;onCourse:(id:string)=>void}){
  const catalog=useGpaCatalog(),read=useServerSemesterGrades(catalog.ready?{semesterId:semester.id,semesterVersion:semester.version??-1,courses:catalog.courseCatalog.filter(c=>c.semesterId===semester.id)}:null,useNavigationScope().active&&active);
  const error=catalog.error??read.error,value=read.value,summary=value?.summary;
  const reload=()=>{void Promise.allSettled([catalog.reloadCatalog(),read.reload()]);};
  const warnings=value?.courses.filter(c=>gradePresentation(serverGradeView(c.result)).attention)??[];
  return <>
    <DashboardSummary data={data} onGrades={onGrades} gradeTile={<Pressable accessibilityRole="button" accessibilityLabel="Dashboard: xem điểm học kỳ" onPress={onGrades} style={S.grow}><Card style={{height:'100%',padding:15,gap:9}}><Icon name="school-outline"/><T style={S.small}>GPA học kỳ</T>{error?<T accessibilityRole="alert" style={{color:C.red}}>Chưa tải được điểm</T>:<><T testID="dashboard-gpa" style={{fontFamily:F.extra,fontSize:28,color:C.primary}}>{!read.loaded||!summary?'…':gradeNumber(summary.gpa,2)}<T style={S.small}> /4</T></T><T style={{fontSize:10,lineHeight:17,color:C.muted}}>{summary?`${summary.calculatedCredits} tín chỉ tính GPA · Điểm đã lưu`:'Đang đọc điểm trong tài khoản'}</T></>}</Card></Pressable>}/>
    <Button label="Cập nhật điểm Trang chủ" secondary disabled={read.loading} onPress={reload}/>
    {error?<T accessibilityRole="alert" style={{color:C.red}}>{error.message}</T>:summary&&<T style={S.small}>{semesterGpaCaption(summary)}{summary.excludedCourses>0?` · ${summary.excludedCourses} môn chưa tính. Điểm thiếu không được xem là 0.`:''}</T>}
    {!!warnings.length&&!error&&<Card style={{backgroundColor:C.canvas,gap:12}}><T style={{fontFamily:F.bold}}>Môn học cần chú ý</T>{warnings.map(c=>{const result=serverGradeView(c.result),p=gradePresentation(result);return <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`Dashboard: cảnh báo điểm ${c.name}`} onPress={()=>onCourse(c.id)}><Row><View style={S.grow}><T style={{fontFamily:F.bold,color:p.color}}>{c.name}</T><GradeStatus result={result}/></View><T style={{fontFamily:F.extra,fontSize:22,color:p.color}}>{gradeNumber(result.total,1)}</T><Icon name="chevron-forward" color={p.color}/></Row></Pressable>;})}</Card>}
  </>;
}
