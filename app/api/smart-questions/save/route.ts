import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { analysisId, answers } = await req.json();
    if (!analysisId || !answers) {
      return NextResponse.json({ error: "Missing analysisId or answers" }, { status: 400 });
    }

    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

    const analysis = await prisma.analysis.findFirst({ where: { id: analysisId, userId: session.userId }, select: { id: true } });
    if (!analysis) return NextResponse.json({ error: "Análise não encontrada." }, { status: 404 });

    // answers is an object: { [questionId]: answerText }
    for (const [qId, answer] of Object.entries(answers)) {
      await prisma.smartQuestion.updateMany({
        where: { id: qId, analysisId },
        data: { answer: answer as string }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving smart question answers:", error);
    return NextResponse.json({ error: "Não foi possível salvar suas respostas. Tente novamente." }, { status: 503 });
  }
}
