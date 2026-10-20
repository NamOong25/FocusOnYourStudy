import React from 'react';
import {View} from 'react-native';
import {Badge,T} from '../../shared/components';
import {C} from '../../shared/theme';
import {courseResult} from './grades';

export default function GradeStatus({result,detail=false}:{result:ReturnType<typeof courseResult>;detail?:boolean}){
  return <View style={{gap:7}}><Badge label={result.status} color={result.failed?C.red:result.passed?C.green:C.muted} bg={result.failed?C.redSoft:result.passed?C.greenSoft:C.track}/>{detail&&<T style={{fontSize:12,lineHeight:20,color:result.failed?C.red:C.muted}}>{result.reason}</T>}</View>;
}
