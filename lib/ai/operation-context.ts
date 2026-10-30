import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { taskContext } from "../task-context";

export const AI_CONTRACT_VERSION = "operation-contract-v1";
export type AiOperation = "unspecified" | "initial_assessment" | "job_parse" | "job_tailoring" | "resume_rewrite" | "linkedin_rewrite" | "comparison" | "questions" | "questions_translation" | "factual_verification" | "reassessment" | "cover_letter";
export type AiPhase = "generation" | "schema_validation" | "language_validation" | "language_audit" | "schema_repair" | "language_repair" | "factual_review" | "factual_repair";
type AiCallContext = { correlationId: string; operation: AiOperation; schemaId: string; policyVersion: string; phase: AiPhase; attempt: number };
export const aiCallContext = new AsyncLocalStorage<AiCallContext>();

export function operationContext(operation: AiOperation, policyVersion: string, schemaId: string): AiCallContext {
  return { correlationId: aiCallContext.getStore()?.correlationId ?? taskContext.getStore()?.correlationId ?? randomUUID(), operation, schemaId: `${operation}:${AI_CONTRACT_VERSION}:${schemaId}`, policyVersion, phase: "generation", attempt: 1 };
}

export function withAiPhase<T>(phase: AiPhase, attempt: number, run: () => T): T {
  const context = aiCallContext.getStore();
  return context ? aiCallContext.run({ ...context, phase, attempt }, run) : run();
}
