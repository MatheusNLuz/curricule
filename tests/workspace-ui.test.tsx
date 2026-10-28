import test, { mock } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { ResumeAnalysisSchema, LinkedInAnalysisSchema } from "../lib/schemas/analysis.schema";

let signedIn = true;
let pathname = "/dashboard";
let mode = "OPTIMIZE_FOR_JOB";
const account = { userId: "owner", email: "ana@example.test", name: "Ana Exemplo", role: "ADMIN" };
const resume = { personalInfo: { name: "Ana Exemplo", email: "ana@example.test", phone: "", location: "São Paulo", linkedin: "", portfolio: "" }, professionalSummary: "Experiência em atendimento ao cliente e organização de pedidos.", experiences: [{ company: "Empresa de Exemplo", title: "Assistente de atendimento", startDate: "2023", endDate: "Atual", location: "São Paulo", description: ["Atendimento a clientes por e-mail.", "Organização de pedidos em planilhas Excel."] }], education: [{ institution: "Instituição de Exemplo", degree: "Gestão Comercial", startDate: "2021", endDate: "2023" }], skills: [{ category: "Competências", items: ["Excel", "Atendimento"] }], certifications: [] };
const assessment = ResumeAnalysisSchema.parse({ detectedLanguage: "pt-BR", recommendedLanguage: "pt-BR", scores: { overall: 55, clarity: 60, structure: 62, keywords: 48, impact: 40 }, strengths: ["Experiência em atendimento descrita no currículo."], weaknesses: ["Algumas atividades precisam de mais contexto."], atsIssues: [{ type: "Clareza da experiência", severity: "medium", description: "Uma atividade está descrita de forma genérica.", recommendation: "Explique o que você fazia com informações que consegue confirmar." }] });
const record = { id: "example", professionalTarget: "Atendimento ao cliente", mode: "OPTIMIZE_FOR_JOB", parsedResumeText: "Experiência em atendimento e organização de pedidos em Excel.", selectedLanguage: "pt-BR", selectedTemplate: "basic-ats", analysisJson: JSON.stringify(assessment), initialScores: JSON.stringify(assessment.scores), finalScores: null, finalResumeJson: JSON.stringify(resume), editorDraftJson: null, jobDescription: "Atendimento e organização de pedidos.", comparisonJson: JSON.stringify({ matchPercentage: 68, missingMandatorySkills: ["Atendimento por chat"], missingNiceToHaveSkills: [], experienceGaps: [], culturalMatchNotes: "Confira as atividades descritas para a vaga.", recommendationsToMatch: ["Confirme se trabalhou com atendimento por chat."] }), coverLetter: null, createdAt: new Date("2026-10-24T12:00:00Z"), updatedAt: new Date("2026-10-25T12:00:00Z"), tasks: [], revision: 1 };
const user = { id: "owner", name: "Ana Exemplo", email: "ana@example.test", role: "ADMIN", status: "ACTIVE", createdAt: record.createdAt, _count: { analyses: 3, usage: 5 }, entitlements: [] };
const ownerReads: string[] = [];
const db = {
  $queryRaw:async(query:{values:unknown[]})=>{assert.ok(query.values.includes(account.userId));ownerReads.push(account.userId);return [{...record,hasAnalysis:!!record.analysisJson,hasResume:!!record.finalResumeJson,hasLetter:!!record.coverLetter,taskStatus:null,taskLeaseUntil:null}];},
  analysis: {
    findMany: async ({ where }: { where: { userId: string } }) => { assert.equal(where.userId, account.userId); ownerReads.push(where.userId); return [record]; },
    count: async () => 3,
    findFirst: async ({where}: {where:{userId:string}}) => {assert.equal(where.userId,account.userId);return record;},
  },
  user: { count: async () => 1, findMany: async () => [user], findUnique: async () => user },
  analysisTask: { count: async () => 0, findMany: async () => [] }, analysisUsage: { count: async () => 5,findMany:async()=>[] },
  billingEntitlement: { count: async () => 0, findMany: async () => [] }, billingWebhook: { findFirst: async () => null }, billingCustomer: { findFirst: async () => null }, adminAudit: { findMany: async () => [] },
};
mock.module(new URL("../lib/db.ts", import.meta.url).href, { namedExports: { prisma: db } });
mock.module(new URL("../lib/auth.ts", import.meta.url).href, { namedExports: { getSessionUser: async () => signedIn ? account : null } });
mock.module(new URL("../lib/admin.ts", import.meta.url).href, { namedExports: { requireAdmin: async () => account } });
mock.module("next/navigation.js", { namedExports: { usePathname: () => pathname, useRouter: () => ({ push() {}, replace() {}, refresh() {} }), useSearchParams: () => new URLSearchParams({ mode }), redirect: () => { throw new Error("LOGIN_REQUIRED"); }, notFound: () => { throw new Error("NOT_FOUND"); } } });
mock.module(new URL("../components/ui/custom-toast.tsx", import.meta.url).href, { namedExports: { useToast: () => ({ toast() {} }) } });
const { WorkspacePage } = await import("../components/workspace/workspace-ui");
const { AppShellNav } = await import("../components/app-shell/app-shell-nav");
const { ThemeProvider } = await import("../components/theme-provider");
const { ResumeAnalysisView } = await import("../components/analysis/resume-analysis-view");
const { ReviewQuestions } = await import("../components/analysis/review-questions");
const { ResumeEditingWorkspace } = await import("../components/editor/resume-editing-workspace");
const { LinkedInDashboard } = await import("../components/analysis/linkedin-dashboard");
const { default: dashboard } = await import("../app/dashboard/page");
const { default: history } = await import("../app/history/page");
const { default: library } = await import("../app/resumes/page");
const { default: NewAnalysis } = await import("../app/analysis/new/page");

