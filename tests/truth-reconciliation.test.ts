import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { ZodType } from "zod";
import { truthContext, truthSourceHash, type ReviewedTruth } from "../lib/ats/truth-policy";
import { writeStructuredAnswer } from "../lib/question-answer";
import type { TruthGuardGen } from "../lib/schemas/questions.schema";

const gitClaim = { claim: "Usa Git diariamente com Git Flow.", source: "confirmed_by_user" as const, canUseInResume: true, canUseInCoverLetter: true, explanation: "Confirmado na resposta." };
const theoryClaim = { claim: "Possui conhecimento teórico de PHPUnit, sem prática.", source: "confirmed_by_user" as const, canUseInResume: true, canUseInCoverLetter: true, explanation: "Apenas conhecimento teórico foi confirmado." };
const source = {
  id: "synthetic", revision: 3, parsedResumeText: "Ana manteve serviços PHP e usou GitHub.",
  comparisonJson: JSON.stringify({ missingMandatorySkills: ["Git", "PHPUnit"] }),
  selectedLanguage: "pt-BR", confirmedClaimsJson: null, rejectedClaimsJson: null,
  questions: [
    { id: "git", question: "Você usa Git?", answer: writeStructuredAnswer({ kind: "choice", selected: ["Sim, uso Git diariamente com Git Flow"], other: "" }), confirmed: true },
    { id: "tests", question: "Você utiliza PHPUnit?", answer: writeStructuredAnswer({ kind: "choice", selected: ["Tenho conhecimento teórico de PHPUnit, mas não pratiquei"], other: "" }), confirmed: true },
  ],
};
let writes: Record<string, unknown>[] = [];
let prompts: { system: string; input: string }[] = [];
let verdict = { claims: [gitClaim, theoryClaim], blockedClaims: [] as string[], warnings: [] as string[] };
const db = { analysis: { findFirst: async () => source, updateMany: async ({ data }: { data: Record<string, unknown> }) => { writes.push(data); return { count: 1 }; } } };
mock.module(new URL("../lib/db.ts", import.meta.url).href, { namedExports: { prisma: db } });
mock.module(new URL("../lib/auth.ts", import.meta.url).href, { namedExports: { getSessionUser: async () => ({ userId: "owner" }) } });
mock.module(new URL("../lib/analysis-task.ts", import.meta.url).href, { namedExports: {
  runAnalysisTask: async (_id: string, _user: string, _kind: string, _input: unknown, run: () => Promise<unknown>) => run(),
  commitTask: async (run: (tx: typeof db) => Promise<unknown>) => run(db),
} });
mock.module(new URL("../lib/ai/analysis-orchestrator.ts", import.meta.url).href, { namedExports: { AnalysisOrchestrator: class {
  async analyzeLocalized<T>(system: string, input: string, schema: ZodType<T>) {
    prompts.push({ system, input }); return schema.parse(verdict);
  }
} } });
const { TruthGuard, normalizeTruthVerdict } = await import("../lib/ats/truth-guard");
const { verifyOutput, OutputVerificationError } = await import("../lib/ats/verify-output");
const route = await import("../app/api/truth-guard/route");

test.beforeEach(() => { writes = []; prompts = []; verdict = { claims: [gitClaim, theoryClaim], blockedClaims: [], warnings: [] }; });
test.afterEach(() => mock.restoreAll());

test("answer review evaluates candidate statements without injecting old vacancy gaps", async () => {
  const response = await route.POST(new Request("https://example.test/api/truth-guard", { method: "POST", body: JSON.stringify({ analysisId: source.id }) }));
  assert.equal(response.status, 200);
  const proposed = prompts[0].input.split('PROPOSED CHANGES/NEW CONTENT TO ADD:\n"""\n')[1].split('\n"""')[0];
  assert.doesNotMatch(proposed, /unconfirmedJobRequirements|missingMandatorySkills/);
  assert.match(proposed, /Git diariamente com Git Flow/);
  assert.match(proposed, /conhecimento teórico de PHPUnit, mas não pratiquei/);
  assert.ok(writes[0].truthGuardJson);
});

