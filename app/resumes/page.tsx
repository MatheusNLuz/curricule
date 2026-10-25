import Link from "next/link";
import { redirect } from "next/navigation";
import { Add01Icon, ArrowRight01Icon, Briefcase01Icon, File02Icon } from "@hugeicons/core-free-icons";
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
    select: { id: true, professionalTarget: true, mode: true, createdAt: true, jobDescription: true },
  });
  const resumes = results.slice(0, HISTORY_PAGE_SIZE);
  const next = new URLSearchParams({ q: query.q, cursor: resumes.at(-1)?.id || "" });

  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-10 sm:px-8 lg:px-12 lg:pt-14">
      <div className="flex flex-col justify-between gap-5 border-b border-border pb-7 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Currículos otimizados</h1>
          <p className="mt-2 max-w-[58ch] text-[13px] leading-relaxed text-muted-foreground">Veja seus currículos finais e baixe uma cópia em PDF quando precisar.</p>
        </div>
        <Link href="/analysis/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
          <HugeIcon icon={Add01Icon} size={17} /> Nova análise
        </Link>
      </div>

      <form action="/resumes" className="mt-6 flex flex-wrap gap-3"><label className="flex flex-1 flex-col gap-2 text-sm">Buscar currículo<input name="q" maxLength={120} defaultValue={query.q} className="h-11 rounded-lg border border-border bg-background px-3" placeholder="Nome da candidatura…" /></label><button type="submit" className="self-end rounded-lg border border-border px-4 py-3 text-sm">Buscar</button></form>
      {resumes.length === 0 ? (
        <div className="surface mt-8 rounded-2xl p-10 text-center sm:p-14">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-soft-primary text-primary"><HugeIcon icon={File02Icon} size={23} /></span>
          <h2 className="mt-5 font-heading text-xl font-semibold tracking-[-0.03em]">Seus currículos otimizados aparecerão aqui.</h2>
          <p className="mx-auto mt-2 max-w-[42ch] text-[13px] leading-relaxed text-muted-foreground">Conclua uma otimização para abrir a prévia e baixar o resultado em PDF.</p>
          <Link href="/analysis/new" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-[13px] font-semibold text-foreground transition-colors hover:bg-soft-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
            <HugeIcon icon={Add01Icon} size={17} /> Escolher uma análise
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3 lg:grid-cols-2">
          {resumes.map((resume) => {
            const item = formatResumeLibraryItem(resume);
            return (
              <li key={resume.id} className="surface flex min-w-0 flex-col justify-between gap-5 rounded-2xl p-4 sm:p-5">
                <div className="flex min-w-0 items-start gap-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-soft-primary text-primary"><HugeIcon icon={File02Icon} size={19} /></span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[14px] font-semibold">{item.title}</h2>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      <span>{item.modeLabel}</span><span aria-hidden="true">·</span>
                      <time dateTime={resume.createdAt.toISOString()}>{new Date(resume.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</time>
                    </p>
                    {item.jobExcerpt && (
                      <p className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground">
                        <HugeIcon icon={Briefcase01Icon} size={15} className="mt-0.5 shrink-0 text-primary" />
                        <span><span className="font-medium text-foreground">Vaga:</span> {item.jobExcerpt}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <Link href={`/analysis/${resume.id}/preview`} className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold text-primary transition-colors hover:bg-soft-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                    Ver currículo <HugeIcon icon={ArrowRight01Icon} size={15} />
                  </Link>
                  <DownloadResumeButton analysisId={resume.id} title={item.title} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <nav aria-label="Paginação da biblioteca" className="mt-6 flex justify-between text-sm">{query.cursor ? <Link href={"/resumes?q=" + encodeURIComponent(query.q)}>Primeira página</Link> : <span />}{results.length > HISTORY_PAGE_SIZE && <Link href={"/resumes?" + next}>Próxima página</Link>}</nav>
    </div>
  );
}
