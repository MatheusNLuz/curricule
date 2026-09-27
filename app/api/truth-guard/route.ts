import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TruthGuard } from "@/lib/ats/truth-guard";
import { getSessionUser } from "@/lib/auth";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { analysisId } = await req.json();
    if (!analysisId) return NextResponse.json({ error: "Analysis ID required" }, { status: 400 });

    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, userId: session.userId },
      include: { questions: true }
    });

    if (!analysis) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const answersText = analysis.questions.filter(q => q.answer).map(q => `Q: ${q.question}\nA: ${q.answer}`).join("\n");
    const proposed = analysis.comparisonJson ? JSON.parse(analysis.comparisonJson).missingMandatorySkills?.join(", ") || "" : "";

    const truthGuardResult = await TruthGuard.evaluate(
      analysis.parsedResumeText || "",
      answersText || "No user answers.",
      proposed || "No proposed additions."
    );

    await prisma.analysis.update({
      where: { id: analysisId },
      data: { truthGuardJson: JSON.stringify(truthGuardResult) }
    });

    return NextResponse.json({ success: true, truthGuard: truthGuardResult });
  } catch (error) {
    console.error("Truth Guard error:", error);
    return NextResponse.json({ error: "Não foi possível verificar a integridade do conteúdo. Tente novamente." }, { status: 503 });
  }
}
