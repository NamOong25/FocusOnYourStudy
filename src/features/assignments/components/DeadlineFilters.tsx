import React from 'react';
import {Pressable} from 'react-native';
import {Row,T} from '../../../shared/components';
import {useActionState} from '../../../shared/feedback/ActionScope';
import {C,F} from '../../../shared/theme';
import {DeadlineFilter,deadlineFilters} from '../assignments';

export default function DeadlineFilters({value,onChange}:{value:DeadlineFilter;onChange:(value:DeadlineFilter)=>void}){
  const action=useActionState();
  return <Row style={{gap:5}}>{deadlineFilters.map(label=><Pressable key={label} accessibilityRole="tab" accessibilityLabel={`Lọc hạn nộp: ${label}`} aria-selected={value===label} accessibilityState={{selected:value===label,disabled:!!action?.busy}} disabled={!!action?.busy} onPress={()=>onChange(label)} style={{flex:1,minWidth:0,minHeight:44,padding:5,borderRadius:14,borderWidth:1,borderColor:value===label?C.primary:C.line,backgroundColor:value===label?C.soft:'#fff',justifyContent:'center',alignItems:'center'}}><T style={{fontSize:11,textAlign:'center',color:value===label?C.primary:C.muted,fontFamily:value===label?F.bold:F.medium}}>{label}</T></Pressable>)}</Row>;
}
