import { Course, Semester } from '../academics/academic';

export const gradePartOptions = ['Điểm thường kỳ', 'Kiểm tra thường kỳ', 'Giữa kỳ', 'Thực hành', 'Kiểm tra thực hành', 'Cuối kỳ'] as const;
export type GradeKind = typeof gradePartOptions[number];
export type Assessment = 'theory' | 'practical' | 'integrated' | 'pass-fail' | 'thesis' | 'custom';
export const assessmentOptions: {value:Assessment;label:string}[] = [{value:'theory',label:'Lý thuyết'},{value:'practical',label:'Thực hành'},{value:'integrated',label:'Tích hợp LT + TH'},{value:'pass-fail',label:'Đạt / không đạt'},{value:'thesis',label:'Đồ án / khóa luận'},{value:'custom',label:'Theo đề cương riêng'}];
export type GradePart = { id: string; name: string; kind?: GradeKind; weight: number; score: number | null };
export type CourseGrades = { parts: GradePart[]; previousCourseId?: string; assessment?: Assessment; theoryCredits?: number; practicalCredits?: number };
export type GradeBook = Record<string, CourseGrades>;
export type GradeRules = { scale: 'iuh' | 'expanded' | 'simple'; decimals: 1 | 2; retake: 'latest' | 'highest' };
export const defaultRules: GradeRules = { scale: 'iuh', decimals: 1, retake: 'highest' };
export const gradeScales = {
  iuh: [{ min: 9, letter: 'A+', point: 4 }, { min: 8.5, letter: 'A', point: 3.8 }, { min: 8, letter: 'B+', point: 3.5 }, { min: 7, letter: 'B', point: 3 }, { min: 6, letter: 'C+', point: 2.5 }, { min: 5.5, letter: 'C', point: 2 }, { min: 5, letter: 'D+', point: 1.5 }, { min: 4, letter: 'D', point: 1 }, { min: 0, letter: 'F', point: 0 }],
  expanded: [{ min: 8.5, letter: 'A', point: 4 }, { min: 8, letter: 'B+', point: 3.5 }, { min: 7, letter: 'B', point: 3 }, { min: 6.5, letter: 'C+', point: 2.5 }, { min: 5.5, letter: 'C', point: 2 }, { min: 5, letter: 'D+', point: 1.5 }, { min: 4, letter: 'D', point: 1 }, { min: 0, letter: 'F', point: 0 }],
  simple: [{ min: 8.5, letter: 'A', point: 4 }, { min: 7, letter: 'B', point: 3 }, { min: 5.5, letter: 'C', point: 2 }, { min: 4, letter: 'D', point: 1 }, { min: 0, letter: 'F', point: 0 }],
};
export function partKind(part: GradePart): GradeKind { return part.kind ?? (part.id==='mid'||part.name==='Giữa kỳ'?'Giữa kỳ':part.id==='final'||part.name==='Cuối kỳ'?'Cuối kỳ':gradePartOptions.includes(part.name as GradeKind)?part.name as GradeKind:'Điểm thường kỳ'); }
export function emptyGrades(): CourseGrades { return { assessment:'theory', parts: [{ id: 'regular', name: 'Điểm thường kỳ', kind:'Điểm thường kỳ', weight: 20, score: null }, { id: 'mid', name: 'Giữa kỳ', kind:'Giữa kỳ', weight: 30, score: null }, { id: 'final', name: 'Cuối kỳ', kind:'Cuối kỳ', weight: 50, score: null }] }; }
function example(scores: (number | null)[]): CourseGrades { return { ...emptyGrades(), parts: emptyGrades().parts.map((p,i) => ({ ...p, score: scores[i] ?? null })) }; }
export const initialGradeBook: GradeBook = {
  'course-oop': example([8,7.5,null]),
  'course-db': example([8,8,8.5]),
  'course-network': example([7,7.5,8]),
  'course-intro': example([8,8.5,9]),
  'course-linear': example([6,7,7]),
};
export function validateGrades(parts: GradePart[]): string | null {
  if (!parts.length || parts.length > 10) return 'Cần từ 1 đến 10 thành phần điểm.';
  if (new Set(parts.map(p => p.id)).size !== parts.length) return 'Các thành phần cần có mã riêng.';
  if (parts.some(p => !p.name.trim())) return 'Nhập tên cho từng thành phần điểm.';
  if (parts.some(p => !Number.isFinite(p.weight) || p.weight <= 0 || p.weight > 100)) return 'Trọng số phải lớn hơn 0 và không quá 100%.';
  if (Math.abs(parts.reduce((s,p) => s+p.weight,0)-100) > 0.000001) return 'Tổng trọng số phải bằng 100%.';
  if (parts.some(p => p.score !== null && (!Number.isFinite(p.score) || p.score < 0 || p.score > 10))) return 'Điểm cần từ 0 đến 10; để trống nếu chưa có.';
  return null;
}
const isPractice = (p:GradePart) => ['Thực hành','Kiểm tra thực hành'].includes(partKind(p));
export function validateAssessment(record:CourseGrades):string|null {
  const error=validateGrades(record.parts); if(error)return error;
  const mode=record.assessment??'custom', parts=record.parts;
  if(parts.some(p=>p.kind && !gradePartOptions.includes(p.kind)))return 'Chọn loại thành phần điểm hợp lệ.';
  if(mode==='practical' && parts.some(p=>!isPractice(p)))return 'Học phần thực hành chỉ gồm điểm thực hành hoặc kiểm tra thực hành.';
  if(mode==='practical' && parts.length!==(record.practicalCredits!==undefined&&record.practicalCredits>=3?5:3))return 'Thực hành cần 3 cột cho 1–2 tín chỉ, 5 cột khi từ 3 tín chỉ.';
  if(mode==='practical' && Math.max(...parts.map(p=>p.weight))-Math.min(...parts.map(p=>p.weight))>0.000001)return 'Điểm thực hành cần có trọng số bằng nhau (trung bình cộng).';
  if(mode==='theory'||mode==='integrated') {
    const lt=mode==='integrated'?record.theoryCredits!:1, th=mode==='integrated'?record.practicalCredits!:0;
    if(!Number.isFinite(lt)||lt<=0||!Number.isFinite(th)||th<0||(mode==='integrated'&&th<=0))return 'Nhập số tín chỉ lý thuyết và thực hành lớn hơn 0.';
    const ratio=lt/(lt+th), sum=(k:GradeKind[])=>parts.filter(p=>k.includes(partKind(p))).reduce((s,p)=>s+p.weight,0);
    if(parts.filter(p=>partKind(p)==='Giữa kỳ').length!==1||parts.filter(p=>partKind(p)==='Cuối kỳ').length!==1)return 'Cần đúng một cột giữa kỳ và một cột cuối kỳ.';
    if(Math.abs(sum(['Điểm thường kỳ','Kiểm tra thường kỳ'])-20*ratio)>0.000001||Math.abs(sum(['Giữa kỳ'])-30*ratio)>0.000001||Math.abs(sum(['Cuối kỳ'])-50*ratio)>0.000001||Math.abs(sum(['Thực hành','Kiểm tra thực hành'])-100*(1-ratio))>0.000001)return 'Trọng số cần đúng nhóm thường kỳ 20%, giữa kỳ 30%, cuối kỳ 50% của phần lý thuyết; thực hành theo tín chỉ.';
    const practice=parts.filter(isPractice);if(practice.length&&Math.max(...practice.map(p=>p.weight))-Math.min(...practice.map(p=>p.weight))>0.000001)return 'Các cột thực hành cần có trọng số bằng nhau.';
    const regular=parts.filter(p=>['Điểm thường kỳ','Kiểm tra thường kỳ'].includes(partKind(p)));if(regular.length>1&&Math.max(...regular.map(p=>p.weight))-Math.min(...regular.map(p=>p.weight))>0.000001)return 'Các cột thường kỳ cần trọng số bằng nhau để tính trung bình cộng.';
    if(mode==='integrated'&&practice.length!==(th>=3?5:3))return 'Số cột thực hành cần là 3 hoặc 5 theo số tín chỉ thực hành.';
  }
  if(mode==='thesis'&&parts.length!==1)return 'Đồ án / khóa luận dùng một cột điểm tổng kết.';
  return null;
}
export function assessmentTemplate(mode:Assessment,credits:number,theoryCredits=credits-1,practicalCredits=1):CourseGrades {
  if(mode==='custom')return {...emptyGrades(),assessment:mode};
  if(mode==='pass-fail'||mode==='thesis')return {assessment:mode,parts:[{id:'total',name:'Điểm tổng kết',kind:'Cuối kỳ',weight:100,score:null}]};
  const lt=mode==='integrated'?theoryCredits:credits,th=mode==='integrated'?practicalCredits:mode==='practical'?credits:0;
  const ratio=mode==='integrated'?lt/(lt+th):mode==='practical'?0:1;
  const parts:GradePart[]=ratio?emptyGrades().parts.map(p=>({...p,weight:p.weight*ratio})):[];
  if(th>0){const n=th>=3?5:3;for(let i=0;i<n;i++)parts.push({id:`practice-${i}`,name:`Thực hành ${i+1}`,kind:'Thực hành',weight:100*(1-ratio)/n,score:null});}
  return {assessment:mode,theoryCredits:lt,practicalCredits:th,parts};
}
export function courseResult(record: CourseGrades | undefined, rules: GradeRules) {
  const value=record??emptyGrades(), parts=value.parts, mode=value.assessment??'custom'; const valid=validateAssessment(value)===null;
  const entered=parts.filter(p=>p.score!==null), allEntered=valid&&entered.length===parts.length;
  const theory=mode==='theory'||mode==='integrated', mid=parts.find(p=>partKind(p)==='Giữa kỳ')?.score, final=parts.find(p=>partKind(p)==='Cuối kỳ')?.score;
  const blocked=valid&&theory&&mid===0, finalFailed=valid&&theory&&final!==null&&final!==undefined&&final<3;
  const complete=allEntered&&!blocked;
  let raw=complete?parts.reduce((sum,p)=>sum+p.score!*p.weight/100,0):null;
  if(raw!==null&&finalFailed){const ratio=mode==='integrated'?value.theoryCredits!/(value.theoryCredits!+value.practicalCredits!):1;raw=final!*ratio+parts.filter(isPractice).reduce((s,p)=>s+p.score!*p.weight/100,0);}
  const factor = 10 ** (rules.scale==='iuh'?1:rules.decimals);
  const total = raw === null ? null : Math.round((raw + Number.EPSILON * Math.max(1,Math.abs(raw))) * factor) / factor;
  const band = total === null ? null : gradeScales[rules.scale].find(b => total >= b.min)!;
  const threshold=mode==='pass-fail'||mode==='thesis'?5:4;
  const passed=total!==null&&total>=threshold;
  // A blocked exam identifies a problem but does not invent an official final score.
  const failed=valid&&(blocked||(total!==null&&!passed)||(mode==='theory'&&finalFailed));
  const status=!valid?'Dữ liệu chưa hợp lệ':blocked?'Không đủ điều kiện thi':failed?'Không đạt · Cần học lại':passed?'Đạt môn':'Chưa đủ dữ liệu';
  const reason=blocked?'Giữa kỳ bằng 0: không được dự thi cuối kỳ. Chưa tự gán điểm cuối kỳ hay tổng kết.':mode==='theory'&&finalFailed?'Cuối kỳ dưới 3,0: tổng kết bằng điểm cuối kỳ, xếp F.':total!==null&&!passed?`Tổng kết dưới ${threshold},0: chưa đạt môn.`:passed?`Đạt ngưỡng ${threshold},0 theo loại học phần đã chọn.`:'Để trống phần chưa có điểm; điểm 0 là kết quả đã nhập.';
  return { valid, complete, failed, blocked, status, reason, threshold, completeForGpa:complete&&mode!=='pass-fail', entered: entered.length, count: parts.length, enteredWeight: entered.reduce((s,p) => s+p.weight,0), total, raw, letter:mode==='pass-fail'?(total===null?null:passed?'P':'F'):band?.letter??null, point:mode==='pass-fail'?null:band?.point??null, passed };
}

