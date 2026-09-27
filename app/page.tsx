import {
  Add01Icon,
  Briefcase01Icon,
  File02Icon,
  FileUploadIcon,
  Layout01Icon,
  SparklesIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ModeRoute } from "@/components/home/mode-route";
import { HugeIcon } from "@/components/ui/huge-icon";
import { Reveal } from "@/components/ui/reveal";
import { RouteLine } from "@/components/ui/route-line";
import { LinkedInLogo } from "@/components/ui/linkedin-logo";

const modes = [
  {
    href: "/analysis/new?mode=MAKE_ATS_FRIENDLY",
    icon: File02Icon,
    title: "Otimizar para ATS",
    description: "Analise e reestruture seu currículo para passar nos filtros de ATS. Não precisa de descrição de vaga.",
    cta: "Iniciar Análise",
    accent: "primary" as const,
  },
  {
    href: "/analysis/new?mode=COMPARE_AGAINST_JOB",
    icon: Briefcase01Icon,
    title: "Comparar com a Vaga",
    description: "Cruze seu currículo com uma descrição de vaga e veja o relatório detalhado de lacunas.",
    cta: "Iniciar Comparação",
    accent: "route" as const,
  },
  {
    href: "/analysis/new?mode=OPTIMIZE_FOR_JOB",
    icon: SparklesIcon,
    title: "Otimização Completa",
    description: "Fluxo completo: comparar, responder perguntas da IA, reescrever e exportar o currículo otimizado.",
    cta: "Iniciar Otimização",
    accent: "signal" as const,
  },
  {
    href: "/analysis/new?mode=LINKEDIN_OPTIMIZATION",
    icon: UserIcon,
    title: "Otimizar LinkedIn",
    description: "Analise o SEO do seu perfil do LinkedIn e melhore sua atratividade para recrutadores.",
    cta: "Otimizar Perfil",
    customIcon: <LinkedInLogo className="size-[19px] text-linkedin" />,
    accent: "linkedin" as const,
  },
  {
    href: "/analysis/new?mode=COVER_LETTER_ONLY",
    icon: Layout01Icon,
    title: "Carta de Apresentação",
    description: "Crie uma carta de apresentação sob medida cruzando seu currículo com a descrição da vaga.",
    cta: "Gerar Carta",
    accent: "route" as const,
  },
];

export default function Home() {
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
              <Link href="/analysis/new?mode=OPTIMIZE_FOR_JOB" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                <HugeIcon icon={Add01Icon} size={18} /> Começar minha jornada
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
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {modes.map((mode, index) => (
            <ModeRoute
              key={mode.href}
              {...mode}
              className={`route-card-enter lg:col-span-2 ${index === 3 ? "lg:col-start-2" : index === 4 ? "lg:col-start-4" : ""}`}
              style={{ "--route-delay": `${Math.min(index, 4) * 45}ms` } as CSSProperties}
            />
          ))}
        </div>
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
