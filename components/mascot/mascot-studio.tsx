"use client";

import { useState } from "react";
import { MASCOT_POSES, type MascotPose } from "@/lib/mascot-guide";
import { Mascot } from "./mascot";
import { GuideCard, GuideReplayButton } from "./guide-card";
import { GuideSettings } from "./guide-settings";
import { AnalysisLoading } from "@/components/analysis/analysis-loading";
import styles from "./studio.module.css";

const labels: Record<MascotPose, string> = { welcome: "Receber", explain: "Explicar", read: "Analisar", think: "Pensar", verify: "Conferir", celebrate: "Concluir" };

export function MascotStudio() {
  const [pose, setPose] = useState<MascotPose>("welcome");
  const [replay, setReplay] = useState(0);
  const [backdrop, setBackdrop] = useState("light");
  return <>
    <section className={styles.playground} aria-label="Prévia do personagem">
      <div className={styles.stage} data-backdrop={backdrop}><Mascot key={pose + replay} pose={pose} size="hero" label={`Personagem do Curricule na pose ${labels[pose].toLowerCase()}`} /><span>{labels[pose]}</span></div>
      <div className={styles.controls}><h2>O mesmo C, em cada momento.</h2><p>Experimente as poses, o movimento e o contraste com os dois fundos. A apresentação usa o personagem escolhido como referência.</p>
        <div className={styles.poses} role="group" aria-label="Pose do personagem">{MASCOT_POSES.map(value => <button key={value} type="button" aria-pressed={pose === value} onClick={() => setPose(value)}>{labels[value]}</button>)}</div>
        <div className={styles.poses} role="group" aria-label="Fundo da prévia"><button type="button" aria-pressed={backdrop === "light"} onClick={() => setBackdrop("light")}>Fundo claro</button><button type="button" aria-pressed={backdrop === "dark"} onClick={() => setBackdrop("dark")}>Fundo escuro</button></div>
        <div className={styles.poses}><button type="button" onClick={() => setReplay(value => value + 1)}>Repetir movimento</button><a href={`/mascot/source/${pose}.png`} download={`curricule-${pose}.png`}>Baixar PNG transparente</a></div>
        <GuideReplayButton>Experimentar tutorial guiado</GuideReplayButton>
      </div>
    </section>
    <GuideCard title="Seu próximo passo pode começar por aqui." pose="welcome"><p>Uma recepção breve para conhecer o caminho. Você pode seguir com o guia ou explorar por conta própria.</p></GuideCard>
    <details className={styles.loadingPreview}><summary>Experimentar o estado de processamento</summary><AnalysisLoading step="Organizando seu material." note="Prévia ilustrativa. Nenhuma análise está sendo executada." /></details>
    <GuideSettings />
  </>;
}
