import React from 'react';
import {Pressable,View} from 'react-native';
import {Card,Icon,Progress,Row,T} from '../../../shared/components';
import {formatGpa} from '../../grades/grades';
import type {dashboardData} from '../dashboard';
import {C,F,S} from '../../../shared/theme';

export default function DashboardSummary({data,onGrades,gradeTile}:{data:ReturnType<typeof dashboardData>;onGrades:()=>void;gradeTile?:React.ReactNode}){
  return <Row style={{alignItems:'stretch',gap:10}}>{gradeTile??<Pressable accessibilityRole="button" accessibilityLabel="Dashboard: xem điểm học kỳ" onPress={onGrades} style={S.grow}><Card style={{height:'100%',padding:15,gap:9}}><Icon name="school-outline"/><T style={S.small}>GPA học kỳ</T><T testID="dashboard-gpa" style={{fontFamily:F.extra,fontSize:28,color:C.primary}}>{formatGpa(data.summary.gpa)}<T style={{fontSize:11,color:C.muted}}> /4</T></T><T style={{fontSize:10,lineHeight:17,color:C.muted}}>{data.summary.scoredCredits} tín chỉ tính GPA · Điểm đã nhập</T></Card></Pressable>}<Card style={[S.grow,{padding:15,gap:9}]}><Icon name="checkmark-circle-outline" color={C.green}/><T style={S.small}>Bài tập hoàn tất</T><T testID="dashboard-task-percent" style={{fontFamily:F.extra,fontSize:28,color:C.green}}>{data.tasks.length?`${data.percent}%`:'—'}</T><Progress value={data.percent}/><T testID="dashboard-task-count" style={{fontSize:10,color:C.muted}}>{data.done}/{data.tasks.length} bài tập</T></Card></Row>;
}
