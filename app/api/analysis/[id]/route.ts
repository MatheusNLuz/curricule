import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

    const analysis = await prisma.analysis.findFirst({
      where: { id, userId: session.userId },
      include: { questions: true }
    });

    if (!analysis) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Error fetching analysis:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
    const body = await req.json();

    const existingAnalysis = await prisma.analysis.findFirst({ where: { id, userId: session.userId }, select: { id: true } });
    if (!existingAnalysis) return NextResponse.json({ error: "Análise não encontrada." }, { status: 404 });

    const analysis = await prisma.analysis.update({
      where: { id: existingAnalysis.id },
      data: body,
    });

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Error updating analysis:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
