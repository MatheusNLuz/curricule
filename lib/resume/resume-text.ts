import { resumeSections } from "./sections";
import type { OptimizedResume } from "../schemas/optimize.schema.ts";
export function resumeText(resume: OptimizedResume,language="pt-BR") {
  return [Object.values(resume.personalInfo).filter(Boolean).join(" | "),...resumeSections(resume,language).flatMap(section=>[section.title,...section.entries.flatMap(entry=>[entry.title,entry.meta,...entry.text,...entry.bullets].filter(Boolean))])].join("\n\n");
}
