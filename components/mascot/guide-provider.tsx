"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { GUIDE_STEPS, parseGuidePreferences, type GuidePreferences } from "@/lib/mascot-guide";
import { GuideTour } from "./guide-tour";
import { GuideContext } from "./guide-context";

const EVENT = "curricule-guide-preferences";
const memory = new Map<string, string>();
const emptySnapshot = () => "";
const serverReady = () => false;
const clientReady = () => true;
const noSubscribe = () => () => {};

export function GuideProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const key = "curricule-guide-v1:" + (userId || "public");
  const router = useRouter();
  const returnFocus = useRef<HTMLElement | null>(null);
  const [step, setStep] = useState<number | null>(null);
  const ready = useSyncExternalStore(noSubscribe, clientReady, serverReady);
  const subscribe = useCallback((notify: () => void) => {
    const external = (event: StorageEvent) => { if (!event.key || event.key === key) { memory.delete(key); notify(); } };
    window.addEventListener(EVENT, notify);
    window.addEventListener("storage", external);
    return () => { window.removeEventListener(EVENT, notify); window.removeEventListener("storage", external); };
  }, [key]);
  const snapshot = useCallback(() => {
    if (memory.has(key)) return memory.get(key)!;
    try { return window.localStorage.getItem(key) || ""; } catch { return ""; }
  }, [key]);
  const raw = useSyncExternalStore(subscribe, snapshot, emptySnapshot);
  const preferences = useMemo(() => parseGuidePreferences(raw), [raw]);
  const updatePreferences = useCallback((patch: Partial<GuidePreferences>) => {
    const value = JSON.stringify({ ...parseGuidePreferences(snapshot()), ...patch });
    memory.set(key, value);
    try { window.localStorage.setItem(key, value); } catch { /* The controls also work without persistent storage. */ }
    window.dispatchEvent(new window.Event(EVENT));
  }, [key, snapshot]);
  function goTo(index: number) { setStep(index); router.push(GUIDE_STEPS[index].path, { scroll: false }); }
  function startTour() {
    if (!userId) return;
    const unsaved = document.querySelector('[data-editor-dirty="true"], [data-unsaved-material="true"]');
    if (unsaved && !window.confirm("A apresentação abre outras telas. Salve suas alterações antes de continuar. Deseja abrir a apresentação agora?")) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    updatePreferences({ welcomeDismissed: true });
    goTo(0);
  }
  function finish() {
    setStep(null);
    updatePreferences({ tutorialSeen: true, welcomeDismissed: true });
    requestAnimationFrame(() => {
      const target = returnFocus.current?.isConnected ? returnFocus.current : document.getElementById("main-content");
      target?.focus({ preventScroll: true });
    });
  }
  return <GuideContext.Provider value={{ preferences, ready, authenticated: !!userId, updatePreferences, startTour }}>
    {children}
    {step !== null && <GuideTour step={step} onStep={goTo} onClose={finish} />}
  </GuideContext.Provider>;
}
