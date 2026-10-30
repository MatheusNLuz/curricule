import { AnalysisOrchestrator } from "@/lib/ai/analysis-orchestrator";
import { TruthGuardGen, TruthGuardSchema } from "@/lib/schemas/questions.schema";
import { OpenRouterProvider } from "@/lib/ai/openrouter-provider";
import { NvidiaNimProvider } from "@/lib/ai/nvidia-nim-provider";

const TRUTH_GUARD_SYSTEM_PROMPT = `You are the Truth Guard. Your sole purpose is to prevent AI hallucination and ensure a candidate's resume contains NO lies.
You must classify every new claim, skill, or metric proposed for the resume rewrite.
A claim can ONLY be used if it is 'confirmed_by_resume' or 'confirmed_by_user'.
Any claim that is an invention or hallucination MUST be marked 'forbidden_to_use'.
For every proposed duty, outcome, soft skill and context, require explicit support from the candidate's resume or confirmed answers. A job title alone does not prove its typical duties, communication, problem solving, teamwork, customer service channels or improvements. A technology or tool alone does not prove collaboration or a particular task. Availability, willingness to relocate and career intentions also require explicit candidate evidence. Paraphrasing and faithful translation of a supported fact are allowed; adding an unsupported detail is not.
For the review screen, translate claim descriptions faithfully into the selected output language even when the source is in another language. Preserve proper names, technical terms and the underlying facts. A question or a blank answer is not a confirmed or denied fact.
Review actual candidate assertions, not labels of missing vacancy requirements. Confirmations supplied by the candidate resolve historical gaps for that precise scope. Never copy a previous gap list into blockedClaims. blockedClaims must describe specific unsupported or forbidden assertions, not a blacklist of isolated technology names. Every blockedClaims item MUST exactly repeat the claim text of a disallowed entry in claims. If all actual assertions are confirmed and allowed, blockedClaims MUST be empty. Never simultaneously confirm an assertion and block that same assertion.
Preserve scope and qualifications: confirmed theoretical knowledge of PHPUnit is a confirmed fact about theory, never evidence of practical or professional testing experience. Separate these assertions instead of marking the theoretical knowledge missing because practice was not confirmed. A negative answer or lack of experience must never be rewritten as positive experience. Permission flags mean whether the precise fact may truthfully appear in that destination, not whether it is relevant or recommended.
When candidateStatements contains question/answer entries, cover every nonempty answer as a separate scoped claim; the question supplies context and is never itself evidence that its premise is true. Keep theory-only qualifications explicit rather than silently converting or omitting them.
Return ONLY valid JSON matching this exact structure:
{
  "claims": [
    {
      "claim": "string",
      "source": "confirmed_by_resume" | "confirmed_by_user" | "low_confidence_inference" | "missing" | "forbidden_to_use",
      "canUseInResume": boolean,
      "canUseInCoverLetter": boolean,
      "explanation": "string"
    }
  ],
  "blockedClaims": ["string"],
  "warnings": ["string"]
}`;

const normalizedClaim = (text: string) => text.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
const VerifiedTruthSchema = TruthGuardSchema.superRefine((report, context) => {
  const disallowed = new Set(report.claims.filter(claim => !["confirmed_by_resume", "confirmed_by_user"].includes(claim.source) || (!claim.canUseInResume && !claim.canUseInCoverLetter)).map(claim => normalizedClaim(claim.claim)));
  report.blockedClaims.forEach((claim, index) => {
    if (!disallowed.has(normalizedClaim(claim))) context.addIssue({ code: "custom", path: ["blockedClaims", index], params: { validationCode: "FACT_VERDICT_CONFLICT" }, message: "Each blocked item must exactly repeat an actual disallowed claims entry. Do not block an approved assertion or a keyword from a historical requirement." });
  });
});

export function normalizeTruthVerdict(result: TruthGuardGen): TruthGuardGen {
  return { ...result, claims: result.claims.map(claim =>
    (claim.source === "confirmed_by_resume" || claim.source === "confirmed_by_user") && !claim.canUseInResume && !claim.canUseInCoverLetter
      ? { ...claim, source: "missing" as const, canUseInResume: false, canUseInCoverLetter: false }
      : claim
  ) };
}

export class TruthGuard {
  static async evaluate(resumeText: string, userAnswers: string, proposedChanges: string, rejected: string[] = [], language = "pt-BR", interactive = false, verifyProposal = false): Promise<TruthGuardGen> {
    const fast = new NvidiaNimProvider(process.env.NVIDIA_NIM_TRUTH_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b");
    const configured = new NvidiaNimProvider();
    const orchestrator = new AnalysisOrchestrator(interactive
      ? [new OpenRouterProvider(), fast, configured]
      : [fast, new OpenRouterProvider(), configured]);
    
    const userPrompt = `
ORIGINAL RESUME:
"""
${resumeText}
"""

USER ANSWERS TO CLARIFYING QUESTIONS:
"""
${userAnswers}
"""

PROPOSED CHANGES/NEW CONTENT TO ADD:
"""
${proposedChanges}
"""

REJECTED ASSERTIONS (their factual meaning must not be asserted, including paraphrases, even if mentioned in sources):
${JSON.stringify(rejected)}

Evaluate EVERY factual claim in the proposed content, including metrics, employers, dates and qualifications. Block anything not strictly supported by the original resume or user answers. Do not treat job requirements as evidence about the candidate. Return at least one claim for nonempty content.
${verifyProposal ? "For this final verification, claims and blockedClaims must describe ONLY assertions actually present in PROPOSED CHANGES/NEW CONTENT TO ADD. The rejected list is a prohibition of assertions, not proposed content or a keyword blacklist: do not list a rejected item as blocked or missing merely because it appears in that list. If its factual meaning is asserted in the proposal, block it even when paraphrased. Determine meaning and scope from the complete sentence: GitHub does not assert Git proficiency; knowledge of PHPUnit theory does not assert professional practice; negating an assertion does not assert it. Do not reject independently supported facts merely for sharing a word with a rejected assertion. Explicit candidate denials remain binding. Never invent an assertion in the proposal." : ""}`;

    const rawResult = await orchestrator.analyzeLocalized<TruthGuardGen>(
      TRUTH_GUARD_SYSTEM_PROMPT,
      userPrompt,
      VerifiedTruthSchema,
      language, undefined, "factual_verification"
    );
    
    const result = VerifiedTruthSchema.parse(rawResult);
    // A contradictory verdict must never turn an uncertain statement into an
    // approved fact merely because the model labeled its source as confirmed.
    return normalizeTruthVerdict(result);
  }
}
