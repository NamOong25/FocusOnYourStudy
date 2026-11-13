import React from 'react';
import {Pressable,View,useWindowDimensions} from 'react-native';
import {Button,Card,Icon,Row,T} from '../../../shared/components';
import {useNavigationScope} from '../../../navigation/Navigation';
import {C,F,S} from '../../../shared/theme';
import type {Semester} from '../../academics/academic';
import type {dashboardData} from '../dashboard';
import {useGpaCatalog} from '../../grades/api/useServerGpa';
import {useServerSemesterGrades} from '../../grades/api/useServerGrades';
import {gradeNumber,serverGradeView} from '../../grades/serverGradeView';
import {gradePresentation} from '../../grades/gradePresentation';
import GradeStatus from '../../grades/GradeStatus';
import DashboardSummary from './DashboardSummary';
import ServerDashboardPomodoro from './ServerDashboardPomodoro';
export default function ServerDashboardSummary({semester,data,active,onGrades,onCourse,children}:{semester:Semester;data:ReturnType<typeof dashboardData>;active:boolean;onGrades:()=>void;onCourse:(id:string)=>void;children:React.ReactNode}){
  const catalog=useGpaCatalog(),read=useServerSemesterGrades(catalog.ready?{semesterId:semester.id,semesterVersion:semester.version??-1,courses:catalog.courseCatalog.filter(c=>c.semesterId===semester.id)}:null,useNavigationScope().active&&active);
  const { width, fontScale } = useWindowDimensions();
  const error=catalog.error??read.error,value=read.value,summary=value?.summary;
  const reload=()=>{void Promise.allSettled([catalog.reloadCatalog(),read.reload()]);};
  const warnings=value?.courses.filter(c=>gradePresentation(serverGradeView(c.result)).attention)??[];
  return <>
    <View style={{ flexDirection: width < 360 || fontScale > 1.25 ? 'column' : 'row', gap: 8 }}>
      <DashboardSummary data={data} onGrades={onGrades} gpa={error ? 'error' : {
        value: read.loaded && summary ? gradeNumber(summary.gpa, 2) : '…',
      }} />
      <ServerDashboardPomodoro />
    </View>
    {children}
    {error&&<><T accessibilityRole="alert" style={{color:C.red}}>{error.message}</T><Button label="Thử lại điểm học kỳ" secondary disabled={read.loading} onPress={reload}/></>}
    {!!warnings.length&&!error&&<Card style={{backgroundColor:C.canvas,gap:12}}><T style={{fontFamily:F.bold}}>Môn học cần chú ý</T>{warnings.map(c=>{const result=serverGradeView(c.result),p=gradePresentation(result);return <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`Dashboard: cảnh báo điểm ${c.name}`} onPress={()=>onCourse(c.id)}><Row><View style={S.grow}><T style={{fontFamily:F.bold,color:p.color}}>{c.name}</T><GradeStatus result={result}/></View><T style={{fontFamily:F.extra,fontSize:22,color:p.color}}>{gradeNumber(result.total,1)}</T><Icon name="chevron-forward" color={p.color}/></Row></Pressable>;})}</Card>}
  </>;
}
