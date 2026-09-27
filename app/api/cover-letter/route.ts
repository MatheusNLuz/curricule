import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AnalysisOrchestrator } from "@/lib/ai/analysis-orchestrator";
import { CoverLetterSchema, CoverLetterGen } from "@/lib/schemas/optimize.schema";
import { getSessionUser } from "@/lib/auth";

const COVER_LETTER_PROMPT = `You are an expert career coach. Given the optimized resume and the job description, write a compelling, concise cover letter.
CRITICAL INSTRUCTIONS:
1. LANGUAGE MATCHING: Write the cover letter in the SAME LANGUAGE as the Job Description (e.g., if the job is in English, write in English. If Portuguese, Portuguese).
2. NO EMAIL HEADERS/CONTACT INFO: DO NOT include phone numbers, emails, addresses, or generic "Dear Hiring Manager" / "Sincerely [Name]" blocks at the top/bottom. The cover letter will be attached to a profile that already has this contact info. Just write the core body paragraphs.
3. TONE & STRUCTURE: Make it sound professional and engaging, focusing on technical matches, gap analysis, and the unique value proposition. It should NOT look like a raw email.

Return ONLY valid JSON matching this exact structure:
{
  "content": "string"
}`;

export async function POST(req: Request) {
  try {
    const { analysisId } = await req.json();
    if (!analysisId) return NextResponse.json({ error: "Analysis ID required" }, { status: 400 });

    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

    const analysis = await prisma.analysis.findFirst({ where: { id: analysisId, userId: session.userId } });
    if (!analysis || (!analysis.finalResumeJson && !analysis.parsedResumeText) || !analysis.jobDescription) {
      return NextResponse.json({ error: "Resume and job description required" }, { status: 400 });
    }

    const resumeContent = analysis.finalResumeJson || analysis.parsedResumeText;
    const payload = `Resume:\n${resumeContent}\n\nJob Description:\n${analysis.jobDescription}`;

    const orchestrator = new AnalysisOrchestrator();
    const rawLetter = await orchestrator.analyze<CoverLetterGen>(COVER_LETTER_PROMPT, payload);
    const validated = CoverLetterSchema.parse(rawLetter);

    await prisma.analysis.update({
      where: { id: analysisId },
      data: { coverLetter: validated.content }
    });

    return NextResponse.json({ success: true, coverLetter: validated.content });
  } catch (error) {
    console.error("Cover letter error:", error);
    return NextResponse.json({ error: "A carta de apresentação não pôde ser gerada. Tente novamente em instantes." }, { status: 503 });
  }
}
