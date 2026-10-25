import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/http-error";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser(); if (!session) throw new HttpError(401, "Faça login para continuar.");
    const { id } = await params; const kind = new URL(request.url).searchParams.get("kind") || "";
    const task = await prisma.analysisTask.findFirst({ where: { analysisId: id, kind, userId: session.userId, analysis: { userId: session.userId } } });
    if (!task) throw new HttpError(404, "Etapa não encontrada.");
    return NextResponse.json({ status: task.status === "RUNNING" && task.leaseUntil < new Date() ? "EXPIRED" : task.status, result: task.status === "COMPLETED" && task.resultJson ? JSON.parse(task.resultJson) : null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
