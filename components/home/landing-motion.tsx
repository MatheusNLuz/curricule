"use client";
import { useEffect, useRef, type ReactNode } from "react";

export function LandingMotion({ children, className }: { children: ReactNode; className: string }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const target = entry.target as HTMLElement;
        target.dataset.motionVisible = String(entry.isIntersecting);
        if (entry.isIntersecting) target.dataset.motionSeen = "true";
      });
    }, { threshold: .12, rootMargin: "0px 0px -20px 0px" });
    element.querySelectorAll("[data-motion]").forEach(target => observer.observe(target));
    const visibility = () => { element.dataset.motionPaused = String(document.hidden); };
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  return <div ref={root} className={className}>{children}</div>;
}
