import { boundedJson } from "@/lib/read-bounded-body";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/http-error";
import { answerForReview, isMalformedStructuredAnswer, readStructuredAnswer } from "@/lib/question-answer";
export async function POST(request: Request) {
  try {
    const session = await getSessionUser(); if (!session) throw new HttpError(401, "Faça login para continuar.");
    const { analysisId, answers } = z.object({ analysisId: z.string(), answers: z.record(z.string(), z.string().max(5000)) }).strict().parse(await boundedJson(request));
    await prisma.$transaction(async tx => {
      const analysis = await tx.analysis.findFirst({ where: { id: analysisId, userId: session.userId }, include: { questions: true } });
      if (!analysis) throw new HttpError(404, "Análise não encontrada.");
      if (Object.keys(answers).some(id => !analysis.questions.some(q => q.id === id))) throw new HttpError(400, "Pergunta inválida para esta análise.");
      let changed = false;
      for (const [id, answer] of Object.entries(answers)) {
        const question = analysis.questions.find(q => q.id === id)!;
        if (question.answer === answer) continue;
        const structured = readStructuredAnswer(answer);
        if (isMalformedStructuredAnswer(answer) || (structured && ((structured.kind === "boolean") !== (question.answerType === "boolean") || (structured.kind === "choice" && !["multiple_choice", "multiple_select"].includes(question.answerType))))) throw new HttpError(400, "Resposta inválida para esta pergunta.");
        if (structured?.kind === "choice") {
          let allowed: unknown;
          try { allowed = JSON.parse(question.options || "[]"); } catch { throw new HttpError(400, "As opções desta pergunta são inválidas."); }
          if (!Array.isArray(allowed) || structured.selected.some(value => !allowed.includes(value)) || new Set(structured.selected).size !== structured.selected.length || (question.answerType === "multiple_choice" && (structured.selected.length > 1 || (!!structured.other.trim() && structured.selected.length > 0)))) throw new HttpError(400, "Revise as opções desta resposta.");
        }
        await tx.smartQuestion.update({ where: { id }, data: { answer, confirmed: !!answerForReview(answer) } }); changed = true;
      }
      if (changed) await tx.analysis.update({ where: { id: analysisId }, data: { truthGuardJson: null, revision: { increment: 1 } } });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
