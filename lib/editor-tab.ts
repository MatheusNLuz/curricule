export const EDITOR_TABS = ["questions", "match", "edit", "preview", "coverletter"] as const;
export type EditorTab = typeof EDITOR_TABS[number];
export function isEditorTab(value: string | null): value is EditorTab {
  return EDITOR_TABS.some(tab => tab === value);
}
export function resolveEditorTab(requested: string | null, hasResume: boolean, hasMatch: boolean): EditorTab {
  if (!isEditorTab(requested)) return hasResume ? "preview" : "questions";
  if ((requested === "edit" || requested === "preview") && !hasResume) return "questions";
  if (requested === "match" && !hasMatch) return hasResume ? "preview" : "questions";
  return requested;
}
