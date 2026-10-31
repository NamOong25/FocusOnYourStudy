import type { PlanInput, PlanSnapshot } from './studyPlansApi';
import { planClock, planDay, planWall, utcNanos } from './planTime';

export type PlanDraft={index:number;title:string;date:string;start:string;duration:string;selected:boolean;originalStartsAt:string;edited:boolean};
export function planDrafts(value:PlanSnapshot):PlanDraft[]{return value.sessions.map(s=>({index:s.index,title:s.title,date:planDay(Date.parse(s.startsAt),value.timeZone),start:planClock(s.startsAt,value.timeZone),duration:String(s.durationMinutes),selected:true,originalStartsAt:s.startsAt,edited:false}));}
export function draftReview(drafts:PlanDraft[],input:PlanInput,snapshot:PlanSnapshot,now=Date.now()){
  const issues:Record<number,string[]>={},intervals:{index:number;start:bigint;end:bigint}[]=[];let selectedMinutes=0;
  const add=(index:number,message:string)=>{const rows=issues[index]??=[];if(!rows.includes(message))rows.push(message);};
  for(const d of drafts){if(!d.selected)continue;
    if(!d.title.trim()||d.title.trim().length>200)add(d.index,'Tên buổi cần 1–200 ký tự.');
    if(!/^\d+$/.test(d.duration)||Number(d.duration)<1||Number(d.duration)>240){add(d.index,'Thời lượng cần 1–240 phút.');continue;}
    selectedMinutes+=Number(d.duration);
    try{
      const start=planWall(d.date,d.start,input.timeZone,d.originalStartsAt),finish=new Date(Date.parse(start)+Number(d.duration)*60000).toISOString(),ns=utcNanos(start)!,ne=utcNanos(finish)!;
      const weekday=new Date(d.date+'T00:00:00Z').getUTCDay()||7;
      if(d.date<input.fromDate||d.date>input.toDate||!input.weekdays.includes(weekday)||d.start<input.availableStart||planDay(Date.parse(finish),input.timeZone)!==d.date||planClock(finish,input.timeZone)>input.availableEnd)add(d.index,'Buổi nằm ngoài ngày/thứ hoặc khung giờ rảnh đã chọn.');
      if(ns<BigInt(now)*1_000_000n||ns<utcNanos(snapshot.asOf)!)add(d.index,'Giờ bắt đầu đã qua.');
      if(ne>=BigInt(Date.UTC(2100,0,1))*1_000_000n)add(d.index,'Buổi cần kết thúc trước năm 2100 theo UTC.');
      if(snapshot.target.deadline&&ne>utcNanos(snapshot.target.deadline)!)add(d.index,'Buổi kết thúc sau deadline hoặc giờ bắt đầu thi.');
      intervals.push({index:d.index,start:ns,end:ne});
    }catch{add(d.index,'Ngày/giờ không hợp lệ, không tồn tại hoặc bị lặp trong múi giờ đã chọn.');}
  }
  intervals.sort((a,b)=>a.start<b.start?-1:a.start>b.start?1:0);
  for(let i=0;i<intervals.length;i++)for(let j=i+1;j<intervals.length;j++){const a=intervals[i]!,b=intervals[j]!;
    if(b.start>=a.end+BigInt(input.breakMinutes)*60_000_000_000n)break;
    add(a.index,'Trùng hoặc chưa đủ thời gian nghỉ giữa các buổi đang chọn.');add(b.index,'Trùng hoặc chưa đủ thời gian nghỉ giữa các buổi đang chọn.');}
  return{issues,selectedMinutes,selectedCount:drafts.filter(d=>d.selected).length,remainingMinutes:Math.max(0,input.totalMinutes-selectedMinutes),overBudget:selectedMinutes>input.totalMinutes,edited:drafts.some(d=>d.edited)};
}
