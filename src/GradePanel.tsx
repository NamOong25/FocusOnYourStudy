import React from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, Icon, Progress, Row, T } from './components';
import { courseResult, emptyGrades } from './grades';
import { useApp } from './model';
import { C, F, S } from './theme';

export default function GradePanel({courseId,onEdit}:{courseId:string;onEdit:()=>void}){
  const {gradeBook,gradeRules,courseCatalog}=useApp();const record=gradeBook[courseId]??emptyGrades();const result=courseResult(record,gradeRules);const previous=courseCatalog.find(c=>c.id===record.previousCourseId);
  return <><Card style={{backgroundColor:result.complete?C.soft:C.canvas,gap:12}}><Row between><Badge label={result.complete?'Đã đủ điểm':'Chưa đủ dữ liệu'} bg={result.complete?'#FFFFFFAA':C.soft}/><Icon name="ribbon-outline"/></Row><Row between><View><T style={{fontSize:11,color:C.muted}}>Điểm tổng kết / 10</T><T style={{fontFamily:F.extra,fontSize:37,lineHeight:52,color:C.primary}}>{result.total===null?'—':result.total.toFixed(gradeRules.decimals)}</T></View><View style={{alignItems:'flex-end',gap:5}}><T style={{fontFamily:F.extra,fontSize:27,color:C.primary}}>{result.letter??'—'}</T><T style={S.small}>{result.point===null?'Chưa quy đổi':`${result.point.toFixed(1)} / 4.0`}</T></View></Row><Progress value={result.enteredWeight}/><T style={S.small}>{result.entered}/{result.count} thành phần · {result.enteredWeight}% trọng số đã nhập</T></Card>
    <Card style={{backgroundColor:C.canvas,gap:13}}><T style={{fontFamily:F.bold}}>Điểm thành phần</T>{record.parts.map(p=><Row key={p.id} between style={{borderBottomWidth:1,borderBottomColor:C.line,paddingBottom:12}}><View style={S.grow}><T style={{fontFamily:F.semi,fontSize:13}}>{p.name}</T><T style={{fontSize:10,color:C.muted}}>Trọng số {p.weight}%</T></View><T style={{fontFamily:p.score===null?F.regular:F.bold,color:p.score===null?C.muted:C.ink,fontSize:14}}>{p.score===null?'Chưa nhập':String(p.score)}</T></Row>)}</Card>
    {previous&&<Badge label={`Học lại từ ${previous.code}`} icon="repeat-outline"/>}<Button label="Nhập / chỉnh sửa điểm" icon="create-outline" onPress={onEdit}/><T style={S.small}>Dữ liệu và quy tắc đang dùng để thử giao diện. Điểm chưa nhập không được tính thành 0. Trạng thái hoàn thành môn do bạn quản lý riêng.</T></>;
}
