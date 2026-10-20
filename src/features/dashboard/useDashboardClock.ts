import {useEffect,useState} from 'react';
import {AppState} from 'react-native';
import {useNavigationScope} from '../../navigation/Navigation';

export default function useDashboardClock(){
  const {active}=useNavigationScope(),[now,setNow]=useState(()=>new Date());
  useEffect(()=>{
    if(!active)return;
    const refresh=()=>setNow(new Date());refresh();
    const timer=setInterval(refresh,30000),subscription=AppState.addEventListener('change',state=>{if(state==='active')refresh();});
    return ()=>{clearInterval(timer);subscription.remove();};
  },[active]);
  return now;
}
