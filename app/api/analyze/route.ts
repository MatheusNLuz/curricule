import { boundedJson } from "@/lib/read-bounded-body";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { AnalysisOrchestrator } from "@/lib/ai/analysis-orchestrator";
import { ATS_ANALYZER_SYSTEM_PROMPT, generateAtsAnalyzerUserPrompt, getLinkedInSystemPrompt, generateLinkedInAnalyzerUserPrompt } from "@/lib/ai/prompts";
import { resumeAssessmentSchema, LinkedInAnalysisSchema } from "@/lib/schemas/analysis.schema";
import { ScoreEngine } from "@/lib/ats/score-engine";
import { GamificationEngine } from "@/lib/gamification/gamification-engine";
import { runAnalysisTask, commitTask } from "@/lib/analysis-task";
import { apiError, HttpError } from "@/lib/http-error";
export const maxDuration = 180;
export async function POST(request: Request) {
  try {
    const session = await getSessionUser(); if (!session) throw new HttpError(401, "Faça login para continuar.");
    const { analysisId } = z.object({ analysisId: z.string() }).strict().parse(await boundedJson(request));
    const record = await prisma.analysis.findFirst({ where: { id: analysisId, userId: session.userId } });
    if (!record?.parsedResumeText || record.parsedResumeText.length < 50) throw new HttpError(400, "Envie seu currículo ou perfil antes de analisar.");
    const result = await runAnalysisTask(analysisId, session.userId, "ANALYZE", ["optional-review-v1", record.parsedResumeText, record.mode, record.selectedLanguage], async () => {
      const ai = new AnalysisOrchestrator();
      if (record.mode === "LINKEDIN_OPTIMIZATION") {
        const { value: analysis, review } = await ai.analyzeWithReview(getLinkedInSystemPrompt(record.selectedLanguage), generateLinkedInAnalyzerUserPrompt(record.parsedResumeText!, record.professionalTarget || "General", record.selectedLanguage), LinkedInAnalysisSchema, record.selectedLanguage);
        const gamification = { level: 1, levelName: "Perfil em revisão", missionsComplete: 0, totalMissions: 4, badges: [] };
        await commitTask(tx => tx.analysis.update({ where: { id: analysisId }, data: { analysisJson: JSON.stringify(analysis), initialScores: JSON.stringify(analysis.scores), gamificationJson: JSON.stringify(gamification) } }));
        return { success: true, analysis, scores: analysis.scores, gamification, review };
      }
      const { value: analysis, review } = await ai.analyzeWithReview(ATS_ANALYZER_SYSTEM_PROMPT, generateAtsAnalyzerUserPrompt(record.parsedResumeText!, record.professionalTarget || "General", record.mode, record.selectedLanguage), resumeAssessmentSchema(record.parsedResumeText!), record.selectedLanguage);
      analysis.scores = ScoreEngine.evaluate(analysis);
      const gamification = GamificationEngine.evaluate(analysis);
      await commitTask(tx => tx.analysis.update({ where: { id: analysisId }, data: { analysisJson: JSON.stringify(analysis), initialScores: JSON.stringify(analysis.scores), gamificationJson: JSON.stringify(gamification) } }));
      return { success: true, analysis, scores: analysis.scores, gamification, review };
    });
    return NextResponse.json(result);
  } catch (error) { return apiError(error, "Não foi possível concluir a análise. Tente novamente."); }
}
