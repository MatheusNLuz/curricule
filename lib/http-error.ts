import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

export function prismaErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  const code = error.code;
  return typeof code === "string" && /^P\d{4}$/.test(code) ? code : undefined;
}

export function apiError(error: unknown, message = "Não foi possível concluir. Tente novamente.") {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: error.status === 409 || error.status === 429 ? { "Retry-After": "5" } : undefined });
  if (error instanceof ZodError || error instanceof SyntaxError) return NextResponse.json({ error: "Os dados enviados são inválidos. Revise os campos." }, { status: 400 });
  const reference = crypto.randomUUID();
  // Only metadata: provider responses and candidate content must never enter logs.
  console.error("Request failed", { reference, type: error instanceof Error ? error.name : "UnknownError", code: prismaErrorCode(error) });
  return NextResponse.json({ error: message, reference }, { status: 503 });
}
