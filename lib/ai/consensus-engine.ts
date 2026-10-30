import { AnalysisOrchestrator } from "./analysis-orchestrator";
import type { ZodType } from "zod";
import type { AiOperation } from "./operation-context";
/** Compatibility facade. This path uses one provider with fallback, not model consensus. */
export class ConsensusEngine {
  async analyzeWithConsensus<T>(systemPrompt: string, userPrompt: string, schema: ZodType<T>, language: string, operation: AiOperation = "unspecified"): Promise<T> {
    return new AnalysisOrchestrator().analyzeLocalized<T>(systemPrompt, userPrompt, schema, language, undefined, operation);
  }
}
