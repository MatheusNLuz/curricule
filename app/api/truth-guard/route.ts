import { boundedJson } from "@/lib/read-bounded-body";
import { answerForReview } from "@/lib/question-answer";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { TruthGuard } from "@/lib/ats/truth-guard";
import { storedConfirmedClaims,storedRejectedClaims,truthSourceHash } from "@/lib/ats/truth-policy";
import { apiError, HttpError } from "@/lib/http-error";
import { runAnalysisTask, commitTask } from "@/lib/analysis-task";
export const maxDuration = 270;
export async function POST(request: Request) {
  try {
    const session = await getSessionUser(); if (!session) throw new HttpError(401, "Faça login para continuar.");
    const { analysisId } = z.object({ analysisId: z.string() }).strict().parse(await boundedJson(request));
    const analysis = await prisma.analysis.findFirst({ where: { id: analysisId, userId: session.userId }, include: { questions: true } });
    if (!analysis) throw new HttpError(404, "Análise não encontrada.");
    const hash = truthSourceHash(analysis);
    const rejected=storedRejectedClaims(analysis.rejectedClaimsJson);
    const result = await runAnalysisTask(analysisId, session.userId, "TRUTH", [hash,analysis.rejectedClaimsJson,analysis.confirmedClaimsJson], async () => {
      const answers = analysis.questions.map(q => ({ question: q.question, answer: answerForReview(q.answer) })).filter(q => q.answer).map(q => q.question + ": " + q.answer).join("\n")+"\n"+storedConfirmedClaims(analysis.confirmedClaimsJson).join("\n");
      const comparison = analysis.comparisonJson ? JSON.parse(analysis.comparisonJson) : null;
      const additions = { answers, unconfirmedJobRequirements: comparison?.missingMandatorySkills || [] };
      const report = { ...await TruthGuard.evaluate(analysis.parsedResumeText || "", answers, JSON.stringify(additions), rejected, analysis.selectedLanguage), sourceHash: hash, decisions: {} };
      await commitTask(async tx=>{
        const updated=await tx.analysis.updateMany({where:{id:analysisId,revision:analysis.revision},data:{truthGuardJson:JSON.stringify(report)}});
        if(!updated.count)throw new HttpError(409,"As respostas mudaram durante a validação. Valide os fatos novamente.");
      });
      return report;
    });
    return NextResponse.json({ success: true, truthGuard: result });
  } catch (error) { return apiError(error); }
}
