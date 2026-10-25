import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { TruthGuard } from "@/lib/ats/truth-guard";
import { truthSourceHash } from "@/lib/ats/truth-policy";
import { apiError, HttpError } from "@/lib/http-error";
import { runAnalysisTask } from "@/lib/analysis-task";
export const maxDuration = 180;
export async function POST(request: Request) {
  try {
    const session = await getSessionUser(); if (!session) throw new HttpError(401, "Faça login para continuar.");
    const { analysisId } = z.object({ analysisId: z.string() }).strict().parse(await request.json());
    const analysis = await prisma.analysis.findFirst({ where: { id: analysisId, userId: session.userId }, include: { questions: true } });
    if (!analysis) throw new HttpError(404, "Análise não encontrada.");
    const hash = truthSourceHash(analysis);
    const result = await runAnalysisTask(analysisId, session.userId, "TRUTH", hash, async () => {
      const answers = analysis.questions.filter(q => q.answer).map(q => q.question + ": " + q.answer).join("\n");
      const comparison = analysis.comparisonJson ? JSON.parse(analysis.comparisonJson) : null;
      const additions = { answers, unconfirmedJobRequirements: comparison?.missingMandatorySkills || [] };
      const report = { ...await TruthGuard.evaluate(analysis.parsedResumeText || "", answers, JSON.stringify(additions), [], analysis.selectedLanguage), sourceHash: hash, decisions: {} };
      return report;
    });
    const updated = await prisma.analysis.updateMany({ where: { id: analysisId, revision: analysis.revision }, data: { truthGuardJson: JSON.stringify(result) } });
    if (!updated.count) throw new HttpError(409, "As respostas mudaram durante a validação. Valide os fatos novamente.");
    return NextResponse.json({ success: true, truthGuard: result });
  } catch (error) { return apiError(error); }
}
