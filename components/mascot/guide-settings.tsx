"use client";

import Link from "next/link";
import { useMascotGuide } from "./guide-context";
import { GuideCard, GuideReplayButton } from "./guide-card";
import styles from "./mascot.module.css";

export function GuideSettings() {
  const { preferences, updatePreferences, authenticated } = useMascotGuide();
  return <section className={styles.settings} aria-labelledby="guide-settings-title">
    <h2 id="guide-settings-title">O guia, do seu jeito.</h2>
    <p>Reabra a apresentação quando quiser. As preferências do personagem ficam neste navegador.</p>
    <div className={styles.settingsControls}>
      <label><input type="checkbox" checked={preferences.visible} onChange={event => updatePreferences({ visible: event.target.checked })} />Mostrar o personagem</label>
      <label><input type="checkbox" checked={preferences.motion} onChange={event => updatePreferences({ motion: event.target.checked })} />Animar o personagem</label>
    </div>
    <div className={styles.actions}>{authenticated ? <><GuideReplayButton /><button type="button" className={styles.secondary} onClick={() => updatePreferences({ welcomeDismissed: false })}>Reativar boas-vindas</button></> : <Link className={styles.primary} href="/login?next=%2Fdashboard">Entrar para conhecer meu espaço</Link>}</div>
    <GuideCard title="Vamos encontrar o próximo passo." pose="think" compact><p>Se um link não abrir, cole o texto ou envie um PDF. Se uma análise parar, retome pelo histórico. Seu material salvo continua disponível.</p></GuideCard>
  </section>;
}
