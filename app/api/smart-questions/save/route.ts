import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/http-error";
export async function POST(request: Request) {
  try {
    const session = await getSessionUser(); if (!session) throw new HttpError(401, "Faça login para continuar.");
    const { analysisId, answers } = z.object({ analysisId: z.string(), answers: z.record(z.string(), z.string().max(5000)) }).strict().parse(await request.json());
    await prisma.$transaction(async tx => {
      const analysis = await tx.analysis.findFirst({ where: { id: analysisId, userId: session.userId }, include: { questions: true } });
      if (!analysis) throw new HttpError(404, "Análise não encontrada.");
      if (Object.keys(answers).some(id => !analysis.questions.some(q => q.id === id))) throw new HttpError(400, "Pergunta inválida para esta análise.");
      let changed = false;
      for (const [id, answer] of Object.entries(answers)) {
        if (analysis.questions.find(q => q.id === id)?.answer === answer) continue;
        await tx.smartQuestion.update({ where: { id }, data: { answer, confirmed: !!answer.trim() } }); changed = true;
      }
      if (changed) await tx.analysis.update({ where: { id: analysisId }, data: { truthGuardJson: null, revision: { increment: 1 } } });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
