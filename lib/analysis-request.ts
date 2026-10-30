export const ANALYSIS_REQUEST_HEADER = "X-Analysis-Request-Id";

export function validAnalysisRequestId(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
}

export function analysisRequestId(token: string): string | null {
  const id = token.split(":")[1];
  return validAnalysisRequestId(id) ? id : null;
}