const noop = () => {};
const props = { analysisId: "example", record: { ...record, updatedAt: record.updatedAt.toISOString() }, analysis: assessment, scores: assessment.scores, finalScores: null, onExport: noop, exporting: false, onGenerateLetter: noop, generatingLetter: false, onDownloadLetter: noop };

test("workspace requires a session before loading any user data", async () => {
  signedIn = false;
  const before = ownerReads.length;
  await assert.rejects(dashboard(), /LOGIN_REQUIRED/);
  assert.equal(ownerReads.length, before);
  signedIn = true;
});
test("dashboard, history and library scope every collection to the signed-in owner", async () => {
  const elements = [await dashboard(), await history({ searchParams: Promise.resolve({}) }), await library({ searchParams: Promise.resolve({}) })];
  for (const element of elements) {
    const html = renderToStaticMarkup(element);
    assert.match(html, /Atendimento ao cliente/);
    assert.doesNotMatch(html, /Ana Martins|Empresa Exemplo/);
  }
  assert.match(renderToStaticMarkup(elements[2]), /Pontuação da versão atual indisponível/);
  assert.equal(ownerReads.length, 3);
});
test("breadcrumb identifies the current workspace page without repeating its root", () => {
  pathname = "/dashboard";
  const dashboardNav = renderToStaticMarkup(<ThemeProvider><AppShellNav session={account} /></ThemeProvider>);
  assert.match(dashboardNav, /aria-label="Caminho da página"/);
  assert.match(dashboardNav, />Curricule<.*aria-current="page">Dashboard/);
  pathname = "/analysis/new";
  const analysisNav = renderToStaticMarkup(<ThemeProvider><AppShellNav session={account} /></ThemeProvider>);
  assert.match(analysisNav, /aria-current="page">Nova análise/);
});
test("score panel shows actual decreases and missing values without fixed predictions", () => {
  const lower = renderToStaticMarkup(<ResumeAnalysisView {...props} finalScores={{ ...assessment.scores, overall: 48 }} />);
  assert.match(lower, /Nota geral inicial: 55/);
  assert.match(lower, /Nota da versão reavaliada: 48/);
  assert.doesNotMatch(lower, /Previsão|Projeção|subiu de|85 %|90 %/);
  const initial = renderToStaticMarkup(<ResumeAnalysisView {...props} record={{...props.record,finalResumeJson:null}} />);
  assert.match(initial, /Detalhes da pontuação/);
  assert.match(initial, /Clareza/);
  assert.doesNotMatch(initial, /Ver detalhes da pontuação/);
  const zero = renderToStaticMarkup(<ResumeAnalysisView {...props} record={{...props.record,finalResumeJson:null}} scores={{ overall: 0 }} />);
  assert.match(zero, /class="resultScoreValue">0<span>\/100/);
  const missing = renderToStaticMarkup(<ResumeAnalysisView {...props} scores={null} />);
  assert.match(missing, /Nota atual indisponível/);
  const edited=renderToStaticMarkup(<ResumeAnalysisView {...props}/>);
  assert.match(edited,/Edição salva; nota ainda não atualizada/);
  assert.match(edited,/Nota atual indisponível/);
  assert.match(edited,/Reavalie a versão salva para atualizar a nota/);
  assert.match(edited,/Avaliação inicial: <strong>55\/100/);
  assert.match(edited,/Baixar PDF/);assert.match(edited,/Baixar DOCX/);
  assert.match(edited,/1 ponto identificado/);
  assert.match(edited,/Atendimento por chat/);
  assert.doesNotMatch(edited,/Requisitos da vaga não comprovam sua experiência/);
  assert.match(edited,/Compatibilidade com a vaga/);
  assert.match(edited,/Pontos fortes e melhorias/);
});

