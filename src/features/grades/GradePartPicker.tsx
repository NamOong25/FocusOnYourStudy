import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {Icon,Row,T} from '../../shared/components';
import {useActionState} from '../../shared/feedback/ActionScope';
import {C,F} from '../../shared/theme';
import {GradeKind} from './grades';

export default function GradePartPicker({index,value,options,onChange}:{index:number;value:GradeKind;options:GradeKind[];onChange:(value:GradeKind)=>void}){
  const [open,setOpen]=useState(false),action=useActionState();
  return <View style={{gap:8,flex:1}}><T style={{fontSize:11,fontFamily:F.semi,color:C.muted}}>Loại điểm · Thành phần {index}</T><Pressable disabled={!!action?.busy||options.length<2} accessibilityRole="button" accessibilityLabel={`Chọn loại thành phần ${index}`} accessibilityState={{expanded:open}} onPress={()=>setOpen(v=>!v)} style={{padding:13,borderWidth:1,borderColor:open?C.primary:C.line,borderRadius:12,backgroundColor:'#fff'}}><Row between><T style={{fontSize:13,fontFamily:F.semi,flex:1}}>{value}</T>{options.length>1&&<Icon name={open?'chevron-up':'chevron-down'} size={17}/>}</Row></Pressable>{open&&<View style={{backgroundColor:'#fff',borderRadius:12,borderWidth:1,borderColor:C.line,overflow:'hidden'}}>{options.map(option=><Pressable key={option} disabled={!!action?.busy} accessibilityRole="radio" accessibilityLabel={`Thành phần ${index}: ${option}`} accessibilityState={{checked:value===option}} onPress={()=>{onChange(option);setOpen(false);}} style={{padding:13,minHeight:46,backgroundColor:value===option?C.soft:'#fff'}}><Row><Icon size={17} name={value===option?'radio-button-on':'radio-button-off'}/><T style={{fontSize:12,flex:1}}>{option}</T></Row></Pressable>)}</View>}</View>;
}
