import { AtsTemplate } from "./ats-template";
import { normalizeTemplateId } from "@/lib/preview-template";
export function PreviewTemplate({ resume, templateId, language, isExport = false }: { resume: unknown; templateId?: unknown; language?: string; isExport?: boolean }) {
  return <AtsTemplate resume={resume} templateId={normalizeTemplateId(templateId)} language={language} isExport={isExport} />;
}
