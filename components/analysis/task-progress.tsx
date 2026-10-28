"use client";
import { useEffect, useState } from "react";
import { TASK_ACTIVITY_EVENT, type TaskActivity } from "@/lib/task-events";
import { taskPollDelay } from "@/lib/task-polling";
const LABELS: Record<string, string> = { ANALYZE: "Analisando seu material", COMPARE: "Comparando com a vaga", QUESTIONS: "Preparando perguntas", QUESTIONS_LOCALIZE: "Conferindo o idioma das perguntas", TRUTH: "Verificando as afirmações", OPTIMIZE: "Preparando e verificando a nova versão", REASSESS: "Reavaliando o documento salvo", COVER_LETTER: "Preparando a carta" };
type Progress = { kind: string; status: string; elapsedSeconds: number };

export function TaskProgress({ analysisId }: { analysisId: string }) {
  const [tasks, setTasks] = useState<Progress[]>([]);
  useEffect(() => {
    let stopped = false, inFlight = false, activeRequests = 0, failures = 0;
    let current: Progress[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const schedule = (delay: number) => { clearTimeout(timer); if (!stopped) timer = setTimeout(poll, delay); };
    async function poll() {
      if (stopped || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const response = await fetch(`/api/analysis/${analysisId}/tasks`, { signal: controller.signal });
        if (response.status === 401 || response.status === 404) { stopped = true; return; }
        if (!response.ok) throw new Error("Progress unavailable");
        const value = await response.json();
        current = value.tasks || [];
        failures = 0;
        if (!stopped) setTasks(current);
      } catch { failures++; }
      finally {
        inFlight = false;
        schedule(taskPollDelay(activeRequests > 0 || current.some(task => task.status === "RUNNING"), failures));
      }
    }
    const activity = (event: Event) => {
      const { detail } = event as CustomEvent<TaskActivity>;
      if (detail.analysisId !== analysisId) return;
      activeRequests = Math.max(0, activeRequests + (detail.active ? 1 : -1));
      schedule(0);
    };
    const visibility = () => { clearTimeout(timer); if (document.visibilityState !== "hidden") schedule(0); };
    window.addEventListener(TASK_ACTIVITY_EVENT, activity);
    document.addEventListener("visibilitychange", visibility);
    void poll();
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
      window.removeEventListener(TASK_ACTIVITY_EVENT, activity);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [analysisId]);
  const running = tasks.filter(task => task.status === "RUNNING");
  if (!running.length) return null;
  return <div className="callout my-4" role="status" aria-live="polite"><div>{running.map(task => <p key={task.kind}><strong>{LABELS[task.kind] || "Processando a etapa"}</strong> · {task.elapsedSeconds}s</p>)}<p className="finePrint">A verificação pode levar alguns instantes. Se sair desta tela, retome pelo histórico para conferir o resultado. Uma etapa interrompida poderá ser tentada novamente.</p></div></div>;
}
