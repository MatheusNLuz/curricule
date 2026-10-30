import { TruthGuard } from "./truth-guard";
import { HttpError } from "../http-error";
import { taskContext } from "../task-context";
export class OutputVerificationError extends HttpError {
  constructor(public issues: string[]) {
    super(422, "A versão gerada contém informações que não foi possível confirmar. Ajuste suas respostas ou tente novamente; seu material foi preservado.", "OUTPUT_UNCONFIRMED");
  }
}
export async function verifyOutput(original: string, confirmed: string, proposed: string, rejected: string[], destination: "resume" | "letter" = "resume", language = "pt-BR") {
  // Restrictions concern assertions and their qualifiers, not string occurrences.
  // The mandatory auditor checks every output, including rejected paraphrases.
  const report = await TruthGuard.evaluate(original, confirmed, proposed, rejected, language, false, true);
  const unconfirmed = report.claims.filter(claim => !(destination === "letter" ? claim.canUseInCoverLetter : claim.canUseInResume) || !["confirmed_by_resume", "confirmed_by_user"].includes(claim.source));
  if (!report.claims.length || report.blockedClaims.length || unconfirmed.length) {
    console.warn("AI factual output rejected", { correlationId: taskContext.getStore()?.correlationId, destination, rule: "UNCONFIRMED_ASSERTION", blockedCount: report.blockedClaims.length, unconfirmedCount: unconfirmed.length, emptyReport: report.claims.length === 0 });
    throw new OutputVerificationError([...report.blockedClaims, ...unconfirmed.map(claim => claim.claim)].filter(Boolean).slice(0, 20).map(claim => claim.slice(0, 500)));
  }
  return report;
}

export async function generateVerifiedOutput<T>(generate: (issues: string[], previousOutput?: T) => Promise<T>, verify: (value: T) => Promise<unknown>): Promise<T> {
  let issues: string[] = [];
  let previousOutput: T | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    const value = await generate(issues, previousOutput);
    try { await verify(value); return value; }
    catch (error) {
      if (!(error instanceof OutputVerificationError) || attempt === 1 || !error.issues.length) throw error;
      issues = error.issues;
      previousOutput = value;
    }
  }
  throw new OutputVerificationError([]);
}
