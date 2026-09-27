import { Add01Icon, Briefcase01Icon, FileUploadIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { AnalysisModeGrid } from "@/components/home/analysis-mode-grid";
import { HugeIcon } from "@/components/ui/huge-icon";
import { Reveal } from "@/components/ui/reveal";
import { RouteLine } from "@/components/ui/route-line";
import { getHomeRedirect } from "@/lib/home-route";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSessionUser();
  const destination = getHomeRedirect(session);
  if (destination) redirect(destination);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-8 sm:px-8 sm:pt-10 lg:px-12 lg:pt-12">
      <Reveal>
        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <h1 className="max-w-[14ch] font-heading text-[clamp(2.5rem,5vw,4.25rem)] font-semibold leading-[0.98] tracking-[-0.055em]">
              Escolha seu próximo passo.
            </h1>
            <p className="mt-5 max-w-[48ch] text-[15px] leading-7 text-muted-foreground sm:text-base">
              Escolha uma rota para melhorar seu currículo, entender uma vaga ou preparar uma candidatura mais forte.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/analysis/new" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                <HugeIcon icon={Add01Icon} size={18} /> Nova análise
              </Link>
              <a href="#rotas" className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-surface px-5 text-[13px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-soft-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                Ver possibilidades
              </a>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
            <div className="absolute -right-12 -top-12 size-40 rounded-full bg-soft-primary opacity-50 blur-2xl" aria-hidden="true" />
            <div className="relative">
              <h2 className="max-w-[18ch] font-heading text-2xl font-semibold leading-tight tracking-[-0.04em]">Comece pelo ponto que mais pede atenção.</h2>
              <p className="mt-3 max-w-[52ch] text-[13px] leading-relaxed text-muted-foreground">Você não precisa resolver tudo de uma vez. Escolha uma rota e avance com contexto.</p>
              <RouteLine className="mt-6" activeIndex={0} steps={[{ label: "Material", description: "Seu currículo" }, { label: "Oportunidade", description: "Sua direção" }, { label: "Ação", description: "Seu próximo passo" }]} />
              <div className="mt-6 flex items-center gap-3 border-t border-border pt-4 text-[12px] text-muted-foreground">
                <HugeIcon icon={FileUploadIcon} size={17} className="text-primary" />
                <span>PDF ou texto colado. Você escolhe como começar.</span>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <section id="rotas" className="mt-10 scroll-mt-8">
        <div className="flex flex-col justify-between gap-3 border-b border-border pb-5 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-heading text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Ações disponíveis</h2>
          </div>
          <p className="max-w-[34ch] text-[12px] leading-relaxed text-muted-foreground sm:text-right">Escolha o tipo de ajuda que você precisa agora.</p>
        </div>
        <AnalysisModeGrid />
      </section>

      <Reveal delay={120}>
        <section className="mt-20 grid gap-6 border-t border-border pt-8 sm:grid-cols-3">
          {[
            { icon: FileUploadIcon, label: "Traga o que você já tem", text: "Comece com um PDF ou cole seu currículo." },
            { icon: Briefcase01Icon, label: "Dê contexto ao caminho", text: "Inclua uma vaga quando quiser comparar possibilidades." },
            { icon: SparklesIcon, label: "Saia com uma ação", text: "Encontre o ponto mais importante para o próximo passo." },
          ].map((item, index) => (
            <div key={item.label} className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-soft-primary text-primary"><HugeIcon icon={item.icon} size={17} /></span>
              <div><p className="text-[13px] font-semibold">{index + 1}. {item.label}</p><p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{item.text}</p></div>
            </div>
          ))}
        </section>
      </Reveal>
    </div>
  );
}
