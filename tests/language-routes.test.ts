import test, { mock } from "node:test";
import assert from "node:assert/strict";
import type { ZodType } from "zod";
import { OutputLanguageError } from "../lib/ai/output-language";
import { ResumeAnalysisSchema } from "../lib/schemas/analysis.schema";

const initial = { id: "a", userId: "owner", selectedLanguage: "en-GB", mode: "MAKE_ATS_FRIENDLY", parsedResumeText: "Ana trabalhou na Example Inc. Organizou arquivos e analisou relatórios.", comparisonJson: null, jobDescription: "Organise files and analyse reports.", jobParseJson: '{"title":"Dados antigos em português"}', revision: 1, truthGuardJson: null, finalResumeJson: null };
let row = { ...initial };
type Question = { id: string; question: string; reason: string; category: string; answerType: string; options: string | null; suggestedAnswer: string | null; answer: string | null; confirmed: boolean };
let questions: Question[] = [];
let outputs: unknown[] = [];
let calls: { locale: string; system: string; input: string }[] = [];
let writes: Record<string, unknown>[] = [];
let tasks: { kind: string; input: unknown }[] = [];
let verificationLocales: string[] = [];
let dualReviews = 0;

class FakeAI {
  async analyzeWithReview<T>(system: string, input: string, schema: ZodType<T>, locale: string): Promise<{ value: T; review: "approved" }> {
    dualReviews++;
    return { value: await this.analyzeLocalized(system, input, schema, locale), review: "approved" };
  }
  async analyzeLocalized<T>(system: string, input: string, schema: ZodType<T>, locale: string): Promise<T> {
    calls.push({ locale, system, input });
    const output = outputs.shift();
    if (output instanceof Error) throw output;
    return schema.parse(output);
  }
}
const db = {
  analysis: {
    findFirst: async () => ({ ...row, questions }),
    update: async ({ data }: { data: Record<string, unknown> }) => { writes.push(data); return row; },
    updateMany: async ({ data }: { data: Record<string, unknown> }) => { writes.push(data); return { count: 1 }; },
  },
  smartQuestion: {
    findMany: async ({ where }: { where: { analysisId: unknown } }) => typeof where.analysisId === "string" ? questions : [],
    create: async ({ data }: { data: Partial<Question> }) => ({ id: "new", ...data }),
    update: async ({ where, data }: { where: { id: string }; data: Partial<Question> }) => {
      const question = questions.find(q => q.id === where.id)!;
      Object.assign(question, data);
      return question;
    },
  },
};
mock.module(new URL("../lib/db.ts", import.meta.url).href, { namedExports: { prisma: { ...db, $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations) } } });
mock.module(new URL("../lib/auth.ts", import.meta.url).href, { namedExports: { getSessionUser: async () => ({ userId: "owner" }) } });
mock.module(new URL("../lib/ai/analysis-orchestrator.ts", import.meta.url).href, { namedExports: { AnalysisOrchestrator: FakeAI } });
mock.module(new URL("../lib/analysis-task.ts", import.meta.url).href, { namedExports: { commitTask:async (run:(tx:typeof db)=>Promise<unknown>)=>run(db), runAnalysisTask: async (_id: string, _user: string, kind: string, input: unknown, run: () => Promise<unknown>) => { tasks.push({ kind, input }); return run(); } } });
mock.module(new URL("../lib/ats/verify-output.ts", import.meta.url).href, { namedExports: { verifyOutput: async (_original: string, _confirmed: string, _proposal: string, _rejects: string[], _destination: string, locale: string) => { verificationLocales.push(locale); } } });
const analyze = await import("../app/api/analyze/route");
const compare = await import("../app/api/compare/route");
const questioning = await import("../app/api/smart-questions/route");
const letter = await import("../app/api/cover-letter/route");
const request = () => new Request("https://app.example/api/test", { method: "POST", body: JSON.stringify({ analysisId: "a" }) });
test.beforeEach(() => { row = { ...initial }; questions = []; outputs = []; calls = []; writes = []; tasks = []; verificationLocales = []; dualReviews = 0; });

test("analysis route forwards each selected locale and never saves a rejected output", async () => {
  for (const locale of ["pt-BR", "pt-PT", "en-US", "en-GB", "es-ES"]) {
    row.selectedLanguage = locale;
    outputs.push(ResumeAnalysisSchema.parse({ recommendedLanguage: locale, rubric:["ats","structure","clarity","impact","keywords"].map(criterion=>({criterion,level:0,foundText:"",reason:"Not enough evidence"})), scores: {} }));
    assert.equal((await analyze.POST(request())).status, 200);
    assert.equal(calls.at(-1)!.locale, locale);
  }
  assert.equal(dualReviews, 5);
  writes = [];
  outputs.push(new OutputLanguageError());
  const response = await analyze.POST(request());
  assert.equal(response.status, 422);
  assert.equal((await response.json()).code, "OUTPUT_LANGUAGE_MISMATCH");
  assert.equal(writes.length, 0);
});

test("comparison reparses legacy job data and scopes both calls and cache to the selected locale", async () => {
  outputs.push({ title: "Assistant", seniority: "unknown", requiredSkills: [], niceToHaveSkills: [], keyResponsibilities: ["Organise files"] }, { matchPercentage: 60, missingMandatorySkills: [], missingNiceToHaveSkills: [], experienceGaps: [], culturalMatchNotes: "No evidence", recommendationsToMatch: [] });
  assert.equal((await compare.POST(request())).status, 200);
  assert.deepEqual(calls.map(c => c.locale), ["en-GB", "en-GB"]);
  assert.match(calls[1].input, /Organise files/);
  assert.doesNotMatch(calls[1].input, /Dados antigos/);
  assert.ok((tasks[0].input as unknown[]).includes("en-GB"));
});

test("generated questions and cached letters receive the selected locale", async () => {
  outputs.push({ questions: [{ question: "How did you organise files?", reason: "Clarify experience", category: "experience", answerType: "text" }] });
  assert.equal((await questioning.POST(request())).status, 200);
  assert.equal(dualReviews, 1);
  outputs.push({ content: "I am applying for this position. I organised files at Example Inc." });
  assert.equal((await letter.POST(request())).status, 200);
  assert.deepEqual(calls.map(c => c.locale), ["en-GB", "en-GB"]);
  assert.deepEqual(verificationLocales, ["en-GB"]);
  assert.ok(tasks.every(t => (t.input as unknown[]).includes("en-GB")));
});

test("legacy question localization preserves IDs, candidate answers and confirmations", async () => {
  questions = [{ id: "q1", question: "Organizou arquivos?", reason: "Detalhar experiência", category: "experience", answerType: "boolean", options: '["Sim","Não"]', suggestedAnswer: "Sim, organizei arquivos.", answer: "Sim, organizei 20 arquivos.", confirmed: true }];
  outputs.push({ questions: [{ question: "Did you organise files?", reason: "Clarify experience", category: "experience", answerType: "boolean", options: ["Yes", "No"], suggestedAnswer: "Yes, I organised files." }] });
  const response = await questioning.POST(request());
  assert.equal(response.status, 200);
  const result = (await response.json()).questions[0];
  assert.equal(result.id, "q1");
  assert.equal(result.question, "Did you organise files?");
  assert.equal(result.answer, "Sim, organizei 20 arquivos.");
  assert.equal(questions[0].confirmed, true);
  assert.equal(questions[0].answer, result.answer);
  assert.deepEqual(JSON.parse(questions[0].options!), ["Yes", "No"]);
  assert.equal(tasks[0].kind, "QUESTIONS_LOCALIZE");
});
