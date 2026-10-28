import { boundedJson } from "@/lib/read-bounded-body";
import { answerForReview } from "@/lib/question-answer";
import { resumeRegionGuidance } from "@/lib/resume/region-guidance";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { AnalysisOrchestrator } from "@/lib/ai/analysis-orchestrator";
import { ATS_ANALYZER_SYSTEM_PROMPT, generateAtsAnalyzerUserPrompt, getLinkedInSystemPrompt } from "@/lib/ai/prompts";
import { OptimizedResumeSchema } from "@/lib/schemas/optimize.schema";
import { LinkedInAnalysisSchema, resumeAssessmentSchema } from "@/lib/schemas/analysis.schema";
import { storedConfirmedClaims, storedRejectedClaims, readTruth, reviewTruth, truthContext, truthSourceHash } from "@/lib/ats/truth-policy";
import { verifyOutput } from "@/lib/ats/verify-output";
import { ScoreEngine } from "@/lib/ats/score-engine";
import { languageLabel } from "@/lib/analysis-contract";
import { resumeText } from "@/lib/resume/resume-text";
import { recordRevision } from "@/lib/resume-revisions";
import { runAnalysisTask, commitTask } from "@/lib/analysis-task";
import { apiError, HttpError } from "@/lib/http-error";
export const maxDuration = 180;

const REWRITE = `You are a resume writer. Return ONLY JSON with this shape:
{"personalInfo":{"name":"","email":"","phone":"","location":"","linkedin":"","portfolio":""},"professionalSummary":"","experiences":[{"company":"","title":"","startDate":"","endDate":"","location":"","description":[""]}],"education":[{"institution":"","degree":"","startDate":"","endDate":""}],"skills":[{"category":"","items":[""]}],"certifications":[{"name":"","issuer":"","date":""}]}
Retain all jobs, education, certifications, projects and language qualifications supported by the candidate. Include optional projects as [{name,description:[],url,startDate,endDate}] and languages as [{name,proficiency}] when supported; never invent a proficiency level. Never infer an employer from an unrelated organization. Leave ambiguous fields empty for review, instead of guessing. Never invent skills, dates, metrics or credentials. Only use keywords supported by candidate sources, never treat job requirements as candidate facts. Use concise bullets (at most 5 per role). Length may be 1 or 2 pages as needed to preserve history. Explicitly rejected claims, including paraphrases, MUST NOT appear. When translating, preserve identity, dates and fact meaning.`;

export async function POST(request: Request) {
  try {
    const session = await getSessionUser(); if (!session) throw new HttpError(401, "Faça login para continuar.");
    const { analysisId } = z.object({ analysisId: z.string() }).strict().parse(await boundedJson(request));
    const analysis = await prisma.analysis.findFirst({ where: { id: analysisId, userId: session.userId }, include: { questions: true } });
    if (!analysis?.parsedResumeText) throw new HttpError(404, "Material não encontrado.");
    const review = readTruth(analysis.truthGuardJson);
    if (!review || review.sourceHash !== truthSourceHash(analysis)) throw new HttpError(409, "Valide os fatos antes de otimizar.");
    try { reviewTruth(review, review.decisions); } catch { throw new HttpError(409, "Aprove ou rejeite todas as inferências antes de otimizar."); }
    const facts = truthContext(review);
    facts.approved=[...new Set([...facts.approved,...storedConfirmedClaims(analysis.confirmedClaimsJson)])];
    facts.rejected=[...new Set([...facts.rejected,...storedRejectedClaims(analysis.rejectedClaimsJson)])];
    const answers = analysis.questions.filter(q => q.confirmed).map(q => ({ question: q.question, answer: answerForReview(q.answer) })).filter(q => q.answer).map(q => q.question + ": " + q.answer).join("\n");
    const confirmed = answers + "\nExplicitly confirmed by candidate:\n" + facts.approved.join("\n");
    const result = await runAnalysisTask(analysisId, session.userId, "OPTIMIZE", [review, analysis.revision, analysis.selectedLanguage, analysis.jobLocation,resumeRegionGuidance(analysis.jobLocation),analysis.rejectedClaimsJson,analysis.confirmedClaimsJson], async () => {
      const ai = new AnalysisOrchestrator();
      const payload = JSON.stringify({ original: analysis.parsedResumeText, confirmed, rejected: facts.rejected, job: analysis.jobDescription, language: languageLabel(analysis.selectedLanguage), region: analysis.jobLocation });
      let optimized: unknown, assessment: unknown, finalScores: unknown;
      if (analysis.mode === "LINKEDIN_OPTIMIZATION") {
        const generated = await ai.analyzeLocalized(getLinkedInSystemPrompt(analysis.selectedLanguage), payload, LinkedInAnalysisSchema, analysis.selectedLanguage);
        const text = JSON.stringify({ headlines: generated.headlineSuggestions, about: generated.summarySuggestion, experience: generated.experienceTips.map(item => ({ role: item.role, company: item.company, bullets: item.optimizedBullets })) });
        await verifyOutput(analysis.parsedResumeText!, confirmed, text, facts.rejected, "resume", analysis.selectedLanguage);
        assessment = await ai.analyzeLocalized(getLinkedInSystemPrompt(analysis.selectedLanguage), "Evaluate this resulting profile with the same criteria, without assuming improvements: " + text, LinkedInAnalysisSchema, analysis.selectedLanguage);
        finalScores = (assessment as z.infer<typeof LinkedInAnalysisSchema>).scores;
        optimized = { ...generated, scores: finalScores };
      } else {
        const generated = await ai.analyzeLocalized(REWRITE + "\nOutput language: " + languageLabel(analysis.selectedLanguage) + ". Optional regional guidance: " + resumeRegionGuidance(analysis.jobLocation) + " These are not universal rules; prioritize the vacancy and candidate's choices. Never invent facts, add personal ID numbers or unconfirmed personal data. The selected output language is independent of region.", payload, OptimizedResumeSchema, analysis.selectedLanguage);
        const text = resumeText(generated,analysis.selectedLanguage);
        await verifyOutput(analysis.parsedResumeText!, confirmed, text, facts.rejected,"resume",analysis.selectedLanguage);
        const evaluation = await ai.analyzeLocalized(ATS_ANALYZER_SYSTEM_PROMPT, generateAtsAnalyzerUserPrompt(text, analysis.professionalTarget || "General", analysis.mode, analysis.selectedLanguage), resumeAssessmentSchema(text), analysis.selectedLanguage);
        finalScores = ScoreEngine.evaluate(evaluation); assessment = { ...evaluation, scores: finalScores }; optimized = generated;
      }
      await commitTask(async tx => {
        const current = await tx.analysis.findUniqueOrThrow({ where: { id: analysisId } });
        if (current.revision !== analysis.revision || current.truthGuardJson !== analysis.truthGuardJson) throw new HttpError(409, "Os dados mudaram durante a geração. Revise antes de tentar novamente.");
        await recordRevision(tx, analysisId, current.finalResumeJson, "before_optimization");
        await recordRevision(tx, analysisId, JSON.stringify(optimized), "ai");
        await tx.analysis.update({ where: { id: analysisId }, data: { finalResumeJson: JSON.stringify(optimized), editorDraftJson: null, finalReviewJson:null, finalScores: JSON.stringify(finalScores), finalAssessmentJson: JSON.stringify(assessment), coverLetter: null, revision: { increment: 1 } } });
      });
      return { success: true, optimized, finalScores };
    });
    return NextResponse.json(result);
  } catch (error) { return apiError(error, "A otimização não foi concluída. Seu conteúdo anterior foi preservado."); }
}
