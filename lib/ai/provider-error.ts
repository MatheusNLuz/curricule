import { ZodError } from "zod";

export class AiProviderError extends Error {
  constructor(public code: string, public status?: number) { super(code); }
}
export function isRetryableProviderFailure(error: unknown): boolean {
  return (error instanceof Error && error.name === "TimeoutError") || (error instanceof AiProviderError && (error.code === "INVALID_JSON" || (error.code === "HTTP_ERROR" && [408, 500, 502, 503, 504].includes(error.status || 0))));
}
export function aiFailureMetadata(error: unknown) {
  if (error instanceof ZodError) return { code: "SCHEMA_INVALID", issues: error.issues.slice(0, 20).map(issue => ({ code: issue.code, depth: issue.path.length })) };
  return error instanceof AiProviderError ? { code: error.code, status: error.status } : { code: error instanceof Error ? error.name : "UnknownError" };
}
