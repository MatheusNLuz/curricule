import type { OptimizedResume } from "../schemas/optimize.schema.ts";
export function resumeText(resume: OptimizedResume) {
  return [
    Object.values(resume.personalInfo).filter(Boolean).join(" | "),
    "Professional Summary / Resumo profissional", resume.professionalSummary,
    "Experience / Experiência", ...resume.experiences.map(item => [item.title, item.company, item.startDate, item.endDate, ...item.description].join("\n")),
    "Education / Formação", ...resume.education.map(item => [item.institution, item.degree, item.startDate, item.endDate].join(" | ")),
    "Skills / Competências", ...resume.skills.map(item => item.category + ": " + item.items.join(", ")),
    "Certifications / Certificações", ...resume.certifications.map(item => [item.name, item.issuer, item.date].filter(Boolean).join(" | ")),
  ].join("\n\n");
}
