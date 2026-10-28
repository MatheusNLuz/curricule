import type { OptimizedResume } from "../schemas/optimize.schema";
import type { TemplateId } from "../preview-template";
import { RESUME_DOCUMENT_STYLES } from "./document-styles";
import { resumeSections, safeResumeLink } from "./sections";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

/** Print-only document: shares the preview's styles and content model, without
 * the app shell, hydration, cookies, network requests or client JavaScript. */
export function resumeDocumentHtml(resume: OptimizedResume, language: string, template: TemplateId) {
  const personal = resume.personalInfo;
  const contact = [personal.location, personal.phone, personal.email].filter(Boolean).join(" · ");
  const links = [personal.linkedin, personal.portfolio].filter((value): value is string => !!value).map(value => {
    const url = safeResumeLink(value);
    return `<p class="doc-contact">${url ? `<a href="${escapeHtml(url)}">${escapeHtml(value)}</a>` : escapeHtml(value)}</p>`;
  }).join("");
  const sections = resumeSections(resume, language, template === "direct-ats").map(section =>
    `<section class="doc-section"><h2>${escapeHtml(section.title)}</h2>${section.entries.map(entry =>
      `<div class="doc-entry">${entry.title ? `<h3>${escapeHtml(entry.title)}</h3>` : ""}${entry.meta ? `<p class="doc-meta">${escapeHtml(entry.meta)}</p>` : ""}${entry.text.map(text => `<p>${escapeHtml(text)}</p>`).join("")}${entry.bullets.length ? `<ul>${entry.bullets.map(text => `<li>${escapeHtml(text)}</li>`).join("")}</ul>` : ""}</div>`
    ).join("")}</section>`
  ).join("");
  return `<!doctype html><html lang="${escapeHtml(language)}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escapeHtml(personal.name)}</title><style>html,body{margin:0;background:white}${RESUME_DOCUMENT_STYLES}</style></head><body><article class="ats-resume ${template} export-document"><div class="doc-head"><h1>${escapeHtml(personal.name)}</h1><p class="doc-contact">${escapeHtml(contact)}</p>${links}</div>${sections}</article></body></html>`;
}
