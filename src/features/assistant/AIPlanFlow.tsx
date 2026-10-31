import React from 'react';
import { useAuth } from '../account/auth/AuthProvider';
import PreviewAIPlanFlow from './PreviewAIPlanFlow';
import ServerStudyPlanFlow from './ServerStudyPlanFlow';

type Props={variant:'deadline'|'free'|'adjust';request?:string;onClose:()=>void;onStudyPlan:()=>void};
export default function AIPlanFlow(props:Props){const auth=useAuth();return auth.hasSession?<ServerStudyPlanFlow key={`${auth.revision}:${auth.profile?.id}`} {...props}/>:<PreviewAIPlanFlow {...props}/>;}
