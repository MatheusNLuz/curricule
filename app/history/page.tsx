import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { languageLabel, MODES } from "@/lib/analysis-contract";
import { historyQuery, HISTORY_PAGE_SIZE } from "@/lib/history-query";
import { AnalysisActions } from "@/components/analysis/analysis-actions";
export const dynamic = "force-dynamic";
const LABELS: Record<string, string> = { MAKE_ATS_FRIENDLY: "ATS", COMPARE_AGAINST_JOB: "Comparação com vaga", OPTIMIZE_FOR_JOB: "Otimização completa", LINKEDIN_OPTIMIZATION: "LinkedIn", COVER_LETTER_ONLY: "Carta" };
export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ q?: string; mode?: string; cursor?: string }> }) {
  const session = await getSessionUser(); if (!session) redirect("/login?next=%2Fhistory");
  const query = historyQuery(await searchParams);
  const history = await prisma.analysis.findMany({
    where: { userId: session.userId, ...(query.q ? { professionalTarget: { contains: query.q, mode: "insensitive" as const } } : {}), ...(MODES.includes(query.mode as typeof MODES[number]) ? { mode: query.mode } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: HISTORY_PAGE_SIZE + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    select: { id: true, mode: true, professionalTarget: true, selectedLanguage: true, createdAt: true, updatedAt: true, initialScores: true, finalScores: true, finalResumeJson: true, analysisJson: true, coverLetter: true, tasks: { select: { status: true, leaseUntil: true }, orderBy: { updatedAt: "desc" }, take: 1 } },
  });
  const more = history.length > HISTORY_PAGE_SIZE; const page = history.slice(0, HISTORY_PAGE_SIZE);
  function nextUrl(cursor?: string) { const p = new URLSearchParams(); if (query.q) p.set("q", query.q); if (query.mode) p.set("mode", query.mode); if (cursor) p.set("cursor", cursor); return "/history?" + p; }
  function score(value: string | null) { try { return value ? JSON.parse(value).overall : null; } catch { return null; } }
  return <div className="mx-auto flex max-w-5xl flex-col gap-7 px-5 pb-24 pt-10 sm:px-8"><header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="font-heading text-3xl font-semibold">Suas análises</h1><p className="mt-2 text-sm text-muted-foreground">Retome rascunhos, encontre candidaturas e gerencie seus dados.</p></div><Link className="rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground" href="/analysis/new">Nova análise</Link></header>
    <form className="surface flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-end" action="/history"><label className="flex flex-1 flex-col gap-2 text-sm">Buscar pelo nome<input name="q" defaultValue={query.q} maxLength={120} className="h-11 rounded-lg border border-border bg-background px-3" placeholder="Vaga, empresa ou título…" /></label><label className="flex flex-col gap-2 text-sm">Tipo de análise<select name="mode" defaultValue={query.mode} className="h-11 rounded-lg border border-border bg-background px-3"><option value="">Todos</option>{MODES.map(mode => <option key={mode} value={mode}>{LABELS[mode]}</option>)}</select></label><button className="h-11 rounded-lg border border-border px-5 text-sm font-semibold" type="submit">Buscar</button></form>
    {!page.length && <p className="surface rounded-xl p-8 text-sm text-muted-foreground">Nenhuma análise encontrada. Ajuste a busca ou inicie uma nova.</p>}
    <ul className="flex flex-col gap-4">{page.map(item => {
      const task = item.tasks[0]; const running = task?.status === "RUNNING" && task.leaseUntil > new Date();
      const draft = !item.analysisJson && !item.coverLetter;
      const status = running ? "Processando" : task?.status === "FAILED" ? "Etapa falhou — abra para tentar novamente" : item.finalResumeJson || item.coverLetter ? "Resultado disponível" : draft ? "Rascunho" : "Análise disponível";
      return <li key={item.id} className="surface rounded-xl p-5"><Link href={draft && !running ? "/analysis/new?mode=" + item.mode + "&draft=" + item.id : "/analysis/" + item.id} className="block rounded-lg focus-visible:outline-2 focus-visible:outline-primary"><div className="flex flex-wrap items-start justify-between gap-3"><h2 className="text-lg font-semibold">{item.professionalTarget || LABELS[item.mode] + " · " + new Date(item.createdAt).toLocaleDateString("pt-BR")}</h2><span className="text-xs font-medium text-primary">{status}</span></div><p className="mt-2 text-xs leading-6 text-muted-foreground">{LABELS[item.mode]} · {languageLabel(item.selectedLanguage)} · Atualizada em {new Date(item.updatedAt).toLocaleString("pt-BR")}</p>{item.initialScores && <p className="mt-3 text-sm">Nota estimada inicial: {score(item.initialScores)} {item.finalScores && <span> · Reavaliada: {score(item.finalScores)}</span>}</p>}</Link><AnalysisActions id={item.id} title={item.professionalTarget} /></li>;
    })}</ul><nav aria-label="Paginação do histórico" className="flex justify-between text-sm">{query.cursor ? <Link href={nextUrl()}>Voltar à primeira página</Link> : <span />}{more && <Link href={nextUrl(page[page.length - 1].id)}>Próxima página</Link>}</nav><p className="text-xs leading-6 text-muted-foreground">As notas são estimativas de conteúdo da IA. Você pode excluir uma análise e seus registros associados. Até 20 revisões do currículo ficam disponíveis por análise, enquanto você a mantiver na conta.</p>
  </div>;
}
