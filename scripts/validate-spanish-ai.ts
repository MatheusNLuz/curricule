/** Isolated, fictional-content smoke test; no application account or database writes. */
import { AnalysisOrchestrator } from "../lib/ai/analysis-orchestrator";
import { NvidiaNimProvider } from "../lib/ai/nvidia-nim-provider";
import { ATS_ANALYZER_SYSTEM_PROMPT, generateAtsAnalyzerUserPrompt, getLinkedInSystemPrompt } from "../lib/ai/prompts";
import { resumeAssessmentSchema, LinkedInAnalysisSchema } from "../lib/schemas/analysis.schema";
import { SmartQuestionSchema } from "../lib/schemas/questions-truth.schema";
import { OptimizedResumeSchema } from "../lib/schemas/optimize.schema";
import { resumeDocumentHtml } from "../lib/resume/document-html";
import { resumeDocx } from "../lib/resume/docx";
import { z } from "zod";

const ai = new AnalysisOrchestrator([new NvidiaNimProvider()]);
const source = "Ana Ejemplo. Atención al cliente por correo electrónico durante dos años. Organizó pedidos en hojas de cálculo. Formación en administración. Idioma: portugués.";
const steps: [string, () => Promise<unknown>][] = [
  ["analysis", () => ai.analyzeLocalized(ATS_ANALYZER_SYSTEM_PROMPT, generateAtsAnalyzerUserPrompt(source, "Atención al cliente", "MAKE_ATS_FRIENDLY", "es-ES"), resumeAssessmentSchema(source), "es-ES")],
  ["questions", () => ai.analyzeLocalized("Generate two neutral questions about the candidate's experience. Return JSON {questions:[{question,reason,category,answerType}]}; never assume undocumented facts.", source, SmartQuestionSchema, "es-ES")],
  ["linkedin", () => ai.analyzeLocalized(getLinkedInSystemPrompt("es-ES"), source, LinkedInAnalysisSchema, "es-ES")],
  ["letter", () => ai.analyzeLocalized("Write a concise cover letter based only on supplied facts, JSON {content:string}.", source, z.object({content:z.string()}), "es-ES")],
  ["resume and exports", async () => {
    const resume = await ai.analyzeLocalized("Rewrite the supplied resume without adding facts. Return JSON with personalInfo, professionalSummary, experiences, education, skills and certifications arrays as appropriate.", source, OptimizedResumeSchema, "es-ES");
    if (!resumeDocumentHtml(resume,"es-ES","basic-ats").includes('lang="es-ES"')) throw new Error("HTML locale mismatch");
    await resumeDocx(resume,"es-ES","basic-ats");
  }],
];
let failed = false;
for (const [name, run] of steps) {
  const started = Date.now();
  try { await run(); console.log(JSON.stringify({step:name,ok:true,elapsedMs:Date.now()-started})); }
  catch (error) { failed = true; console.log(JSON.stringify({step:name,ok:false,error:error instanceof Error ? error.name : "UnknownError",elapsedMs:Date.now()-started})); }
}
if (failed) process.exitCode = 1;
