export const TASK_ACTIVITY_EVENT = "curricule-task-activity";
export type TaskActivity = { analysisId: string; active: boolean };

export function notifyTaskActivity(body: BodyInit | null | undefined, active: boolean) {
  if (typeof window === "undefined" || typeof body !== "string") return;
  try {
    const { analysisId } = JSON.parse(body);
    if (typeof analysisId === "string") window.dispatchEvent(new window.CustomEvent<TaskActivity>(TASK_ACTIVITY_EVENT, { detail: { analysisId, active } }));
  } catch { /* Non-analysis requests do not participate in progress polling. */ }
}
