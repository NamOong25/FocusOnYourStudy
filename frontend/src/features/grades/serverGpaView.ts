import type {ServerSemesterGrades} from './api/gradesReadApi';
export function semesterGpaCaption(s:ServerSemesterGrades['summary']){return s.state==='EMPTY'?'Học kỳ chưa có môn':s.gpa===null?'Chưa đủ dữ liệu':s.state==='PARTIAL'?'GPA tạm tính · Còn môn chưa đủ kết quả':'Đủ kết quả trong dữ liệu đã nhập';}
export function serverGpaDifference(a:ServerSemesterGrades['summary'],b:ServerSemesterGrades['summary']){
  if(a.gpa===null||b.gpa===null)return null;
  const n=Number((b.gpa-a.gpa).toFixed(2));return{amount:Object.is(n,-0)?0:n,provisional:a.state!=='COMPLETE'||b.state!=='COMPLETE'};
}
