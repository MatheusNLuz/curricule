export const TEMPLATE_OPTIONS = [
  { id: "basic-ats", name: "Básico ATS", description: "Nome centralizado e estrutura neutra." },
  { id: "modern-ats", name: "Moderno ATS", description: "Hierarquia com acento violeta." },
  { id: "executive-ats", name: "Executivo ATS", description: "Georgia nos títulos; experiência em destaque." },
  { id: "direct-ats", name: "Direto ATS", description: "Composição compacta; competências antes da experiência." },
] as const;
export type TemplateId = typeof TEMPLATE_OPTIONS[number]["id"];

export const DEFAULT_TEMPLATE_ID: TemplateId = "basic-ats";

export function normalizeTemplateId(value: unknown): TemplateId {
  return TEMPLATE_OPTIONS.some(option => option.id === value) ? value as TemplateId : DEFAULT_TEMPLATE_ID;
}
