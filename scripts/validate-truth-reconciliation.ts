/** Synthetic facts only; no account, resume or database access. At most 16 HTTP calls. */
import assert from "node:assert/strict";
import { TruthGuard } from "../lib/ats/truth-guard";
import { verifyOutput, OutputVerificationError } from "../lib/ats/verify-output";
import { aiFailureMetadata } from "../lib/ai/provider-error";

const original = "Ana Exemplo manteve serviços PHP e utilizou GitHub para hospedar código na Empresa Exemplo.";
const candidateStatements = [
  { question: "Você usa Git?", answer: "Sim, uso Git diariamente com Git Flow." },
  { question: "Você utiliza PHPUnit para testes?", answer: "Tenho conhecimento teórico de PHPUnit, mas não pratiquei." },
];
const answers = candidateStatements.map(item => `${item.question}: ${item.answer}`).join("\n");
const originalFetch = globalThis.fetch;
let requests = 0, failures = 0;
const budget = AbortSignal.timeout(180_000);
globalThis.fetch = (url, init) => {
  if (++requests > 16) throw new Error("SYNTHETIC_REQUEST_LIMIT");
  return originalFetch(url, { ...init, signal: init?.signal ? AbortSignal.any([budget, init.signal]) : budget });
};
async function check(name: string, run: () => Promise<void>) {
  const started = Date.now();
  try { await run(); console.info("Synthetic fact check", { name, passed: true, elapsedMs: Date.now() - started }); }
  catch (error) { failures++; console.info("Synthetic fact check", { name, passed: false, ...aiFailureMetadata(error), elapsedMs: Date.now() - started }); }
}
try {
  await check("candidate_confirmations", async () => {
    const report = await TruthGuard.evaluate(original, answers, JSON.stringify({ candidateStatements }), [], "pt-BR", true);
    console.info("Synthetic candidate verdict", { claims: report.claims.map(claim => ({ git: /\bgit\b/i.test(claim.claim), phpunit: /phpunit/i.test(claim.claim), theory: /te[oó]ri/i.test(claim.claim), source: claim.source, resume: claim.canUseInResume, letter: claim.canUseInCoverLetter })), blockedCount: report.blockedClaims.length });
    assert.ok(report.claims.some(claim => /\bgit\b/i.test(claim.claim) && claim.source === "confirmed_by_user" && claim.canUseInResume));
    assert.ok(report.claims.some(claim => /phpunit/i.test(claim.claim) && /te[oó]ri/i.test(claim.claim)));
    // A missing practical qualification may remain missing; the whole tool
    // must not become forbidden. The next checks exercise allowed theory and
    // disallowed professional practice separately through the final auditor.
    assert.ok(report.blockedClaims.every(claim => !/^(?:git|phpunit)$/i.test(claim.trim())));
  });
  if (!process.argv.includes("--review-only")) {
  await check("github_is_not_git_proficiency", async () => { await verifyOutput(original, "", "Utilizou GitHub para hospedar código.", ["Git"], "resume", "pt-BR"); });
  await check("theory_is_not_professional_practice", async () => { await verifyOutput(original, answers, "Possui conhecimento teórico de PHPUnit, sem prática.", ["Experiência profissional com PHPUnit"], "resume", "pt-BR"); });
  await check("invented_practice_is_blocked", async () => {
    await assert.rejects(verifyOutput(original, answers, "Escreveu testes profissionais com PHPUnit na Empresa Exemplo.", ["Experiência profissional com PHPUnit"], "resume", "pt-BR"), OutputVerificationError);
  });
  }
} finally {
  globalThis.fetch = originalFetch;
  console.info("Synthetic fact checks finished", { requests, failures });
}
if (failures) process.exitCode = 1;
