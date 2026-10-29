import { ScoreRing } from "./score-ring";
import styles from "./score-comparison.module.css";

export function ScoreComparison({ before, after, generated }: { before?: number; after?: number; generated: boolean }) {
  const knownBefore = typeof before === "number" && Number.isFinite(before) && before >= 0 && before <= 100;
  const knownAfter = typeof after === "number" && Number.isFinite(after) && after >= 0 && after <= 100;
  return <div className={styles.comparison}>
    <section><h2>Antes da otimização</h2><ScoreRing value={before} label="Antes da otimização" initial/><p>{knownBefore ? "Avaliação do currículo base." : "Nota inicial indisponível."}</p></section>
    <section><h2>Após a otimização</h2><ScoreRing value={after} label="Após a otimização"/><p>{knownAfter ? "Avaliação da versão reescrita." : generated ? "Nota atual indisponível. Reavalie a versão salva." : "Disponível após perguntas, revisão e reescrita."}</p></section>
  </div>;
}
