const MODE_LABELS: Record<string, string> = {
  MAKE_ATS_FRIENDLY: "Otimização ATS",
  COMPARE_AGAINST_JOB: "Comparação com vaga",
  OPTIMIZE_FOR_JOB: "Otimização completa",
  LINKEDIN_OPTIMIZATION: "LinkedIn",
  COVER_LETTER_ONLY: "Carta de apresentação",
};

export const RESUME_ANALYSIS_MODES = [
  "MAKE_ATS_FRIENDLY",
  "COMPARE_AGAINST_JOB",
  "OPTIMIZE_FOR_JOB",
] as const;

const JOB_EXCERPT_LIMIT = 132;

export function isResumeAnalysisMode(mode: string): mode is (typeof RESUME_ANALYSIS_MODES)[number] {
  return RESUME_ANALYSIS_MODES.includes(mode as (typeof RESUME_ANALYSIS_MODES)[number]);
}

export function formatResumeLibraryItem({
  professionalTarget,
  mode,
  jobDescription,
}: {
  professionalTarget: string | null;
  mode: string;
  jobDescription: string | null;
}) {
  const title = professionalTarget?.trim() || "Análise sem título";
  const normalizedDescription = jobDescription?.trim().replace(/\s+/gu, " ") || "";
  const characters = Array.from(normalizedDescription);
  const jobExcerpt = characters.length > JOB_EXCERPT_LIMIT
    ? `${characters.slice(0, JOB_EXCERPT_LIMIT - 1).join("").trimEnd()}…`
    : normalizedDescription || null;

  return {
    title,
    modeLabel: MODE_LABELS[mode] || mode.replace(/_/gu, " ").toLocaleLowerCase("pt-BR"),
    jobExcerpt,
  };
}

export function makeResumePdfFilename(title: string) {
  const safeTitle = title
    .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  return `${safeTitle || "Curriculo Otimizado"}.pdf`;
}
