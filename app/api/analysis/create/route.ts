import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { CreateAnalysisSchema } from "@/lib/analysis-contract";
import { apiError, HttpError } from "@/lib/http-error";
export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) throw new HttpError(401, "Faça login para iniciar uma análise.");
    const input = CreateAnalysisSchema.parse(await req.json());
    const analysis = await prisma.analysis.upsert({ where: { clientRequestId: input.clientRequestId }, update: {}, create: { ...input, userId: session.userId, selectedTemplate: "basic-ats", resumeInputType: "PDF_UPLOAD", jobLocation: input.jobLocation || null } });
    if (analysis.userId !== session.userId) throw new HttpError(404, "Análise não encontrada.");
    return NextResponse.json(analysis);
  } catch (error) { return apiError(error); }
}
