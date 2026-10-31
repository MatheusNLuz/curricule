"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import { GUIDE_STEPS } from "@/lib/mascot-guide";
import { Mascot } from "./mascot";
import styles from "./mascot.module.css";

export function GuideTour({ step, onStep, onClose }: { step: number; onStep: (index: number) => void; onClose: () => void }) {
  const current = GUIDE_STEPS[step];
  const pathname = usePathname();
  const searchParams = useSearchParams().toString();
  const panel = useRef<HTMLElement>(null);
  const [bounds, setBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  useEffect(() => {
    let target: HTMLElement | null = null;
    let frame = 0;
    let scrolled = false;
    const measure = () => {
      target = document.querySelector<HTMLElement>(`[data-guide="${current.target}"]`);
      if (!target) { setBounds(null); return; }
      if (!scrolled) {
        scrolled = true;
        target.scrollIntoView({ block: "start", behavior: "instant" });
      }
      const rect = target.getBoundingClientRect();
      const available = Math.max(0, (panel.current?.getBoundingClientRect().top || window.innerHeight) - rect.top - 12);
      setBounds({ x: Math.max(4, rect.x - 5), y: Math.max(4, rect.y - 5), width: Math.min(rect.width + 10, window.innerWidth - Math.max(4, rect.x - 5) - 4), height: Math.max(0, Math.min(rect.height + 10, available)) });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = new MutationObserver(schedule);
    observer.observe(document.getElementById("main-content") || document.body, { childList: true, subtree: true });
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    resize?.observe(document.documentElement);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    schedule();
    const focus = requestAnimationFrame(() => panel.current?.focus({ preventScroll: true }));
    return () => { observer.disconnect(); resize?.disconnect(); cancelAnimationFrame(frame); cancelAnimationFrame(focus); window.removeEventListener("resize", schedule); window.removeEventListener("scroll", schedule, true); };
  }, [current.target, pathname, searchParams]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);
  return createPortal(<div className={styles.tourRoot} data-app-utilities>
    {bounds && bounds.height > 0 && <div className={styles.spotlight} aria-hidden="true" style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }} />}
    <section ref={panel} className={styles.tourPanel} role="dialog" aria-modal="false" aria-labelledby="curricule-tour-title" aria-describedby="curricule-tour-description" tabIndex={-1}>
      <div className={styles.tourTop}><span>Conheça seu espaço · {step + 1} de {GUIDE_STEPS.length}</span><button type="button" onClick={onClose} className={styles.textButton} aria-label="Fechar apresentação">Fechar</button></div>
      <div className={styles.tourContent}><Mascot pose={current.pose} size="small" /><div><h2 id="curricule-tour-title">{current.title}</h2><p id="curricule-tour-description">{current.text}</p></div></div>
      <div className={styles.tourProgress} role="progressbar" aria-label="Progresso da apresentação" aria-valuemin={1} aria-valuemax={GUIDE_STEPS.length} aria-valuenow={step + 1} aria-valuetext={`Etapa ${step + 1} de ${GUIDE_STEPS.length}`}>{GUIDE_STEPS.map((item, index) => <span key={item.target} data-current={index === step} data-complete={index < step} />)}</div>
      {!bounds && <p className={styles.routeStatus} role="status">Localizando esta etapa…</p>}
      <div className={styles.tourActions}><button type="button" className={styles.textButton} onClick={onClose}>Pular</button><div><button type="button" className={styles.secondary} disabled={step === 0} onClick={() => onStep(step - 1)}>Anterior</button><button type="button" className={styles.primary} disabled={!bounds} onClick={() => step === GUIDE_STEPS.length - 1 ? onClose() : onStep(step + 1)}>{step === GUIDE_STEPS.length - 1 ? "Concluir" : "Próximo"}</button></div></div>
    </section>
  </div>, document.body);
}
