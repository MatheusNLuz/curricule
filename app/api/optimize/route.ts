import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AnalysisOrchestrator } from "@/lib/ai/analysis-orchestrator";
import { OptimizedResumeSchema, OptimizedResume } from "@/lib/schemas/optimize.schema";
import { getLinkedInSystemPrompt } from "@/lib/ai/prompts";
import { getSessionUser } from "@/lib/auth";

export const maxDuration = 60;

const REGION_FORMATS: Record<string, string> = {
  "BR": "Brazilian resume format. Use Portuguese (pt-BR). Include CPF-free layout. Emphasize education and certifications.",
  "US": "American resume format. Use English (en-US). 1-page preferred. No photo, no personal info (age, marital status). Focus on achievements with metrics.",
  "UK": "British CV format. Use English (en-GB). Can be 2 pages. Include 'Profile' section. Avoid personal pronouns.",
  "CA": "Canadian resume format. Use English (en-US). Similar to US but can include volunteer work and languages prominently.",
  "DE": "German-style international CV. Use English. Include clear dates (MM/YYYY). Structured sections. Can be 2 pages.",
  "PT": "Portuguese/European format. Use Portuguese (pt-PT). Europass-compatible structure. Include languages section.",
  "REMOTE": "International remote format. Use English (en-US). Highlight remote work experience, timezone flexibility, and async communication skills.",
};

