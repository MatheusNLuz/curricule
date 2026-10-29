/** Offline benchmark with fictional data. No database writes or real candidate information. */
import { AnalysisOrchestrator } from "../lib/ai/analysis-orchestrator";
import { OpenRouterProvider } from "../lib/ai/openrouter-provider";
import { NvidiaNimProvider } from "../lib/ai/nvidia-nim-provider";
import { SmartQuestionSchema } from "../lib/schemas/questions-truth.schema";

const fictional = "Candidata fictícia: trabalhou dois anos em atendimento por email e organizou pedidos em planilhas. Não informou experiência com chat nem resultados numéricos.";
const prompt = "Gere três perguntas curtas e neutras para esclarecer experiência profissional, sem assumir trabalho com chat, liderança ou resultados não informados. Permita respostas negativas ou desconhecidas. Retorne JSON {questions:[{question,reason,category,answerType,options?}]}.";
for (const provider of [new OpenRouterProvider(), new NvidiaNimProvider()]) {
  const started = Date.now();
  try {
    const result = await new AnalysisOrchestrator([provider]).analyzeLocalized(prompt, fictional, SmartQuestionSchema, "pt-BR");
    console.log(JSON.stringify({ provider: provider.name, elapsedMs: Date.now() - started, questions: result.questions.map(q => ({ question: q.question, reason: q.reason })) }));
  } catch (error) {
    console.log(JSON.stringify({ provider: provider.name, elapsedMs: Date.now() - started, error: error instanceof Error ? error.name : "UnknownError" }));
  }
}
