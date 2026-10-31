import Link from "next/link";
import { WorkspacePage, PageHeading, Sheet, Status, EmptyState } from "@/components/workspace/workspace-ui";
import { CollectionPagination, CollectionView } from "@/components/workspace/collection-controls";
import { Plus, FileText, ArrowRight } from "@/components/ui/app-icon";
import { redirect } from "next/navigation";
import { readHistory } from "@/lib/analyses/history-reader";
import { getAnalysisDestination } from "@/lib/analysis-destination";
import { getSessionUser } from "@/lib/auth";
import { languageLabel, MODES } from "@/lib/analysis-contract";
import { historyQuery, HISTORY_PAGE_SIZE } from "@/lib/history-query";
import { CandidacyActions } from "@/components/analysis/candidacy-actions";
import { AnalysisActions } from "@/components/analysis/analysis-actions";

export const dynamic = "force-dynamic";
const LABELS: Record<string, string> = { MAKE_ATS_FRIENDLY: "ATS", COMPARE_AGAINST_JOB: "Comparação com vaga", OPTIMIZE_FOR_JOB: "Otimização completa", LINKEDIN_OPTIMIZATION: "LinkedIn", COVER_LETTER_ONLY: "Carta" };

function score(value: string | null) {
  try { return value ? JSON.parse(value).overall : null; } catch { return null; }
}

export default async function HistoryPage({ searchParams }: {
  searchParams: Promise<{ q?: string; mode?: string; cursor?: string; view?: string }>;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=%2Fhistory");
  const params = await searchParams;
  const query = historyQuery(params);
  const compact = params.view === "compact";
  const history = await readHistory(session.userId, query);
  const more = history.length > HISTORY_PAGE_SIZE;
  const page = history.slice(0, HISTORY_PAGE_SIZE);

  function href(cursor?: string, view = compact ? "compact" : "full") {
    const p = new URLSearchParams();
    if (query.q) p.set("q", query.q);
    if (query.mode) p.set("mode", query.mode);
    if (cursor) p.set("cursor", cursor);
    if (view === "compact") p.set("view", view);
    return "/history" + (p.size ? "?" + p : "");
  }
  const pagination = { firstHref: query.cursor ? href() : undefined, nextHref: more ? href(page.at(-1)!.id) : undefined };

  return <WorkspacePage>
    <PageHeading title="O caminho que você já percorreu." description="Retome análises e acompanhe as revisões da sua candidatura.">
      <Link href="/analysis/new" className="button primary"><Plus size={17} />Nova análise</Link>
    </PageHeading>
    {(page.length > 0 || query.q || query.mode || query.cursor) && <>
      <form className="filterBar" action="/history">
        {compact && <input type="hidden" name="view" value="compact" />}
        <label className="searchField"><FileText size={18} /><input name="q" aria-label="Buscar pelo nome" defaultValue={query.q} maxLength={120} placeholder="Buscar no histórico" /></label>
        <label className="field mb-0"><span>Tipo de análise</span><select name="mode" defaultValue={query.mode}><option value="">Todas as análises</option>{MODES.map(mode => <option key={mode} value={mode}>{LABELS[mode]}</option>)}</select></label>
        <button type="submit" className="button secondary">Buscar</button>
      </form>
      <CollectionView compact={compact} fullHref={href(query.cursor, "full")} compactHref={href(query.cursor, "compact")} />
    </>}
    <CollectionPagination {...pagination} label="Paginação do histórico, início da lista" />
    <div data-guide="analysis-history"><Sheet className={compact ? "historyCompact" : undefined}>
      {!page.length ? <EmptyState mascot mascotPose={query.q || query.mode ? "think" : "welcome"} title={query.q || query.mode ? "Nenhuma análise encontrada." : "Suas análises aparecerão aqui."} description={query.q || query.mode ? "Ajuste os filtros para encontrar outra análise." : "Comece com seu currículo e acompanhe cada versão neste espaço."} /> : <>
        <div className="tableHeading"><span>Análise</span><span>Status</span><span>Atualização</span><span /></div>
        {page.map(item => {
          const running = !!(item.taskStatus === "RUNNING" && item.taskLeaseUntil && item.taskLeaseUntil > new Date());
          const draft = !item.hasAnalysis && !item.hasLetter && !item.hasResume;
          const status = running ? "Processando" : item.taskStatus === "FAILED" ? "Tentar novamente" : item.hasResume || item.hasLetter ? "Resultado disponível" : draft ? "Rascunho" : "Análise disponível";
          const actions = <div className="historyActions">
            <AnalysisActions id={item.id} title={item.professionalTarget} />
            {(item.hasAnalysis || item.hasResume) && <CandidacyActions id={item.id} status={item.applicationStatus} jobUrl={item.jobUrl} parentId={item.parentAnalysisId} />}
          </div>;
          return <div key={item.id}>
            <Link className="historyRow" href={getAnalysisDestination({ ...item, running })}>
              <div className="recordIdentity"><span className="fileSymbol"><FileText size={20} /></span><span><strong>{item.professionalTarget || LABELS[item.mode]}</strong><small>{LABELS[item.mode]} · {languageLabel(item.selectedLanguage)}{item.initialScores ? " · Nota: " + score(item.initialScores) : ""}{item.finalScores ? " → " + score(item.finalScores) : ""}</small></span></div>
              <Status tone={running || item.taskStatus === "FAILED" ? "amber" : draft ? "neutral" : "green"}>{status}</Status>
              <time className="date" dateTime={item.updatedAt.toISOString()}>{item.updatedAt.toLocaleDateString("pt-BR")}</time><ArrowRight size={17} />
            </Link>
            {compact ? <details className="collectionDetails"><summary>Ações desta análise<span className="sr-only">: {item.professionalTarget || LABELS[item.mode]}</span></summary>{actions}</details> : actions}
          </div>;
        })}
      </>}
    </Sheet></div>
    <CollectionPagination {...pagination} label="Paginação do histórico, fim da lista" />
  </WorkspacePage>;
}
