import React,{useEffect,useState} from 'react';
import {useGradeConfigurationWrites} from '../api/GradeConfigurationWritesProvider';
import ServerGradeConfigurationEditor from './ServerGradeConfigurationEditor';
import ServerGradeScoresEditor from './ServerGradeScoresEditor';

export type ServerGradeEditMode='configuration'|'scores';
export default function ServerGradeEditorRouter({courseId,mode='scores',onClose}:{courseId:string;mode?:ServerGradeEditMode;onClose:()=>void}){
  const {state}=useGradeConfigurationWrites();
  const pending=state.pending?.course.id===courseId?state.pending:null;
  const recovery:ServerGradeEditMode|null=pending?(pending.operation==='scores'?'scores':'configuration'):null;
  const [selected,setSelected]=useState<ServerGradeEditMode>(()=>recovery??mode);
  useEffect(()=>{if(recovery)setSelected(recovery);},[recovery]);
  return (recovery??selected)==='scores'?<ServerGradeScoresEditor courseId={courseId} onClose={onClose} onConfigure={()=>setSelected('configuration')}/>:<ServerGradeConfigurationEditor courseId={courseId} onClose={onClose}/>;
}
