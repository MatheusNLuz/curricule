import { TruthGuard } from "./truth-guard";
import { HttpError } from "../http-error";
export async function verifyOutput(original: string, confirmed: string, proposed: string, rejected: string[], destination: "resume" | "letter" = "resume", language = "pt-BR") {
  const normalized = proposed.normalize("NFKC").toLowerCase();
  if (rejected.some(claim => claim.trim().length > 0 && normalized.includes(claim.normalize("NFKC").toLowerCase()))) throw new HttpError(422, "A proposta contém um fato rejeitado. Revise suas respostas antes de gerar novamente.");
  const report = await TruthGuard.evaluate(original, confirmed, proposed, rejected, language);
  if (!report.claims.length || report.blockedClaims.length || report.claims.some(claim => !(destination === "letter" ? claim.canUseInCoverLetter : claim.canUseInResume) || !["confirmed_by_resume", "confirmed_by_user"].includes(claim.source))) throw new HttpError(422, "A proposta contém informações sem confirmação. Revise os fatos e tente novamente; a versão anterior foi preservada.");
  return report;
}
