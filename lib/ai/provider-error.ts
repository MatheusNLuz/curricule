export class AiProviderError extends Error {
  constructor(public code: string, public status?: number) { super(code); }
}
export function aiFailureMetadata(error: unknown) {
  return error instanceof AiProviderError ? { code: error.code, status: error.status } : { code: error instanceof Error ? error.name : "UnknownError" };
}
