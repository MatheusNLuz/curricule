"use client";

import { useEffect, useRef, useState } from "react";
import type { MascotPose } from "@/lib/mascot-guide";
import { useMascotGuide } from "./guide-context";
import styles from "./mascot.module.css";
import { MascotFilm } from "./mascot-film";

export function Mascot({ pose = "welcome", size = "medium", repeat = false, label = "", className = "" }: {
  pose?: MascotPose;
  size?: "small" | "medium" | "large" | "hero";
  repeat?: boolean;
  label?: string;
  className?: string;
}) {
  const { preferences } = useMascotGuide();
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element || typeof window.matchMedia !== 'function') return;
    let visible = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      const active = visible && !document.hidden && !paused && preferences.motion && !reduced.matches;
      element.dataset.active = String(active);
      if (!video.current) return;
      if (active && video.current.parentElement?.dataset.unsupported !== 'true') void video.current.play().catch(() => {});
      else video.current.pause();
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer?.observe(element);
    document.addEventListener("visibilitychange", update);
    reduced.addEventListener('change', update);
    if (observer) update();
    return () => { observer?.disconnect(); document.removeEventListener("visibilitychange", update); reduced.removeEventListener('change',update); };
  }, [paused, preferences.motion, preferences.visible, pose]);
  if (!preferences.visible) return null;
  return <figure ref={root} className={`${styles.character} ${styles[size]} ${className}`} data-mascot data-pose={pose} data-repeat={repeat} data-active={!paused && preferences.motion} data-motion={preferences.motion}>
    <span key={pose} role={label ? "img" : undefined} aria-label={label || undefined}><MascotFilm pose={pose} videoRef={video} repeat={repeat} /></span>
    {repeat && preferences.motion && <button className={styles.pause} type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused}>{paused ? "Animar personagem" : "Pausar personagem"}</button>}
  </figure>;
}
