import {useEffect,useState} from 'react';
import {AppState} from 'react-native';
import {useNavigationScope} from '../../navigation/Navigation';

// Deadlines use minute precision. Refresh just after each minute boundary and
// when returning to a screen or bringing the application to the foreground.
export default function useCurrentTime(){
  const {active}=useNavigationScope(),[now,setNow]=useState(()=>new Date());
  useEffect(()=>{
    if(!active)return;
    let timer:ReturnType<typeof setTimeout>;
    const refresh=()=>{clearTimeout(timer);setNow(new Date());timer=setTimeout(refresh,60000-Date.now()%60000+10);};
    refresh();const subscription=AppState.addEventListener('change',state=>{if(state==='active')refresh();});
    return()=>{clearTimeout(timer);subscription.remove();};
  },[active]);
  return now;
}
