import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { AnalysisOrchestrator } from "@/lib/ai/analysis-orchestrator";
import { CoverLetterSchema } from "@/lib/schemas/optimize.schema";
import { readTruth, truthContext, truthSourceHash } from "@/lib/ats/truth-policy";
import { verifyOutput } from "@/lib/ats/verify-output";
import { runAnalysisTask } from "@/lib/analysis-task";
import { languageLabel } from "@/lib/analysis-contract";
import { apiError, HttpError } from "@/lib/http-error";
export const maxDuration = 180;
export async function POST(request: Request) {
  try {
    const session = await getSessionUser(); if (!session) throw new HttpError(401, "Faça login para continuar.");
    const { analysisId } = z.object({ analysisId: z.string() }).strict().parse(await request.json());
    const analysis = await prisma.analysis.findFirst({ where: { id: analysisId, userId: session.userId }, include: { questions: true } });
    if (!analysis?.parsedResumeText || !analysis.jobDescription) throw new HttpError(400, "Informe seu currículo e a descrição da vaga.");
    const review = readTruth(analysis.truthGuardJson);
    if (review && review.sourceHash !== truthSourceHash(analysis)) throw new HttpError(409, "As respostas mudaram. Valide os fatos novamente.");
    const facts = truthContext(review);
    const confirmed = analysis.questions.filter(q => q.answer && q.confirmed).map(q => q.answer).join("\n") + "\n" + facts.approved.join("\n");
    const result = await runAnalysisTask(analysisId, session.userId, "COVER_LETTER", [analysis.revision, analysis.truthGuardJson, analysis.selectedLanguage], async () => {
      const letter = await new AnalysisOrchestrator().analyzeLocalized("Write a concise cover letter in " + languageLabel(analysis.selectedLanguage) + ". Return only JSON {\"content\":\"...\"}. Use only facts supported by ORIGINAL or CONFIRMED; never invent skills, metrics or qualifications from the job. Do not use REJECTED claims, even paraphrased. No contact blocks or email headers.", JSON.stringify({ original: analysis.parsedResumeText, confirmed, rejected: facts.rejected, job: analysis.jobDescription, optimized: analysis.finalResumeJson }), CoverLetterSchema, analysis.selectedLanguage);
      await verifyOutput(analysis.parsedResumeText!, confirmed, letter.content, facts.rejected, "letter", analysis.selectedLanguage);
      const updated = await prisma.analysis.updateMany({ where: { id: analysisId, revision: analysis.revision, truthGuardJson: analysis.truthGuardJson }, data: { coverLetter: letter.content } });
      if (!updated.count) throw new HttpError(409, "O conteúdo mudou durante a geração. Tente novamente.");
      return { success: true, coverLetter: letter.content };
    });
    return NextResponse.json(result);
  } catch (error) { return apiError(error, "Não foi possível gerar a carta. Nenhum resultado anterior foi substituído."); }
}
