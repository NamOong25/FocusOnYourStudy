import React from 'react';
import {Pressable,View} from 'react-native';
import {Badge,Button,Card,Icon,IconTile,Row,T} from '../../../shared/components';
import type {Exam} from '../../schedule/calendar';
import {dateLabel} from '../../../shared/utils/dates';
import {examCountdown} from '../dashboard';
import {C,F,S} from '../../../shared/theme';

export default function NearestExamCard({exam,now,onOpen,onAdd}:{exam?:Exam;now:Date;onOpen:(id:string)=>void;onAdd:()=>void}){
  if(!exam)return <Card style={{backgroundColor:C.canvas,gap:11}}><IconTile name="calendar-outline"/><T style={{fontFamily:F.bold}}>Chưa có lịch thi sắp tới</T><T style={S.small}>Lịch thi đã kết thúc không xuất hiện ở thẻ này. Thêm lịch của học kỳ đang chọn để chủ động ôn tập.</T><Button label="Thêm lịch thi cho học kỳ này" secondary onPress={onAdd}/></Card>;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Dashboard: lịch thi ${exam.course}`} onPress={()=>onOpen(exam.id)}><Card style={{backgroundColor:C.amberSoft,gap:14}}><Row between><Badge label={examCountdown(exam,now)} bg="#FFFFFFBB" color={C.amber} icon="hourglass-outline"/><Icon name="chevron-forward" color={C.amber} size={18}/></Row><T style={{fontFamily:F.extra,fontSize:21,lineHeight:30,color:C.ink}}>{exam.course}</T><T style={{fontSize:12,color:C.amber}}>{exam.kind} · {exam.format}</T><Row><Icon name="calendar-outline" color={C.amber} size={17}/><View style={S.grow}><T style={{fontFamily:F.semi,fontSize:13}}>{dateLabel(exam.date)}/{exam.date.slice(0,4)} · {exam.time} – {exam.end}</T><T style={{fontSize:12,color:C.muted,marginTop:5}}>Phòng {exam.room || 'Chưa cập nhật'}</T></View></Row></Card></Pressable>;
}
