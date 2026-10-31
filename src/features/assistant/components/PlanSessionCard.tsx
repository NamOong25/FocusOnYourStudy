import React from 'react';
import { Pressable } from 'react-native';
import { Badge, Button, Card, Field, Icon, Row, T } from '../../../shared/components';
import { DateField, TimeField } from '../../../shared/components/DateTimePicker';
import { C, F, S } from '../../../shared/theme';
import type { PlanDraft } from '../api/planDrafts';
import { planClock, planWall } from '../api/planTime';

export function PlanSessionCard({draft,zone,expanded,onExpand,onChange,issues}:{draft:PlanDraft;zone:string;expanded:boolean;onExpand:()=>void;onChange:(patch:Partial<PlanDraft>)=>void;issues:string[]}){
  let timing='Ngày/giờ cần sửa';try{const at=planWall(draft.date,draft.start,zone,draft.originalStartsAt);if(/^\d+$/.test(draft.duration)&&Number(draft.duration)>0&&Number(draft.duration)<=240)timing=`${draft.date.split('-').reverse().join('/')} · ${draft.start}–${planClock(Date.parse(at)+Number(draft.duration)*60000,zone)}`;}catch{}
  return <Card style={{gap:11,backgroundColor:draft.selected?C.card:C.canvas}}>
    <Row between><Pressable accessibilityRole="checkbox" accessibilityLabel={`Chọn buổi ${draft.index}`} accessibilityState={{checked:draft.selected}} aria-checked={draft.selected} onPress={()=>onChange({selected:!draft.selected})} style={[S.row,{minHeight:44}]}><Icon name={draft.selected?'checkbox':'square-outline'}/><T style={{fontFamily:F.bold}}>Buổi {draft.index}</T></Pressable>
      <Badge label={!draft.selected?'Bỏ chọn':issues.length?'Cần xem lại':draft.edited?'Đã chỉnh sửa':'Bản đề xuất'} color={issues.length?C.red:C.primary} bg={issues.length?C.redSoft:C.soft}/></Row>
    <T style={{fontFamily:F.bold}}>{draft.title}</T><T style={{fontSize:12,color:C.primary}}>{timing}</T><T style={S.small}>{draft.duration||'—'} phút · {zone}</T>
    {expanded&&<><Field label={`Tên buổi ${draft.index}`} value={draft.title} onChange={title=>onChange({title})} maxLength={200}/><DateField label={`Ngày buổi ${draft.index}`} value={draft.date} onChange={date=>onChange({date})}/><TimeField label={`Giờ buổi ${draft.index}`} value={draft.start} onChange={start=>onChange({start})}/><Field label={`Thời lượng buổi ${draft.index}`} value={draft.duration} onChange={duration=>onChange({duration})} numeric maxLength={3}/></>}
    {issues.map((message,i)=><T key={i} accessibilityRole="alert" style={{fontSize:12,color:C.red}}>{message}</T>)}
    <Button label={`${expanded?'Thu gọn':'Chỉnh sửa'} buổi ${draft.index}`} secondary onPress={onExpand}/>
  </Card>;
}
