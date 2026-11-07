import React from 'react';
import { Badge, Button, Card, Sheet, StateView, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { planClock, planDay } from '../api/planTime';
import type { PlanApplicationManager, emptyPlanApplication } from '../api/PlanApplicationManager';

export function PlanSaveStatus({state,manager,onClose,onReturn,onView,listReady,listLoading,listError,onReload}:{state:ReturnType<typeof emptyPlanApplication>;manager:PlanApplicationManager;onClose:()=>void;onReturn:()=>void;onView:()=>void;listReady:boolean;listLoading:boolean;listError:string;onReload:()=>void}){
  const command=state.command!,receipt=state.receipt,working=state.busy||state.checking;
  const act=(fn:()=>Promise<unknown>)=>()=>{void fn().catch(()=>{});};
  return <Sheet title={receipt?'Kế hoạch đã lưu':state.rejected?'Cần xem lại kế hoạch':'Đối chiếu lần lưu'} onClose={onClose} onBack={onClose} scrollKey={receipt?'saved':'pending'}>
    <Badge label={receipt?'ĐÃ LƯU VÀO TÀI KHOẢN':state.rejected?'CHƯA LƯU KẾ HOẠCH':'GIỮ NGUYÊN YÊU CẦU ĐÃ GỬI'} icon={receipt?'checkmark-circle-outline':'information-circle-outline'}/>
    <Card style={{backgroundColor:receipt?C.greenSoft:C.soft,gap:10}}>
      <T style={{fontFamily:F.extra,fontSize:22}}>{receipt?`Đã lưu ${receipt.sessions.length} buổi học`:state.rejected?'Lần lưu chưa thành công':state.busy?'Đang lưu các buổi đã chọn':'Cần kiểm tra kết quả lần lưu'}</T>
      <T style={S.small}>{receipt?`${receipt.savedMinutes} phút đã lưu · còn thiếu ${receipt.remainingMinutes} phút so với mục tiêu. Các buổi mới đang ở trạng thái đã lên lịch.`:state.rejected?'Các buổi đã chọn vẫn được giữ để bạn xem lại. Hãy xử lý thông báo trước khi tiếp tục.':'Ứng dụng giữ đúng nội dung và mã của lần lưu này. Kiểm tra biên nhận trước khi chỉnh sửa hoặc bắt đầu kế hoạch khác.'}</T>
      {receipt&&<T style={S.small}>Lưu lúc {planClock(receipt.appliedAt,command.conditions.timeZone)} · {planDay(Date.parse(receipt.appliedAt),command.conditions.timeZone).split('-').reverse().join('/')} · {command.conditions.timeZone}</T>}
    </Card>
    {state.error&&<T accessibilityRole="alert" style={{color:receipt?C.amber:C.red}}>{state.error.message}</T>}
    {!receipt&&!state.rejected&&<>
      <Button label="Kiểm tra kết quả lần lưu" secondary loading={state.checking} disabled={working} onPress={act(manager.check)}/>
      {state.missing&&<><T style={S.small}>Chưa tìm thấy biên nhận tại thời điểm kiểm tra. Lần lưu trước có thể còn đang xử lý; gửi lại sẽ dùng đúng nội dung và mã cũ.</T><Button label="Gửi lại đúng yêu cầu cũ" loading={state.busy} disabled={working} onPress={act(manager.retry)}/></>}
      {state.busy&&<T accessibilityLiveRegion="polite" style={S.small}>Đóng màn hình không hủy được một lần lưu đang xử lý. Mở lại phần kế hoạch để kiểm tra kết quả.</T>}
    </>}
    {receipt&&<>
      <T style={S.small}>Đây là biên nhận lúc lưu. Danh sách Tự học sẽ đọc dữ liệu hiện tại; các buổi đã sửa hoặc xóa sau đó được giữ đúng trạng thái mới.</T>
      {listError&&<StateView kind="error" title="Kế hoạch đã lưu, danh sách chưa tải lại được" message={listError}/>}
      {!listReady&&<Button label="Tải lại danh sách tự học" secondary loading={listLoading} disabled={working||listLoading} onPress={onReload}/>}
      <Button label="Xem lịch tự học" icon="calendar-outline" disabled={working||!listReady} onPress={onView}/>
    </>}
    {(receipt||state.rejected)&&<Button label={receipt?'Tiếp tục lập kế hoạch':'Quay lại xem và chỉnh'} secondary loading={state.checking} disabled={working} onPress={onReturn}/>}
    <T style={{fontFamily:F.bold}}>Các buổi trong lần lưu này</T>
    {command.sessions.map(s=><Card key={s.index} style={{gap:5,backgroundColor:C.canvas}}><T style={{fontFamily:F.bold}}>{s.title}</T><T style={S.small}>{planDay(Date.parse(s.startsAt),command.conditions.timeZone).split('-').reverse().join('/')} · {planClock(s.startsAt,command.conditions.timeZone)} · {s.durationMinutes} phút</T></Card>)}
    <T selectable style={S.small}>Mã đối chiếu: {command.clientRequestId}</T>
  </Sheet>;
}
