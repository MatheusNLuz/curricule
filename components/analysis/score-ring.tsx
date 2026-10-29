import styles from "./score-ring.module.css";

export function ScoreRing({ value, label, initial = false }: { value: number | null | undefined; label: string; initial?: boolean }) {
  const score = typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
  const tone = initial || score === null ? "neutral" : score >= 75 ? "good" : score >= 50 ? "attention" : "low";
  const formatted = score === null ? "—" : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(score);
  return <div className={styles.scoreRing} data-tone={tone} role={score === null ? "img" : "meter"} aria-label={score === null ? `${label}: avaliação pendente` : label} aria-valuemin={score === null ? undefined : 0} aria-valuemax={score === null ? undefined : 100} aria-valuenow={score ?? undefined} aria-valuetext={score === null ? undefined : `${formatted} de 100`}>
    <svg viewBox="0 0 72 72" aria-hidden="true"><circle className={styles.track} cx="36" cy="36" r="29"/>{score !== null && <circle className={styles.progress} cx="36" cy="36" r="29" pathLength="100" strokeDasharray={`${score} 100`} />}</svg>
    <strong aria-hidden="true">{formatted}</strong>
  </div>;
}
