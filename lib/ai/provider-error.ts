export class AiProviderError extends Error {
  constructor(public code: string, public status?: number) { super(code); }
}
export function isRetryableProviderFailure(error: unknown): boolean {
  return error instanceof AiProviderError && (error.code === "INVALID_JSON" || (error.code === "HTTP_ERROR" && [408, 500, 502, 503, 504].includes(error.status || 0)));
}
export function aiFailureMetadata(error: unknown) {
  return error instanceof AiProviderError ? { code: error.code, status: error.status } : { code: error instanceof Error ? error.name : "UnknownError" };
}
