import React from 'react';
import {View} from 'react-native';
import Svg,{Circle} from 'react-native-svg';
import {Badge,T} from '../../../shared/components';
import {C,F,S} from '../../../shared/theme';

export default function FocusTimerFace({milliseconds,label,caption,stale=false}:{milliseconds:number;label:string;caption:string;stale?:boolean}){
  const seconds=Math.ceil(Math.max(0,milliseconds)/1000),minutes=String(Math.floor(seconds/60)).padStart(2,'0'),secs=String(seconds%60).padStart(2,'0');
  const radius=121,circumference=2*Math.PI*radius,progress=1-Math.min(1,milliseconds/1500000);
  return <View style={{alignItems:'center',paddingVertical:20}}><View style={{width:'100%',maxWidth:286,aspectRatio:1,alignItems:'center',justifyContent:'center'}}>
    <Svg width="100%" height="100%" style={{position:'absolute'}} viewBox="0 0 286 286"><Circle cx="143" cy="143" r={radius} stroke={C.track} strokeWidth="12" fill="none"/><Circle cx="143" cy="143" r={radius} stroke={stale?C.muted:C.purple} strokeWidth="12" fill="none" strokeDasharray={`${circumference}`} strokeDashoffset={circumference*(1-Math.max(.008,progress))} strokeLinecap="round" transform="rotate(-90 143 143)"/></Svg>
    <View style={{gap:10,alignItems:'center',maxWidth:230}}><Badge label={label} icon="ellipse"/><T testID="server-pomodoro-clock" accessibilityLabel={`Đồng hồ ${minutes} phút ${secs} giây`} style={{fontFamily:F.extra,fontSize:53,lineHeight:70,letterSpacing:-2,fontVariant:['tabular-nums']}}>{minutes}:{secs}</T><T style={[S.small,{textAlign:'center'}]}>{caption}</T></View>
  </View></View>;
}
