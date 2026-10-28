import { RESUME_DOCUMENT_STYLES } from "@/lib/resume/document-styles";
import { OptimizedResumeSchema } from "@/lib/schemas/optimize.schema";
import type { TemplateId } from "@/lib/preview-template";
import { resumeSections, safeResumeLink } from "@/lib/resume/sections";

export function AtsTemplate({ resume: value, templateId, isExport = false, language = "pt-BR" }: { resume: unknown; templateId: TemplateId; isExport?: boolean; language?: string }) {
  const parsed = OptimizedResumeSchema.safeParse(value);
  if (!parsed.success) return <p role="alert">Não foi possível apresentar este currículo. Confira o conteúdo salvo.</p>;
  const resume = parsed.data;
  const personal = resume.personalInfo;
  const contact = [personal.location, personal.phone, personal.email].filter(Boolean);
  const sections = resumeSections(resume, language, templateId === "direct-ats");
  return <article className={`ats-resume ${templateId}${isExport ? " export-document" : ""}`} lang={language}>
    <style>{RESUME_DOCUMENT_STYLES}</style>
    <div className="doc-head"><h1>{personal.name}</h1><p className="doc-contact">{contact.join(" · ")}</p>{[personal.linkedin, personal.portfolio].filter(Boolean).map((url, index) => <p className="doc-contact" key={index}>{safeResumeLink(url) ? <a href={safeResumeLink(url)}>{url}</a> : url}</p>)}</div>
    {sections.map(section => <section className="doc-section" key={section.title}><h2>{section.title}</h2>{section.entries.map((entry,index) => <div className="doc-entry" key={index}>{entry.title && <h3>{entry.title}</h3>}{entry.meta && <p className="doc-meta">{entry.meta}</p>}{entry.text.map((text,i)=><p key={i}>{text}</p>)}{!!entry.bullets.length && <ul>{entry.bullets.map((text,i)=><li key={i}>{text}</li>)}</ul>}</div>)}</section>)}
  </article>;
}
