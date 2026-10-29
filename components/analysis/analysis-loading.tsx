import styles from "./analysis-loading.module.css";

export function AnalysisLoading({ step }: { step: string }) {
  const description = step.includes("Comparando")
    ? "Estamos relacionando sua experiência ao que a vaga pede."
    : step.includes("Carta")
      ? "Estamos preparando uma apresentação para você revisar."
      : "Estamos organizando as informações do seu material para você revisar com clareza.";

  return <div className={styles.layout} role="status" aria-live="polite">
    <div className={styles.content}>
      <div className={styles.art} aria-hidden="true">
        <div className={styles.backSheet} />
        <div className={styles.paper}>
          <div className={styles.paperHeader}><span className={styles.avatar}/><div className={styles.headerLines}><span/><span/></div></div>
          <div className={styles.divider}/>
          <div className={styles.paperLines}><span/><span/><span/><span/><span/><span/></div>
          <div className={styles.scan}/>
        </div>
        <div className={styles.spark}><span/><span/><span/></div>
      </div>
      <div className={styles.copy}>
        <p className={styles.kicker}>SEU PRÓXIMO PASSO</p>
        <h1>{step}</h1>
        <p>{description}</p>
        <div className={styles.wait}><span className={styles.dot}/>Isso pode levar alguns instantes. Seu material está salvo.</div>
      </div>
    </div>
  </div>;
}
