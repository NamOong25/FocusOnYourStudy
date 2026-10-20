import React from 'react';
import {Pressable,View} from 'react-native';
import {Badge,Card,Icon,Row,T} from '../../../shared/components';
import {C,F,S} from '../../../shared/theme';
import {Task,taskDeadlineLabel,taskDueLabel,taskIsOverdue} from '../assignments';

export default function AssignmentCard({task,now,onPress}:{task:Task;now:Date;onPress:()=>void}){
  const late=taskIsOverdue(task,now),color=task.status==='Hoàn thành'?C.green:late?C.red:C.primary;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Mở bài tập ${task.title}`} onPress={onPress}><Card style={{gap:11,borderColor:late?C.red:C.line}}>
    <Row between><Badge label={`Ưu tiên ${task.priority.toLowerCase()}`} bg={task.priority==='Cao'?C.redSoft:C.soft} color={task.priority==='Cao'?C.red:C.primary} icon="flag-outline"/><T style={{flexShrink:1,textAlign:'right',color,fontFamily:F.semi,fontSize:11}}>{taskDueLabel(task,now)}</T></Row>
    <T style={{fontFamily:F.bold,fontSize:17,lineHeight:25}}>{task.title}</T><T style={{fontSize:11,color:C.primary}}>{task.course}</T><T numberOfLines={2} style={{fontSize:12,lineHeight:20,color:C.muted}}>{task.notes||'Chưa có ghi chú'}</T>
    <Row><Icon name="calendar-outline" size={14}/><T style={[S.grow,{fontSize:11,lineHeight:19,color:C.muted}]}>Hạn nộp: {taskDeadlineLabel(task)}</T></Row>
    <Row between><Badge label={task.status}/><T style={{fontSize:11,color:C.primary,fontFamily:F.semi}}>Xem chi tiết →</T></Row>
  </Card></Pressable>;
}
