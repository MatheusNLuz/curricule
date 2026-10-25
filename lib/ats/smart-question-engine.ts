import { AnalysisOrchestrator } from "@/lib/ai/analysis-orchestrator";
import { SmartQuestionGen, SmartQuestionSchema } from "@/lib/schemas/questions.schema";
import { RequirementMatrix } from "@/lib/schemas/job.schema";

const QUESTION_SYSTEM_PROMPT = `You are a career coach and resume optimizer AI.
Your task is to generate smart questions for a candidate based on gaps or weak points found between their resume and the target job description.
Focus on missing skills, lack of metrics, and unclear experience.
Return only valid JSON matching the provided schema.`;

export class SmartQuestionEngine {
  static async generate(resumeText: string, jobDescription: string, matrix: RequirementMatrix, language: string): Promise<SmartQuestionGen> {
    const orchestrator = new AnalysisOrchestrator();
    
    // Only pass requirements that are missing or not confirmed
    const gaps = matrix.requirements.filter(r => r.status === "missing" || r.status === "not_confirmed");
    
    const userPrompt = `
RESUME:
"""
${resumeText}
"""

JOB DESCRIPTION:
"""
${jobDescription}
"""

GAPS:
${JSON.stringify(gaps, null, 2)}

Generate questions to fill these gaps without encouraging the candidate to lie.`;

    const rawResult = await orchestrator.analyzeLocalized<SmartQuestionGen>(
      QUESTION_SYSTEM_PROMPT,
      userPrompt,
      SmartQuestionSchema,
      language
    );
    
    return SmartQuestionSchema.parse(rawResult);
  }
}
