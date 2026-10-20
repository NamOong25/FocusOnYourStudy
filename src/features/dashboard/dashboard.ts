import type {Course} from '../academics/academic';
import type {Task} from '../../store/model';
import type {ClassOccurrence,Exam} from '../schedule/calendar';
import type {StudySession} from '../study/learning';
import {courseResult,summarizeGrades,type GradeBook,type GradeRules} from '../grades/grades';
import {dateKey} from '../../shared/utils/dates';
import {compareTaskDeadlines,taskIsOverdue,taskIsSoon} from '../assignments/assignments';

export function examCountdown(exam:Exam,now:Date):string {
  const start=new Date(`${exam.date}T${exam.time}:00`).getTime(),end=new Date(`${exam.date}T${exam.end}:00`).getTime();
  if(end<=now.getTime())return 'Đã kết thúc';
  if(start<=now.getTime())return 'Đang diễn ra';
  const minutes=Math.ceil((start-now.getTime())/60000);
  if(minutes<60)return `Còn ${minutes} phút`;
  if(minutes<1440)return `Còn ${Math.floor(minutes/60)} giờ${minutes%60?` ${minutes%60} phút`:''}`;
  return `Còn ${Math.ceil(minutes/1440)} ngày`;
}

// Every dashboard section uses course IDs from one semester; titles are not identities.
export function dashboardData(input:{semesterId:string;catalog:Course[];tasks:Task[];exams:Exam[];sessions:StudySession[];classes:ClassOccurrence[];book:GradeBook;rules:GradeRules;now:Date}){
  const {semesterId,catalog,book,rules,now}=input,today=dateKey(now);
  const courses=catalog.filter(c=>c.semesterId===semesterId),ids=new Set(courses.map(c=>c.id));
  const tasks=input.tasks.filter(t=>ids.has(t.courseId));
  const pending=tasks.filter(t=>t.status!=='Hoàn thành').sort(compareTaskDeadlines);
  const overdue=pending.filter(t=>taskIsOverdue(t,now)),soon=pending.filter(t=>taskIsSoon(t,now));
  const done=tasks.length-pending.length,percent=tasks.length?Math.round(done/tasks.length*100):0;
  const exams=input.exams.filter(e=>ids.has(e.courseId)&&new Date(`${e.date}T${e.end}:00`).getTime()>now.getTime()).sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const classes=input.classes.filter(c=>ids.has(c.courseId)&&c.date===today&&!c.cancelled).sort((a,b)=>a.start.localeCompare(b.start));
  const sessions=input.sessions.filter(s=>ids.has(s.courseId)),todaySessions=sessions.filter(s=>s.date===today).sort((a,b)=>a.start.localeCompare(b.start));
  const failed=courses.filter(c=>courseResult(book[c.id],rules).failed),summary=summarizeGrades(courses,book,rules);
  return {courses,tasks,pending,overdue,soon,done,percent,nextExam:exams[0],classes,sessions,todaySessions,failed,summary,today};
}
