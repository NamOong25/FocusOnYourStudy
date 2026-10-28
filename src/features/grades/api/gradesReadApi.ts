import { ApiError, createHttpClient } from '../../../shared/api/http';
import type { Authorized } from '../../academics/api/semestersApi';
import type { Course } from '../../academics/academic';

export type Assessment = 'THEORY' | 'PRACTICAL';
export type ResultStatus = 'INCOMPLETE_CONFIGURATION' | 'INCOMPLETE_SCORES' | 'EXAM_BLOCKED' | 'FAILED' | 'PASSED';
export type MissingScore = { columnId: string; field: 'SCORE' | 'REMAINDER_SCORE' };
export type Notice = { code: string; message: string };
export type ResultCore = { status: ResultStatus | null; reason: string; complete: boolean; passed: boolean | null;
  total: number | null; letter: string | null; gradePoint: number | null; missingGroups: string[]; missingScores: MissingScore[]; notices: Notice[] };
export type CourseRef = Pick<Course, 'id' | 'semesterId' | 'credits' | 'version'>;
export type SemesterGradeQuery = { semesterId: string; semesterVersion: number; courses: CourseRef[] };
export type ServerCourseGrade = { id: string; code: string; name: string; credits: number; courseVersion: number;
  configurationId: string | null; gradeVersion: number | null; assessment: Assessment | null; result: ResultCore };
export type ServerSemesterGrades = { semesterId: string; semesterVersion: number; courses: ServerCourseGrade[];
  summary: { state: 'EMPTY' | 'NO_RESULTS' | 'PARTIAL' | 'COMPLETE'; gpa: number | null; registeredCourses: number; calculatedCourses: number; calculatedCredits: number; excludedCourses: number } };
export type GradePart = { id: string; name: string; kind: string; project: { target: 'PRACTICE' | 'FINAL'; share: number } | null;
  weight: number; weightNumerator: number; weightDenominator: number; score: number | null; remainderScore: number | null; effectiveScore: number | null };
export type ServerGradeDetail = { kind: 'unconfigured'; courseId: string } | { kind: 'configured'; courseId: string;
  configurationId: string; gradeVersion: number; courseVersion: number; credits: number; assessment: Assessment;
  configurationState: 'DRAFT' | 'READY'; parts: GradePart[]; result: ResultCore; enteredColumns: number; columnCount: number };

