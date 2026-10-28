import {
  Briefcase01Icon,
  File02Icon,
  Layout01Icon,
  SparklesIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export const ANALYSIS_MODES = [
  {
    value: "MAKE_ATS_FRIENDLY",
    href: "/analysis/new?mode=MAKE_ATS_FRIENDLY",
    icon: File02Icon,
    title: "Otimizar para ATS",
    description: "Revise estrutura e conteúdo do currículo com foco em leitura clara. Não precisa de descrição de vaga.",
    cta: "Iniciar análise",
    accent: "primary",
  },
  {
    value: "COMPARE_AGAINST_JOB",
    href: "/analysis/new?mode=COMPARE_AGAINST_JOB",
    icon: Briefcase01Icon,
    title: "Comparar com a Vaga",
    description: "Cruze seu currículo com uma descrição de vaga e veja o relatório detalhado de lacunas.",
    cta: "Iniciar comparação",
    accent: "route",
  },
  {
    value: "OPTIMIZE_FOR_JOB",
    href: "/analysis/new?mode=OPTIMIZE_FOR_JOB",
    icon: SparklesIcon,
    title: "Otimização Completa",
    description: "Fluxo completo: comparar, responder perguntas da IA, reescrever e exportar o currículo otimizado.",
    cta: "Iniciar otimização",
    accent: "signal",
  },
  {
    value: "LINKEDIN_OPTIMIZATION",
    href: "/analysis/new?mode=LINKEDIN_OPTIMIZATION",
    icon: UserIcon,
    title: "Otimizar LinkedIn",
    description: "Analise o SEO do seu perfil do LinkedIn e melhore sua atratividade para recrutadores.",
    cta: "Otimizar perfil",
    accent: "linkedin",
  },
  {
    value: "COVER_LETTER_ONLY",
    href: "/analysis/new?mode=COVER_LETTER_ONLY",
    icon: Layout01Icon,
    title: "Carta de Apresentação",
    description: "Crie uma carta de apresentação sob medida cruzando seu currículo com a descrição da vaga.",
    cta: "Gerar carta",
    accent: "route",
  },
] as const satisfies ReadonlyArray<{
  value: string;
  href: string;
  icon: IconSvgElement;
  title: string;
  description: string;
  cta: string;
  accent: "primary" | "route" | "signal" | "linkedin";
}>;

export type AnalysisMode = (typeof ANALYSIS_MODES)[number]["value"];

export function resolveAnalysisMode(value: string | null): AnalysisMode | null {
  return ANALYSIS_MODES.find((mode) => mode.value === value)?.value ?? null;
}
