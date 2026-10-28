import { boundedJson } from "@/lib/read-bounded-body";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AnalysisOrchestrator } from "@/lib/ai/analysis-orchestrator";
import { SmartQuestionSchema, SmartQuestionGen } from "@/lib/schemas/questions-truth.schema";
import { getSessionUser } from "@/lib/auth";
import { runAnalysisTask, commitTask } from "@/lib/analysis-task";
import { apiError } from "@/lib/http-error";
import type { SmartQuestion } from "@prisma/client";

const QUESTIONS_WITH_JOB_PROMPT = `You are an expert technical recruiter and ATS specialist.
Based on the gap analysis between the resume and the job description, generate smart questions to ask the candidate. You can generate up to 8 questions if necessary.
Ask neutral questions. Never assume the candidate implemented improvements, used tools, led people, or achieved results that are not explicitly documented. Quantitative questions must explicitly allow "not measured / do not know"; do not demand a number or suggest one. Do not claim a recruiter or ATS universally requires a metric.
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
If the 'Previous Answers History' provided in the payload contains information that partially or fully answers the question you are generating, you MUST fill the 'suggestedAnswer' field with that exact factual information, faithfully translated into the selected output locale so the candidate doesn't have to re-type it. Otherwise, omit the field entirely.

Use the user-selected output locale for every question, reason, option and suggested answer.`;

const QUESTIONS_GENERAL_PROMPT = `You are an expert technical recruiter and ATS specialist.
Based on the parsed resume text, generate 3-5 smart questions to ask the candidate to help improve their resume for general ATS screening.
Ask neutral questions. Never assume the candidate implemented improvements, used tools, led people, or achieved results that are not explicitly documented. Quantitative questions must explicitly allow "not measured / do not know"; do not demand a number or suggest one. Do not claim a recruiter or ATS universally requires a metric.
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
If the 'Previous Answers History' provided in the payload contains information that partially or fully answers the question you are generating, you MUST fill the 'suggestedAnswer' field with that exact factual information, faithfully translated into the selected output locale so the candidate doesn't have to re-type it. Otherwise, omit the field entirely.

Use the user-selected output locale for every question, reason, option and suggested answer.`;

const QUESTIONS_LINKEDIN_PROMPT = `You are an expert LinkedIn Profile optimizer and technical recruiter.
Based on the parsed LinkedIn profile text, generate 3-5 smart questions to help the user optimize their profile for recruiter search results.
Ask neutral questions. Never assume the candidate implemented improvements, used tools, led people, or achieved results that are not explicitly documented. Quantitative questions must explicitly allow "not measured / do not know"; do not demand a number or suggest one. Do not claim a recruiter or ATS universally requires a metric.
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

Use the user-selected output locale for every question, reason, option and suggested answer.`;

export const maxDuration = 180;

export async function POST(req: Request) {
  try {
    const { analysisId } = await boundedJson(req);
    if (!analysisId) return NextResponse.json({ error: "Analysis ID required" }, { status: 400 });

    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

    const analysis = await prisma.analysis.findFirst({ where: { id: analysisId, userId: session.userId } });
    if (!analysis) return NextResponse.json({ error: "Analysis not found" }, { status: 404 });

    // 1. Return existing questions if already generated
    const existingQuestions = await prisma.smartQuestion.findMany({
      where: { analysisId, analysis: { userId: session.userId } }
    });
    if (existingQuestions.length > 0) {
      // Localize legacy generated fields once. Never rewrite candidate answers or confirmations.
      const localized = await runAnalysisTask(analysisId, session.userId, "QUESTIONS_LOCALIZE", [existingQuestions.map(q => q.id).sort(), analysis.selectedLanguage], async () => {
        const ordered = [...existingQuestions].sort((a, b) => a.id.localeCompare(b.id));
        const source = ordered.map(q => ({ question: q.question, reason: q.reason, category: q.category, answerType: q.answerType, options: q.options ? JSON.parse(q.options) : undefined, suggestedAnswer: q.suggestedAnswer || undefined }));
        const schema = SmartQuestionSchema.refine(value => value.questions.length === ordered.length && value.questions.every((q, i) => q.category === source[i].category && q.answerType === source[i].answerType), "Preserve question order, count and machine fields");
        const translated = await new AnalysisOrchestrator().analyzeLocalized("Faithfully translate these existing questions into the selected locale. Preserve their exact order, count, meaning, category and answerType. Do not generate new questions or facts. Preserve already-correct text. Return JSON {questions:[{question,reason,category,answerType,options?,suggestedAnswer?}]}. Options and suggestedAnswer are prose and must also use the selected locale.", JSON.stringify({ questions: source }), schema, analysis.selectedLanguage);
        const questions = translated.questions.map((q, i) => ({ ...q, id: ordered[i].id }));
        await commitTask(tx=>Promise.all(questions.map(q => tx.smartQuestion.update({ where: { id: q.id }, data: { question: q.question, reason: q.reason, options: q.options ? JSON.stringify(q.options) : null, suggestedAnswer: q.suggestedAnswer || null } }))));
        return questions;
      });
      const translatedById = new Map(localized.map(q => [q.id, q]));
      // Map database format to API format (options parsed from JSON string)
      const mapped = existingQuestions.map(q => ({
        id: q.id,
        question: translatedById.get(q.id)!.question,
        reason: translatedById.get(q.id)!.reason,
        category: q.category,
        answerType: q.answerType,
        options: translatedById.get(q.id)!.options,
        answer: q.answer,
        suggestedAnswer: translatedById.get(q.id)!.suggestedAnswer,
      }));
      return NextResponse.json({ success: true, questions: mapped });
    }

    const result = await runAnalysisTask(analysisId, session.userId, "QUESTIONS", [analysis.parsedResumeText, analysis.comparisonJson, analysis.selectedLanguage], async () => {
    // 2. Fetch past answered questions for the SAME USER to reuse answers
    let pastAnsweredQuestions: SmartQuestion[] = [];
    if (analysis.userId) {
      pastAnsweredQuestions = await prisma.smartQuestion.findMany({
        where: { 
          answer: { not: null }, confirmed: true,
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

    prompt += "\nAdapt questions to the candidate's actual profession. Never require invented metrics; explicitly permit 'I do not know' or 'I have not done this'. Suggestions are unconfirmed until the candidate chooses and submits them.";
    const rawQuestions = await orchestrator.analyzeLocalized<SmartQuestionGen>(prompt, payload, SmartQuestionSchema, analysis.selectedLanguage);
    const validated = SmartQuestionSchema.parse(rawQuestions);

    const savedQuestions: { id: string; question: string; reason: string; category: string; answerType: string; options: string[] | undefined; suggestedAnswer: string | null }[] = [];
    await commitTask(async tx=>{
    for (const q of validated.questions) {
      const dbQ = await tx.smartQuestion.create({
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

    });
    return { success: true, questions: savedQuestions };
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "As perguntas não puderam ser geradas. Tente novamente em instantes.");
  }
}
