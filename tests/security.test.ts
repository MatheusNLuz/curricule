import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { CreateAnalysisSchema, UpdateAnalysisSchema } from "../lib/analysis-contract.ts";
import { validateSourceUrl, isPublicAddress, extractSourceText, resolvePublicHost, importWebSource } from "../lib/web-source.ts";

test("LinkedIn authentication redirects explain the public access limitation", async () => {
  await assert.rejects(
    () => importWebSource("https://www.linkedin.com/in/example/", "linkedin", async () => ({ status: 302, location: "/authwall", html: "" })),
    /LinkedIn exige acesso.*PDF/,
  );
});
import { pdfFileError, hasPdfSignature } from "../lib/upload-validation.ts";
import { reviewTruth, truthContext, truthSourceHash, type ReviewedTruth } from "../lib/ats/truth-policy.ts";
import { AnalysisOrchestrator } from "../lib/ai/analysis-orchestrator.ts";
import { z } from "zod";
import { TruthGuard } from "../lib/ats/truth-guard.ts";
import { verifyOutput } from "../lib/ats/verify-output.ts";
import { hasSourceText, isSourceUrl } from "../lib/source-input.ts";

test("PATCH rejects internal fields and validates published resume JSON", () => {
  for (const body of [{ userId: "other" }, { initialScores: "{}" }, { finalScores: "{}" }, { mode: "UNKNOWN" }, { finalResumeJson: "not JSON" }, { draftJson: "{}" }]) assert.equal(UpdateAnalysisSchema.safeParse(body).success, false);
  assert.equal(UpdateAnalysisSchema.safeParse({ selectedTemplate: "modern-ats", professionalTarget: "Analista" }).success, true);
  assert.equal(CreateAnalysisSchema.safeParse({ mode: "wrong", clientRequestId: crypto.randomUUID() }).success, false);
  assert.equal(CreateAnalysisSchema.parse({ mode: "OPTIMIZE_FOR_JOB", clientRequestId: crypto.randomUUID(), selectedLanguage: "pt-PT", jobLocation: "UK" }).selectedLanguage, "pt-PT");
});
test("an address alone is never accepted as the job description", () => {
  const url = "https://careers.example.com/company/a-very-long-vacancy-id-1234567890";
  assert.equal(isSourceUrl(url), true); assert.equal(hasSourceText(url), false);
  assert.equal(UpdateAnalysisSchema.safeParse({ jobDescription: url }).success, false);
  assert.equal(hasSourceText("Responsabilidades: organizar processos e atender clientes com clareza."), true);
});
test("source URLs reject local addresses, deceptive domains, credentials and non-HTTPS", () => {
  for (const url of ["http://example.com", "https://127.0.0.1", "https://[::1]", "https://2130706433", "https://example.com:8443", "https://user:pass@example.com", "https://metadata.internal"]) assert.throws(() => validateSourceUrl(url, "job"));
  for (const url of ["https://linkedin.com.attacker.com/in/name", "https://example.com/in/name", "https://linkedin.com/jobs/view/123"]) assert.throws(() => validateSourceUrl(url, "linkedin"));
  assert.equal(validateSourceUrl("https://www.linkedin.com/in/candidate/?trk=public", "linkedin").hostname, "www.linkedin.com");
});
test("DNS targets exclude private, reserved, mapped and transition IP ranges", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.5", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "198.18.0.1", "203.0.113.1", "::1", "::ffff:127.0.0.1", "fe80::1", "fc00::1", "2001:db8::1", "2002:7f00:1::"]) assert.equal(isPublicAddress(ip), false, ip);
  assert.equal(isPublicAddress("8.8.8.8"), true); assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
});
test("job extraction prefers JobPosting structured description and strips markup", () => {
  const description = "<h2>Responsabilidades</h2><p>Organizar processos financeiros e acompanhar resultados com a equipe.</p><h2>Requisitos</h2><p>Formação na área e experiência em atendimento e organização de relatórios gerenciais, com comunicação clara e atenção aos detalhes.</p>";
  const result = extractSourceText('<html><head><title>Portal de vagas</title><script type="application/ld+json">' + JSON.stringify({ "@graph": [{ "@type": "JobPosting", title: "Analista financeiro", description }] }) + '</script></head><body><nav>Menu</nav><main>Carregando</main></body></html>', "job");
  assert.equal(result.title, "Analista financeiro"); assert.match(result.text, /Formação/); assert.doesNotMatch(result.text, /<p>|Menu|Carregando/);
});
test("mixed DNS records are rejected and DNS resolution obeys cancellation", async () => {
  const controller = new AbortController();
  await assert.rejects(() => resolvePublicHost("public.example", controller.signal, async () => [{ address: "8.8.8.8", family: 4 }, { address: "10.0.0.1", family: 4 }]));
  const pending = resolvePublicHost("public.example", controller.signal, async () => new Promise(() => {}));
  controller.abort(new Error("Cancelled DNS")); await assert.rejects(() => pending, /Cancelled DNS/);
});
test("source reading rejects unsafe redirects and bounds redirect loops", async () => {
  let calls = 0;
  await assert.rejects(() => importWebSource("https://jobs.example.com/vaga", "job", async () => { calls++; return { status: 302, location: "https://127.0.0.1/private", html: "" }; }));
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(() => importWebSource("https://jobs.example.com/vaga", "job", async () => { calls++; return { status: 302, location: "https://jobs.example.com/loop", html: "" }; }));
  assert.equal(calls, 4);
});
test("login walls and incomplete profiles cannot masquerade as an imported profile", () => {
  assert.throws(() => extractSourceText("<title>Sign in | LinkedIn</title><main>Experience " + "generic content ".repeat(50) + "</main>", "linkedin"));
  assert.throws(() => extractSourceText("<title>Candidate</title><main>Only a name</main>", "linkedin"));
  assert.match(extractSourceText("<title>Candidate | LinkedIn</title><main><h1>Candidate</h1><h2>Experience</h2>" + "Worked in customer service and supported customers with clear communication. ".repeat(6) + "</main>", "linkedin").text, /customer service/);
});
test("PDF upload validates size, type and magic signature", () => {
  assert.ok(pdfFileError({ name: "cv.pdf", size: 10 * 1024 * 1024 + 1, type: "application/pdf" }));
  assert.ok(pdfFileError({ name: "cv.exe", size: 10, type: "application/pdf" }));
  assert.equal(pdfFileError({ name: "cv.pdf", size: 100, type: "application/pdf" }), null);
  assert.equal(hasPdfSignature(new TextEncoder().encode("%PDF-1.7")), true); assert.equal(hasPdfSignature(new TextEncoder().encode("<html>")), false);
});

