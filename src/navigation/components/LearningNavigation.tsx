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
  {value:'Tự học',label:'Tự học',icon:'book-outline'},
];

export default function LearningNavigation({value,onChange}:{value:ScheduleMode;onChange:(value:ScheduleMode)=>void}){
  const action=useActionState(),academic=value==='Môn & học kỳ';
  return <View style={{gap:10}}>
    <Row between><T style={[S.grow,{fontFamily:F.bold,fontSize:16}]}>Học tập</T><Pressable accessibilityRole="tab" accessibilityLabel="Môn & học kỳ" accessibilityState={{selected:academic,disabled:!!action?.busy}} aria-selected={academic} disabled={!!action?.busy} onPress={()=>onChange('Môn & học kỳ')} style={{minHeight:44,paddingHorizontal:12,borderRadius:15,borderWidth:1,borderColor:academic?C.primary:C.line,backgroundColor:academic?C.soft:'#fff',justifyContent:'center'}}><Row style={{gap:6}}><Icon name="school-outline" size={17}/><T style={{fontFamily:F.semi,fontSize:11,color:C.primary}}>Môn & học kỳ</T><Icon name="chevron-forward" size={14}/></Row></Pressable></Row>
    <Row style={{gap:6}}>{destinations.map(item=>{const selected=item.value===value;return <Pressable key={item.value} accessibilityRole="tab" accessibilityLabel={item.value} accessibilityState={{selected,disabled:!!action?.busy}} aria-selected={selected} disabled={!!action?.busy} onPress={()=>onChange(item.value)} style={({pressed})=>({flex:1,minWidth:0,minHeight:68,paddingHorizontal:3,paddingVertical:10,alignItems:'center',justifyContent:'center',gap:6,borderRadius:17,borderWidth:1,borderColor:selected?C.primary:C.line,backgroundColor:selected?C.primary:'#fff',opacity:pressed?0.7:1})}><Icon name={item.icon} size={21} color={selected?'#fff':C.muted}/><T style={{fontSize:11,fontFamily:selected?F.bold:F.medium,color:selected?'#fff':C.muted,textAlign:'center'}}>{item.label}</T></Pressable>;})}</Row>
  </View>;
}
