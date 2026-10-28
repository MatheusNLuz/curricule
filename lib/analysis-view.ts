import type { Analysis, SmartQuestion } from "@prisma/client";

export type AnalysisQuestion = Omit<SmartQuestion, "createdAt"> & { createdAt: string };
export type AnalysisView = Omit<Analysis, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string; questions: AnalysisQuestion[] };
export function parseAnalysisJson<T>(value: string | null): T | null {
  if (!value) return null;
  try { return JSON.parse(value) as T; } catch { return null; }
}