test("public LinkedIn sections survive sign-in CTAs without importing posts or modals", () => {
  const profile = '<title>Candidate | LinkedIn</title><main><h1 class="top-card-layout__title">Candidate</h1><section class="pp-section summary"><h2>About</h2>Customer support professional who helps clients organize requests and resolve questions clearly.</section><section class="pp-section experience"><h2>Experience</h2>Assistant at Example. Responded to customer questions and maintained order records in spreadsheets.</section><div class="contextual-sign-in-modal">Sign in to view private data</div><article>Unrelated public activity posts</article></main>';
  const imported = extractSourceText(profile, "linkedin");
  assert.match(imported.text, /maintained order/); assert.doesNotMatch(imported.text, /private data|activity posts/);
});
test("Greenhouse-style headings are recognized as a real job description", () => {
  const text = "What You Will Do: Build reliable systems and collaborate with product teams. What You're About: Five years developing backend applications and shipping systems from architecture to deployment. Computer science background or equivalent practical experience.";
  assert.match(extractSourceText(`<title>Job Application for Engineer</title><main>${text}</main>`, "job").text, /backend applications/);
});
test("Truth Guard requires decisions and preserves rejects across resume and letter", () => {
  const report: ReviewedTruth = { claims: [{ claim: "Gerenciei uma equipe", source: "low_confidence_inference", canUseInResume: false, canUseInCoverLetter: false, explanation: "Incerto" }, { claim: "Conheço SAP", source: "forbidden_to_use", canUseInResume: false, canUseInCoverLetter: false, explanation: "Sem fonte" }], blockedClaims: ["Conheço SAP"], warnings: [], sourceHash: "source", decisions: {} };
  assert.throws(() => reviewTruth(report, {})); assert.throws(() => reviewTruth(report, { "0": true, "1": true }));
  const reviewed = reviewTruth(report, { "0": false }); const restored = JSON.parse(JSON.stringify(reviewed));
  assert.deepEqual(truthContext(restored), { approved: [], rejected: ["Conheço SAP", "Gerenciei uma equipe"] });
  const source = { parsedResumeText: "Original", comparisonJson: null, selectedLanguage: "pt-BR", questions: [{ id: "q", answer: "A" }] };
  assert.notEqual(truthSourceHash(source), truthSourceHash({ ...source, questions: [{ id: "q", answer: "B" }] }));
});
test("AI fallback validates schema before accepting provider output", async () => {
  const calls: string[] = [];
  function provider(name: string, value: unknown) { return { name, generateText: async () => "", generateJson: async <T>({ systemPrompt }: { systemPrompt: string }) => { calls.push(name); return (systemPrompt.startsWith("You are a strict language quality auditor.") ? { matchesSelectedLocale: true, containsMixedLanguage: false } : value) as T; } }; }
  const logger = mock.method(console, "warn", () => {});
  const ai = new AnalysisOrchestrator([provider("primary", { invalid: true }), provider("secondary", { score: 42 })]);
  assert.deepEqual(await ai.analyzeLocalized("system", "input", z.object({ score: z.number() }), "pt-BR"), { score: 42 }); assert.deepEqual(calls, ["primary", "primary", "secondary", "secondary"]); logger.mock.restore();
});
test("final fact verification rejects declined and unconfirmed generated content", async () => {
  const verify = mock.method(TruthGuard, "evaluate", async () => ({ claims: [{ claim: "Invented metric", source: "missing" as const, canUseInResume: false, canUseInCoverLetter: false, explanation: "No source" }], blockedClaims: [], warnings: [] }));
  await assert.rejects(() => verifyOutput("Original", "", "Eu gerenciei uma equipe de 20 pessoas", ["gerenciei uma equipe de 20 pessoas"]));
  assert.equal(verify.mock.callCount(), 0);
  await assert.rejects(() => verifyOutput("Original", "", "Invented metric", []));
  assert.equal(verify.mock.callCount(), 1); verify.mock.restore();
});
