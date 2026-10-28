import Link from "next/link";
import { WorkspacePage, PageHeading, ResumeDocument, Status, Sheet, EmptyState } from "@/components/workspace/workspace-ui";
import { languageLabel } from "@/lib/analysis-contract";
import { redirect } from "next/navigation";
import { Add01Icon, ArrowRight01Icon, File02Icon } from "@hugeicons/core-free-icons";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { formatResumeLibraryItem, RESUME_ANALYSIS_MODES } from "@/lib/resume-library";
import { HugeIcon } from "@/components/ui/huge-icon";
import { DownloadResumeButton } from "@/components/resumes/download-resume-button";
import { historyQuery, HISTORY_PAGE_SIZE } from "@/lib/history-query";

export const dynamic = "force-dynamic";

export default async function ResumesPage({ searchParams }: { searchParams: Promise<{ q?: string; cursor?: string }> }) {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=%2Fresumes");

  const query = historyQuery(await searchParams);
  const results = await prisma.analysis.findMany({
    where: {
      userId: session.userId,
      mode: { in: [...RESUME_ANALYSIS_MODES] },
      finalResumeJson: { not: null },
      ...(query.q ? { professionalTarget: { contains: query.q, mode: "insensitive" as const } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: HISTORY_PAGE_SIZE + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    select: { id: true, professionalTarget: true, mode: true, createdAt: true, jobDescription: true, finalResumeJson: true, selectedLanguage: true },
  });
  const resumes = results.slice(0, HISTORY_PAGE_SIZE);
  const next = new URLSearchParams({ q: query.q, cursor: resumes.at(-1)?.id || "" });

  return <WorkspacePage><PageHeading title="Cada versão, um próximo passo." description="Seus currículos organizados para retomar, revisar e usar."><Link href="/analysis/new" className="button primary"><HugeIcon icon={Add01Icon} size={17}/>Criar uma versão</Link></PageHeading>
<form action="/resumes" className="filterBar"><label className="searchField"><HugeIcon icon={File02Icon} size={18}/><input name="q" aria-label="Buscar currículo" maxLength={120} defaultValue={query.q} placeholder="Buscar meus currículos"/></label><button type="submit" className="button secondary">Buscar</button></form>
{!resumes.length?<Sheet><EmptyState title="Seus currículos aparecerão aqui." description="Conclua uma revisão para abrir seu currículo no editor e baixar o PDF."/></Sheet>:<div className="resumeGrid">{resumes.map(resume=>{const item=formatResumeLibraryItem(resume);return <article key={resume.id} className="resumeTile"><Link href={"/analysis/"+resume.id+"/preview"} className="resumeThumbnail" aria-label={"Ver currículo: "+item.title}><ResumeDocument value={resume.finalResumeJson} language={resume.selectedLanguage} compact/></Link><div className="resumeTileInfo"><Status tone="green">Revisado</Status><h2>{item.title}</h2><p>{languageLabel(resume.selectedLanguage)} · {resume.createdAt.toLocaleDateString("pt-BR")}</p>{item.jobExcerpt&&<p>{item.jobExcerpt}</p>}<div><Link href={"/analysis/"+resume.id+"/editor"} className="textLink">Abrir no editor <HugeIcon icon={ArrowRight01Icon} size={16}/></Link><DownloadResumeButton analysisId={resume.id} title={item.title}/></div></div></article>})}</div>}
<nav className="pagination" aria-label="Paginação da biblioteca">{query.cursor?<Link href={"/resumes?q="+encodeURIComponent(query.q)}>Primeira página</Link>:<span/>}{results.length>HISTORY_PAGE_SIZE&&<Link href={"/resumes?"+next}>Próxima página</Link>}</nav></WorkspacePage>;
}
