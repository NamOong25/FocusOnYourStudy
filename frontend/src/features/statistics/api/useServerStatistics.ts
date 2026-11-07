import { useMemo } from 'react';
import { API_BASE_URL } from '../../../shared/api/config';
import { useAuth } from '../../account/auth/AuthProvider';
import { usePomodoro } from '../../focus/api/PomodoroProvider';
import { usePomodoroRead } from '../../focus/api/usePomodoroInsights';
import { createStatisticsApi, statisticsKey, type StatisticsQuery } from './pomodoroStatisticsApi';

export function useServerStatistics(query: StatisticsQuery, enabled = true) {
  const auth = useAuth(), { state: timer } = usePomodoro();
  const api = useMemo(() => createStatisticsApi(API_BASE_URL, auth.authorized), [auth.authorized]);
  const revision = [timer.last?.id, timer.last?.version, timer.last?.status].join(':');
  return usePomodoroRead(api.read, statisticsKey, query, revision, enabled);
}
