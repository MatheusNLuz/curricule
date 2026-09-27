import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ConsensusEngine } from "@/lib/ai/consensus-engine";
import { 
  ATS_ANALYZER_SYSTEM_PROMPT, 
  generateAtsAnalyzerUserPrompt,
  getLinkedInSystemPrompt,
  generateLinkedInAnalyzerUserPrompt 
} from "@/lib/ai/prompts";
import { 
  ResumeAnalysis, 
  ResumeAnalysisSchema,
  LinkedInAnalysisSchema 
} from "@/lib/schemas/analysis.schema";
import { ScoreEngine } from "@/lib/ats/score-engine";
import { GamificationEngine } from "@/lib/gamification/gamification-engine";
import { getSessionUser } from "@/lib/auth";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { analysisId } = body;

    if (!analysisId) {
      return NextResponse.json({ error: "Analysis ID is required" }, { status: 400 });
    }

    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

    const analysisRecord = await prisma.analysis.findFirst({
      where: { id: analysisId, userId: session.userId }
    });

    if (!analysisRecord || !analysisRecord.parsedResumeText) {
      return NextResponse.json({ error: "Analysis record or parsed resume text not found" }, { status: 404 });
    }

    const engine = new ConsensusEngine();
    
    if (analysisRecord.mode === "LINKEDIN_OPTIMIZATION") {
      // Generate LinkedIn Analysis using Consensus
      const rawAnalysis = await engine.analyzeWithConsensus<any>(
        getLinkedInSystemPrompt(analysisRecord.selectedLanguage),
        generateLinkedInAnalyzerUserPrompt(
          analysisRecord.parsedResumeText,
          analysisRecord.professionalTarget || "General",
          analysisRecord.selectedLanguage
        )
      );

      const validatedAnalysis = LinkedInAnalysisSchema.parse(rawAnalysis);

      // Custom simple gamification for LinkedIn
      const overall = validatedAnalysis.scores.overall;
      let level = 1;
      let levelName = "Perfil Básico";
      if (overall >= 90) {
        level = 5;
        levelName = "Pronto para Recrutadores";
      } else if (overall >= 75) {
        level = 4;
        levelName = "Perfil Altamente Competitivo";
      } else if (overall >= 60) {
        level = 3;
        levelName = "Perfil Otimizado";
      } else if (overall >= 40) {
        level = 2;
        levelName = "Perfil Estruturado";
      }

      const gamification = {
        level,
        levelName,
        missionsComplete: overall >= 90 ? 4 : overall >= 75 ? 3 : overall >= 50 ? 2 : 1,
        totalMissions: 4,
        badges: overall >= 80 ? ["LinkedIn Star", "SEO Master"] : ["LinkedIn Basic"],
      };

      // Save back to database
      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          analysisJson: JSON.stringify(validatedAnalysis),
          initialScores: JSON.stringify(validatedAnalysis.scores),
          gamificationJson: JSON.stringify(gamification),
          selectedLanguage: validatedAnalysis.recommendedLanguage || analysisRecord.selectedLanguage,
        }
      });

      return NextResponse.json({
        success: true,
        analysis: validatedAnalysis,
        scores: validatedAnalysis.scores,
        gamification
      });
    }

    // Default ATS Resume Analysis workflow
    const rawAnalysis = await engine.analyzeWithConsensus<ResumeAnalysis>(
      ATS_ANALYZER_SYSTEM_PROMPT,
      generateAtsAnalyzerUserPrompt(
        analysisRecord.parsedResumeText, 
        analysisRecord.professionalTarget || "General", 
        analysisRecord.mode, 
        analysisRecord.selectedLanguage
      )
    );

    // Validate with Zod
    const validatedAnalysis = ResumeAnalysisSchema.parse(rawAnalysis);

    // Recalculate/normalize scores
    const calculatedScores = ScoreEngine.evaluate(validatedAnalysis);
    validatedAnalysis.scores = calculatedScores;

    // Gamification
    const gamification = GamificationEngine.evaluate(validatedAnalysis);

    // Save back to database
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        analysisJson: JSON.stringify(validatedAnalysis),
        initialScores: JSON.stringify(calculatedScores),
        gamificationJson: JSON.stringify(gamification),
        selectedLanguage: validatedAnalysis.recommendedLanguage || analysisRecord.selectedLanguage,
      }
    });

    return NextResponse.json({
      success: true,
      analysis: validatedAnalysis,
      scores: calculatedScores,
      gamification
    });

  } catch (error) {
    console.error("Error running analysis engine:", error);
    return NextResponse.json({ error: "A análise do currículo não foi concluída. Tente novamente em instantes." }, { status: 503 });
  }
}
