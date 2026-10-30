import { AnalysisOrchestrator } from "@/lib/ai/analysis-orchestrator";
import { RequirementMatrix, RequirementMatrixSchema } from "@/lib/schemas/job.schema";

const COMPARISON_SYSTEM_PROMPT = `You are a technical matching engine.
Your task is to compare a structured resume against a structured job description.
Create a detailed requirement matrix where each requirement from the job is evaluated against the resume.
Be strict: do not assume a candidate knows a specific tool if it is not explicitly mentioned or clearly implied by their role.
Use "not_confirmed" if a skill might be known but lacks evidence.
Return only valid JSON matching the provided schema.`;

export class JobMatchAnalyzer {
  static async compare(resumeText: string, jobDescription: string, language: string): Promise<RequirementMatrix> {
    const orchestrator = new AnalysisOrchestrator();
    
    const userPrompt = `
RESUME:
"""
${resumeText}
"""

JOB DESCRIPTION:
"""
${jobDescription}
"""

Compare them and return the requirement matrix.`;

    const rawResult = await orchestrator.analyzeLocalized<RequirementMatrix>(
      COMPARISON_SYSTEM_PROMPT,
      userPrompt,
      RequirementMatrixSchema,
      language, undefined, "comparison"
    );
    
    return RequirementMatrixSchema.parse(rawResult);
  }

  static calculateScore(matrix: RequirementMatrix): number {
    let score = 0;
    let totalWeight = 0;

    matrix.requirements.forEach(req => {
      let weight = 1;
      if (req.importance === "required") weight = 3;
      if (req.importance === "preferred") weight = 2;

      totalWeight += weight;

      if (req.status === "met") score += weight;
      else if (req.status === "partially_met") score += (weight * 0.5);
    });

    return totalWeight === 0 ? 0 : Math.round((score / totalWeight) * 100);
  }
}
