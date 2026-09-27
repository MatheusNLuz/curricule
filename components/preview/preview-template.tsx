import { BasicAtsTemplate } from "@/components/preview/basic-ats-template";
import { ModernAtsTemplate } from "@/components/preview/modern-ats-template";
import { normalizeTemplateId } from "@/lib/preview-template";

export function PreviewTemplate({
  resume,
  templateId,
  language,
  isExport = false,
}: {
  resume: unknown;
  templateId?: unknown;
  language?: string;
  isExport?: boolean;
}) {
  const selectedTemplate = normalizeTemplateId(templateId);

  return selectedTemplate === "modern-ats" ? (
    <ModernAtsTemplate resume={resume} isExport={isExport} language={language} />
  ) : (
    <BasicAtsTemplate resume={resume} isExport={isExport} language={language} />
  );
}