// Derive attempts from stable course code, equal credits and semester chronology, never names.
export function autoLinkAttempts(catalog:Course[],book:GradeBook,semesters:Semester[]):GradeBook {
  const order=(id:string)=>{const s=semesters.find(s=>s.id===id);const year=s?.academicYear.match(/^\d{4}/)?.[0];return s&&year?Number(year)*10+s.term:null;};
  const next:GradeBook={};for(const c of catalog){const current=order(c.semesterId);const candidates=catalog.filter(p=>p.id!==c.id&&p.code.trim().toUpperCase()===c.code.trim().toUpperCase()&&p.credits===c.credits&&current!==null&&order(p.semesterId)!==null&&order(p.semesterId)!<current).sort((a,b)=>order(b.semesterId)!-order(a.semesterId)!);
    const previous=candidates[0], ambiguous=previous&&candidates[1]&&order(previous.semesterId)===order(candidates[1].semesterId);
    next[c.id]={...(book[c.id]??emptyGrades()),previousCourseId:previous&&!ambiguous?previous.id:undefined};}
  return next;
}
export function rootCourseId(id: string, book: GradeBook) {
  const seen = new Set<string>(); let current = id;
  while (book[current]?.previousCourseId && !seen.has(current)) { seen.add(current); current = book[current]!.previousCourseId!; }
  return current;
}
export function attemptDepth(id: string, book: GradeBook) {
  const seen = new Set<string>(); let current = id, count = 0;
  while (book[current]?.previousCourseId && !seen.has(current)) { seen.add(current); count++; current = book[current]!.previousCourseId!; }
  return count;
}
export function validateRetake(id: string, previousId: string | undefined, catalog: Course[], book: GradeBook) {
  if (!previousId) return null;
  const course = catalog.find(c => c.id === id), previous = catalog.find(c => c.id === previousId);
  if (!course || !previous || id === previousId) return 'Chọn môn đã học trước đó hợp lệ.';
  if (course.semesterId === previous.semesterId) return 'Lần học trước cần thuộc học kỳ khác.';
  if (course.credits !== previous.credits) return 'Bản mẫu chỉ gộp các lần học có cùng số tín chỉ.';
  const seen = new Set([id]); let next: string | undefined = previousId;
  while (next) { if (seen.has(next)) return 'Liên kết học lại tạo vòng lặp.'; seen.add(next); next = book[next]?.previousCourseId; }
  if (Object.entries(book).some(([key, value]) => key !== id && value.previousCourseId === previousId)) return 'Môn này đã có lần học tiếp theo. Hãy chọn lần học gần nhất trong chuỗi.';
  return null;
}
export function summarizeGrades(catalog: Course[], book: GradeBook, rules: GradeRules, cumulative = false) {
  const eligible = catalog.filter(c => courseResult(book[c.id],rules).completeForGpa);
  let selected = eligible;
  if (cumulative) {
    const groups = new Map<string, Course[]>();
    for (const course of eligible) { const root = rootCourseId(course.id,book); groups.set(root,[...(groups.get(root) ?? []),course]); }
    selected = [...groups.values()].map(group => [...group].sort((a,b) => {
      if (rules.retake === 'highest') { const diff = courseResult(book[b.id],rules).point! - courseResult(book[a.id],rules).point!; if (diff) return diff; }
      return attemptDepth(b.id,book) - attemptDepth(a.id,book);
    })[0]!);
  }
  const scoredCredits = selected.reduce((sum,c) => sum+c.credits,0);
  const earnedCredits = selected.filter(c => courseResult(book[c.id],rules).passed).reduce((sum,c) => sum+c.credits,0);
  const gpa = scoredCredits ? selected.reduce((sum,c) => sum+courseResult(book[c.id],rules).point!*c.credits,0)/scoredCredits : null;
  return { gpa, scoredCredits, earnedCredits, completeCourses: eligible.length, totalCourses: catalog.length, excludedIncomplete: catalog.length-eligible.length, selectedIds: selected.map(c=>c.id), selectedCount: selected.length };
}
export function requiredRemaining(record: CourseGrades | undefined, target: number) {
  const parts = record?.parts ?? emptyGrades().parts;
  if (!Number.isFinite(target) || target < 0 || target > 10 || validateGrades(parts)) return null;
  const missing = parts.filter(p=>p.score===null), weight = missing.reduce((s,p)=>s+p.weight,0);
  if (!weight) return null;
  const known = parts.reduce((s,p)=>s+(p.score ?? 0)*p.weight/100,0);
  return { needed: (target-known)/(weight/100), weight, missingCount: missing.length };
}
export function formatGpa(value: number | null) { return value === null ? '—' : value.toFixed(2); }
