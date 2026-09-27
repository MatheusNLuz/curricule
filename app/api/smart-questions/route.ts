import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AnalysisOrchestrator } from "@/lib/ai/analysis-orchestrator";
import { SmartQuestionSchema, SmartQuestionGen } from "@/lib/schemas/questions-truth.schema";
import { getSessionUser } from "@/lib/auth";

const QUESTIONS_WITH_JOB_PROMPT = `You are an expert technical recruiter and ATS specialist.
Based on the gap analysis between the resume and the job description, generate smart questions to ask the candidate. You can generate up to 8 questions if necessary.
CRITICAL INSTRUCTION: AT LEAST 2 QUESTIONS MUST BE STRICTLY QUANTITATIVE. You must ask for the STAR method (Situation, Task, Action, Result) with numbers.

Focus on:
1. QUANTITATIVE IMPACT/METRICS (Mandatory): Ask for numbers, percentages, team size, database volume, server load, or performance gains. (e.g., "What was the percentage increase?", "How many users did it support?").
2. MISSING GAPS (CRITICAL): You MUST explicitly list ALL missing mandatory skills found in the Gap Analysis and ask the candidate if they have experience with them. Do not omit any missing skill. If there are many missing skills, group them intelligently, but EVERY SINGLE MISSING SKILL must be mentioned in at least one question.
3. CLARIFICATION: Ask about important missing context (e.g., details of their roles, projects, or education).

{
  "questions": [
    {
      "question": "string",
      "reason": "string",
      "category": "experience" | "skill" | "education",
      "answerType": "text" | "boolean" | "multiple_choice",
      "options": ["string"] (optional),
      "suggestedAnswer": "string" (optional - ONLY if candidate's history contains the answer)
    }
  ]
}

CRITICAL FOR 'suggestedAnswer':
If the 'Previous Answers History' provided in the payload contains information that partially or fully answers the question you are generating, you MUST fill the 'suggestedAnswer' field with that exact information so the candidate doesn't have to re-type it. Otherwise, omit the field entirely.

CRITICAL: Generate everything in Portuguese (pt-BR).`;

const QUESTIONS_GENERAL_PROMPT = `You are an expert technical recruiter and ATS specialist.
Based on the parsed resume text, generate 3-5 smart questions to ask the candidate to help improve their resume for general ATS screening.
CRITICAL INSTRUCTION: AT LEAST 2 QUESTIONS MUST BE STRICTLY QUANTITATIVE. You must ask for the STAR method (Situation, Task, Action, Result) with numbers.

Focus on:
1. QUANTITATIVE IMPACT/METRICS (Mandatory): Ask for numbers, percentages, team size, database volume, or performance gains to replace soft descriptions with quantifiable results. (e.g., "What was the percentage increase?", "How many users did it support?").
2. MISSING TECH/CONTEXT: Ask for missing tools, methodologies, or project scopes that could make the experience bullets stronger.

{
  "questions": [
    {
      "question": "string",
      "reason": "string",
      "category": "experience" | "skill" | "education",
      "answerType": "text" | "boolean" | "multiple_choice",
      "options": ["string"] (optional),
      "suggestedAnswer": "string" (optional - ONLY if candidate's history contains the answer)
    }
  ]
}

CRITICAL FOR 'suggestedAnswer':
If the 'Previous Answers History' provided in the payload contains information that partially or fully answers the question you are generating, you MUST fill the 'suggestedAnswer' field with that exact information so the candidate doesn't have to re-type it. Otherwise, omit the field entirely.

CRITICAL: Generate everything in Portuguese (pt-BR).`;

