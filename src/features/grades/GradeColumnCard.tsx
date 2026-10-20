import React,{useState} from 'react';
import {View} from 'react-native';
import {Button,Card,Field,IconButton,Row,T} from '../../shared/components';
import {useActionState} from '../../shared/feedback/ActionScope';
import {C,F,S} from '../../shared/theme';
import {Assessment,GradeKind,GradePart,availablePartKinds,effectiveScore,projectAllocationLabel} from './grades';
import GradePartPicker from './GradePartPicker';
import ProjectAllocationEditor,{DraftProject} from './ProjectAllocationEditor';

export type DraftPart={id:string;name:string;kind:GradeKind;weight:number;score:string;project?:DraftProject};

export default function GradeColumnCard({part,value,index,assessment,aggregate,onChange,onKindChange,onDelete}:{
  part:DraftPart;value:GradePart;index:number;assessment:Assessment;aggregate:boolean;
  onChange:(patch:Partial<DraftPart>)=>void;onKindChange:(kind:GradeKind)=>void;onDelete:()=>void;
}){
  const [editingName,setEditingName]=useState(false),[confirmDelete,setConfirmDelete]=useState(false),action=useActionState();
  const score=effectiveScore(value),hasScore=part.score.trim()!==''||!!part.project?.remainderScore.trim();
  return <Card style={{backgroundColor:C.canvas,padding:14,gap:12}}>
    <Row between><View style={S.grow}><T style={{fontFamily:F.bold,fontSize:13}}>{part.name}</T><T style={S.small}>Cột {index}</T></View><IconButton name="create-outline" label={`Sửa tên cột điểm ${index}`} onPress={()=>setEditingName(v=>!v)} disabled={!!action?.busy}/><IconButton name="trash-outline" color={C.red} bg={C.redSoft} label={`Xóa cột điểm ${index}`} onPress={()=>hasScore?setConfirmDelete(true):onDelete()} disabled={!!action?.busy}/></Row>
    {confirmDelete&&<View style={{gap:10,padding:12,borderRadius:12,backgroundColor:C.redSoft}}><T style={S.small}>Xóa cột “{part.name}” và điểm đang nhập trong bản nháp? Bảng điểm đã lưu chỉ thay đổi khi bạn bấm Lưu.</T><Button label={`Xác nhận xóa cột ${index}`} danger onPress={onDelete}/><Button label={`Giữ lại cột ${index}`} secondary onPress={()=>setConfirmDelete(false)}/></View>}
    {editingName&&<Field label="Tên hiển thị" accessibilityLabel={`Tên cột điểm ${index}`} value={part.name} onChange={name=>onChange({name})} placeholder="Ví dụ: Kiểm tra tuần 3"/>}
    <GradePartPicker index={index} value={part.kind} options={availablePartKinds(assessment,value)} onChange={onKindChange}/>
    <Row style={{alignItems:'flex-start'}}><View style={S.grow}><Field label={part.kind==='Bài tập lớn'?'Điểm bài tập lớn / 10':aggregate?'Trung bình thường kỳ / 10':'Điểm / 10'} accessibilityLabel={`Điểm thành phần ${index}`} value={part.score} onChange={score=>onChange({score})} placeholder="Chưa nhập" numeric/></View><View style={[S.grow,{gap:8,paddingLeft:5}]}><T style={{fontFamily:F.semi,fontSize:12}}>Trọng số toàn môn</T><T style={{paddingVertical:14,fontSize:15,fontFamily:F.bold,color:C.primary}}>{Number(value.weight.toFixed(2))}%</T></View></Row>
    {part.kind==='Bài tập lớn'&&part.project&&<><ProjectAllocationEditor index={index} value={part.project} practical={assessment==='practical'} onChange={project=>onChange({project})}/><T style={{fontSize:12,lineHeight:20,color:C.primary}}>{projectAllocationLabel(value)} · Điểm cột sau quy đổi: {score===null?'Chưa đủ dữ liệu':score.toFixed(1)}</T></>}
  </Card>;
}
