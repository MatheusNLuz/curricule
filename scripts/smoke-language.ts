import { z } from "zod";
import { AnalysisOrchestrator } from "../lib/ai/analysis-orchestrator";
import { LOCALES } from "../lib/analysis-contract";
import assert from "node:assert/strict";
import { assertOutputLanguage, OutputLanguageError } from "../lib/ai/output-language";
import { NvidiaNimProvider } from "../lib/ai/nvidia-nim-provider";

// Only synthetic candidate data. No database reads, writes or private profile imports.
const schema = z.object({
  recommendedLanguage: z.enum(LOCALES),
  summary: z.string().min(15),
  question: z.string().min(10),
  sectionTitle: z.string().min(3),
  suggestedAnswer: z.string().min(10),
});
for (const language of process.argv.includes("--audit-only") ? [] : LOCALES) {
  const started = Date.now();
  const result = await new AnalysisOrchestrator().analyzeLocalized(
    "Return JSON {recommendedLanguage,summary,question,sectionTitle,suggestedAnswer}. Write a short factual summary, a question about file organisation, the experience section heading, and an unconfirmed suggested answer using only source facts. Exercise the chosen regional spelling/vocabulary: files, team, organise/organize, analyse/analyze. Do not invent outcomes.",
    JSON.stringify({ original: "Ana Silva worked at Example Inc. She organised files, analysed reports and supported the team using React and TypeScript. Ana Silva organizou arquivos, analisou relatórios e apoiou a equipe.", jobLocation: language.startsWith("pt") ? "US" : "BR" }),
    schema,
    language,
  );
  console.info(JSON.stringify({ locale: language, elapsedMs: Date.now() - started, result }));
}

const invalidOutputs = [
  ["pt-BR", "Organizei os arquivos. I worked with the team and analyzed reports."],
  ["en-US", "I organized files and analyzed reports. Também trabalhei com a equipe."],
  ["pt-PT", "Organizei os arquivos e apoiei a equipe usando o celular."],
  ["en-GB", "I organized the team, analyzed the reports and optimized the process."],
] as const;
for (const [locale, content] of invalidOutputs) {
  await assert.rejects(() => assertOutputLanguage(new NvidiaNimProvider(), { content }, locale), OutputLanguageError);
  console.info(JSON.stringify({ locale, deliberatelyInvalidOutputRejected: true }));
}
