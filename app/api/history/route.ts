import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Faça login para ver seu histórico." }, { status: 401 });

    const history = await prisma.analysis.findMany({
      where: { userId: session.userId },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      ...(new URL(request.url).searchParams.get("cursor") ? { cursor: { id: new URL(request.url).searchParams.get("cursor")! }, skip: 1 } : {}),
      select: {
        id: true,
        mode: true,
        professionalTarget: true,
        selectedLanguage: true,
        createdAt: true,
        initialScores: true,
        finalScores: true,
      },
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json({ error: "Não foi possível carregar seu histórico. Tente novamente em instantes." }, { status: 503 });
  }
}
