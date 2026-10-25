import { ResumeAnalysis } from "@/lib/schemas/analysis.schema";

export class ScoreEngine {
  /**
   * Recalculates scores based on the analysis output.
   * Can be used to validate AI scores or generate them deterministically.
   */
  static evaluate(analysis: ResumeAnalysis) {
    let atsPenalty = 0;
    
    analysis.atsIssues.forEach((issue) => {
      if (issue.severity === "high") atsPenalty -= 15;
      if (issue.severity === "medium") atsPenalty -= 8;
      if (issue.severity === "low") atsPenalty -= 3;
    });

    const dataPenalty = analysis.sensitiveDataWarnings.length * -5;

    let impactScore = analysis.scores.impact;
    if (analysis.strengths.some(s => s.toLowerCase().includes("metric") || s.toLowerCase().includes("result"))) {
      impactScore = Math.min(100, impactScore + 10);
    }

    const calculatedAtsScore = Math.max(0, Math.min(100, analysis.scores.ats + atsPenalty + dataPenalty));
    
    // Average overall from sub-scores if we want a deterministic final overall
    const overallScore = Math.round(
      (calculatedAtsScore * 0.4) + 
      (analysis.scores.structure * 0.2) + 
      (analysis.scores.clarity * 0.15) + 
      (impactScore * 0.15) + 
      (analysis.scores.keywords * 0.1)
    );

    return {
      overall: overallScore,
      ats: calculatedAtsScore,
      structure: analysis.scores.structure,
      clarity: analysis.scores.clarity,
      keywords: analysis.scores.keywords,
      impact: impactScore,
      perceivedSeniority: analysis.scores.perceivedSeniority,
      internationalCompatibility: analysis.scores.internationalCompatibility || 0,
    };
  }
}