const QUESTIONS_LINKEDIN_PROMPT = `You are an expert LinkedIn Profile optimizer and technical recruiter.
Based on the parsed LinkedIn profile text, generate 3-5 smart questions to help the user optimize their profile for recruiter search results.
CRITICAL INSTRUCTION: AT LEAST 2 QUESTIONS MUST BE STRICTLY QUANTITATIVE. You must ask for real metrics, numbers, percentages, or achievements for their experiences to replace any draft/hallucinated placeholders.
(e.g., "Qual foi o impacto percentual na melhoria de performance no cargo X?", "Quantas pessoas faziam parte da equipe?", "Quantos sistemas legados você migrou?").

{
  "questions": [
    {
      "question": "string",
      "reason": "string",
      "category": "experience" | "skill" | "education",
      "answerType": "text" | "boolean" | "multiple_choice",
      "options": ["string"] (optional),
      "suggestedAnswer": "string" (optional - ONLY if candidate's history contains the answer)
    }
  ]
}

CRITICAL: Generate everything in Portuguese (pt-BR).`;

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { analysisId } = await req.json();
    if (!analysisId) return NextResponse.json({ error: "Analysis ID required" }, { status: 400 });

    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

    // 1. Return existing questions if already generated
    const existingQuestions = await prisma.smartQuestion.findMany({
      where: { analysisId, analysis: { userId: session.userId } }
    });
    if (existingQuestions.length > 0) {
      // Map database format to API format (options parsed from JSON string)
      const mapped = existingQuestions.map(q => ({
        id: q.id,
        question: q.question,
        reason: q.reason,
        category: q.category,
        answerType: q.answerType,
        options: q.options ? JSON.parse(q.options) : undefined,
        answer: q.answer,
        suggestedAnswer: q.suggestedAnswer,
      }));
      return NextResponse.json({ success: true, questions: mapped });
    }

    const analysis = await prisma.analysis.findFirst({ where: { id: analysisId, userId: session.userId } });
    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    // 2. Fetch past answered questions for the SAME USER to reuse answers
    let pastAnsweredQuestions: any[] = [];
    if (analysis.userId) {
      pastAnsweredQuestions = await prisma.smartQuestion.findMany({
        where: { 
          answer: { not: null },
          AND: [{ answer: { not: "" } }],
          analysisId: { not: analysisId },
          analysis: { userId: analysis.userId }
        },
        orderBy: { createdAt: 'desc' },
        take: 15
      });
    }
    
    let historyBlock = "";
    if (pastAnsweredQuestions.length > 0) {
      historyBlock = "--- PAST KNOWLEDGE BASE FOR THIS CANDIDATE ---\n";
      historyBlock += "CRITICAL: DO NOT use these past questions/answers as requirements for the current job. The current job requirements are ONLY in the 'Gap Analysis' section. Use this knowledge base EXCLUSIVELY to extract facts about the candidate to pre-fill the 'suggestedAnswer' field for the NEW questions you generate.\n\n";
      pastAnsweredQuestions.forEach(pq => {
        historyBlock += `Past Fact/Answer from Candidate: ${pq.answer}\n(Context of what was asked: ${pq.question})\n\n`;
      });
      historyBlock += "----------------------------------------------\n";
    }

    const orchestrator = new AnalysisOrchestrator();
    let prompt = "";
    let payload = "";

    if (analysis.mode === "LINKEDIN_OPTIMIZATION") {
      prompt = QUESTIONS_LINKEDIN_PROMPT;
      payload = `LinkedIn Profile Text:\n${analysis.parsedResumeText}\n\n${historyBlock}`;
    } else if (analysis.comparisonJson) {
      // Job-specific gaps mode
      prompt = QUESTIONS_WITH_JOB_PROMPT;
      payload = `Resume Text:\n${analysis.parsedResumeText}\n\nGap Analysis:\n${analysis.comparisonJson}\n\n${historyBlock}`;
    } else {
      // General resume optimization mode
      prompt = QUESTIONS_GENERAL_PROMPT;
      payload = `Resume Text:\n${analysis.parsedResumeText}\n\n${historyBlock}`;
    }

    const rawQuestions = await orchestrator.analyze<SmartQuestionGen>(prompt, payload);
    const validated = SmartQuestionSchema.parse(rawQuestions);

    const savedQuestions: any[] = [];
    // Save to DB
    for (const q of validated.questions) {
      const dbQ = await prisma.smartQuestion.create({
        data: {
          analysisId,
          question: q.question,
          reason: q.reason,
          category: q.category,
          answerType: q.answerType,
          options: q.options ? JSON.stringify(q.options) : null,
          suggestedAnswer: q.suggestedAnswer || null,
        }
      });
      savedQuestions.push({
        id: dbQ.id,
        question: dbQ.question,
        reason: dbQ.reason,
        category: dbQ.category,
        answerType: dbQ.answerType,
        options: q.options,
        suggestedAnswer: dbQ.suggestedAnswer,
      });
    }

    return NextResponse.json({ success: true, questions: savedQuestions });
  } catch (error) {
    console.error("Smart questions error:", error);
    return NextResponse.json({ error: "As perguntas não puderam ser geradas. Tente novamente em instantes." }, { status: 503 });
  }
}
