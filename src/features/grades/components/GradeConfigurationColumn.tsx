import React from 'react';
import {Pressable,View} from 'react-native';
import {Badge,Card,Field,Icon,Row,Segments,T} from '../../../shared/components';
import {C,F,S} from '../../../shared/theme';
import GradePartPicker from '../GradePartPicker';
import type {GradeKind} from '../grades';
import {gradeKindLabels} from '../serverGradeView';
import {allowedConfigurationKinds,type ConfigurationDraft,type ConfigurationKind} from '../gradeConfigurationDraft';

type Part=ConfigurationDraft['parts'][number];
export default function GradeConfigurationColumn({part,index,count,assessment,scored,disabled,onChange,onMove,onRemove}:{
  part:Part;index:number;count:number;assessment:ConfigurationDraft['assessment'];scored:boolean;disabled:boolean;
  onChange:(part:Part)=>void;onMove:(delta:number)=>void;onRemove:()=>void;
}){
  const kinds=allowedConfigurationKinds(assessment),locked=scored||disabled;
  const control=(label:string,icon:'arrow-up'|'arrow-down'|'trash-outline',blocked:boolean,onPress:()=>void)=><Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:blocked}} disabled={blocked} onPress={onPress} style={{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',opacity:blocked?0.3:1}}><Icon name={icon} color={icon==='trash-outline'?C.red:C.primary} size={18}/></Pressable>;
  return <Card style={{backgroundColor:C.canvas,gap:13}}>
    <Row between><Badge label={`Cột ${index}`}/><Row style={{gap:0}}>
      {control(`Đưa cột ${index} lên`,'arrow-up',disabled||index===1,()=>onMove(-1))}
      {control(`Đưa cột ${index} xuống`,'arrow-down',disabled||index===count,()=>onMove(1))}
      {control(`Xóa cột điểm ${index}`,'trash-outline',locked,onRemove)}
    </Row></Row>
    {scored&&<><Badge label="Đã có điểm · Giữ loại cột và cách quy đổi" icon="lock-closed-outline"/><T style={S.small}>Bạn vẫn có thể đổi tên và thứ tự cột này.</T></>}
    <Field label="Tên cột điểm" accessibilityLabel={`Tên cột điểm ${index}`} value={part.name} onChange={name=>onChange({...part,name})} maxLength={200} disabled={disabled}/>
    <GradePartPicker index={index} value={gradeKindLabels[part.kind] as GradeKind} options={kinds.map(k=>gradeKindLabels[k] as GradeKind)} disabled={locked} onChange={label=>{
      const kind=kinds.find(k=>gradeKindLabels[k]===label) as ConfigurationKind|undefined;if(!kind)return;
      onChange({...part,kind,name:part.name===gradeKindLabels[part.kind]?gradeKindLabels[kind]!:part.name,project:kind==='PROJECT'?(part.project??{target:'FINAL',share:''}):null});
    }}/>
    {part.project&&<View style={{gap:12,borderTopWidth:1,borderColor:C.line,paddingTop:13}}>
      <T style={{fontFamily:F.bold,fontSize:13}}>Bài tập lớn tính vào đâu?</T>
      {assessment==='PRACTICAL'&&!locked?<Segments values={['Một cột thực hành','Điểm cuối kỳ']} value={part.project.target==='PRACTICE'?'Một cột thực hành':'Điểm cuối kỳ'} onChange={value=>onChange({...part,project:{target:value==='Một cột thực hành'?'PRACTICE':'FINAL',share:value==='Một cột thực hành'?'100':''}})}/>
        :<T style={S.small}>{part.project.target==='PRACTICE'?'BTL thay một cột thực hành.':'BTL làm hoặc góp vào cột cuối kỳ.'}</T>}
      {part.project.target==='PRACTICE'?<T style={S.small}>BTL chiếm 100% cột này và chỉ tính một lần trong bộ cột thực hành.</T>:<>
        {!locked&&<Segments values={['Toàn bộ cột cuối kỳ','Một phần cột cuối kỳ']} value={part.project.share==='100'?'Toàn bộ cột cuối kỳ':'Một phần cột cuối kỳ'} onChange={value=>onChange({...part,project:{target:'FINAL',share:value==='Toàn bộ cột cuối kỳ'?'100':''}})}/>}
        {part.project.share==='100'?<T style={S.small}>Điểm BTL là toàn bộ điểm cuối kỳ. Không tạo thêm cột cuối kỳ thứ hai.</T>:<Field label="BTL chiếm bao nhiêu % cột cuối kỳ?" accessibilityLabel={`Tỷ lệ BTL cột ${index}`} value={part.project.share} onChange={share=>onChange({...part,project:{target:'FINAL',share}})} placeholder="Nhập theo đề cương, ví dụ 40" numeric disabled={locked} maxLength={12}/>}
        <T style={S.small}>Tỷ lệ này tính trong cột cuối kỳ. Phần điểm còn lại sẽ được nhập ở bước nhập điểm.</T>
      </>}
    </View>}
  </Card>;
}
