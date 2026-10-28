import React,{createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {AppState,Platform} from 'react-native';
import {useAuth} from '../../account/auth/AuthProvider';
import {API_BASE_URL} from '../../../shared/api/config';
import {createPomodoroApi} from './pomodoroApi';
import {PomodoroManager,emptyPomodoro,monotonicNow,visiblePomodoro,type PomodoroSnapshot} from './PomodoroManager';
import {pomodoroCommandStore,listenPomodoro,notifyPomodoro} from './pomodoroPlatform';

const Context=createContext<PomodoroSnapshot|null>(null);
export function PomodoroProvider({children}:{children:ReactNode}){
  const auth=useAuth(),id=auth.hasSession?auth.profile?.id:null,owner=id?`${auth.revision}:${id}`:null;
  const [snapshot,setSnapshot]=useState<PomodoroSnapshot>({owner:null,manager:null,state:emptyPomodoro()});
  useEffect(()=>{
    if(!owner||!id)return;
    const manager=new PomodoroManager(createPomodoroApi(API_BASE_URL,auth.authorized),pomodoroCommandStore(id),monotonicNow,notifyPomodoro);
    const update=()=>setSnapshot({owner,manager,state:manager.state});update();const unsubscribe=manager.subscribe(update);
    const visible=()=>Platform.OS==='web'?document.visibilityState==='visible':AppState.currentState==='active';
    const sync=()=>{if(visible()&&!manager.state.busy)void manager.reload().catch(()=>{});};
    sync();const stop=listenPomodoro(sync),poll=setInterval(sync,15000);
    const due=setInterval(()=>{if(visible())void manager.confirmElapsed();},500);
    const native=AppState.addEventListener('change',s=>{if(s==='active')sync();});
    if(Platform.OS==='web'){window.addEventListener('focus',sync);window.addEventListener('online',sync);document.addEventListener('visibilitychange',sync);}
    return()=>{unsubscribe();stop();clearInterval(poll);clearInterval(due);native.remove();if(Platform.OS==='web'){window.removeEventListener('focus',sync);window.removeEventListener('online',sync);document.removeEventListener('visibilitychange',sync);}manager.dispose();};
  },[owner,id,auth.authorized]);
  return <Context.Provider value={visiblePomodoro(snapshot,owner)}>{children}</Context.Provider>;
}
export function usePomodoro(){const value=useContext(Context);if(!value)throw new Error('Missing PomodoroProvider');return value;}
export function usePomodoroClock(){const [now,setNow]=useState(monotonicNow);const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;const tick=()=>{if(mounted.current)setNow(monotonicNow());};const interval=setInterval(tick,250);return()=>{mounted.current=false;clearInterval(interval);};},[]);return now;}
