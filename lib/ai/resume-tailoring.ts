import { z } from "zod";

export const RESUME_TAILORING_PROMPT = `You prepare an evidence-based plan for rewriting a resume for a specific vacancy. This plan is not the resume. Read the vacancy and candidate sources independently. Rank the most important job requirements that have direct support in the original resume or confirmed answers. For each, quote one short continuous excerpt from the vacancy and one from the candidate sources. Never use a job requirement as candidate evidence. Preserve each quotation verbatim in foundText, even when source and output languages differ. Translate requirement labels and targetRole into the selected output language. List relevant requirements without candidate evidence separately in unsupportedRequirements; they MUST NOT become candidate skills or experience. Prioritize the actual vacancy, not the order of the original resume. Do not infer typical duties from a job title. Return ONLY JSON {"targetRole":"","priorities":[{"requirement":"","jobEvidence":{"foundText":""},"candidateEvidence":{"foundText":""}}],"unsupportedRequirements":[""]}. Use at most 6 priorities and short quotations. Return empty priorities if no supported match exists.`;

const normalize = (text: string) => text.normalize("NFKC").replace(/\s+/g, " ").trim();
export function resumeTailoringSchema(original: string, confirmed: string, job: string) {
  return z.object({
    targetRole: z.string().max(180),
    priorities: z.array(z.object({
      requirement: z.string().min(1).max(300),
      jobEvidence: z.object({ foundText: z.string().min(3).max(400) }),
      candidateEvidence: z.object({ foundText: z.string().min(3).max(400) }),
    })).max(6),
    unsupportedRequirements: z.array(z.string().min(1).max(300)).max(12),
  }).superRefine((plan, context) => {
    plan.priorities.forEach((priority, index) => {
      if (!normalize(job).includes(normalize(priority.jobEvidence.foundText))) context.addIssue({ code: "custom", path: ["priorities", index, "jobEvidence", "foundText"], message: "Quote one exact continuous excerpt from the job description." });
      if (![original, confirmed].some(source => normalize(source).includes(normalize(priority.candidateEvidence.foundText)))) context.addIssue({ code: "custom", path: ["priorities", index, "candidateEvidence", "foundText"], message: "Quote one exact continuous excerpt from the original resume or confirmed answers; job requirements are not candidate evidence." });
    });
  });
}
export type ResumeTailoringPlan = z.infer<ReturnType<typeof resumeTailoringSchema>>;
