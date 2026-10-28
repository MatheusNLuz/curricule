import { AnalysisOrchestrator } from "@/lib/ai/analysis-orchestrator";
import { TruthGuardGen, TruthGuardSchema } from "@/lib/schemas/questions.schema";

const TRUTH_GUARD_SYSTEM_PROMPT = `You are the Truth Guard. Your sole purpose is to prevent AI hallucination and ensure a candidate's resume contains NO lies.
You must classify every new claim, skill, or metric proposed for the resume rewrite.
A claim can ONLY be used if it is 'confirmed_by_resume' or 'confirmed_by_user'.
Any claim that is an invention or hallucination MUST be marked 'forbidden_to_use'.
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

export class TruthGuard {
  static async evaluate(resumeText: string, userAnswers: string, proposedChanges: string, rejected: string[] = [], language = "pt-BR"): Promise<TruthGuardGen> {
    const orchestrator = new AnalysisOrchestrator();
    
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

Evaluate EVERY factual claim in the proposed content, including metrics, employers, dates and qualifications. Block anything not strictly supported by the original resume or user answers. Do not treat job requirements as evidence about the candidate. Return at least one claim for nonempty content.`;

    const rawResult = await orchestrator.analyzeLocalized<TruthGuardGen>(
      TRUTH_GUARD_SYSTEM_PROMPT,
      userPrompt,
      TruthGuardSchema,
      language
    );
    
    return TruthGuardSchema.parse(rawResult);
  }
}