test("an old Git restriction cannot reject GitHub before the factual auditor runs", async () => {
  const audit = mock.method(TruthGuard, "evaluate", async () => ({ claims: [{ ...gitClaim, claim: "Usa GitHub.", source: "confirmed_by_resume" as const }], blockedClaims: [], warnings: [] }));
  await verifyOutput(source.parsedResumeText, "", "Usa GitHub.", ["Git"]);
  assert.equal(audit.mock.callCount(), 1);
  assert.deepEqual(audit.mock.calls[0].arguments[3], ["Git"]);
});

test("theoretical PHPUnit remains eligible without granting professional practice", async () => {
  const audit = mock.method(TruthGuard, "evaluate", async (): Promise<TruthGuardGen> => ({ claims: [theoryClaim], blockedClaims: [], warnings: [] }));
  await verifyOutput("", theoryClaim.claim, theoryClaim.claim, ["PHPUnit"]);
  assert.equal(audit.mock.callCount(), 1);
  audit.mock.mockImplementation(async (): Promise<TruthGuardGen> => ({ claims: [{ ...theoryClaim, claim: "Escreveu testes profissionais com PHPUnit.", source: "missing", canUseInResume: false, canUseInCoverLetter: false }], blockedClaims: ["Escreveu testes profissionais com PHPUnit."], warnings: [] }));
  await assert.rejects(verifyOutput("", theoryClaim.claim, "Escreveu testes profissionais com PHPUnit.", ["PHPUnit"]), OutputVerificationError);
});

test("explicitly rejected assertions and their paraphrases still reach the auditor and fail closed", async () => {
  const assertion = "Liderei vinte pessoas.";
  const audit = mock.method(TruthGuard, "evaluate", async () => ({ claims: [], blockedClaims: [assertion], warnings: [] }));
  for (const output of [assertion, "Gerenciei uma equipe de 20 profissionais."]) await assert.rejects(verifyOutput("", "", output, [assertion]), OutputVerificationError);
  assert.equal(audit.mock.callCount(), 2);
  audit.mock.mockImplementation(async () => { throw new Error("Auditor unavailable"); });
  await assert.rejects(verifyOutput("", "", "Texto gerado", [assertion]), /Auditor unavailable/);
});

test("new policy invalidates old reviews without changing saved answers", () => {
  const previous = createHash("sha256").update(JSON.stringify([source.parsedResumeText, source.comparisonJson, source.selectedLanguage, null, null, source.questions.map(q => [q.id, q.answer])])).digest("hex");
  const answers = JSON.stringify(source.questions);
  assert.notEqual(truthSourceHash(source), previous);
  assert.equal(JSON.stringify(source.questions), answers);
});

test("permission for a resume is independent of permission for a cover letter", () => {
  const normalized = normalizeTruthVerdict({ claims: [{ ...theoryClaim, canUseInCoverLetter: false }], blockedClaims: [], warnings: [] });
  assert.equal(normalized.claims[0].source, "confirmed_by_user");
  const report: ReviewedTruth = { ...normalized, decisions: {}, sourceHash: "synthetic" };
  assert.deepEqual(truthContext(report).approved, [theoryClaim.claim]);
  assert.deepEqual(truthContext(report, "letter").approved, []);
});

test("a verdict cannot both approve an assertion and leave it in a contradictory blocklist", async () => {
  for (const blocked of ["Git", gitClaim.claim]) {
    verdict = { claims: [gitClaim], blockedClaims: [blocked], warnings: [] };
    await assert.rejects(TruthGuard.evaluate(source.parsedResumeText, gitClaim.claim, gitClaim.claim), error => error instanceof Error && "issues" in error);
  }
});