export const validGradeId = (v: unknown): v is string => typeof v === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v);
const invalid = () => new ApiError('Phản hồi bảng điểm chưa hợp lệ. Hãy tải lại.', 'INVALID_RESPONSE');
const changed = () => new ApiError('Thông tin học kỳ hoặc môn đã thay đổi. Tải lại để xem đúng bảng điểm.', 'GRADE_CATALOG_CHANGED');
function obj(v: unknown): Record<string, unknown> { if (!v || typeof v !== 'object' || Array.isArray(v)) throw invalid(); return v as Record<string, unknown>; }
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const version = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
const number = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
function decimal(v: unknown, max: number): number | null { if (v === null) return null; if (!number(v, 0, max)) throw invalid(); return v; }
const id = (v: unknown) => { if (!validGradeId(v)) throw invalid(); return v.toLowerCase(); };
function list(v: unknown, max: number): unknown[] { if (!Array.isArray(v) || v.length > max) throw invalid(); return v; }
function token<T extends string>(v: unknown, values: readonly T[]): T { if (typeof v !== 'string' || !values.includes(v as T)) throw invalid(); return v as T; }
function groups(v: unknown) { const a = list(v, 4).map(x => token(x, ['REGULAR', 'MIDTERM', 'FINAL', 'PRACTICAL_COLUMNS'] as const)); if (new Set(a).size !== a.length) throw invalid(); return a; }
const columnId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(v);
function missing(v: unknown): MissingScore[] { return list(v, 20).map(x => { const p = obj(x); if (!columnId(p.columnId)) throw invalid(); return { columnId: p.columnId, field: token(p.field, ['SCORE', 'REMAINDER_SCORE']) }; }); }
function notices(v: unknown): Notice[] { return list(v, 30).map(x => { const n = obj(x); if (!text(n.code, 100) || !text(n.message, 1200)) throw invalid(); return { code: n.code, message: n.message }; }); }
export function core(v: Record<string, unknown>, status: unknown, reason: unknown): ResultCore {
  const s = status === null ? null : token(status, ['INCOMPLETE_CONFIGURATION', 'INCOMPLETE_SCORES', 'EXAM_BLOCKED', 'FAILED', 'PASSED'] as const);
  if (!text(reason, 100) || typeof v.complete !== 'boolean' || v.passed !== null && typeof v.passed !== 'boolean') throw invalid();
  const total = decimal(v.total, 10), gradePoint = decimal(v.gradePoint, 4);
  const letter = v.letter === null ? null : token(v.letter, ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F']);
  if (v.complete && (total === null || gradePoint === null || letter === null || v.passed === null || s !== 'PASSED' && s !== 'FAILED')
    || !v.complete && (total !== null || gradePoint !== null || letter !== null)
    || s === 'PASSED' && (!v.complete || v.passed !== true) || s === 'FAILED' && v.passed !== false) throw invalid();
  return { status: s, reason, complete: v.complete, passed: v.passed as boolean | null, total, gradePoint, letter,
    missingGroups: groups(v.missingGroups), missingScores: missing(v.missingScores), notices: notices(v.notices) };
}
function ref(c: CourseRef) {
  if (!validGradeId(c.id) || !validGradeId(c.semesterId) || !version(c.version) || !Number.isInteger(c.credits) || c.credits < 1 || c.credits > 30)
    throw new ApiError('Chọn môn học đã được tải từ tài khoản.', 'INVALID_GRADE_QUERY');
  return [c.id.toLowerCase(), c.semesterId.toLowerCase(), c.version, c.credits];
}
export function semesterGradesKey(q: SemesterGradeQuery) {
  if (!validGradeId(q.semesterId) || !version(q.semesterVersion) || !Array.isArray(q.courses)) throw new ApiError('Chọn học kỳ và danh sách môn hợp lệ.', 'INVALID_GRADE_QUERY');
  const refs=q.courses.map(ref);
  if (refs.some(c => c[1] !== q.semesterId.toLowerCase()) || new Set(refs.map(c=>c[0])).size !== refs.length) throw new ApiError('Chọn học kỳ và danh sách môn hợp lệ.', 'INVALID_GRADE_QUERY');
  return JSON.stringify([q.semesterId.toLowerCase(), q.semesterVersion, refs.sort((a,b) => String(a[0]).localeCompare(String(b[0])))]);
}
export const courseGradeKey = (c: CourseRef) => JSON.stringify(ref(c));

export function parseSemesterGrades(input: unknown, query: SemesterGradeQuery): ServerSemesterGrades {
  semesterGradesKey(query);
  const v = obj(input), semester = obj(v.semester), summary = obj(v.summary), expected = new Map(query.courses.map(c => [c.id.toLowerCase(), c]));
  if (id(semester.id) !== query.semesterId.toLowerCase() || !version(semester.version)) throw invalid();
  if (semester.version !== query.semesterVersion) throw changed();
  const courses = list(v.courses, 10000).map(input => {
    const row = obj(input), courseId = id(row.id), local = expected.get(courseId);
    if (!local) throw changed();
    if (!version(row.courseVersion) || row.courseVersion !== local.version || row.credits !== local.credits) throw changed();
    if (!text(row.code,64) || !row.code.trim() || !text(row.name,200) || !row.name.trim()) throw invalid();
    const configurationId = row.configurationId === null ? null : id(row.configurationId);
    const assessment = row.assessment === null ? null : token(row.assessment, ['THEORY','PRACTICAL'] as const);
    if (configurationId === null ? row.gradeVersion !== null || assessment !== null : !version(row.gradeVersion) || assessment === null) throw invalid();
    const result = core(row, row.resultStatus, row.resultReason);
    if (configurationId === null && (result.status !== null || result.complete || result.reason !== 'NO_CONFIGURATION') || configurationId !== null && result.status === null) throw invalid();
    return { id: courseId, code: row.code, name: row.name, credits: local.credits, courseVersion: Number(row.courseVersion),
      configurationId, gradeVersion: row.gradeVersion as number | null, assessment, result };
  });
  if (new Set(courses.map(c => c.id)).size !== courses.length) throw invalid();
  if (courses.length !== expected.size) throw changed();
  const state = token(summary.state,['EMPTY','NO_RESULTS','PARTIAL','COMPLETE'] as const), gpa = decimal(summary.gpa,4);
  for (const field of ['registeredCourses','calculatedCourses','calculatedCredits','excludedCourses']) if (!version(summary[field])) throw invalid();
  if (summary.registeredCourses !== courses.length || Number(summary.calculatedCourses) + Number(summary.excludedCourses) !== courses.length
    || (Number(summary.calculatedCredits) === 0) !== (gpa === null)) throw invalid();
  return { semesterId: query.semesterId.toLowerCase(), semesterVersion: Number(semester.version), courses,
    summary: { state, gpa, registeredCourses: Number(summary.registeredCourses), calculatedCourses: Number(summary.calculatedCourses),
      calculatedCredits: Number(summary.calculatedCredits), excludedCourses: Number(summary.excludedCourses) } };
}
function configuration(input: unknown, courseId: string) {
  const v = obj(input); if (id(v.courseId) !== courseId.toLowerCase() || !version(v.version)) throw invalid();
  return { id: id(v.id), version: v.version };
}
export function parseGradeDetail(input: unknown, course: CourseRef, config: { id: string; version: number }): ServerGradeDetail {
  courseGradeKey(course);
  const v = obj(input), scores = obj(v.scores), result = obj(v.result);
  if (id(scores.courseId) !== course.id.toLowerCase() || id(scores.configurationId) !== config.id || !version(scores.version) || scores.version < config.version) throw invalid();
  if (!version(v.courseVersion) || v.courseVersion !== course.version || v.credits !== course.credits) throw changed();
  const assessment = token(scores.assessment, ['THEORY','PRACTICAL'] as const), configurationState = token(scores.configurationState,['DRAFT','READY'] as const);
  const columns = list(result.columns,10).map(x => { const c=obj(x); if (!columnId(c.id)) throw invalid(); return { id:c.id,score:decimal(c.effectiveScore,10) }; });
  if (new Set(columns.map(c=>c.id)).size !== columns.length) throw invalid();
  const effective = new Map(columns.map(c=>[c.id,c.score]));
  const parts: GradePart[] = list(scores.parts,10).map(x => {
    const p=obj(x); if (!columnId(p.id) || !text(p.name,200) || !p.name.trim() || !number(p.weight,0,100)
      || !Number.isInteger(p.weightNumerator) || Number(p.weightNumerator)<=0 || Number(p.weightNumerator)>100
      || !Number.isInteger(p.weightDenominator) || Number(p.weightDenominator)<1 || Number(p.weightDenominator)>10 || !effective.has(p.id)) throw invalid();
    const kind=token(p.kind,['REGULAR','REGULAR_TEST','MIDTERM','PRACTICE_REGULAR','PRACTICE_TEST','FINAL','PROJECT']);
    let project: GradePart['project']=null;
    if (kind==='PROJECT') { const pr=obj(p.project); if (!number(pr.share,0,100) || pr.share===0) throw invalid(); project={target:token(pr.target,['PRACTICE','FINAL']),share:pr.share}; }
    else if (p.project!==null) throw invalid();
    return {id:p.id,name:p.name,kind,project,weight:p.weight,weightNumerator:Number(p.weightNumerator),weightDenominator:Number(p.weightDenominator),
      score:decimal(p.score,10),remainderScore:decimal(p.remainderScore,10),effectiveScore:effective.get(p.id)!};
  });
  if (new Set(parts.map(p=>p.id)).size!==parts.length || columns.length!==parts.length || !version(result.enteredColumns)
    || result.enteredColumns>parts.length || result.columnCount!==parts.length || typeof scores.hasScores!=='boolean') throw invalid();
  // Display the server's atomic result, never rebalance columns or rerun the preview calculator.
  const parsed=core(result,result.status,result.reason); if (parsed.status===null) throw invalid();
  const ids=new Set(parts.map(p=>p.id)); if (parsed.missingScores.some(m=>!ids.has(m.columnId))) throw invalid();
  return {kind:'configured',courseId:course.id.toLowerCase(),configurationId:config.id,gradeVersion:Number(scores.version),courseVersion:Number(v.courseVersion),
    credits:course.credits,assessment,configurationState,parts,result:parsed,enteredColumns:Number(result.enteredColumns),columnCount:parts.length};
}
export function createGradesReadApi(baseUrl: string, authorized: Authorized, options?: Parameters<typeof createHttpClient>[1]) {
  const http=createHttpClient(baseUrl,options);
  const get=(path:string,signal?:AbortSignal)=>authorized(token=>http<unknown>(path,{headers:{Authorization:`Bearer ${token}`},signal}),signal);
  return {
    async semester(query:SemesterGradeQuery,signal?:AbortSignal) { semesterGradesKey(query); return parseSemesterGrades(await get('/api/v1/semesters/'+encodeURIComponent(query.semesterId)+'/gpa',signal),query); },
    async detail(course:CourseRef,signal?:AbortSignal):Promise<ServerGradeDetail> {
      courseGradeKey(course);
      let config: {id:string;version:number};
      try { config=configuration(await get('/api/v1/courses/'+encodeURIComponent(course.id)+'/grade-configuration',signal),course.id); }
      catch(e) { if (e instanceof ApiError && e.status===404 && e.code==='GRADE_CONFIGURATION_NOT_FOUND') return {kind:'unconfigured',courseId:course.id.toLowerCase()}; throw e; }
      return parseGradeDetail(await get('/api/v1/grade-configurations/'+encodeURIComponent(config.id)+'/result',signal),course,config);
    },
  };
}
