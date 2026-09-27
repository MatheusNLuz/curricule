export type TemplateId = "basic-ats" | "modern-ats";

export const DEFAULT_TEMPLATE_ID: TemplateId = "basic-ats";

export function normalizeTemplateId(value: unknown): TemplateId {
  return value === "modern-ats" ? "modern-ats" : DEFAULT_TEMPLATE_ID;
}
