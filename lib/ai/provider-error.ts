import { ZodError, type ZodType } from "zod";
import { knownSchemaPaths, safeFieldPath } from "./schema-contract";
import { HttpError } from "../http-error";

export class AiProviderError extends Error {
  constructor(public code: string, public status?: number) { super(code); }
}
export function isRetryableProviderFailure(error: unknown): boolean {
  return (error instanceof Error && error.name === "TimeoutError") || (error instanceof AiProviderError && (error.code === "INVALID_JSON" || (error.code === "HTTP_ERROR" && [408, 500, 502, 503, 504].includes(error.status || 0))));
}
const validationCodes = new Set(["EVIDENCE_NOT_IN_SOURCE", "POSITIVE_LEVEL_WITHOUT_EVIDENCE", "RUBRIC_CRITERIA_INVALID"]);
const languageRules = new Set(["LOCALE_METADATA", "REGIONAL_PROSE", "PORTUGUESE_PROSE", "SPANISH_PROSE", "ENGLISH_PHRASE", "ENGLISH_SENTENCE", "AUDITOR_REJECTED"]);
export function aiFailureMetadata(error: unknown, schema?: ZodType) {
  const allowed = schema ? knownSchemaPaths(schema) : new Set<string>();
  if (error instanceof ZodError) return { code: "SCHEMA_INVALID", issues: error.issues.slice(0, 20).map(issue => ({
    code: issue.code, depth: issue.path.length, ...(schema ? { path: safeFieldPath(issue.path, allowed) } : {}),
    ...("minimum" in issue && typeof issue.minimum === "number" ? { minimum: issue.minimum } : {}),
    ...("maximum" in issue && typeof issue.maximum === "number" ? { maximum: issue.maximum } : {}),
    ...(issue.code === "custom" && validationCodes.has(issue.params?.validationCode) ? { validationCode: issue.params!.validationCode as string } : {}),
  })) };
  if (error instanceof Error && "rule" in error && typeof error.rule === "string" && languageRules.has(error.rule)) {
    const issues = "issues" in error && Array.isArray(error.issues) ? error.issues.slice(0, 12) : [];
    return { code: "OUTPUT_LANGUAGE_MISMATCH", rule: error.rule, paths: issues.map(issue => typeof issue.path === "string" ? safeFieldPath(issue.path.replace(/\[(\d+)\]/g, ".$1").split(".").map((part: string) => /^\d+$/.test(part) ? Number(part) : part), allowed) : undefined).filter(Boolean) };
  }
  if (error instanceof AiProviderError) return { code: error.code, status: error.status };
  if (error instanceof HttpError && ["AI_PROVIDERS_UNAVAILABLE", "DUAL_AI_UNAVAILABLE", "DUAL_AI_AUTHOR_UNAVAILABLE", "DUAL_AI_REVIEW_REJECTED", "LANGUAGE_AUDIT_UNAVAILABLE", "OUTPUT_LANGUAGE_MISMATCH", "TASK_TIMEOUT", "TASK_EXPIRED"].includes(error.code ?? "")) return { code: error.code, status: error.status };
  return { code: error instanceof Error && ["OutputLanguageAuditError", "TimeoutError", "AbortError", "TypeError", "Error"].includes(error.name) ? error.name : "UnknownError" };
}