function buildOptimizePrompt(language: string, jobLocation: string | null): string {
  const langLabel = language === "en-US" ? "English (en-US)" : "Portuguese (pt-BR)";
  const regionRules = jobLocation && REGION_FORMATS[jobLocation] ? REGION_FORMATS[jobLocation] : `Use ${langLabel}.`;
  
  return `You are an expert resume writer and ATS optimization specialist.
Given the original resume text (extracted from a PDF), job description, gap analysis, and candidate answers, generate a fully optimized, ATS-friendly resume JSON.

CRITICAL CONTEXT ABOUT THE INPUT:
The resume text was extracted from a multi-column PDF using a text parser. This means:
- Section headers, company names, institution names, and dates may appear OUT OF ORDER or SEPARATED from their content.
- You MUST use contextual reasoning to reconstruct the original structure. For example:
  - If you see "FAM" floating near "Sistemas de Informação" and "2024-2025", then FAM is the institution for that degree.
  - If you see "Escola Saga" near "Curso de Web Design" and "2018-2020", then Escola Saga is the issuer.
  - If you see "Alura" near formation/course names, then Alura is the issuer for those certifications.
  - If job titles appear without an explicit company name nearby, look for ANY institution/organization names elsewhere in the text that could logically be the employer.

CRITICAL DATA INTEGRITY RULES:
1. DATA LOSS PREVENTION: NEVER omit any existing job, degree, or certification from the original resume. Retain ALL history. You may REWRITE bullet points and improve phrasing, but never delete entries.
2. COMPANY NAMES: You MUST identify the company/institution for every role. Search the ENTIRE text for organization names. Note that professional councils, public agencies, or regional bodies (e.g., "Coren-SP", "Coren-SC", "TCU") can be the candidate's actual employers/companies where they worked. If a role is positioned under or next to them, list them as the company name. NEVER output "Não informado", "Unknown", or "Not specified".
3. KEYWORD INJECTION: Incorporate missing keywords from the job description naturally into bullet points and the professional summary. Use action verbs and quantifiable results where possible.
4. CONCISENESS & LENGTH (CRITICAL): You MUST limit bullet points to a MAXIMUM of 5 bullets per role. Bullet points MUST BE EXTREMELY CONCISE. Do not write paragraphs. Keep every bullet point to a maximum of 1 to 2 lines. Combine related tasks and remove filler words to ensure the resume fits tightly on a single page.
5. HONESTY: Only add skills or claims explicitly supported by the original resume text or candidate answers. Do NOT invent experience, metrics, or skills not present.
6. CERTIFICATIONS vs LICENSES: Professional licenses/registrations (e.g., nursing or law council registrations like "Coren-SP", "Coren-SC", "CRM", "OAB") are NOT the same as educational certifications/courses. Exclude professional council license numbers or registrations from the certifications section unless they are actual courses/training. (Remember, if they are the *employer* where the candidate worked, they belong in the experience section as the company name, not as a license/certification).
7. SKILLS ACCURACY: Only list skills that appear in the original resume's skills section or are clearly demonstrated in the experience bullets. Do not inflate the skills list with technologies not mentioned.

LANGUAGE & REGIONAL FORMAT:
${regionRules}
All content (summary, bullet points, section headers, everything) MUST be in the language specified above.
If the original resume is in a different language, translate everything professionally.

Return ONLY valid JSON matching this exact structure (no markdown, no extra text):
{
  "personalInfo": { "name": "string", "email": "string", "phone": "string", "location": "string", "linkedin": "string (optional)", "portfolio": "string (optional)" },
  "professionalSummary": "string",
  "experiences": [ { "company": "string", "title": "string", "startDate": "string", "endDate": "string", "location": "string (optional)", "description": ["string"] } ],
  "education": [ { "institution": "string", "degree": "string", "startDate": "string", "endDate": "string" } ],
  "skills": [ { "category": "string", "items": ["string"] } ],
  "certifications": [ { "name": "string", "issuer": "string", "date": "string (optional)" } ]
}`;
}

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

    if (analysis.mode === "LINKEDIN_OPTIMIZATION") {
      const answersText = analysis.questions
        .filter(q => q.answer)
        .map(q => `Q: ${q.question}\nA: ${q.answer}`)
        .join("\n");
      
      const payload = `Original LinkedIn Profile Content:\n${analysis.parsedResumeText}
      
Candidate's Answers to Smart Questions (Use these to fill in metrics and numbers. DO NOT INVENT any metric not answered here!):
${answersText || "Nenhuma resposta fornecida."}`;

      const orchestrator = new AnalysisOrchestrator();
      
      // Import dynamic schema to parse
      const { LinkedInAnalysisSchema } = require("@/lib/schemas/analysis.schema");
      
      const rawOptimize = await orchestrator.analyze<any>(
        getLinkedInSystemPrompt(analysis.selectedLanguage),
        payload
      );
      
      const validated = LinkedInAnalysisSchema.parse(rawOptimize);

      await prisma.analysis.update({
        where: { id: analysisId },
        data: { 
          analysisJson: JSON.stringify(validated),
          finalScores: JSON.stringify(validated.scores),
          finalResumeJson: JSON.stringify(validated)
        }
      });

      return NextResponse.json({ success: true, optimized: validated, finalScores: validated.scores });
    }

    const answersText = analysis.questions.filter(q => q.answer).map(q => `Q: ${q.question}\nA: ${q.answer}`).join("\n");

    const payload = `Original Resume Text:\n${analysis.parsedResumeText}
    
Job Description:\n${analysis.jobDescription || "N/A"}

Job Comparison/Gaps:\n${analysis.comparisonJson || "N/A"}

Candidate's Extra Answers:\n${answersText || "None"}`;

    const jobLocation = analysis.jobLocation || null;

    const systemPrompt = buildOptimizePrompt(analysis.selectedLanguage, jobLocation);

    const orchestrator = new AnalysisOrchestrator();
    const rawOptimize = await orchestrator.analyze<OptimizedResume>(systemPrompt, payload);
    const validated = OptimizedResumeSchema.parse(rawOptimize);

    const initial = analysis.initialScores ? JSON.parse(analysis.initialScores) : null;
    let finalScoresObj = null;
    if (initial) {
      const ats = Math.min(98, Math.max((initial.ats || 70) + 15, 85));
      const structure = Math.min(95, Math.max((initial.structure || 70) + 15, 90));
      const clarity = Math.min(95, Math.max((initial.clarity || 70) + 10, 90));
      const keywords = analysis.jobDescription ? Math.min(95, Math.max((initial.keywords || 60) + 25, 85)) : (initial.keywords || 70);
      const impact = answersText.trim().length > 10 ? Math.min(95, Math.max((initial.impact || 60) + 20, 85)) : Math.min(90, Math.max((initial.impact || 60) + 5, 75));
      const overall = Math.round((ats * 0.4) + (structure * 0.2) + (clarity * 0.15) + (impact * 0.15) + (keywords * 0.1));
      
      finalScoresObj = {
        overall,
        ats,
        structure,
        clarity,
        keywords,
        impact,
        perceivedSeniority: initial.perceivedSeniority || "intermediate",
        internationalCompatibility: jobLocation ? 95 : (initial.internationalCompatibility || 50)
      };
    }

    await prisma.analysis.update({
      where: { id: analysisId },
      data: { 
        finalResumeJson: JSON.stringify(validated),
        finalScores: finalScoresObj ? JSON.stringify(finalScoresObj) : undefined
      }
    });

    return NextResponse.json({ success: true, optimized: validated, finalScores: finalScoresObj });
  } catch (error) {
    console.error("Optimize error:", error);
    return NextResponse.json({ error: "A otimização não foi concluída. Tente novamente em instantes." }, { status: 503 });
  }
}
