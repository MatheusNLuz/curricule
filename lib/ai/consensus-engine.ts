import { AnalysisOrchestrator } from "./analysis-orchestrator";
import type { ZodType } from "zod";
/** Compatibility facade. This path uses one provider with fallback, not model consensus. */
export class ConsensusEngine {
  async analyzeWithConsensus<T>(systemPrompt: string, userPrompt: string, schema: ZodType<T>, language: string): Promise<T> {
    return new AnalysisOrchestrator().analyzeLocalized<T>(systemPrompt, userPrompt, schema, language);
  }
}
