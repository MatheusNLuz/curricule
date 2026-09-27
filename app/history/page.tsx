import Link from "next/link";
import { Add01Icon, ArrowRight01Icon, Briefcase01Icon, Clock01Icon, File02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { HugeIcon } from "@/components/ui/huge-icon";

export const dynamic = "force-dynamic";

const MODE_ICONS: Record<string, IconSvgElement> = {
  MAKE_ATS_FRIENDLY: File02Icon,
  COMPARE_AGAINST_JOB: Briefcase01Icon,
  OPTIMIZE_FOR_JOB: SparklesIcon,
};

const MODE_LABELS: Record<string, string> = {
  MAKE_ATS_FRIENDLY: "Perfil",
  COMPARE_AGAINST_JOB: "Comparação",
  OPTIMIZE_FOR_JOB: "Candidatura",
  LINKEDIN_OPTIMIZATION: "LinkedIn",
  COVER_LETTER_ONLY: "Carta",
};

function scoreFrom(value: string | null) {
  if (!value) return 0;
  try {
    const parsed = JSON.parse(value) as { overall?: number };
    return parsed.overall || 0;
  } catch {
    return 0;
  }
}

export default async function HistoryPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=%2Fhistory");

  const history = await prisma.analysis.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, mode: true, professionalTarget: true, selectedLanguage: true, createdAt: true, initialScores: true, finalScores: true },
  });

  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-10 sm:px-8 lg:px-12 lg:pt-14">
      <div className="flex flex-col justify-between gap-5 border-b border-border pb-7 sm:flex-row sm:items-end"><div><h1 className="font-heading text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Análises anteriores</h1><p className="mt-2 text-[13px] text-muted-foreground">Reveja resultados e acompanhe a evolução do seu perfil.</p></div><Link href="/analysis/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/15"><HugeIcon icon={Add01Icon} size={17} /> Nova análise</Link></div>

      {history.length === 0 ? (
        <div className="surface mt-8 rounded-2xl p-10 text-center sm:p-14"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-soft-primary text-primary"><HugeIcon icon={Clock01Icon} size={23} /></span><h2 className="mt-5 font-heading text-xl font-semibold tracking-[-0.03em]">Nenhuma análise por aqui ainda.</h2><p className="mx-auto mt-2 max-w-[38ch] text-[13px] leading-relaxed text-muted-foreground">Escolha uma opção para começar. Seus resultados vão aparecer aqui.</p><Link href="/analysis/new" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-[13px] font-semibold text-foreground hover:bg-soft-primary"><HugeIcon icon={Add01Icon} size={17} /> Nova análise</Link></div>
      ) : (
        <div className="mt-8 space-y-3">
          {history.map((item) => {
            const initialScore = scoreFrom(item.initialScores);
            const finalScore = scoreFrom(item.finalScores);
            const icon = MODE_ICONS[item.mode] || File02Icon;
            return <Link key={item.id} href={`/analysis/${item.id}`} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"><div className="surface surface-hover rounded-2xl p-4 sm:p-5"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-soft-primary text-primary"><HugeIcon icon={icon} size={20} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-[14px] font-semibold sm:text-[15px]">{item.professionalTarget || "Análise sem título"}</h2><span className="rounded-full bg-secondary px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{MODE_LABELS[item.mode] || item.mode.replace(/_/g, " ")}</span></div><p className="mt-1.5 text-[11px] text-muted-foreground">{new Date(item.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })} · {item.selectedLanguage === "pt-BR" ? "Português" : "Inglês"}</p></div><HugeIcon icon={ArrowRight01Icon} size={18} className="mt-1 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" /></div>{(initialScore > 0 || finalScore > 0) && <div className="mt-4 flex items-center gap-5 border-t border-border pt-3"><span className="text-[11px] text-muted-foreground">Pontuação</span>{initialScore > 0 && <span className="text-[12px] font-semibold text-foreground">Inicial <strong className="ml-1 font-mono">{initialScore}</strong></span>}{finalScore > 0 && <span className="text-[12px] font-semibold text-route">Depois <strong className="ml-1 font-mono">{finalScore}</strong></span>}</div>}</div></Link>;
          })}
        </div>
      )}
    </div>
  );
}
