import { z } from "zod";

const PREFIX = "curricule-answer-v1:";
const AnswerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("boolean"), choice: z.enum(["yes", "no"]).nullable(), explanation: z.string().max(4000) }).strict(),
  z.object({ kind: z.literal("choice"), selected: z.array(z.string().max(300)).max(20), other: z.string().max(4000) }).strict(),
]);
export type StructuredAnswer = z.infer<typeof AnswerSchema>;

export function readStructuredAnswer(value: string | null | undefined): StructuredAnswer | null {
  if (!value?.startsWith(PREFIX)) return null;
  try { const result = AnswerSchema.safeParse(JSON.parse(value.slice(PREFIX.length))); return result.success ? result.data : null; } catch { return null; }
}
export function writeStructuredAnswer(value: StructuredAnswer): string { return PREFIX + JSON.stringify(AnswerSchema.parse(value)); }
export function isMalformedStructuredAnswer(value: string): boolean { return value.startsWith(PREFIX) && !readStructuredAnswer(value); }
export function answerForReview(value: string | null | undefined): string {
  if (!value) return "";
  const answer = readStructuredAnswer(value);
  if (!answer) return value.startsWith(PREFIX) ? "" : value.trim();
  if (answer.kind === "boolean") return answer.choice === "no" ? "Não." : answer.choice === "yes" ? `Sim${answer.explanation.trim() ? ": " + answer.explanation.trim() : ". Sem detalhes informados."}` : "";
  return [...answer.selected, answer.other.trim()].filter(Boolean).join("; ");
}
