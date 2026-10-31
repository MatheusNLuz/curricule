import Link from "next/link";
import { WorkspacePage, PageHeading, Sheet, EmptyState } from "@/components/workspace/workspace-ui";
import { redirect } from "next/navigation";
import { Add01Icon, File02Icon } from "@hugeicons/core-free-icons";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { RESUME_ANALYSIS_MODES } from "@/lib/resume-library";
import { HugeIcon } from "@/components/ui/huge-icon";
import { ResumeLibraryCard } from "@/components/resumes/resume-library-card";
import { historyQuery, HISTORY_PAGE_SIZE } from "@/lib/history-query";
import { CollectionPagination, CollectionView } from "@/components/workspace/collection-controls";

export const dynamic = "force-dynamic";

export default async function ResumesPage({ searchParams }: { searchParams: Promise<{ q?: string; cursor?: string; view?: string }> }) {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=%2Fresumes");

  const params = await searchParams;
  const query = historyQuery(params);
  const compact = params.view === "compact";
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
    select: { id: true, professionalTarget: true, mode: true, createdAt: true, jobDescription: true, finalResumeJson: true, initialScores: true, finalScores: true, selectedLanguage: true },
  });
  const resumes = results.slice(0, HISTORY_PAGE_SIZE);
  function href(cursor?: string, view = compact ? "compact" : "full") {
    const p = new URLSearchParams();
    if (query.q) p.set("q", query.q);
    if (cursor) p.set("cursor", cursor);
    if (view === "compact") p.set("view", view);
    return "/resumes" + (p.size ? "?" + p : "");
  }
  const pagination = { firstHref: query.cursor ? href() : undefined, nextHref: results.length > HISTORY_PAGE_SIZE ? href(resumes.at(-1)!.id) : undefined };

  return <WorkspacePage><PageHeading title="Cada versão, um próximo passo." description="Seus currículos organizados para retomar, revisar e usar."><Link href="/analysis/new" className="button primary"><HugeIcon icon={Add01Icon} size={17}/>Criar uma versão</Link></PageHeading>
{(resumes.length > 0 || query.q || query.cursor) && <><form action="/resumes" className="filterBar">{compact && <input type="hidden" name="view" value="compact" />}<label className="searchField"><HugeIcon icon={File02Icon} size={18}/><input name="q" aria-label="Buscar currículo" maxLength={120} defaultValue={query.q} placeholder="Buscar meus currículos"/></label><button type="submit" className="button secondary">Buscar</button></form><CollectionView compact={compact} fullHref={href(query.cursor, "full")} compactHref={href(query.cursor, "compact")} /></>}
<CollectionPagination {...pagination} label="Paginação da biblioteca, início da lista" />
{!resumes.length?<Sheet><EmptyState title="Seus currículos aparecerão aqui." description="Conclua uma revisão para abrir seu currículo no editor e baixar o PDF."/></Sheet>:<div className={compact ? "resumeGrid resumeGridCompact" : "resumeGrid"}>{resumes.map(resume=><ResumeLibraryCard key={resume.id} resume={resume} compact={compact}/>)}</div>}
<CollectionPagination {...pagination} label="Paginação da biblioteca, fim da lista" /></WorkspacePage>;
}
