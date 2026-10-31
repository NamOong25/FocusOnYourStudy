import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Button, Card, Field, Icon, Row, Segments, Sheet, StateView, T } from '../../shared/components';
import { DateField, TimeField } from '../../shared/components/DateTimePicker';
import { C, F, S } from '../../shared/theme';
import { ApiError, asApiError } from '../../shared/api/http';
import { useApp } from '../../store/model';
import { useAuth } from '../account/auth/AuthProvider';
import { CourseChoices } from '../academics/CourseChoices';
import { deadlineTimestamp, taskDeadlineLabel } from '../assignments/assignments';
import { useServerAllExams } from '../exams/api/useServerExams';
import { examDate, examTiming } from '../exams/examView';
import { draftReview, planDrafts, type PlanDraft } from './api/planDrafts';
import { planClock, planDay } from './api/planTime';
import { validatePlanInput, type PlanInput } from './api/studyPlansApi';
import { usePlanPreview } from './api/usePlanPreview';
import { PlanSessionCard } from './components/PlanSessionCard';

type Props={variant:'deadline'|'free'|'adjust';request?:string;onClose:()=>void;onStudyPlan:()=>void};
type Form={courseId:string;target:string;targetId:string;goal:string;fromDate:string;toDate:string;timeZone:string;availableStart:string;availableEnd:string;weekdays:number[];total:string;session:string;rest:string};
const labels=['T2','T3','T4','T5','T6','T7','CN'];
const dateAfter=(day:string,days:number)=>new Date(Date.parse(day+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
export default function ServerStudyPlanFlow({variant,request='',onClose,onStudyPlan}:Props){
  const app=useApp(),auth=useAuth(),exams=useServerAllExams(variant!=='adjust'),preview=usePlanPreview();
  const [form,setForm]=useState<Form>(()=>{const zone=auth.profile?.timeZone||'Asia/Ho_Chi_Minh',day=planDay(Date.now(),zone),pending=app.tasks.find(t=>t.status!=='Hoàn thành'&&deadlineTimestamp(t)>Date.now());
    return{courseId:(variant==='deadline'?pending?.courseId:null)??app.courseCatalog[0]?.id??'',target:variant==='deadline'&&pending?'Bài tập':'Tự học',targetId:variant==='deadline'?pending?.id??'':'',goal:(request||'Ôn kiến thức và luyện bài tập').slice(0,120),fromDate:day,toDate:dateAfter(day,6),timeZone:zone,availableStart:'19:00',availableEnd:'21:00',weekdays:[1,2,3,4,5,6,7],total:'180',session:'45',rest:'10'};});
  const [step,setStep]=useState<'input'|'review'>('input'),[localError,setError]=useState(''),[submitted,setSubmitted]=useState<PlanInput|null>(null),[drafts,setDrafts]=useState<PlanDraft[]>([]),[editing,setEditing]=useState<number|null>(null),[touched,setTouched]=useState(false),[baseline,setBaseline]=useState(''),[now,setNow]=useState(Date.now());
  const generation=useRef(0);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>{clearInterval(timer);generation.current++;};},[]);
  useEffect(()=>{if(!form.courseId&&app.courseCatalog.length)setForm(f=>({...f,courseId:app.courseCatalog[0]!.id}));},[form.courseId,app.courseCatalog]);
  const update=(patch:Partial<Form>)=>{generation.current++;preview.clear();setForm(f=>({...f,...patch}));setError('');setTouched(true);};
  const catalogError=app.courseConnection?.error??app.semesterConnection?.error;
  const sourcesReady=!!app.courseConnection?.loaded&&!!app.semesterConnection?.loaded&&!catalogError&&(form.target!=='Bài tập'||!!app.assignmentConnection?.loaded&&!app.assignmentConnection.error)&&(form.target!=='Kỳ thi'||exams.loaded&&!exams.error);
  const sourceError=catalogError??(form.target==='Bài tập'?app.assignmentConnection?.error:form.target==='Kỳ thi'?exams.error:null);
  const stamp=JSON.stringify([app.courseCatalog.map(c=>[c.id,c.version]),app.tasks.map(t=>[t.id,t.version]),(exams.value??[]).map(e=>[e.id,e.version]),app.studySessions.map(s=>[s.id,s.version]),app.scheduleRevision]);
  const snapshot=preview.state.value,course=app.courseCatalog.find(c=>c.id===snapshot?.courseId),targetTask=app.tasks.find(t=>t.id===snapshot?.target.id),targetExam=exams.value?.find(e=>e.id===snapshot?.target.id);
  const sourceChanged=!!snapshot&&(baseline!==stamp||course?.version!==snapshot.courseVersion||snapshot.target.kind==='ASSIGNMENT'&&targetTask?.version!==snapshot.target.version||snapshot.target.kind==='EXAM'&&targetExam?.version!==snapshot.target.version);
  const review=snapshot&&submitted?draftReview(drafts,submitted,snapshot,now):null;
  const reload=async()=>{try{await Promise.all([app.courseConnection?.reload(),app.semesterConnection?.reload(),app.assignmentConnection?.reload(),exams.reload()]);setError('');}catch(error){setError(asApiError(error).message);}};
  const generate=async()=>{
    try{
      if(!sourcesReady)throw new ApiError('Tải lại danh mục môn và mục tiêu trước khi tạo đề xuất.','INVALID_STUDY_PLAN');
      const next:PlanInput={courseId:form.courseId,goal:form.goal,fromDate:form.fromDate,toDate:form.toDate,timeZone:form.timeZone,availableStart:form.availableStart,availableEnd:form.availableEnd,weekdays:[...form.weekdays],totalMinutes:/^\d+$/.test(form.total)?Number(form.total):NaN,sessionMinutes:/^\d+$/.test(form.session)?Number(form.session):NaN,breakMinutes:/^\d+$/.test(form.rest)?Number(form.rest):NaN,
        ...(form.target==='Bài tập'?{assignmentId:form.targetId}:form.target==='Kỳ thi'?{examId:form.targetId}:{})};
      validatePlanInput(next);if(!app.courseCatalog.some(c=>c.id===next.courseId))throw new ApiError('Môn học không còn trong danh sách. Chọn lại môn.','INVALID_STUDY_PLAN');
      const task=app.tasks.find(t=>t.id===next.assignmentId),exam=exams.value?.find(e=>e.id===next.examId);
      if(next.assignmentId&&(!task||task.courseId!==next.courseId||task.status==='Hoàn thành'))throw new ApiError('Chọn bài chưa hoàn thành thuộc đúng môn.','INVALID_STUDY_PLAN');
      if(next.examId&&(!exam||exam.courseId!==next.courseId))throw new ApiError('Chọn kỳ thi thuộc đúng môn.','INVALID_STUDY_PLAN');
      setError('');const seq=++generation.current;setSubmitted(next);setBaseline(stamp);const result=await preview.generate(next);
      if(seq!==generation.current)return;setDrafts(planDrafts(result));setEditing(null);setStep('review');setTouched(false);
    }catch(error){const failure=asApiError(error);if(failure.code!=='REQUEST_CANCELLED')setError(failure.message);}
  };
  if(variant==='adjust')return <Sheet title="Điều chỉnh buổi học đã lưu" onClose={onClose}><Badge label="Dữ liệu tài khoản"/><T style={S.small}>Đề xuất tự động dành cho các buổi mới. Bạn có thể chỉnh từng buổi đã lưu tại Tự học; điều chỉnh cả kế hoạch sẽ được bổ sung sau.</T><Button label="Đến Tự học" onPress={onStudyPlan}/></Sheet>;
  const title=step==='review'?'Xem trước kế hoạch':'Tạo đề xuất kế hoạch';
  return <Sheet title={title} onClose={onClose} scrollKey={step} dirty={touched||!!review?.edited} onBack={()=>step==='review'?setStep('input'):onClose()}>
    <Badge label="LỊCH THẬT · ĐỀ XUẤT THEO QUY TẮC" icon="calendar-outline"/>
    {step==='input'&&<>
      <Card style={{backgroundColor:C.soft,gap:8}}><T style={{fontFamily:F.extra,fontSize:21}}>Một kế hoạch vừa sức với bạn.</T><T style={S.small}>Chọn mục tiêu và giờ rảnh. Ứng dụng tìm khoảng trống từ lịch đã lưu; bạn xem trước kết quả trước khi quyết định.</T></Card>
      {!sourcesReady&&<StateView kind={sourceError?'error':'loading'} title={sourceError?'Chưa tải được danh mục':'Đang tải môn và mục tiêu'} message={sourceError?.message??'Chờ dữ liệu tài khoản để chọn đúng môn và mục tiêu.'} actionLabel={sourceError?'Tải lại danh mục':undefined} onAction={sourceError?()=>{void reload();}:undefined}/>}
      {!!app.courseConnection?.loaded&&!app.courseCatalog.length&&<StateView title="Cần một môn học để lập kế hoạch" message="Thêm học kỳ và môn học rồi quay lại." actionLabel="Đến Môn & học kỳ" onAction={()=>{onClose();app.setScheduleMode('Môn & học kỳ');}}/>}
      {!!app.courseCatalog.length&&<><T style={{fontFamily:F.bold}}>Môn học</T><CourseChoices value={form.courseId} onChange={courseId=>update({courseId,targetId:''})}/></>}
      <T style={{fontFamily:F.bold}}>Mục tiêu gắn với</T><Segments values={['Bài tập','Kỳ thi','Tự học']} value={form.target} onChange={target=>update({target,targetId:''})}/>
      {form.target==='Bài tập'&&<>{app.tasks.filter(t=>t.courseId===form.courseId&&t.status!=='Hoàn thành').map(t=><Target key={t.id} label={t.title} detail={`Hạn nộp ${taskDeadlineLabel(t)}`} selected={form.targetId===t.id} onPress={()=>update({targetId:t.id})}/>)}{!app.tasks.some(t=>t.courseId===form.courseId&&t.status!=='Hoàn thành')&&<T style={S.small}>Chưa có bài chưa hoàn thành cho môn này. Chọn môn khác hoặc Tự học.</T>}</>}
      {form.target==='Kỳ thi'&&<>{(exams.value??[]).filter(e=>e.courseId===form.courseId).map(e=><Target key={e.id} label={`Kỳ thi ${examDate(e)} · ${examTiming(e)}`} detail={`${e.room||'Chưa có phòng'} · ${e.timeZone}`} selected={form.targetId===e.id} onPress={()=>update({targetId:e.id})}/>)}{exams.loaded&&!exams.value?.some(e=>e.courseId===form.courseId)&&<T style={S.small}>Chưa có lịch thi cho môn này.</T>}</>}
      <Field label="Mục tiêu học tập" value={form.goal} onChange={goal=>update({goal})} multiline maxLength={120}/>{!!request&&<T style={S.small}>Nội dung bạn nhập được dùng làm mục tiêu, chưa có AI phân tích câu hỏi.</T>}
      <DateField label="Từ ngày" value={form.fromDate} onChange={fromDate=>update({fromDate})}/><DateField label="Đến ngày" value={form.toDate} onChange={toDate=>update({toDate})}/>
      <Field label="Múi giờ kế hoạch" value={form.timeZone} onChange={timeZone=>update({timeZone})} maxLength={100}/><T style={S.small}>Ngày và giờ trong biểu mẫu theo múi giờ này. Ví dụ Asia/Ho_Chi_Minh là giờ Việt Nam.</T>
      <Row style={{alignItems:'flex-start'}}><View style={S.grow}><TimeField label="Rảnh từ" value={form.availableStart} onChange={availableStart=>update({availableStart})}/></View><View style={S.grow}><TimeField label="Rảnh đến" value={form.availableEnd} onChange={availableEnd=>update({availableEnd})}/></View></Row>
      <T style={{fontFamily:F.bold}}>Các ngày rảnh trong tuần</T><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{labels.map((label,i)=>{const checked=form.weekdays.includes(i+1);return <Pressable key={label} accessibilityRole="checkbox" accessibilityLabel={`Ngày rảnh ${label}`} accessibilityState={{checked}} aria-checked={checked} onPress={()=>update({weekdays:checked?form.weekdays.filter(d=>d!==i+1):[...form.weekdays,i+1].sort()})} style={{minWidth:48,minHeight:44,padding:12,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:checked?C.primary:C.canvas}}><T style={{color:checked?'#fff':C.ink,fontFamily:F.semi}}>{label}</T></Pressable>;})}</View>
      <Field label="Thời gian cần học thêm (phút)" value={form.total} onChange={total=>update({total})} numeric maxLength={4}/><Segments values={['90','180','240']} value={form.total} onChange={total=>update({total})}/>
      <Field label="Mỗi buổi (phút)" value={form.session} onChange={session=>update({session})} numeric maxLength={3}/><Segments values={['25','45','60','90']} value={form.session} onChange={session=>update({session})}/>
      <Field label="Nghỉ giữa buổi (phút)" value={form.rest} onChange={rest=>update({rest})} numeric maxLength={2}/>
      {!!localError&&<T accessibilityRole="alert" style={{color:C.red}}>{localError}</T>}
      <Button label={preview.state.error?'Thử tạo lại đề xuất':'Tạo đề xuất'} icon="sparkles-outline" loading={preview.state.loading} disabled={!sourcesReady||!form.courseId} onPress={()=>{void generate();}}/>
      {preview.state.loading&&<T accessibilityLiveRegion="polite" style={S.small}>Đang đọc lịch thật và tìm khoảng trống. Bạn có thể thay điều kiện để hủy lượt này.</T>}
      <T style={S.small}>Tối đa 14 ngày và 1440 phút mỗi lần. Tổng phút là phần muốn xếp thêm; buổi đã lưu được tính là lịch bận. Đây là bộ xếp lịch theo quy tắc, chưa gọi dịch vụ AI.</T>
    </>}
    {step==='review'&&snapshot&&submitted&&review&&<>
      <Card style={{backgroundColor:C.soft,gap:9}}><T style={{fontFamily:F.extra,fontSize:21}}>{snapshot.complete?'Đã tìm đủ thời gian học':'Kế hoạch còn thiếu thời gian'}</T><T style={{fontFamily:F.bold,color:C.primary}}>Đã xếp {snapshot.scheduledMinutes}/{snapshot.requestedMinutes} phút · còn thiếu {snapshot.unscheduledMinutes} phút</T><T style={S.small}>{snapshot.sessions.length} buổi · {snapshot.fromDate.split('-').reverse().join('/')} → {snapshot.toDate.split('-').reverse().join('/')} · {snapshot.timeZone}</T><T style={S.small}>Tính lúc {planClock(snapshot.asOf,snapshot.timeZone)} · {planDay(Date.parse(snapshot.asOf),snapshot.timeZone).split('-').reverse().join('/')}. Chưa lưu vào lịch.</T></Card>
      {sourceChanged&&<Card style={{backgroundColor:C.amberSoft,gap:8}}><T accessibilityRole="alert" style={{color:C.amber}}>Dữ liệu môn hoặc lịch/mục tiêu đã được cập nhật. Bản đề xuất vẫn được giữ để xem; hãy tạo lại với dữ liệu mới.</T><Button label="Tải lại danh mục" secondary onPress={()=>{void reload();}}/></Card>}
      {snapshot.target.deadline&&<Badge label={`Kết thúc không sau ${planDay(Date.parse(snapshot.target.deadline),snapshot.timeZone).split('-').reverse().join('/')} · ${planClock(snapshot.target.deadline,snapshot.timeZone)}`} icon="flag-outline"/>}
      {snapshot.warnings.includes('DST_WINDOW_SKIPPED')&&<T style={{color:C.amber}}>Một số ngày có giờ rảnh không tồn tại hoặc lặp do đổi giờ đã được bỏ qua.</T>}
      {snapshot.warnings.includes('DEADLINE_LIMIT')&&<T style={S.small}>Thời gian có thể xếp đã được giới hạn theo deadline hoặc giờ bắt đầu thi.</T>}
      {!drafts.length&&<StateView title="Chưa tìm được khoảng phù hợp" message="Thử mở rộng giờ rảnh, chọn thêm ngày hoặc giảm thời lượng mỗi buổi."/>}
      <T accessibilityLiveRegion="polite" style={{fontFamily:F.bold}}>Đang chọn {review.selectedCount} buổi · {review.selectedMinutes} phút · còn thiếu {review.remainingMinutes} phút</T>
      {review.overBudget&&<T accessibilityRole="alert" style={{color:C.red}}>Các buổi đang chọn vượt tổng thời gian yêu cầu. Giảm thời lượng hoặc bỏ chọn một số buổi.</T>}
      {review.edited&&<T accessibilityRole="alert" style={{color:C.amber}}>Bạn đã chỉnh bản xem trước. Kiểm tra dưới đây chỉ xét ngày/giờ, deadline và các buổi đang chọn; các thay đổi chưa được kiểm tra lại với toàn bộ lịch bận.</T>}
      {drafts.map(d=><PlanSessionCard key={d.index} draft={d} zone={snapshot.timeZone} expanded={editing===d.index} onExpand={()=>setEditing(editing===d.index?null:d.index)} issues={review.issues[d.index]??[]} onChange={patch=>{setDrafts(rows=>rows.map(row=>row.index===d.index?{...row,...patch,edited:row.edited||Object.keys(patch).some(key=>key!=='selected')}:row));setTouched(true);}}/>)}
      <Card style={{backgroundColor:C.canvas,gap:8}}><T style={{fontFamily:F.bold}}>Bản xem trước chưa được lưu</T><T style={S.small}>Việc chọn hoặc sửa các buổi chưa thay đổi lịch của bạn. Chức năng lưu các buổi vào lịch sẽ được bổ sung sau, kèm kiểm tra lịch lại trước khi lưu.</T></Card>
      <Button label="Đổi điều kiện đề xuất" secondary onPress={()=>{setStep('input');setError('');}}/><Button label="Xem danh sách tự học" secondary onPress={onStudyPlan}/><Button label="Đóng bản xem trước" secondary onPress={onClose}/>
    </>}
  </Sheet>;
}
function Target({label,detail,selected,onPress}:{label:string;detail:string;selected:boolean;onPress:()=>void}){return <Pressable accessibilityRole="radio" accessibilityLabel={`Mục tiêu: ${label}`} accessibilityState={{checked:selected}} aria-checked={selected} onPress={onPress}><Card style={{backgroundColor:selected?C.soft:C.canvas,gap:7}}><Row><Icon name={selected?'radio-button-on':'radio-button-off'}/><T style={[S.grow,{fontFamily:F.semi}]}>{label}</T></Row><T style={S.small}>{detail}</T></Card></Pressable>;}
