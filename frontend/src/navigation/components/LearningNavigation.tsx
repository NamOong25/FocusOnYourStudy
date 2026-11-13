import React from 'react';
import {Pressable,View} from 'react-native';
import {Icon,IconName,Row,T} from '../../shared/components';
import {useActionState} from '../../shared/feedback/ActionScope';
import {C,F,S} from '../../shared/theme';
import {ScheduleMode} from '../navigationState';

const destinations:{value:ScheduleMode;label:string;icon:IconName}[]=[
  {value:'Thời khóa biểu',label:'Lịch học',icon:'calendar-outline'},
  {value:'Bài tập',label:'Bài tập',icon:'clipboard-outline'},
  {value:'Kỳ thi',label:'Lịch thi',icon:'reader-outline'},
];
const academicDestination = { value: 'Môn & học kỳ', label: 'Môn & học kỳ', icon: 'school-outline' } as const;

export default function LearningNavigation({value,onChange}:{value:ScheduleMode;onChange:(value:ScheduleMode)=>void}){
  const action=useActionState(),academic=value==='Môn & học kỳ',compact=value==='Thời khóa biểu';
  return <View style={{gap:10}}>
    {!compact&&<Row between><T style={[S.grow,{fontFamily:F.bold,fontSize:16}]}>Học tập</T><Pressable accessibilityRole="tab" accessibilityLabel="Môn & học kỳ" accessibilityState={{selected:academic,disabled:!!action?.busy}} aria-selected={academic} disabled={!!action?.busy} onPress={()=>onChange('Môn & học kỳ')} style={{minHeight:44,paddingHorizontal:12,borderRadius:16,borderWidth:1,borderColor:academic?C.primary:C.line,backgroundColor:academic?C.soft:'#fff',justifyContent:'center',boxShadow:academic?'0px 4px 12px rgba(83,65,205,0.12)':'none'}}><Row style={{gap:6}}><Icon name="school-outline" size={17}/><T style={{fontFamily:F.semi,fontSize:11,color:C.primary}}>Môn & học kỳ</T><Icon name="chevron-forward" size={14}/></Row></Pressable></Row>}
    <Row style={{gap:6}}>{(compact?[...destinations,academicDestination]:destinations).map(item=>{const selected=item.value===value;return <Pressable key={item.value} accessibilityRole="tab" accessibilityLabel={item.value} accessibilityState={{selected,disabled:!!action?.busy}} aria-selected={selected} disabled={!!action?.busy} onPress={()=>onChange(item.value)} style={({pressed})=>({flex:1,minWidth:0,minHeight:compact?54:68,paddingHorizontal:3,paddingVertical:compact?6:10,alignItems:'center',justifyContent:'center',gap:compact?3:6,borderRadius:compact?14:18,borderWidth:1,borderColor:selected?C.primary:C.line,backgroundColor:selected?C.primary:'#fff',boxShadow:selected?'0px 6px 16px rgba(83,65,205,0.2)':'0px 2px 6px rgba(0,0,0,0.02)',opacity:pressed?0.7:1})}><Icon name={item.icon} size={compact?17:21} color={selected?'#fff':C.muted}/><T style={{fontSize:compact?10:11,lineHeight:compact?14:undefined,fontFamily:selected?F.bold:F.medium,color:selected?'#fff':C.muted,textAlign:'center'}}>{item.label}</T></Pressable>;})}</Row>
  </View>;
}
