import { ApiError, asApiError, cancelledRequest } from '../../../shared/api/http';
import { descriptorKey, staleSource, type ReminderDescriptor } from './notificationDescriptors';
import { sameBasis, type NotificationReadApi, type ReadState } from './notificationReadApi';

export type ReceiptView = { localRevision: string; state: ReadState };
export type NotificationReadState = {
  key: string | null; rows: Record<string,ReceiptView>; loading: boolean; loaded: boolean; busy: boolean;
  needsReload: boolean; sourceMismatch: boolean; error: ApiError | null; message: string;
};
export const emptyNotificationReads = (): NotificationReadState => ({key:null,rows:{},loading:false,loaded:false,busy:false,needsReload:false,sourceMismatch:false,error:null,message:''});
export class NotificationReadManager {
  state=emptyNotificationReads();
  private frame: ReminderDescriptor[] | null=null;
  private disposed=false;
  private listeners=new Set<() => void>();
  private readController: AbortController | null=null;
  private writeController: AbortController | null=null;
  private generation=0;
  private readPromise: Promise<void> | null=null;
  constructor(private api: NotificationReadApi,private onWriteSettled: () => void=() => {}) { }
  subscribe=(listener: () => void) => { this.listeners.add(listener);return () => {this.listeners.delete(listener);}; };
  private publish(patch: Partial<NotificationReadState>) { if(this.disposed)return;this.state={...this.state,...patch};for(const l of this.listeners)l(); }
  setFrame(items: ReminderDescriptor[] | null) {
    if(this.disposed)return;
    const key=items === null ? null : descriptorKey(items);
    if(key === this.state.key)return;
    this.readController?.abort();this.generation++;this.readPromise=null;
    this.frame=items?.map(x => ({...x,target:{...x.target},basis:{...x.basis}})) ?? null;
    this.publish({key,rows:{},loaded:false,loading:false,sourceMismatch:false,error:this.state.needsReload ? this.state.error : null});
  }
  reload=(manual=false): Promise<void> => {
    if(this.disposed || !this.frame)return Promise.reject(cancelledRequest());
    if(this.state.busy || !manual && (this.state.needsReload || this.state.sourceMismatch))return Promise.resolve();
    if(this.readPromise)return this.readPromise;
    const frame=this.frame,key=this.state.key,seq=++this.generation,controller=new AbortController();this.readController=controller;
    this.publish({loading:true,error:null});
    const run=(async()=>{
      const rows: Record<string,ReceiptView>={};
      try {
        for(let start=0;start<frame.length;start+=200) {
          const chunk=frame.slice(start,start+200),snapshot=await this.api.query(chunk.map(x=>x.target),controller.signal);
          if(this.disposed || seq !== this.generation)throw cancelledRequest();
          for(let i=0;i<chunk.length;i++) {
            const d=chunk[i]!,s=snapshot.items[i]!;
            if(!s.available || !sameBasis(s.basis,d.basis))throw staleSource();
            rows[d.id]={localRevision:d.localRevision,state:s};
          }
        }
        if(this.disposed || seq !== this.generation)throw cancelledRequest();
        this.publish({key,rows,loaded:true,loading:false,error:null,sourceMismatch:false,needsReload:manual ? false : this.state.needsReload,
          message:manual ? 'Đã đối chiếu trạng thái đọc với tài khoản.' : this.state.message});
      }catch(error) {
        if(this.disposed || seq !== this.generation)throw cancelledRequest();
        const failure=asApiError(error);this.publish({loaded:false,loading:false,error:failure,sourceMismatch:failure.code === 'NOTIFICATION_SOURCES_CHANGED'});throw failure;
      }
    })();
    this.readPromise=run;
    void run.finally(()=>{if(this.readPromise===run){this.readPromise=null;this.readController=null;}}).catch(()=>{});
    return run;
  };
  async mark(seen: {id:string;localRevision:string}[]) {
    if(this.disposed)throw cancelledRequest();
    if(this.state.busy || this.state.loading || !this.state.loaded || this.state.needsReload || this.state.sourceMismatch || !this.frame)throw new ApiError('Chờ xác nhận trạng thái đọc hoặc tải lại nhắc việc trước khi thao tác.', 'NOTIFICATION_NOT_READY');
    const frame=this.frame,key=this.state.key,seenIds=new Set(seen.map(x=>x.id));
    if(seenIds.size!==seen.length)throw staleSource();
    const selected=seen.map(x=>{
      const d=frame.find(d=>d.id===x.id),row=this.state.rows[x.id];
      if(!d || d.localRevision!==x.localRevision || !row || row.localRevision!==x.localRevision || !sameBasis(row.state.basis,d.basis))throw staleSource();
      return {d,state:row.state};
    }).filter(x=>!x.state.read);
    if(!selected.length)return;
    this.readController?.abort();this.generation++;this.readPromise=null;
    const controller=new AbortController();this.writeController=controller;let done=0,attempted=false;
    this.publish({busy:true,error:null,message:''});
    try {
      for(let start=0;start<selected.length;start+=200) {
        if(this.disposed || this.state.key!==key)throw cancelledRequest();
        const chunk=selected.slice(start,start+200);attempted=true;
        const result=await this.api.mark(chunk.map(x=>({target:x.d.target,revision:x.state.revision!})),controller.signal);
        if(this.disposed)throw cancelledRequest();
        if(result.items.some((s,i)=>!sameBasis(s.basis,chunk[i]!.d.basis)))throw staleSource();
        done+=chunk.length;
        if(this.state.key===key) {
          const rows={...this.state.rows};for(let i=0;i<chunk.length;i++)rows[chunk[i]!.d.id]={localRevision:chunk[i]!.d.localRevision,state:result.items[i]!};
          this.publish({rows,message:`Đã lưu ${done}/${selected.length} mục đã đọc.`});
        }
      }
    }catch(error) {
      if(!this.disposed)this.publish({needsReload:true,loaded:false,error:asApiError(error),message:done ? `Đã lưu ${done}/${selected.length} mục. Tải lại để đối chiếu phần còn lại.` : 'Chưa xác nhận kết quả lưu. Tải lại để đối chiếu trước khi thao tác tiếp.'});
      throw error;
    }finally {
      if(!this.disposed){this.publish({busy:false});if(attempted)this.onWriteSettled();
        if(!this.state.needsReload && this.state.key!==key && this.frame)void this.reload().catch(()=>{});
      }
      this.writeController=null;
    }
  }
  dispose() {this.disposed=true;this.generation++;this.readController?.abort();this.writeController?.abort();this.listeners.clear();this.frame=null;}
}
