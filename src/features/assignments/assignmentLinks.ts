import type { Task } from './assignments';
import { sessionExceedsDeadline } from './assignments';
import type { StudySession } from '../study/learning';

// A confirmed remote change must not silently move or delete a local study plan.
export function reconcileAssignmentLinks(tasks: Task[], sessions: StudySession[]) {
  const byId = new Map(tasks.map(task => [task.id, task]));
  const detached = new Set<string>();
  const studySessions = sessions.map(session => {
    if (!session.taskId) return session;
    const task = byId.get(session.taskId);
    if (task && task.courseId === session.courseId && !sessionExceedsDeadline(task, session)) return session;
    detached.add(session.taskId);
    return { ...session, taskId: undefined };
  });
  return { studySessions, detached };
}
