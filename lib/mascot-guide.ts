export const MASCOT_POSES = ["welcome", "explain", "read", "think", "verify", "celebrate"] as const;
export type MascotPose = typeof MASCOT_POSES[number];

export type GuidePreferences = { visible: boolean; motion: boolean; welcomeDismissed: boolean; tutorialSeen: boolean };
export const DEFAULT_GUIDE_PREFERENCES: GuidePreferences = { visible: true, motion: true, welcomeDismissed: false, tutorialSeen: false };

export function parseGuidePreferences(raw: string): GuidePreferences {
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object") return DEFAULT_GUIDE_PREFERENCES;
    return { visible: value.visible !== false, motion: value.motion !== false, welcomeDismissed: value.welcomeDismissed === true, tutorialSeen: value.tutorialSeen === true };
  } catch { return DEFAULT_GUIDE_PREFERENCES; }
}

export const GUIDE_STEPS = [
  { title: "Um objetivo por vez", text: "Escolha o que você quer preparar: seu currículo, uma candidatura para uma vaga ou seu LinkedIn. Cada opção tem um caminho próprio.", path: "/analysis/new", target: "analysis-options", pose: "welcome" },
  { title: "Comece com o que você já tem", text: "Envie um PDF ou cole o texto completo. Você pode conferir o material antes de iniciar a análise. Esta apresentação não envia nenhum arquivo.", path: "/analysis/new?mode=MAKE_ATS_FRIENDLY", target: "analysis-material", pose: "read" },
  { title: "A oportunidade dá o contexto", text: "Para comparar com uma vaga, informe o link ou cole a descrição. Confira o conteúdo importado antes de continuar.", path: "/analysis/new?mode=COMPARE_AGAINST_JOB", target: "analysis-job", pose: "think" },
  { title: "Escolha como quer se apresentar", text: "Defina o idioma do resultado e a convenção do currículo. O país escolhido não troca o idioma automaticamente.", path: "/analysis/new?mode=MAKE_ATS_FRIENDLY", target: "analysis-preferences", pose: "explain" },
  { title: "Sua revisão faz parte do resultado", text: "Quando uma versão ficar pronta, ela aparece aqui. Abra a prévia, confira os fatos e use o editor antes de baixar o PDF. Nenhuma candidatura é enviada automaticamente.", path: "/resumes", target: "resume-library", pose: "verify" },
  { title: "Você pode retomar depois", text: "Rascunhos e resultados ficam no histórico. A ajuda continua disponível no menu da conta e na página Ajuda. Seu próximo passo já pode começar.", path: "/history", target: "analysis-history", pose: "celebrate" },
] as const satisfies ReadonlyArray<{ title: string; text: string; path: string; target: string; pose: MascotPose }>;
