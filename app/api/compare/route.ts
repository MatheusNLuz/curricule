import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AnalysisOrchestrator } from "@/lib/ai/analysis-orchestrator";
import { JobParseSchema, CompareSchema, JobParse, CompareAnalysis } from "@/lib/schemas/job-compare.schema";
import { getSessionUser } from "@/lib/auth";

export const maxDuration = 60;

const JOB_PARSE_PROMPT = `You are an expert technical recruiter. Extract the structured details from this job description.
Return ONLY valid JSON matching this exact structure:
{
  "title": "string",
  "seniority": "junior" | "mid" | "senior" | "lead" | "unknown",
  "requiredSkills": ["string"],
  "niceToHaveSkills": ["string"],
  "keyResponsibilities": ["string"]
}

CRITICAL: Return in Portuguese (pt-BR) unless it's a technical keyword.`;

const COMPARE_PROMPT = `You are an expert ATS and technical recruiter. Compare the user's parsed resume against the parsed job description.
Return ONLY valid JSON matching this exact structure:
{
  "matchPercentage": 0-100,
  "missingMandatorySkills": ["string"],
  "missingNiceToHaveSkills": ["string"],
  "experienceGaps": ["string"],
  "culturalMatchNotes": "string",
  "recommendationsToMatch": ["string"]
}

CRITICAL: Return in Portuguese (pt-BR).`;

export async function POST(req: Request) {
  try {
    const { analysisId } = await req.json();

    if (!analysisId) return NextResponse.json({ error: "Analysis ID required" }, { status: 400 });

    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

    const analysis = await prisma.analysis.findFirst({ where: { id: analysisId, userId: session.userId } });
    if (!analysis || !analysis.jobDescription || !analysis.parsedResumeText) {
      return NextResponse.json({ error: "Missing job description or parsed resume" }, { status: 400 });
    }

    const orchestrator = new AnalysisOrchestrator();

    // 1. Parse Job
    let jobParseJson = analysis.jobParseJson;
    if (!jobParseJson) {
      const rawJob = await orchestrator.analyze<JobParse>(
        JOB_PARSE_PROMPT,
        `Job Description:\n${analysis.jobDescription}`
      );
      const validatedJob = JobParseSchema.parse(rawJob);
      jobParseJson = JSON.stringify(validatedJob);
      await prisma.analysis.update({ where: { id: analysisId }, data: { jobParseJson } });
    }

    // 2. Compare
    const rawCompare = await orchestrator.analyze<CompareAnalysis>(
      COMPARE_PROMPT,
      `Parsed Job:\n${jobParseJson}\n\nParsed Resume:\n${analysis.parsedResumeText}`
    );
    const validatedCompare = CompareSchema.parse(rawCompare);

    await prisma.analysis.update({
      where: { id: analysisId },
      data: { comparisonJson: JSON.stringify(validatedCompare) }
    });

    return NextResponse.json({ success: true, comparison: validatedCompare });
  } catch (error) {
    console.error("Compare error:", error);
    return NextResponse.json({ error: "A comparação com a vaga não foi concluída. Tente novamente em instantes." }, { status: 503 });
  }
}
