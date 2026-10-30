import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { AnalysisOrchestrator } from "../lib/ai/analysis-orchestrator";
import { resumeTailoringSchema } from "../lib/ai/resume-tailoring";
import { assertOutputLanguage, OutputLanguageError } from "../lib/ai/output-language";
import { aiFailureMetadata } from "../lib/ai/provider-error";
import { ChatProvider } from "../lib/ai/chat-provider";
import { AiProviderError } from "../lib/ai/provider-error";
import { resumeAssessmentSchema } from "../lib/schemas/analysis.schema";
import { aiCallContext } from "../lib/ai/operation-context";
import type { AiGenerateJsonParams, AiProviderInterface } from "../lib/ai/ai-provider.interface";

const approved = { matchesSelectedLocale: true, containsMixedLanguage: false };
function provider(responses: unknown[]) {
  const calls: AiGenerateJsonParams[] = [];
  const fake: AiProviderInterface = {
    name: "synthetic",
    async generateJson<T>(params: AiGenerateJsonParams) {
      calls.push(params);
      assert.ok(responses.length, "Unexpected provider call");
      const next = responses.shift();
      if (next instanceof Error) throw next;
      return next as T;
    },
    async generateText() { throw new Error("Unexpected text generation"); },
  };
  return { fake, calls };
}

test("a vacancy limit repair receives its full contract without assessment-only instructions", async () => {
  const plan = { targetRole: "Desenvolvimento", priorities: [], unsupportedRequirements: ["Docker"] };
  const { fake, calls } = provider([{ ...plan, unsupportedRequirements: Array(13).fill("Docker") }, plan, approved]);
  const value = await new AnalysisOrchestrator([fake]).analyzeLocalized("Prepare a vacancy plan", "PRIVATE_SOURCE", resumeTailoringSchema("", "", ""), "pt-BR", undefined, "job_tailoring");
  assert.deepEqual(value, plan);
  for (const call of calls.slice(0, 2)) {
    assert.match(call.systemPrompt, /"maxItems":12/);
    assert.match(call.systemPrompt, /"maxLength":180/);
  }
  assert.doesNotMatch(calls[1].systemPrompt, /rubric|level 0/);
});

test("schema and language events identify operation, phase and fields without private content", async context => {
  const events: unknown[] = [];
  context.mock.method(console, "warn", (...args: unknown[]) => events.push(args));
  context.mock.method(console, "info", (...args: unknown[]) => events.push(args));
  const plan = { targetRole: "Desenvolvimento", priorities: [], unsupportedRequirements: [] };
  const { fake } = provider([{ ...plan, targetRole: "PRIVATE_".repeat(30) }, plan, approved]);
  await new AnalysisOrchestrator([fake]).analyzeLocalized("PRIVATE_INSTRUCTIONS", "PRIVATE_SOURCE", resumeTailoringSchema("", "", ""), "pt-BR", undefined, "job_tailoring");
  const logs = JSON.stringify(events);
  assert.match(logs, /job_tailoring/);
  assert.match(logs, /schema_validation/);
  assert.match(logs, /targetRole/);
  assert.match(logs, /correlationId/);
  assert.doesNotMatch(logs, /PRIVATE/);
  const error = new OutputLanguageError([{ path: "targetRole", reason: "PRIVATE_AUDIT_REASON" }, { path: "PRIVATE_KEY", reason: "PRIVATE_VALUE" }]);
  const metadata = JSON.stringify(aiFailureMetadata(error, resumeTailoringSchema("", "", "")));
  assert.match(metadata, /AUDITOR_REJECTED/);
  assert.match(metadata, /targetRole/);
  assert.doesNotMatch(metadata, /PRIVATE/);
});

test("operation context survives author, audit and independent factual review", async () => {
  const phases: unknown[] = [];
  const author = provider([{ content: "Texto correto." }, approved]);
  const reviewer = provider([{ approved: true }]);
  reviewer.fake.name = "reviewer";
  for (const { fake } of [author, reviewer]) {
    const generate = fake.generateJson;
    fake.generateJson = async params => { phases.push(aiCallContext.getStore()); return generate(params); };
  }
  await new AnalysisOrchestrator([author.fake, reviewer.fake]).analyzeWithReview("Summary", "Original", z.object({ content: z.string() }), "pt-BR", "initial_assessment");
  const contexts = phases as { operation: string; phase: string; correlationId: string }[];
  assert.deepEqual(contexts.map(value => value.phase), ["generation", "language_audit", "factual_review"]);
  assert.ok(contexts.every(value => value.operation === "initial_assessment"));
  assert.equal(new Set(contexts.map(value => value.correlationId)).size, 1);
});

test("language-only recovery rejects changes to scores, source quotations, identity and machine enums", async () => {
  const schema = z.object({ content: z.string(), score: z.number(), foundText: z.string(), name: z.string(), criterion: z.enum(["ats", "impact"]) });
  const wrong = { content: "Software developer", score: 50, foundText: "Original evidence", name: "Ana", criterion: "ats" as const };
  for (const mutation of [{ score: 99 }, { foundText: "Invented evidence" }, { name: "Other Person" }, { criterion: "impact" }]) {
    const primary = provider([wrong, { ...wrong, ...mutation, content: "Desenvolvedora de software" }]);
    const fallback = provider([{ ...wrong, content: "Desenvolvedora de software" }, approved]);
    const result = await new AnalysisOrchestrator([primary.fake, fallback.fake]).analyzeLocalized("Rewrite", "Original", schema, "pt-BR");
    assert.equal(result.score, 50);
    assert.equal(result.foundText, "Original evidence");
    assert.equal(result.name, "Ana");
    assert.equal(result.criterion, "ats");
    assert.equal(primary.calls.length, 2);
  }
});

