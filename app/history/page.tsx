import Link from "next/link";
import { WorkspacePage, PageHeading, Sheet, Status, EmptyState } from "@/components/workspace/workspace-ui";
import { Plus, FileText, ArrowRight } from "@/components/ui/app-icon";
import { redirect } from "next/navigation";
import { readHistory } from "@/lib/analyses/history-reader";
import { getSessionUser } from "@/lib/auth";
import { languageLabel, MODES } from "@/lib/analysis-contract";
import { historyQuery, HISTORY_PAGE_SIZE } from "@/lib/history-query";
import { CandidacyActions } from "@/components/analysis/candidacy-actions";
import { AnalysisActions } from "@/components/analysis/analysis-actions";
export const dynamic = "force-dynamic";
const LABELS: Record<string, string> = { MAKE_ATS_FRIENDLY: "ATS", COMPARE_AGAINST_JOB: "Comparação com vaga", OPTIMIZE_FOR_JOB: "Otimização completa", LINKEDIN_OPTIMIZATION: "LinkedIn", COVER_LETTER_ONLY: "Carta" };
export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ q?: string; mode?: string; cursor?: string }> }) {
  const session = await getSessionUser(); if (!session) redirect("/login?next=%2Fhistory");
  const query = historyQuery(await searchParams);
  const history = await readHistory(session.userId,query);
  const more = history.length > HISTORY_PAGE_SIZE; const page = history.slice(0, HISTORY_PAGE_SIZE);
  function nextUrl(cursor?: string) { const p = new URLSearchParams(); if (query.q) p.set("q", query.q); if (query.mode) p.set("mode", query.mode); if (cursor) p.set("cursor", cursor); return "/history?" + p; }
  function score(value: string | null) { try { return value ? JSON.parse(value).overall : null; } catch { return null; } }
  return <WorkspacePage><PageHeading title="O caminho que você já percorreu." description="Retome análises e acompanhe as revisões da sua candidatura."><Link href="/analysis/new" className="button primary"><Plus size={17}/>Nova análise</Link></PageHeading>
<form className="filterBar" action="/history"><label className="searchField"><FileText size={18}/><input name="q" aria-label="Buscar pelo nome" defaultValue={query.q} maxLength={120} placeholder="Buscar no histórico"/></label><label className="field mb-0"><span>Tipo de análise</span><select name="mode" defaultValue={query.mode}><option value="">Todas as análises</option>{MODES.map(mode=><option key={mode} value={mode}>{LABELS[mode]}</option>)}</select></label><button type="submit" className="button secondary">Buscar</button></form>
<Sheet>{!page.length?<EmptyState title="Nenhuma análise encontrada." description="Ajuste sua busca ou comece uma nova candidatura."/>:<><div className="tableHeading"><span>Análise</span><span>Status</span><span>Atualização</span><span/></div>{page.map(item=>{
const task=item.taskStatus?{status:item.taskStatus,leaseUntil:item.taskLeaseUntil}:null,running=task?.status==="RUNNING"&&task.leaseUntil&&task.leaseUntil>new Date(),draft=!item.hasAnalysis&&!item.hasLetter;
const status=running?"Processando":task?.status==="FAILED"?"Tentar novamente":item.hasResume||item.hasLetter?"Resultado disponível":draft?"Rascunho":"Análise disponível";
return <div key={item.id}><Link className="historyRow" href={draft&&!running?"/analysis/new?mode="+item.mode+"&draft="+item.id:"/analysis/"+item.id}><div className="recordIdentity"><span className="fileSymbol"><FileText size={20}/></span><span><strong>{item.professionalTarget||LABELS[item.mode]}</strong><small>{LABELS[item.mode]} · {languageLabel(item.selectedLanguage)}{item.initialScores?" · Nota: "+score(item.initialScores):""}{item.finalScores?" → "+score(item.finalScores):""}</small></span></div><Status tone={running||task?.status==="FAILED"?"amber":draft?"neutral":"green"}>{status}</Status><time className="date" dateTime={item.updatedAt.toISOString()}>{item.updatedAt.toLocaleDateString("pt-BR")}</time><ArrowRight size={17}/></Link><div className="historyActions"><AnalysisActions id={item.id} title={item.professionalTarget}/>{(!!item.hasAnalysis||!!item.hasResume)&&<CandidacyActions id={item.id} status={item.applicationStatus} jobUrl={item.jobUrl} parentId={item.parentAnalysisId}/>}</div></div>;
})}</>}</Sheet><nav className="pagination" aria-label="Paginação">{query.cursor?<Link href={nextUrl()}>Primeira página</Link>:<span/>}{more&&<Link href={nextUrl(page.at(-1)!.id)}>Próxima página</Link>}</nav></WorkspacePage>;
}
