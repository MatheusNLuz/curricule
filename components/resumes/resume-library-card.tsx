import Link from "next/link";
import { ResumeDocument, Status } from "@/components/workspace/workspace-ui";
import { ScoreRing } from "@/components/analysis/score-ring";
import { ArrowRight } from "@/components/ui/app-icon";
import { languageLabel } from "@/lib/analysis-contract";
import { formatResumeLibraryItem, revisedResumeScore } from "@/lib/resume-library";
import { DownloadResumeButton } from "./download-resume-button";
import styles from "./resume-library-card.module.css";

type ResumeItem = { id: string; professionalTarget: string | null; mode: string; createdAt: Date | string; jobDescription: string | null; finalResumeJson: string | null; initialScores?: string | null; finalScores: string | null; selectedLanguage: string };
export function ResumeLibraryCard({ resume, compact = false }: { resume: ResumeItem; compact?: boolean }) {
  const item = formatResumeLibraryItem(resume);
  const before = revisedResumeScore(resume.initialScores || null);
  const after = revisedResumeScore(resume.finalScores);
  const actions = <>
    <dl className={styles.comparison}><div><dt>Antes da otimização</dt><dd>{before === null ? "Indisponível" : `${before}/100`}</dd></div><div><dt>Após a otimização</dt><dd>{after === null ? "Reavaliação pendente" : `${after}/100`}</dd></div></dl>
    <Link href={`/analysis/${resume.id}`} className="resumeScoreLink">{after === null ? "Reavaliar versão atual" : "Ver detalhes da avaliação"}<ArrowRight size={15}/></Link>
    <div><Link href={`/analysis/${resume.id}/editor`} className="textLink">Abrir no editor<ArrowRight size={16}/></Link><DownloadResumeButton analysisId={resume.id} title={item.title}/></div>
  </>;
  return <article className="resumeTile">
    {!compact && <Link href={`/analysis/${resume.id}/preview`} className={`resumeThumbnail ${styles.thumbnail}`} aria-label={`Ver currículo: ${item.title}`}>
      <div className={styles.document}><div className={styles.badge}><ScoreRing value={after} label="Após a otimização" /></div><ResumeDocument value={resume.finalResumeJson} language={resume.selectedLanguage} compact /></div>
    </Link>}
    <div className="resumeTileInfo"><Status tone="neutral">Versão gerada</Status><h2><Link href={`/analysis/${resume.id}/preview`}>{item.title}</Link></h2><p>{languageLabel(resume.selectedLanguage)} · {new Date(resume.createdAt).toLocaleDateString("pt-BR")}</p>{!compact && item.jobExcerpt && <p>{item.jobExcerpt}</p>}
      {compact ? <details className="collectionDetails"><summary>Avaliação e ações<span className="sr-only">: {item.title}</span></summary>
        {item.jobExcerpt && <p>{item.jobExcerpt}</p>}
        {actions}
      </details> : actions}
    </div>
  </article>;
}
