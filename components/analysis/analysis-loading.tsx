"use client";

import { Mascot } from "@/components/mascot/mascot";
import type { MascotPose } from "@/lib/mascot-guide";
import styles from "./analysis-loading.module.css";

type LoadingVariant = "read" | "compare" | "rewrite" | "questions" | "verify" | "letter" | "export";
type Props = { step: string; description?: string; writing?: boolean; variant?: LoadingVariant; compact?: boolean; note?: string };
const descriptions: Record<LoadingVariant, string> = {
  read: "Estamos organizando as informações do seu material para você revisar com clareza.",
  compare: "Relacionamos as experiências do seu currículo aos requisitos desta oportunidade.",
  rewrite: "Seu histórico é a base. A vaga orienta o foco, e o idioma escolhido orienta a escrita.",
  questions: "Buscamos os detalhes que ajudam a apresentar melhor sua experiência.",
  verify: "Conferimos as informações do material e as respostas que você confirmou.",
  letter: "Preparamos uma apresentação com base no seu histórico e na oportunidade.",
  export: "Estamos organizando as páginas e preparando seu arquivo para baixar.",
};
const poses: Record<LoadingVariant, MascotPose> = { read: "read", compare: "think", rewrite: "read", questions: "think", verify: "verify", letter: "read", export: "verify" };

export function AnalysisLoading({ step, description, writing = false, variant, compact = false, note = "Seu material permanece salvo." }: Props) {
  const kind = variant || (writing ? "rewrite" : /comparando/i.test(step) ? "compare" : /carta/i.test(step) ? "letter" : "read");
  const Heading = compact ? "h2" : "h1";
  return <div className={styles.layout} data-kind={kind} data-compact={compact || undefined} role="status" aria-live="polite" aria-busy="true">
    <div className={styles.content}>
      <div className={styles.mascotStage}><Mascot pose={poses[kind]} size={compact ? "medium" : "large"} repeat /></div>
      <div className={styles.copy}>
        <Heading>{step}</Heading>
        <p>{description || descriptions[kind]}</p>
        <div className={styles.wait}><span className={styles.dot} aria-hidden="true" /><span>Em andamento</span></div>
        <p className={styles.note}>{note}</p>
      </div>
    </div>
  </div>;
}
