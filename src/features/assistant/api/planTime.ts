import { ApiError } from '../../../shared/api/http';
import { isValidDate } from '../../../shared/utils/dates';
import { validTimeZone, zonedDay } from '../../study/studyTime';

export const planDay = zonedDay;
export function planClock(at: string | number, zone: string) {
  return new Intl.DateTimeFormat('en-GB', {timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(typeof at==='string'?Date.parse(at):at);
}
/** Server Clock may return nanoseconds; keep deadline comparisons exact instead of rounding to JS milliseconds. */
export function utcNanos(value: unknown): bigint | null {
  if(typeof value!=='string')return null;
  const match=/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,9}))?Z$/.exec(value);
  if(!match)return null;const at=Date.parse(match[1]+'Z');
  if(!Number.isFinite(at)||new Date(at).toISOString().slice(0,19)!==match[1])return null;
  return BigInt(at)*1_000_000n+BigInt((match[2]??'').padEnd(9,'0'));
}
export function planZone(zone:string){return !!zone&&!/^[+-]|^(?:UTC|GMT)[+-]/.test(zone)&&validTimeZone(zone);}
export function planWall(date:string,time:string,zone:string,original?:string) {
  const fail=()=>new ApiError('Ngày/giờ không tồn tại hoặc bị lặp do đổi giờ. Chọn giờ khác.','INVALID_PLAN_DRAFT');
  if(!isValidDate(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!planZone(zone))throw fail();
  if(original&&planDay(Date.parse(original),zone)===date&&planClock(original,zone)===time)return original;
  const wall=Date.parse(date+'T'+time+':00Z'),offsets=new Set<number>();
  for(let hours=-36;hours<=36;hours+=6){const probe=wall+hours*3600000;
    const local=planDay(probe,zone)+'T'+planClock(probe,zone)+':00Z';offsets.add(Date.parse(local)-probe);}
  const candidates=[...offsets].map(offset=>wall-offset).filter(at=>planDay(at,zone)===date&&planClock(at,zone)===time);
  if(candidates.length!==1)throw fail();return new Date(candidates[0]!).toISOString();
}
