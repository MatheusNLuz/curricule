"use client";

import { useEffect, useRef } from "react";
import { CurriculeMark } from "@/components/brand/curricule-logo";
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

export function AnalysisLoading({ step, description, writing = false, variant, compact = false, note = "Seu material permanece salvo." }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const kind = variant || (writing ? "rewrite" : /comparando/i.test(step) ? "compare" : /carta/i.test(step) ? "letter" : "read");
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let visible = true;
    const update = () => { element.dataset.motion = visible && !document.hidden ? "running" : "paused"; };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer?.observe(element);
    document.addEventListener("visibilitychange", update);
    update();
    return () => { observer?.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);
  const Heading = compact ? "h2" : "h1";
  return <div ref={root} className={styles.layout} data-kind={kind} data-compact={compact || undefined} role="status" aria-live="polite" aria-busy="true">
    <div className={styles.content}>
      <div className={styles.art} aria-hidden="true">
        <div className={styles.orbit} />
        <div className={styles.source}><span>{kind === "compare" ? "A oportunidade" : "Seu material"}</span><i/><i/><i/><i/></div>
        <div className={styles.paper}>
          <div className={styles.paperHeader}><CurriculeMark width={24} height={24}/><span>{kind === "letter" ? "Sua apresentação" : kind === "questions" ? "Sua experiência" : "Sua nova versão"}</span><span className={styles.paperDot}/></div>
          <div className={styles.nameLine}/><div className={styles.contactLine}/>
          <div className={styles.section}><span className={styles.sectionLabel}/><div className={styles.lines}><i/><i/><i/></div></div>
          <div className={styles.section}><span className={styles.sectionLabel}/><div className={`${styles.lines} ${styles.bullets}`}><i/><i/><i/></div></div>
          <div className={styles.skills}><i/><i/><i/></div>
          <div className={styles.cursor}/><div className={styles.scan}/>
        </div>
        <div className={styles.activity}><span/><span/><span/></div>
      </div>
      <div className={styles.copy}>
        <Heading>{step}</Heading>
        <p>{description || descriptions[kind]}</p>
        <div className={styles.wait}><span className={styles.dot}/><span>Em andamento</span></div>
        <p className={styles.note}>{note}</p>
      </div>
    </div>
  </div>;
}
