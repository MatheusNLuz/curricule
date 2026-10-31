"use client";

import { useId, type ReactNode } from "react";
import type { MascotPose } from "@/lib/mascot-guide";
import { Mascot } from "./mascot";
import { useMascotGuide } from "./guide-context";
import styles from "./mascot.module.css";

export function GuideCard({ title, children, pose = "explain", compact = false, actions }: {
  title: string; children: ReactNode; pose?: MascotPose; compact?: boolean; actions?: ReactNode;
}) {
  const id = useId();
  const { preferences } = useMascotGuide();
  return <aside className={`${styles.card} ${compact ? styles.compact : ""} ${!preferences.visible ? styles.withoutCharacter : ""}`} aria-labelledby={id}>
    <Mascot pose={pose} size={compact ? "small" : "medium"} />
    <div className={styles.copy}><h2 id={id}>{title}</h2><div className={styles.body}>{children}</div>{actions && <div className={styles.actions}>{actions}</div>}</div>
  </aside>;
}

export function WelcomeGuide() {
  const { preferences, ready, startTour, updatePreferences } = useMascotGuide();
  if (!ready || preferences.welcomeDismissed) return null;
  return <GuideCard title="Seu próximo passo pode começar por aqui." pose="welcome" actions={<><button type="button" className={styles.primary} onClick={startTour}>Conhecer meu espaço</button><button type="button" className={styles.secondary} onClick={() => updatePreferences({ welcomeDismissed: true })}>Vou explorar por conta própria</button></>}>
    <p>Eu acompanho você na preparação do seu material. Vamos conhecer o caminho, do currículo à revisão final?</p>
  </GuideCard>;
}

export function GuideReplayButton({ children = "Rever apresentação" }: { children?: ReactNode }) {
  const { startTour, authenticated } = useMascotGuide();
  if (!authenticated) return null;
  return <button type="button" className={styles.secondary} onClick={startTour} data-guide-replay>{children}</button>;
}

export function EditorGuide() {
  return <details className={styles.editorHelp}><summary>Uma ajuda para revisar seu currículo</summary>
    <GuideCard title="Sua experiência continua sendo a referência." pose="verify" compact>
      <p>Confira nomes, datas, atividades e resultados. Salve suas alterações, abra a prévia e revise o documento antes de baixar. Reavaliar a nota é uma ação separada.</p>
    </GuideCard>
  </details>;
}
