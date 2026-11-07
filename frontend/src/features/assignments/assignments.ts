import type {Course} from '../academics/academic';
import {addDays,dateKey,dateLabel,isValidDate,parseDay} from '../../shared/utils/dates';

export type TaskStatus='Chưa làm'|'Đang làm'|'Hoàn thành';
export type Task={id:string;title:string;courseId:string;course:string;deadline:string;deadlineTime?:string;priority:'Cao'|'Trung bình';status:TaskStatus;notes:string;version?:number;dueAt?:string};
export const deadlineFilters=['Tất cả','Hôm nay','Quá hạn','Sắp hạn'] as const;
export type DeadlineFilter=typeof deadlineFilters[number];
type Deadline=Pick<Task,'deadline'|'deadlineTime'|'dueAt'>;
const validTime=(s:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export function taskDeadlineTime(task:Deadline){return task.deadlineTime??'23:59';}
export function deadlineTimestamp(task:Deadline){
  if(task.dueAt)return new Date(task.dueAt).getTime();
  const time=taskDeadlineTime(task);
  return isValidDate(task.deadline)&&validTime(time)?new Date(`${task.deadline}T${time}:00`).getTime():NaN;
}
export function taskDeadlineLabel(task:Deadline,year=true){return `${dateLabel(task.deadline)}${year?`/${task.deadline.slice(0,4)}`:''} · ${taskDeadlineTime(task)}`;}
export function taskIsOverdue(task:Task,now=new Date()){return task.status!=='Hoàn thành'&&deadlineTimestamp(task)<now.getTime();}
export function taskIsSoon(task:Task,now=new Date()){
  const at=deadlineTimestamp(task);return task.status!=='Hoàn thành'&&at>=now.getTime()&&at<=addDays(now,7).getTime();
}
export function taskDueLabel(task:Task,now=new Date()){
  if(task.status==='Hoàn thành')return 'Đã hoàn thành';
  const distance=deadlineTimestamp(task)-now.getTime();if(!Number.isFinite(distance))return 'Hạn nộp chưa hợp lệ';
  if(distance<0){const minutes=Math.max(1,Math.ceil(-distance/60000));return minutes<60?`Trễ ${minutes} phút`:minutes<1440?`Trễ ${Math.floor(minutes/60)} giờ`:`Trễ ${Math.floor(minutes/1440)} ngày`;}
  if(task.deadline===dateKey(now)){const minutes=Math.ceil(distance/60000);return minutes===0?'Đến hạn':minutes<60?`Còn ${minutes} phút`:`Còn ${Math.floor(minutes/60)} giờ${minutes%60?` ${minutes%60} phút`:''}`;}
  const days=Math.round((parseDay(task.deadline).getTime()-parseDay(dateKey(now)).getTime())/86400000);return days===1?'Ngày mai':`Còn ${days} ngày`;
}
export function sessionExceedsDeadline(task:Deadline,session:{date:string;start:string;duration:number;startsAt?:string}){
  if(!isValidDate(session.date)||!validTime(session.start)||!Number.isFinite(session.duration)||session.duration<=0)return true;
  const due=deadlineTimestamp(task),end=(session.startsAt?Date.parse(session.startsAt):new Date(`${session.date}T${session.start}:00`).getTime())+session.duration*60000;
  return !Number.isFinite(due)||end>due;
}
export function compareTaskDeadlines(a:Task,b:Task){
  const left=deadlineTimestamp(a),right=deadlineTimestamp(b);
  return (Number.isFinite(left)?left:Infinity)-(Number.isFinite(right)?right:Infinity)||(a.priority===b.priority?0:a.priority==='Cao'?-1:1)||a.title.localeCompare(b.title);
}
const normalized=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLocaleLowerCase('vi').trim().replace(/\s+/g,' ');
export function filterAssignments(tasks:Task[],catalog:Course[],filters:{query:string;status:TaskStatus|'Tất cả';courseId:string;deadline:DeadlineFilter},now:Date){
  const query=normalized(filters.query),courses=new Map(catalog.map(c=>[c.id,c]));
  return tasks.filter(task=>{
    const course=courses.get(task.courseId);
    if(filters.status!=='Tất cả'&&task.status!==filters.status||filters.courseId&&task.courseId!==filters.courseId)return false;
    if(query&&!normalized(`${task.title} ${course?.name??task.course} ${course?.code??''}`).includes(query))return false;
    return filters.deadline==='Tất cả'||filters.deadline==='Hôm nay'&&task.deadline===dateKey(now)||filters.deadline==='Quá hạn'&&taskIsOverdue(task,now)||filters.deadline==='Sắp hạn'&&taskIsSoon(task,now);
  }).sort(compareTaskDeadlines);
}
