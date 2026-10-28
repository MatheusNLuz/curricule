export const TASK_ACTIVITY_EVENT = "curricule-task-activity";
export type TaskActivity = { analysisId: string; active: boolean };
const CHANNEL = "curricule-task-activity";
let sourceId: string | undefined;
function source() { return sourceId ??= window.crypto.randomUUID(); }
function channel() {
  try { return typeof window.BroadcastChannel === "function" ? new window.BroadcastChannel(CHANNEL) : null; }
  catch { return null; }
}
function isActivity(value: unknown): value is TaskActivity & { source?: unknown } {
  return !!value && typeof value === "object" && "analysisId" in value && typeof value.analysisId === "string" && "active" in value && typeof value.active === "boolean";
}
export function subscribeTaskActivity(listener: (activity: TaskActivity) => void) {
  const local = (event: Event) => { const detail = (event as CustomEvent<unknown>).detail; if (isActivity(detail)) listener(detail); };
  window.addEventListener(TASK_ACTIVITY_EVENT, local);
  const broadcast = channel();
  if (broadcast) broadcast.onmessage = event => {
    if (isActivity(event.data) && event.data.source !== source()) listener(event.data);
  };
  return () => { window.removeEventListener(TASK_ACTIVITY_EVENT, local); broadcast?.close(); };
}

export function notifyTaskActivity(body: BodyInit | null | undefined, active: boolean) {
  if (typeof window === "undefined" || typeof body !== "string") return;
  try {
    const { analysisId } = JSON.parse(body);
    if (typeof analysisId === "string") window.dispatchEvent(new window.CustomEvent<TaskActivity>(TASK_ACTIVITY_EVENT, { detail: { analysisId, active } }));
    if (typeof analysisId === "string") {
      const broadcast = channel();
      try { broadcast?.postMessage({ analysisId, active, source: source() }); }
      finally { broadcast?.close(); }
    }
  } catch { /* Non-analysis requests do not participate in progress polling. */ }
}
