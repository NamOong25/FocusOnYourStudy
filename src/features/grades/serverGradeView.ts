import type { ResultCore } from './api/gradesReadApi';

const reasons:Record<string,string>={
  NO_CONFIGURATION:'Môn học chưa có bảng điểm được lưu trong tài khoản.',
  MIDTERM_ZERO:'Giữa kỳ bằng 0 nên không đủ điều kiện thi cuối kỳ. Chưa có tổng kết hoàn chỉnh.',
  MISSING_GROUPS:'Bảng điểm còn thiếu nhóm thành phần bắt buộc.',
  FINAL_BELOW_3:'Điểm cuối kỳ dưới 3,0 nên môn không đạt.',
  MISSING_SCORES:'Một số cột điểm hoặc phần điểm bài tập lớn còn chưa nhập.',
  TOTAL_BELOW_4:'Điểm tổng kết dưới 4,0 nên môn chưa đạt.',
  TOTAL_AT_LEAST_4:'Môn đã đạt theo kết quả tổng kết.',
};
export function serverGradeView(r:ResultCore){
  const failed=r.status==='FAILED'||r.status==='EXAM_BLOCKED';
  const status=r.status===null?'Chưa có bảng điểm':r.status==='EXAM_BLOCKED'?'Không đủ điều kiện thi'
    :r.status==='FAILED'?(r.complete?'Không đạt · Cần học lại':'Không đạt · Chưa đủ tổng kết')
    :r.status==='PASSED'?'Đạt môn':r.status==='INCOMPLETE_CONFIGURATION'?'Chưa đủ cột điểm':'Chưa đủ dữ liệu';
  return {complete:r.complete,passed:r.passed===true,failed,status,reason:reasons[r.reason]??'Xem các cột điểm và thông tin còn thiếu của môn.',
    total:r.total,letter:r.letter,point:r.gradePoint};
}
export function gradeNumber(value:number|null,decimals?:number){return value===null?'—':decimals===undefined?String(value):value.toFixed(decimals);}
export const gradeKindLabels:Record<string,string>={REGULAR:'Điểm thường kỳ',REGULAR_TEST:'Kiểm tra thường kỳ',MIDTERM:'Giữa kỳ',PRACTICE_REGULAR:'Thường kỳ thực hành',PRACTICE_TEST:'Kiểm tra thực hành',FINAL:'Cuối kỳ',PROJECT:'Bài tập lớn'};
