import { createHash } from "node:crypto";
import { TruthGuardSchema, type TruthGuardGen } from "../schemas/questions.schema.ts";

export type ReviewedTruth = TruthGuardGen & { sourceHash: string; decisions: Record<string, boolean> };
type TruthSource = { parsedResumeText: string | null; comparisonJson: string | null; selectedLanguage: string; questions: { id: string; answer: string | null }[] };
export function truthSourceHash(source: TruthSource) {
  return createHash("sha256").update(JSON.stringify([source.parsedResumeText, source.comparisonJson, source.selectedLanguage, [...source.questions].sort((a, b) => a.id.localeCompare(b.id)).map(q => [q.id, q.answer])])).digest("hex");
}
export function readTruth(value: string | null): ReviewedTruth | null {
  try {
    const raw = JSON.parse(value || "null");
    if (!raw || typeof raw.sourceHash !== "string" || !raw.decisions || typeof raw.decisions !== "object") return null;
    return { ...TruthGuardSchema.parse(raw), sourceHash: raw.sourceHash, decisions: raw.decisions };
  } catch { return null; }
}
export function reviewTruth(report: ReviewedTruth, decisions: Record<string, boolean>): ReviewedTruth {
  for (const [index, approved] of Object.entries(decisions)) {
    const claim = report.claims[Number(index)];
    if (!/^\d+$/.test(index) || !claim || (claim.source !== "low_confidence_inference" && approved)) throw new Error("Decisão inválida para esse fato.");
  }
  if (report.claims.some((claim, index) => claim.source === "low_confidence_inference" && typeof decisions[index] !== "boolean")) throw new Error("Revise todas as inferências antes de continuar.");
  return { ...report, decisions };
}
export function truthContext(report: ReviewedTruth | null) {
  if (!report) return { approved: [] as string[], rejected: [] as string[] };
  const approved: string[] = [], rejected: string[] = [...report.blockedClaims];
  report.claims.forEach((claim, index) => {
    if (claim.source === "forbidden_to_use" || claim.source === "missing" || report.decisions[index] === false) rejected.push(claim.claim);
    else if (report.decisions[index] === true || claim.source === "confirmed_by_resume" || claim.source === "confirmed_by_user") approved.push(claim.claim);
  });
  return { approved, rejected: [...new Set(rejected)] };
}
