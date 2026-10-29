import { AnalysisOrchestrator } from "@/lib/ai/analysis-orchestrator";
import { TruthGuardGen, TruthGuardSchema } from "@/lib/schemas/questions.schema";
import { OpenRouterProvider } from "@/lib/ai/openrouter-provider";
import { NvidiaNimProvider } from "@/lib/ai/nvidia-nim-provider";

const TRUTH_GUARD_SYSTEM_PROMPT = `You are the Truth Guard. Your sole purpose is to prevent AI hallucination and ensure a candidate's resume contains NO lies.
You must classify every new claim, skill, or metric proposed for the resume rewrite.
A claim can ONLY be used if it is 'confirmed_by_resume' or 'confirmed_by_user'.
Any claim that is an invention or hallucination MUST be marked 'forbidden_to_use'.
For the review screen, translate claim descriptions faithfully into the selected output language even when the source is in another language. Preserve proper names, technical terms and the underlying facts. A question or a blank answer is not a confirmed or denied fact.
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

export function normalizeTruthVerdict(result: TruthGuardGen): TruthGuardGen {
  return { ...result, claims: result.claims.map(claim =>
    (claim.source === "confirmed_by_resume" || claim.source === "confirmed_by_user") && (!claim.canUseInResume || !claim.canUseInCoverLetter)
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

EXPLICITLY REJECTED CLAIMS (must not appear, including paraphrases, even if mentioned in sources):
${JSON.stringify(rejected)}

Evaluate EVERY factual claim in the proposed content, including metrics, employers, dates and qualifications. Block anything not strictly supported by the original resume or user answers. Do not treat job requirements as evidence about the candidate. Return at least one claim for nonempty content.
${verifyProposal ? "For this final verification, claims and blockedClaims must describe ONLY assertions actually present in PROPOSED CHANGES/NEW CONTENT TO ADD. The rejected list is a prohibition, not proposed content: do not list a rejected item as blocked or missing merely because it appears in that list. If its meaning actually appears in the proposal, block it even when paraphrased. Never invent an assertion in the proposal." : ""}`;

    const rawResult = await orchestrator.analyzeLocalized<TruthGuardGen>(
      TRUTH_GUARD_SYSTEM_PROMPT,
      userPrompt,
      TruthGuardSchema,
      language
    );
    
    const result = TruthGuardSchema.parse(rawResult);
    // A contradictory verdict must never turn an uncertain statement into an
    // approved fact merely because the model labeled its source as confirmed.
    return normalizeTruthVerdict(result);
  }
}
