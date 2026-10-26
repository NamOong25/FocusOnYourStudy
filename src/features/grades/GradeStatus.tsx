import { gradePresentation } from './gradePresentation';
import React from 'react';
import {View} from 'react-native';
import {Badge,T} from '../../shared/components';
import {C} from '../../shared/theme';
import {courseResult} from './grades';

export default function GradeStatus({result,detail=false}:{result:ReturnType<typeof courseResult>;detail?:boolean}){
  const presentation = gradePresentation(result);
  return <View style={{gap:7}}><Badge label={presentation.label} color={presentation.color} bg={presentation.background}/>{detail&&<T style={{fontSize:12,lineHeight:20,color:presentation.attention?presentation.color:C.muted}}>{result.reason}</T>}</View>;
}
