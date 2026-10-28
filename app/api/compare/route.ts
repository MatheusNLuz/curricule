import { boundedJson } from "@/lib/read-bounded-body";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AnalysisOrchestrator } from "@/lib/ai/analysis-orchestrator";
import { JobParseSchema, CompareSchema, JobParse, CompareAnalysis } from "@/lib/schemas/job-compare.schema";
import { getSessionUser } from "@/lib/auth";
import { runAnalysisTask, commitTask } from "@/lib/analysis-task";
import { apiError } from "@/lib/http-error";

export const maxDuration = 180;

const JOB_PARSE_PROMPT = `You are an expert technical recruiter. Extract the structured details from this job description.
Return ONLY valid JSON matching this exact structure:
{
  "title": "string",
  "seniority": "junior" | "mid" | "senior" | "lead" | "unknown",
  "requiredSkills": ["string"],
  "niceToHaveSkills": ["string"],
  "keyResponsibilities": ["string"]
}

Use the user-selected output locale.`;

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

Use the user-selected output locale.`;

export async function POST(req: Request) {
  try {
    const { analysisId } = await boundedJson(req);

    if (!analysisId) return NextResponse.json({ error: "Analysis ID required" }, { status: 400 });

    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

    const analysis = await prisma.analysis.findFirst({ where: { id: analysisId, userId: session.userId } });
    if (!analysis || !analysis.jobDescription || !analysis.parsedResumeText) {
      return NextResponse.json({ error: "Missing job description or parsed resume" }, { status: 400 });
    }

    const result = await runAnalysisTask(analysisId, session.userId, "COMPARE", [analysis.parsedResumeText, analysis.jobDescription, analysis.selectedLanguage], async () => {
    const orchestrator = new AnalysisOrchestrator();

    // Reparse under the current locale policy; legacy parses may use another language.
    const parsedJob = await orchestrator.analyzeLocalized<JobParse>(
      JOB_PARSE_PROMPT,
      `Job Description:\n${analysis.jobDescription}`,
      JobParseSchema,
      analysis.selectedLanguage
    );
    const jobParseJson = JSON.stringify(parsedJob);
    await commitTask(tx=>tx.analysis.update({where:{id:analysisId},data:{jobParseJson}}));

    // 2. Compare
    const rawCompare = await orchestrator.analyzeLocalized<CompareAnalysis>(
      COMPARE_PROMPT,
      `Parsed Job:\n${jobParseJson}\n\nParsed Resume:\n${analysis.parsedResumeText}`,
      CompareSchema, analysis.selectedLanguage);
    const validatedCompare = CompareSchema.parse(rawCompare);

    await commitTask(tx=>tx.analysis.update({where:{id:analysisId},data:{comparisonJson:JSON.stringify(validatedCompare)}}));

    return { success: true, comparison: validatedCompare };
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "A comparação com a vaga não foi concluída. Tente novamente em instantes.");
  }
}
