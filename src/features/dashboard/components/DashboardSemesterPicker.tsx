import React from 'react';
import {Pressable,View} from 'react-native';
import {Badge,Button,Icon,Row,Sheet,T} from '../../../shared/components';
import type {Semester} from '../../academics/academic';
import {C,F,S} from '../../../shared/theme';

export default function DashboardSemesterPicker({semesters,selectedId,onSelect,onClose,onManage}:{semesters:Semester[];selectedId:string;onSelect:(id:string)=>void;onClose:()=>void;onManage:()=>void}){
  const sorted=[...semesters].sort((a,b)=>b.academicYear.localeCompare(a.academicYear)||a.term-b.term);
  return <Sheet title="Học kỳ trên Trang chủ" onClose={onClose}><T style={S.small}>Lịch học, bài tập, lịch thi và điểm trên Trang chủ sẽ hiển thị theo học kỳ bạn chọn.</T>{sorted.map(s=><Pressable key={s.id} accessibilityRole="radio" accessibilityLabel={`Dashboard: ${s.name}, ${s.academicYear}`} accessibilityState={{checked:selectedId===s.id}} aria-checked={selectedId===s.id} onPress={()=>onSelect(s.id)} style={{padding:15,minHeight:80,borderRadius:18,borderWidth:1,borderColor:selectedId===s.id?C.primary:C.line,backgroundColor:selectedId===s.id?C.soft:C.canvas}}><Row><Icon name={selectedId===s.id?'radio-button-on':'radio-button-off'}/><View style={[S.grow,{gap:5}]}><T style={{fontFamily:F.bold,fontSize:15}}>{s.name}</T><T style={S.small}>{s.academicYear}</T></View><Badge label={s.status} bg="#FFFFFFAA"/></Row></Pressable>)}<Button label="Quản lý học kỳ và môn" secondary onPress={onManage}/></Sheet>;
}
