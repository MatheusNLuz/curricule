import type { OptimizedResume } from "../schemas/optimize.schema";

export function resumeLabels(language = "pt-BR") {
  return language === "es-ES" ? { summary: "Perfil profesional", experience: "Experiencia profesional", skills: "Competencias", education: "Formación académica", certifications: "Certificaciones", projects: "Proyectos", languages: "Idiomas", present: "Actualidad" }
    : language.startsWith("pt-") ? { summary: "Resumo profissional", experience: "Experiência profissional", skills: "Competências", education: language === "pt-PT" ? "Formação académica" : "Formação acadêmica", certifications: "Certificações", projects: "Projetos", languages: "Idiomas", present: "Atual" }
    : { summary: "Professional Summary", experience: "Professional Experience", skills: "Skills", education: "Education", certifications: "Certifications", projects: "Projects", languages: "Languages", present: "Present" };
}
export function safeResumeLink(value: string | undefined) {
  if (!value?.trim()) return undefined;
  try { const url = new URL(/^https?:\/\//i.test(value) ? value : "https://" + value); return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined; } catch { return undefined; }
}
export function resumeDates(start: string, end: string, present = "") { const last=present&&/^(?:atual|actual|actualidad|presente|present|current|ongoing)$/i.test(end.trim())?present:end;return [start,last].filter(Boolean).join(" – "); }
export function resumeSections(resume: OptimizedResume, language: string, skillsFirst = false) {
  const labels = resumeLabels(language);
  const sections = {
    summary: { title: labels.summary, entries: resume.professionalSummary ? [{ title: "", meta: "", text: [resume.professionalSummary], bullets: [] as string[] }] : [] },
    experience: { title: labels.experience, entries: resume.experiences.map(item => ({ title: item.title, meta: [item.company, item.location, resumeDates(item.startDate, item.endDate, labels.present)].filter(Boolean).join(" · "), text: [] as string[], bullets: item.description })) },
    skills: { title: labels.skills, entries: resume.skills.filter(item => item.items.length).map(item => ({ title: "", meta: "", text: [(item.category ? item.category + ": " : "") + item.items.join(", ")], bullets: [] as string[] })) },
    education: { title: labels.education, entries: resume.education.map(item => ({ title: item.degree, meta: [item.institution, resumeDates(item.startDate, item.endDate,labels.present)].filter(Boolean).join(" · "), text: [] as string[], bullets: [] as string[] })) },
    certifications: { title: labels.certifications, entries: resume.certifications.map(item => ({ title: item.name, meta: [item.issuer, item.date].filter(Boolean).join(" · "), text: [] as string[], bullets: [] as string[] })) },
    projects: { title: labels.projects, entries: (resume.projects || []).map(item => ({ title: item.name, meta: [resumeDates(item.startDate, item.endDate,labels.present), item.url].filter(Boolean).join(" · "), text: [] as string[], bullets: item.description })) },
    languages: { title: labels.languages, entries: (resume.languages || []).map(item => ({ title: "", meta: "", text: [[item.name, item.proficiency].filter(Boolean).join(": ")], bullets: [] as string[] })) },
  };
  return (skillsFirst ? [sections.summary, sections.skills, sections.experience, sections.projects, sections.education, sections.certifications, sections.languages] : [sections.summary, sections.experience, sections.projects, sections.skills, sections.education, sections.certifications, sections.languages]).map(section=>({...section,entries:section.entries.filter(entry=>[entry.title,entry.meta,...entry.text,...entry.bullets].some(text=>text.trim().length>0)).map(entry=>({...entry,text:entry.text.filter(text=>text.trim()),bullets:entry.bullets.filter(text=>text.trim())}))})).filter(section => section.entries.length);
}
