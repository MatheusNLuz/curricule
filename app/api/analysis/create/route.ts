import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode, jobLocation, selectedLanguage } = body;

    if (!mode) {
      return NextResponse.json({ error: "Mode is required" }, { status: 400 });
    }

    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Faça login para iniciar uma análise." }, { status: 401 });
    }

    // Create the analysis record
    const analysis = await prisma.analysis.create({
      data: {
        userId: session.userId,
        mode,
        selectedLanguage: selectedLanguage || "unknown",
        selectedTemplate: "basic-ats",
        resumeInputType: "PDF_UPLOAD",
        jobLocation: jobLocation || null,
      },
    });

    return NextResponse.json({ ...analysis, jobLocation: jobLocation || null });
  } catch (error) {
    console.error("Error creating analysis:", error);
    return NextResponse.json({ error: "Não foi possível iniciar a análise. Tente novamente em instantes." }, { status: 503 });
  }
}
