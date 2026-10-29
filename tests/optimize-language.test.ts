import test, { mock } from "node:test";
import assert from "node:assert/strict";
import type { ZodType } from "zod";
import { OptimizedResumeSchema } from "../lib/schemas/optimize.schema";
import { truthSourceHash } from "../lib/ats/truth-policy";
import { OutputLanguageError } from "../lib/ai/output-language";

let locale = "es-ES";
let failure = false;
let writes: Record<string, unknown>[] = [];
let calls: { locale: string; input: string; prompt: string }[] = [];
const original = "Ana Example. Software developer at Example Labs. Manteve serviços PHP e APIs REST.";
const generated = OptimizedResumeSchema.parse({ personalInfo: { name: "Ana Example" }, professionalSummary: "Desarrolladora de software con experiencia en servicios PHP y API REST.", experiences: [{ company: "Example Labs", title: "Desarrolladora de software", description: ["Mantuvo servicios PHP y API REST."] }] });
function row() {
  const source = { id: "a", userId: "owner", mode: "OPTIMIZE_FOR_JOB", parsedResumeText: original, selectedLanguage: locale, jobLocation: "US", jobDescription: "Backend development with PHP APIs", comparisonJson: null, revision: 1, questions: [], confirmedClaimsJson: null, rejectedClaimsJson: null, finalResumeJson: null };
  return { ...source, truthGuardJson: JSON.stringify({ sourceHash: truthSourceHash(source), decisions: {}, claims: [], blockedClaims: [], warnings: [] }) };
}
const db = { analysis: { findFirst: async () => row(), findUniqueOrThrow: async () => row(), update: async ({ data }: { data: Record<string, unknown> }) => { writes.push(data); return row(); } } };
mock.module(new URL("../lib/db.ts", import.meta.url).href, { namedExports: { prisma: db } });
mock.module(new URL("../lib/auth.ts", import.meta.url).href, { namedExports: { getSessionUser: async () => ({ userId: "owner" }) } });
mock.module(new URL("../lib/analysis-task.ts", import.meta.url).href, { namedExports: { commitTask: async (run: (tx: typeof db) => Promise<unknown>) => run(db), runAnalysisTask: async (_id: string, _user: string, _kind: string, _input: unknown, run: () => Promise<unknown>) => run() } });
mock.module(new URL("../lib/resume-revisions.ts", import.meta.url).href, { namedExports: { recordRevision: async () => {} } });
mock.module(new URL("../lib/ats/truth-guard.ts", import.meta.url).href, { namedExports: { TruthGuard: { evaluate: async () => ({ claims: [{ claim: "Servicios PHP y API REST", source: "confirmed_by_resume", canUseInResume: true, canUseInCoverLetter: true, explanation: "En la fuente." }], blockedClaims: [], warnings: [] }) } } });
mock.module(new URL("../lib/ai/analysis-orchestrator.ts", import.meta.url).href, { namedExports: { AnalysisOrchestrator: class {
  async analyzeLocalized<T>(prompt: string, input: string, schema: ZodType<T>, selected: string): Promise<T> {
    calls.push({ locale: selected, input, prompt });
    if (failure) throw new OutputLanguageError();
    return schema.parse(calls.length === 1 ? generated : { rubric: ["ats", "structure", "clarity", "impact", "keywords"].map(criterion => ({ criterion, level: 0, foundText: "", reason: "Sin evaluación suficiente." })), scores: {} });
  }
} } });
const optimize = await import("../app/api/optimize/route");
const request = () => new Request("https://app.example/api/optimize", { method: "POST", body: JSON.stringify({ analysisId: "a" }) });
test.beforeEach(() => { writes = []; calls = []; failure = false; locale = "es-ES"; });

test("rewrite and final assessment use the selected locale independently of mixed input and job country", async () => {
  for (const selected of ["es-ES", "pt-BR", "pt-PT", "en-US", "en-GB"]) {
    locale = selected; calls = [];
    const response = await optimize.POST(request());
    assert.equal(response.status, 200);
    assert.deepEqual(calls.map(call => call.locale), [selected, selected]);
    const payload = JSON.parse(calls[0].input);
    assert.equal(payload.original, original);
    assert.equal(payload.region, "US");
    assert.equal(payload.job, row().jobDescription);
    assert.match(calls[0].prompt, /role titles/);
    assert.match(calls[0].prompt, /most relevant supported bullets FIRST/);
    assert.deepEqual(JSON.parse(writes.at(-1)!.finalResumeJson as string), generated);
  }
});

test("a rejected output language cannot replace the saved resume", async () => {
  failure = true;
  const response = await optimize.POST(request());
  assert.equal(response.status, 422);
  assert.equal((await response.json()).code, "OUTPUT_LANGUAGE_MISMATCH");
  assert.equal(writes.length, 0);
});
