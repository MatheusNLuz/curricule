/** Synthetic smoke test: at most 12 provider requests, no accounts or database writes. */
import assert from "node:assert/strict";
import { AnalysisOrchestrator } from "../lib/ai/analysis-orchestrator";
import { NvidiaNimProvider } from "../lib/ai/nvidia-nim-provider";
import { OpenRouterProvider } from "../lib/ai/openrouter-provider";
import { aiFailureMetadata } from "../lib/ai/provider-error";
import { RESUME_TAILORING_PROMPT, resumeTailoringSchema } from "../lib/ai/resume-tailoring";
import { ATS_ANALYZER_SYSTEM_PROMPT, generateAtsAnalyzerUserPrompt } from "../lib/ai/prompts";
import { resumeAssessmentSchema } from "../lib/schemas/analysis.schema";
import type { AiProviderInterface } from "../lib/ai/ai-provider.interface";

const original = "Ana Exemplo. Contato: ana@example.test. Experiência profissional: desenvolveu serviços PHP e interfaces React na Empresa Exemplo entre 2022 e 2024. Formação: graduação em Sistemas de Informação na Faculdade Exemplo, concluída em 2021. Usou Git para controle de versão. Idioma: português nativo.";
const job = "Vaga de desenvolvimento. Requisitos obrigatórios: PHP, Git, React, Docker, Kubernetes, PostgreSQL, Redis, AWS, Terraform, Grafana, Prometheus, Linux, Python, Go, Kafka, RabbitMQ, inglês avançado, liderança e disponibilidade para viagens.";
let requests = 0;
function bounded(provider: AiProviderInterface): AiProviderInterface {
  return {
    name: provider.name,
    async generateJson(params) {
      if (++requests > 12) throw new Error("SYNTHETIC_REQUEST_LIMIT");
      return provider.generateJson({ ...params, timeoutMs: 45_000 });
    },
    async generateText() { throw new Error("TEXT_NOT_ALLOWED"); },
  };
}

const originalFetch = globalThis.fetch;
const budget = AbortSignal.timeout(180_000);
globalThis.fetch = (url, init) => originalFetch(url, { ...init, signal: init?.signal ? AbortSignal.any([budget, init.signal]) : budget });
let failed = false;
try {
  const providers = process.argv.includes("--openrouter-only") ? [new OpenRouterProvider()] : [new NvidiaNimProvider(), new OpenRouterProvider()];
  for (const provider of providers) {
    const started = Date.now();
    try {
      const ai = new AnalysisOrchestrator([bounded(provider)]);
      const plan = await ai.analyzeLocalized(RESUME_TAILORING_PROMPT, JSON.stringify({ original, confirmed: "", job }), resumeTailoringSchema(original, "", job), "pt-BR", 2400, "job_tailoring");
      assert.ok(plan.priorities.length > 0 && plan.priorities.length <= 6);
      assert.ok(plan.unsupportedRequirements.length > 0 && plan.unsupportedRequirements.length <= 12);
      console.info("Synthetic provider check", { provider: provider.name, operation: "job_tailoring", ok: true, elapsedMs: Date.now() - started });
    } catch (error) {
      failed = true;
      console.info("Synthetic provider check", { provider: provider.name, operation: "job_tailoring", ok: false, ...aiFailureMetadata(error), elapsedMs: Date.now() - started });
    }
  }
  if (!process.argv.includes("--tailoring-only")) {
  const started = Date.now();
  try {
    const assessment = await new AnalysisOrchestrator([bounded(new NvidiaNimProvider()), bounded(new OpenRouterProvider())]).analyzeLocalized(ATS_ANALYZER_SYSTEM_PROMPT, generateAtsAnalyzerUserPrompt(original, "Desenvolvimento", "MAKE_ATS_FRIENDLY", "pt-BR"), resumeAssessmentSchema(original), "pt-BR", 3200, "initial_assessment");
    assert.equal(assessment.rubric?.length, 5);
    console.info("Synthetic assessment check", { ok: true, elapsedMs: Date.now() - started });
  } catch (error) {
    failed = true;
    console.info("Synthetic assessment check", { ok: false, ...aiFailureMetadata(error), elapsedMs: Date.now() - started });
  }
  }
} finally {
  globalThis.fetch = originalFetch;
  console.info("Synthetic checks completed", { requests, failed });
}
if (failed) process.exitCode = 1;
