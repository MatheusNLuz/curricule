import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/http-error";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser(); if (!session) throw new HttpError(401, "Faça login para continuar.");
    const { id } = await params;
    if (!await prisma.analysis.findFirst({ where: { id, userId: session.userId }, select: { id: true } })) throw new HttpError(404, "Análise não encontrada.");
    return NextResponse.json(await prisma.resumeRevision.findMany({ where: { analysisId: id }, orderBy: { createdAt: "desc" }, take: 20 }));
  } catch (error) { return apiError(error); }
}
