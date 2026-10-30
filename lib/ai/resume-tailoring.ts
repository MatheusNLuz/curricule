import { z } from "zod";

export const TAILORING_LIMITS = { targetRole: 180, priorities: 6, requirement: 300, evidenceMin: 3, evidenceMax: 400, unsupportedRequirements: 12 } as const;
export const RESUME_TAILORING_PROMPT = `You prepare an evidence-based plan for rewriting a resume for a specific vacancy. This plan is not the resume. Read the vacancy and candidate sources independently. Rank the most important job requirements that have direct support in the original resume or confirmed answers. For each, quote one short continuous excerpt from the vacancy and one from the candidate sources. Never use a job requirement as candidate evidence. Preserve each quotation verbatim in foundText, even when source and output languages differ. Translate requirement labels and targetRole into the selected output language. List relevant requirements without candidate evidence separately in unsupportedRequirements; they MUST NOT become candidate skills or experience. Prioritize the actual vacancy, not the order of the original resume. Do not infer typical duties from a job title. Return ONLY the JSON object defined by the supplied schema. Each retained priority must have nonempty jobEvidence.foundText AND candidateEvidence.foundText copied from the corresponding input. If no candidate excerpt supports a requirement, list it only as an unsupported requirement, never as a priority. targetRole: at most ${TAILORING_LIMITS.targetRole} characters. Use at most ${TAILORING_LIMITS.priorities} priorities; requirement: 1-${TAILORING_LIMITS.requirement} characters; every foundText: ${TAILORING_LIMITS.evidenceMin}-${TAILORING_LIMITS.evidenceMax} characters. unsupportedRequirements: at most ${TAILORING_LIMITS.unsupportedRequirements} distinct items, each 1-${TAILORING_LIMITS.requirement} characters. Deduplicate equivalent gaps. If there are more gaps, select required requirements before preferred ones, then use vacancy order to break ties. This bounded internal rewrite plan is not an exhaustive gap report; never claim all requirements were covered. Return empty priorities if no supported match exists.`;

const normalize = (text: string) => text.normalize("NFKC").replace(/\s+/g, " ").trim();
export function resumeTailoringSchema(original: string, confirmed: string, job: string) {
  return z.object({
    targetRole: z.string().max(TAILORING_LIMITS.targetRole),
    priorities: z.array(z.object({
      requirement: z.string().min(1).max(TAILORING_LIMITS.requirement),
      jobEvidence: z.object({ foundText: z.string().min(TAILORING_LIMITS.evidenceMin).max(TAILORING_LIMITS.evidenceMax) }),
      candidateEvidence: z.object({ foundText: z.string().min(TAILORING_LIMITS.evidenceMin).max(TAILORING_LIMITS.evidenceMax) }),
    })).max(TAILORING_LIMITS.priorities),
    unsupportedRequirements: z.array(z.string().min(1).max(TAILORING_LIMITS.requirement)).max(TAILORING_LIMITS.unsupportedRequirements),
  }).superRefine((plan, context) => {
    plan.priorities.forEach((priority, index) => {
      if (!normalize(job).includes(normalize(priority.jobEvidence.foundText))) context.addIssue({ code: "custom", path: ["priorities", index, "jobEvidence", "foundText"], params: { validationCode: "EVIDENCE_NOT_IN_SOURCE" }, message: "Quote one exact continuous excerpt from the job description." });
      if (![original, confirmed].some(source => normalize(source).includes(normalize(priority.candidateEvidence.foundText)))) context.addIssue({ code: "custom", path: ["priorities", index, "candidateEvidence", "foundText"], params: { validationCode: "EVIDENCE_NOT_IN_SOURCE" }, message: "Quote one exact continuous excerpt from the original resume or confirmed answers; job requirements are not candidate evidence." });
    });
  });
}
export type ResumeTailoringPlan = z.infer<ReturnType<typeof resumeTailoringSchema>>;
