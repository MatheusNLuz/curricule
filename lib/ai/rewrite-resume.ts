import type { AnalysisOrchestrator } from "./analysis-orchestrator";
import { RESUME_REWRITE_PROMPT, RESUME_FACT_REPAIR_PROMPT } from "./resume-rewrite-prompt";
import { RESUME_TAILORING_PROMPT, resumeTailoringSchema } from "./resume-tailoring";
import { OptimizedResumeSchema, type OptimizedResume } from "../schemas/optimize.schema";
import { generateVerifiedOutput, verifyOutput } from "../ats/verify-output";
import { resumeText } from "../resume/resume-text";
import { resumeRegionGuidance } from "../resume/region-guidance";
import { languageLabel } from "../analysis-contract";

type RewriteInput = { original: string; confirmed: string; confirmedEvidence?: string; rejected: string[]; job: string | null; language: string; region: string | null };

export async function rewriteResume(ai: AnalysisOrchestrator, input: RewriteInput): Promise<OptimizedResume> {
  const confirmedEvidence = input.confirmedEvidence ?? input.confirmed;
  const tailoring = input.job?.trim() ? await ai.analyzeLocalized(RESUME_TAILORING_PROMPT, JSON.stringify({ original: input.original, confirmed: confirmedEvidence, job: input.job }), resumeTailoringSchema(input.original, confirmedEvidence, input.job), input.language, 2400) : null;
  const payload = { ...input, language: languageLabel(input.language), tailoring };
  return generateVerifiedOutput<OptimizedResume>(
    (issues, previousOutput) => ai.analyzeLocalized(
      (issues.length ? RESUME_FACT_REPAIR_PROMPT : RESUME_REWRITE_PROMPT) + "\nOutput language: " + languageLabel(input.language) + ". Optional regional guidance: " + resumeRegionGuidance(input.region) + ". Region never overrides language or candidate facts. Use the evidence-based tailoring plan to lead the summary and order supported bullets and skills by job relevance. Its unsupportedRequirements are gaps, never candidate facts. Keep the existing roles and history faithful to the source.",
      JSON.stringify(issues.length ? { originalInput: payload, previousOutput, reviewFeedback: issues } : payload),
      OptimizedResumeSchema, input.language,
    ),
    value => verifyOutput(input.original, input.confirmed, resumeText(value, input.language), input.rejected, "resume", input.language),
  );
}
