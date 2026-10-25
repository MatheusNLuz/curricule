import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { readTruth, reviewTruth, truthSourceHash } from "@/lib/ats/truth-policy";
import { apiError, HttpError } from "@/lib/http-error";
export async function POST(request: Request) {
  try {
    const session = await getSessionUser(); if (!session) throw new HttpError(401, "Faça login para continuar.");
    const input = z.object({ analysisId: z.string(), sourceHash: z.string(), decisions: z.record(z.string(), z.boolean()) }).strict().parse(await request.json());
    const analysis = await prisma.analysis.findFirst({ where: { id: input.analysisId, userId: session.userId }, include: { questions: true } });
    if (!analysis) throw new HttpError(404, "Análise não encontrada.");
    const report = readTruth(analysis.truthGuardJson);
    if (!report || report.sourceHash !== input.sourceHash || report.sourceHash !== truthSourceHash(analysis)) throw new HttpError(409, "As respostas mudaram. Valide os fatos novamente.");
    let reviewed;
    try { reviewed = reviewTruth(report, input.decisions); } catch (error) { throw new HttpError(400, (error as Error).message); }
    await prisma.analysis.update({ where: { id: analysis.id }, data: { truthGuardJson: JSON.stringify(reviewed) } });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
