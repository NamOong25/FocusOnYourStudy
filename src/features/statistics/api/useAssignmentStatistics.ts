import { useMemo } from 'react';
import { API_BASE_URL } from '../../../shared/api/config';
import { useAuth } from '../../account/auth/AuthProvider';
import { usePomodoroRead } from '../../focus/api/usePomodoroInsights';
import { assignmentStatisticsKey, createAssignmentStatisticsApi, type AssignmentStatisticsQuery } from './assignmentStatisticsApi';

export function useAssignmentStatistics(query: AssignmentStatisticsQuery, revision: string, enabled: boolean) {
  const auth = useAuth();
  const api = useMemo(() => createAssignmentStatisticsApi(API_BASE_URL, auth.authorized), [auth.authorized]);
  return usePomodoroRead(api.read, assignmentStatisticsKey, query, revision, enabled);
}
