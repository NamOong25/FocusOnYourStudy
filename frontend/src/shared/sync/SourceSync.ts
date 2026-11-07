export type SyncSource = { state: { busy: boolean; loading: boolean; needsReload: boolean }; reload: () => Promise<unknown>; subscribe: (listener: () => void) => () => void };
export const academicSignalKey = (baseUrl: string, owner: string) => 'focus-study-academic-sync-v1:' + JSON.stringify([baseUrl.replace(/\/$/, ''), owner]);

/** Coalesce read requests; never retry writes or clear an unresolved-write guard. */
export function createSourceSync(source: SyncSource, foreground: () => boolean) {
  let pending = false, queued = false, disposed = false;
  const schedule = () => {
    if (queued || disposed) return;
    queued = true;
    void Promise.resolve().then(() => {
      queued = false;
      if (disposed || !pending || !foreground() || source.state.busy || source.state.loading || source.state.needsReload) return;
      pending = false;
      void Promise.resolve().then(() => { if (!disposed) return source.reload(); }).catch(() => { /* The source retains its error and manual reload requirement. */ });
    });
  };
  const stop = source.subscribe(() => { if (pending) schedule(); });
  return { request() { if (!disposed) { pending = true; schedule(); } }, dispose() { disposed = true; pending = false; stop(); } };
}