test("reassessed recommendations and evidence belong to the same version as the final score",()=>{
  const original={...assessment,strengths:["Diagnóstico antigo exclusivo"]};
  const latest={...assessment,strengths:["Diagnóstico atual exclusivo"],weaknesses:[],atsIssues:[],scores:{...assessment.scores,overall:48}};
  const html=renderToStaticMarkup(<ResumeAnalysisView {...props} analysis={original} record={{...props.record,finalAssessmentJson:JSON.stringify(latest)}} finalScores={latest.scores}/>);
  assert.match(html,/Diagnóstico atual exclusivo/);assert.doesNotMatch(html,/Diagnóstico antigo exclusivo/);
  const legacy=renderToStaticMarkup(<ResumeAnalysisView {...props} analysis={original} finalScores={latest.scores}/>);
  assert.doesNotMatch(legacy,/Diagnóstico antigo exclusivo/);assert.match(legacy,/detalhes desta avaliação não estão disponíveis/);
});
test("production theme retains every supported locale and no demo-only integration controls", () => {
  mode = "LINKEDIN_OPTIMIZATION";
  const html = renderToStaticMarkup(<NewAnalysis />);
  for (const locale of ["pt-BR", "pt-PT", "en-US", "en-GB"]) assert.ok(html.includes(locale));
  assert.doesNotMatch(html, /Simular leitura|Prévia para aprovação/);
});

