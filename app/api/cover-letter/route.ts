import { boundedJson } from "@/lib/read-bounded-body";
import { answerForReview } from "@/lib/question-answer";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { AnalysisOrchestrator } from "@/lib/ai/analysis-orchestrator";
import { CoverLetterSchema } from "@/lib/schemas/optimize.schema";
import { storedConfirmedClaims, storedRejectedClaims, readTruth, truthContext, truthSourceHash } from "@/lib/ats/truth-policy";
import { verifyOutput } from "@/lib/ats/verify-output";
import { runAnalysisTask, commitTask } from "@/lib/analysis-task";
import { languageLabel } from "@/lib/analysis-contract";
import { apiError, HttpError } from "@/lib/http-error";
export const maxDuration = 270;
export async function POST(request: Request) {
  try {
    const session = await getSessionUser(); if (!session) throw new HttpError(401, "Faça login para continuar.");
    const { analysisId } = z.object({ analysisId: z.string() }).strict().parse(await boundedJson(request));
    const analysis = await prisma.analysis.findFirst({ where: { id: analysisId, userId: session.userId }, include: { questions: true } });
    if (!analysis?.parsedResumeText || !analysis.jobDescription) throw new HttpError(400, "Informe seu currículo e a descrição da vaga.");
    const review = readTruth(analysis.truthGuardJson);
    if (review && review.sourceHash !== truthSourceHash(analysis)) throw new HttpError(409, "As respostas mudaram. Valide os fatos novamente.");
    const facts = truthContext(review);
    facts.approved=[...new Set([...facts.approved,...storedConfirmedClaims(analysis.confirmedClaimsJson)])];
    facts.rejected=[...new Set([...facts.rejected,...storedRejectedClaims(analysis.rejectedClaimsJson)])];
    const confirmed = analysis.questions.filter(q => q.confirmed).map(q => answerForReview(q.answer)).filter(Boolean).join("\n") + "\n" + facts.approved.join("\n");
    const result = await runAnalysisTask(analysisId, session.userId, "COVER_LETTER", [analysis.revision, analysis.truthGuardJson, analysis.selectedLanguage,analysis.rejectedClaimsJson,analysis.confirmedClaimsJson], async () => {
      const writer=new AnalysisOrchestrator();
      const prompt="Write a concise cover letter in " + languageLabel(analysis.selectedLanguage) + ". Return only JSON {\"content\":\"...\"}. Use only facts supported by ORIGINAL or CONFIRMED; never invent skills, metrics or qualifications from the job. Do not use REJECTED claims, even paraphrased. No contact blocks or email headers. Avoid unsupported self-descriptions such as expert, proven excellence, high performance or a track record of improvements. Interest in a role is not evidence of a qualification.";
      const payload=JSON.stringify({original:analysis.parsedResumeText,confirmed,rejected:facts.rejected,job:analysis.jobDescription});
      let letter=await writer.analyzeLocalized(prompt,payload,CoverLetterSchema,analysis.selectedLanguage);
      try{await verifyOutput(analysis.parsedResumeText!,confirmed,letter.content,facts.rejected,"letter",analysis.selectedLanguage);}catch(error){
        if(!(error instanceof HttpError)||error.status!==422)throw error;
        letter=await writer.analyzeLocalized(prompt+" The previous draft failed factual verification. Start again from ORIGINAL and CONFIRMED only. Keep it brief, omit all inferred achievements, skills and personal qualities, and connect only explicitly documented activities to the role. Do not add missing facts to make the candidate fit.",payload,CoverLetterSchema,analysis.selectedLanguage);
        await verifyOutput(analysis.parsedResumeText!,confirmed,letter.content,facts.rejected,"letter",analysis.selectedLanguage);
      }
      const updated = await commitTask(tx => tx.analysis.updateMany({ where: { id: analysisId, revision: analysis.revision, truthGuardJson: analysis.truthGuardJson }, data: { coverLetter: letter.content } }));
      if (!updated.count) throw new HttpError(409, "O conteúdo mudou durante a geração. Tente novamente.");
      return { success: true, coverLetter: letter.content };
    });
    return NextResponse.json(result);
  } catch (error) { return apiError(error, "Não foi possível gerar a carta. Nenhum resultado anterior foi substituído."); }
}
