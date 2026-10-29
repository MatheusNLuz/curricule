import Link from "next/link";
import { ScoreComparison } from "@/components/analysis/score-comparison";
import { revisedResumeScore } from "@/lib/resume-library";
import { ArrowRight } from "@/components/ui/app-icon";
import styles from "./generated-resume-summary.module.css";

export function GeneratedResumeSummary({ initialScores, finalScores, analysisId }: { initialScores: string | null; finalScores: string | null; analysisId: string }) {
  const before = revisedResumeScore(initialScores);
  const after = revisedResumeScore(finalScores);
  return <section className={styles.resultSummary} aria-label="Resultado da versão gerada">
    <div className={styles.resultIntro}><h2>Confira sua nova versão.</h2><p>O currículo está logo abaixo. Revise o conteúdo e baixe o PDF quando estiver pronto.</p><Link href={`/analysis/${analysisId}`} className="textLink">Ver análise detalhada <ArrowRight size={15}/></Link><p className={styles.scoreNote}>A nota avalia o currículo; não representa uma chance de contratação.</p></div>
    <ScoreComparison before={before ?? undefined} after={after ?? undefined} generated />
  </section>;
}