test("render production components with synthetic records for isolated browser layout checks", async context => {
  const output = "scratch/applied-workspace";
  mkdirSync(output, { recursive: true });
  const chunkDir = ".next/dev/static/chunks";
  if (!existsSync(chunkDir)) { context.skip("Visual fixture generation requires a local Next.js dev build."); return; }
  const compiledGlobal = readdirSync(chunkDir).find(file => /^app_globals_css_.*single\.css$/.test(file));
  const css = (compiledGlobal ? readFileSync(`${chunkDir}/${compiledGlobal}`, "utf8") : "") + "\n" + readFileSync("app/workspace.css", "utf8");
  writeFileSync(`${output}/app.css`, css);
  const admin = await import("../app/admin/page");
  const users = await import("../app/admin/users/page");
  const detail = await import("../app/admin/users/[id]/page");
  const audit = await import("../app/admin/audit/page");
  const billing = await import("../app/settings/billing/page");
  const linkedin = LinkedInAnalysisSchema.parse({ recommendedLanguage: "pt-BR", headlineSuggestions: ["Atendimento ao cliente | Organização de pedidos | Excel"], summarySuggestion: resume.professionalSummary, seoKeywords: ["Atendimento", "Excel"], experienceTips: [{ role: "Assistente de atendimento", company: "Empresa de Exemplo", tips: ["Acrescente contexto com fatos reais."], optimizedBullets: resume.experiences[0].description }], scores: { overall: 72, headline: 76, summary: 68, experiences: 70, seo: 74 } });
  mode = "OPTIMIZE_FOR_JOB";
  // Tuple values are individual render roots, not JSX siblings in a rendered list.
  /* eslint-disable react/jsx-key */
  const pages: [string, string, React.ReactNode][] = [
    ["dashboard", "/dashboard", await dashboard()], ["nova", "/analysis/new", <NewAnalysis />], ["nova-linkedin", "/analysis/new", <NewAnalysis />],
    ["resultado", "/analysis/example", <ResumeAnalysisView {...props} />],
    ["resultado-inicial", "/analysis/example", <ResumeAnalysisView {...props} record={{...props.record,finalResumeJson:null}} />],
    ["perguntas", "/analysis/example/editor", <WorkspacePage><ReviewQuestions questions={[{ id: "q1", question: "Além do e-mail, você também atendia por chat?", reason: "Esse requisito não foi identificado no seu currículo.", answerType: "text" }]} answers={{}} generating={false} validating={false} truth={null} onAnswer={noop} onValidate={noop} onApprove={async () => {}} onEditAnswers={noop} onRetry={noop} /></WorkspacePage>],
    ["editor", "/analysis/example/editor", <WorkspacePage><ResumeEditingWorkspace language="pt-BR" initialData={resume} onSave={async () => {}} onDraftSave={async () => {}} /></WorkspacePage>],
    ["linkedin", "/analysis/example", <LinkedInDashboard analysis={linkedin} scores={linkedin.scores} analysisId="example" />],
    ["historico", "/history", await history({ searchParams: Promise.resolve({}) })],
    ["curriculos", "/resumes", await library({ searchParams: Promise.resolve({}) })],
    ["admin", "/admin", <WorkspacePage>{await admin.default()}</WorkspacePage>],
    ["usuarios", "/admin/users", <WorkspacePage>{await users.default({ searchParams: Promise.resolve({}) })}</WorkspacePage>],
    ["usuario", "/admin/users/owner", <WorkspacePage>{await detail.default({ params: Promise.resolve({ id: "owner" }) })}</WorkspacePage>],
    ["auditoria", "/admin/audit", <WorkspacePage>{await audit.default()}</WorkspacePage>],
    ["acesso", "/settings/billing", await billing.default()],
  ];
  const originalRecord = { ...record };
  Object.assign(record, { finalResumeJson: null, analysisJson: null, professionalTarget: "Minha candidatura" });
  pages.push(["dashboard-rascunho", "/dashboard", await dashboard()]);
  Object.assign(record, originalRecord);
  /* eslint-enable react/jsx-key */
  for (const [name, path, element] of pages) {
    pathname = path;
    mode = name === "nova-linkedin" ? "LINKEDIN_OPTIMIZATION" : "OPTIMIZE_FOR_JOB";
    const html = renderToStaticMarkup(<ThemeProvider><AppShellNav session={account} /><main className="workspaceMain">{element}</main></ThemeProvider>);
    for (const theme of ["light", "dark"]) writeFileSync(`${output}/${name}-${theme}.html`, `<!doctype html><html lang="pt-BR" class="${theme === "dark" ? "dark" : ""}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="/app.css" rel="stylesheet"><title>Componentes aplicados · ${name} · dados fictícios</title></head><body class="bg-background text-foreground font-sans">${html}</body></html>`);
  }
});