test("truncation falls back without retrying the same token cap", async () => {
  const first = provider([new AiProviderError("OUTPUT_TRUNCATED")]);
  const second = provider([{ content: "Texto completo." }, approved]);
  const result = await new AnalysisOrchestrator([first.fake, second.fake]).analyzeLocalized("Summary", "Original", z.object({ content: z.string() }), "pt-BR");
  assert.equal(result.content, "Texto completo.");
  assert.equal(first.calls.length, 1);
});

test("PDF normalization accepts continuous evidence but rejects joined, translated or invented excerpts", () => {
  const source = "Experiência\u00a0profissional\nAtuou no oﬃce.\n“Serviços” de informação.\nEquipe de suporte.";
  const base = { rubric: ["ats", "structure", "clarity", "impact", "keywords"].map(criterion => ({ criterion, level: 1, foundText: "Experiência profissional Atuou no office.", reason: "Evidência presente." })), scores: {} };
  const schema = resumeAssessmentSchema(source);
  assert.ok(schema.safeParse(base).success);
  for (const foundText of ["Experiência profissional Equipe de suporte.", "Professional experience", "Liderou 20 pessoas."]) {
    const result = schema.safeParse({ ...base, rubric: base.rubric.map(item => ({ ...item, foundText })) });
    assert.equal(result.success, false);
    if (!result.success) assert.match(JSON.stringify(aiFailureMetadata(result.error, schema)), /EVIDENCE_NOT_IN_SOURCE/);
  }
});

test("diagnostics disclose known schema paths and bounds without values or unknown keys", () => {
  const schema = z.object({ priorities: z.array(z.object({ requirement: z.string().max(5) }).strict()) });
  const result = schema.safeParse({ priorities: [{ requirement: "PRIVATE_CONTENT", PRIVATE_KEY: "PRIVATE_VALUE" }] });
  assert.equal(result.success, false);
  if (result.success) return;
  // A schema must be supplied to authorize technical field names.
  const metadata = JSON.stringify(aiFailureMetadata(result.error, schema));
  assert.match(metadata, /priorities\[\]\.requirement/);
  assert.match(metadata, /"maximum":5/);
  assert.doesNotMatch(metadata, /PRIVATE|unrecognized_keys.*keys/);
});

test("field repair preserves valid fields on the server and revalidates the merged output", async () => {
  const schema = resumeTailoringSchema("", "", "");
  const plan = { targetRole: "Desenvolvimento", priorities: [], unsupportedRequirements: Array(13).fill("Docker") };
  const { fake, calls } = provider([plan, { targetRole: "UNRELATED_MUTATION", unsupportedRequirements: ["Docker"] }, approved]);
  const value = await new AnalysisOrchestrator([fake]).analyzeLocalized("Plan", "Original", schema, "pt-BR", undefined, "job_tailoring");
  assert.equal(value.targetRole, plan.targetRole);
  assert.deepEqual(value.unsupportedRequirements, ["Docker"]);
  assert.match(calls[1].systemPrompt, /server preserves all other fields/);
  const invalidRepair = provider([plan, { unsupportedRequirements: Array(14).fill("Docker") }]);
  await assert.rejects(new AnalysisOrchestrator([invalidRepair.fake]).analyzeLocalized("Plan", "Original", schema, "pt-BR", undefined, "job_tailoring"));
  assert.equal(invalidRepair.calls.length, 2);
});

test("repeated technical terms in Portuguese do not become an English sentence", async () => {
  const { fake, calls } = provider([approved]);
  await assertOutputLanguage(fake, { content: "Especialista em Internet of Things, aplicações de Internet of Things e redes de Internet of Things." }, "pt-BR");
  assert.equal(calls.length, 1);
  await assert.rejects(assertOutputLanguage(fake, { content: "Developed software for the company and worked with customers." }, "pt-BR"), OutputLanguageError);
});

test("a token-limited completion is rejected even when its JSON is syntactically valid", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ finish_reason: "length", message: { content: '{"content":"partial"}' } }], usage: { prompt_tokens: 10, completion_tokens: 4 } }));
  try {
    await assert.rejects(new ChatProvider("synthetic", "synthetic-key", "synthetic-model", "https://example.test").generateJson({ systemPrompt: "Return JSON", userPrompt: "PRIVATE_SOURCE" }), error => error instanceof Error && error.message === "OUTPUT_TRUNCATED");
  } finally { globalThis.fetch = originalFetch; }
});

test("configured zero temperature is honored and invalid values use the default", async () => {
  const originalFetch = globalThis.fetch;
  const originalTemperature = process.env.AI_DEFAULT_TEMPERATURE;
  const temperatures: number[] = [];
  globalThis.fetch = async (_url, init) => {
    temperatures.push(JSON.parse(String(init?.body)).temperature);
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: '{"ok":true}' } }] });
  };
  try {
    const provider = new ChatProvider("synthetic", "synthetic-key", "synthetic-model", "https://example.test");
    for (const configured of ["0.0", "0.7", "invalid", "3", "", " "]) {
      process.env.AI_DEFAULT_TEMPERATURE = configured;
      await provider.generateJson({ systemPrompt: "Return JSON", userPrompt: "Synthetic" });
    }
    assert.deepEqual(temperatures, [0, 0.7, 0.1, 0.1, 0.1, 0.1]);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalTemperature === undefined) delete process.env.AI_DEFAULT_TEMPERATURE; else process.env.AI_DEFAULT_TEMPERATURE = originalTemperature;
  }
});
