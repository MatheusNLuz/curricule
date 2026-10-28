import { AnalysisOrchestrator } from "@/lib/ai/analysis-orchestrator";
import { StructuredResume, StructuredResumeSchema } from "@/lib/schemas/resume.schema";
import { TruthGuardGen } from "@/lib/schemas/questions.schema";

const REWRITE_SYSTEM_PROMPT = `You are an expert resume writer and ATS optimizer.
Your task is to take an original resume, user answers, and Truth Guard validations to generate a perfectly structured, ATS-compliant JSON resume.
You MUST NOT invent any information. Only use data confirmed by the original resume or user answers, strictly following Truth Guard validations.
Ensure bullet points are impactful, start with action verbs, and include metrics where available.
Return only valid JSON matching the provided schema.`;

export class ResumeRewriter {
  static async rewrite(
    originalText: string,
    jobDescription: string | null,
    userAnswers: unknown,
    truthGuard: TruthGuardGen | null,
    targetLanguage: string
  ): Promise<StructuredResume> {
    const orchestrator = new AnalysisOrchestrator();
    
    const userPrompt = `
TARGET LANGUAGE: ${targetLanguage}
ORIGINAL RESUME:
"""
${originalText}
"""

TARGET JOB DESCRIPTION:
"""
${jobDescription || "N/A - General ATS Optimization"}
"""

USER ANSWERS TO GAPS:
${JSON.stringify(userAnswers, null, 2)}

TRUTH GUARD ENFORCEMENTS (Do not use any blocked claims):
${truthGuard ? JSON.stringify(truthGuard, null, 2) : "N/A"}

Rewrite the resume into the structured JSON format. Maximize impact without lying.`;

    const rawResult = await orchestrator.analyzeLocalized<StructuredResume>(
      REWRITE_SYSTEM_PROMPT,
      userPrompt,
      StructuredResumeSchema,
      targetLanguage
    );
    
    return StructuredResumeSchema.parse(rawResult);
  }
}
