"use client";

import { useEffect, useRef, useState } from "react";
import type { MascotPose } from "@/lib/mascot-guide";
import { useMascotGuide } from "./guide-context";
import styles from "./mascot.module.css";
import { MascotRig } from "./mascot-rig";

export function Mascot({ pose = "welcome", size = "medium", repeat = false, label = "", className = "" }: {
  pose?: MascotPose;
  size?: "small" | "medium" | "large" | "hero";
  repeat?: boolean;
  label?: string;
  className?: string;
}) {
  const { preferences } = useMascotGuide();
  const root = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let visible = true;
    const update = () => { element.dataset.active = String(visible && !document.hidden && !paused && preferences.motion); };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer?.observe(element);
    document.addEventListener("visibilitychange", update);
    update();
    return () => { observer?.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, [paused, preferences.motion, preferences.visible]);
  if (!preferences.visible) return null;
  return <figure ref={root} className={`${styles.character} ${styles[size]} ${className}`} data-mascot data-pose={pose} data-repeat={repeat} data-active={!paused && preferences.motion}>
    <span key={pose} role={label ? "img" : undefined} aria-label={label || undefined}><MascotRig /></span>
    {repeat && preferences.motion && <button className={styles.pause} type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused}>{paused ? "Animar personagem" : "Pausar personagem"}</button>}
  </figure>;
}
