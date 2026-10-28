/** Optional drafting guidance, not a legal requirement or a substitute for a vacancy's instructions. */
const guidance: Record<string, string> = {
  BR: "Tailor the resume to the vacancy, use clear sections and relevant experience, and omit identity document numbers unless explicitly required elsewhere.",
  PT: "Tailor the CV to the role; Europass is a possible format, not a universal requirement. Use a clear structure and relevant verified experience.",
  US: "Use a readable resume tailored to the position, with clear sections and relevant experience. A full street address is not necessary.",
  UK: "Use clear headings and concise evidence tailored to the role; omit age, date of birth, marital status and nationality unless the candidate explicitly needs to provide them elsewhere.",
  CA: "Prefer relevant professional information and avoid photos and unnecessary personal details.",
  DE: "A concise, reverse-chronological CV with dates and relevant activities is common. A photo and family information are optional, never invent or require them.",
  ES: "A clear, concise CV of up to two pages is common guidance, not a strict limit; a photo is optional and depends on the position.",
  REMOTE: "Follow the vacancy's instructions and use clear sections; do not assume one country's conventions apply.",
};

export function resumeRegionGuidance(region: string | null | undefined): string {
  return guidance[region || ""] || "Follow the vacancy's instructions and use clear, relevant sections.";
}
