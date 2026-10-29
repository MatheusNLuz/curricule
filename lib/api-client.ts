export function getLoginUrl(nextPath = "/") {
  const safePath = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
  return `/login?${new URLSearchParams({ next: safePath }).toString()}`;
}

export function getOAuthCallbackUrl(nextPath: string | null = "/") {
  return nextPath?.startsWith("/") && !nextPath.startsWith("//") && !nextPath.includes("\\")
    ? nextPath
    : "/";
}

export async function readApiError(response: Response, fallback: string) {
  try {
    const payload = await response.clone().json() as { error?: unknown;reference?:unknown };
    if (typeof payload.error === "string" && payload.error.trim()) return payload.error+(typeof payload.reference==="string"&&/^[a-f0-9-]{36}$/i.test(payload.reference)?" (Referência: "+payload.reference+")":"");
  } catch {
    // Some network/proxy failures return an empty or non-JSON response.
  }

  if (response.status === 401) return "Sua sessão expirou. Entre novamente para continuar.";
  if (response.status === 403) return "Você não tem permissão para acessar este conteúdo.";
  if (response.status === 404) return "Não encontramos esta análise.";
  if (response.status >= 500) return "O serviço está indisponível no momento. Tente novamente em instantes.";

  return fallback;
}

export function getFetchErrorMessage(error: unknown, fallback: string) {
  if (error instanceof TypeError) {
    return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
  }

  return error instanceof Error && error.message ? error.message : fallback;
}

/** Resume an already-running server task without starting another generation. */
export async function fetchAnalysisTask(url: string, init: RequestInit): Promise<Response> {
  const { notifyTaskActivity } = await import("./task-events.ts");
  notifyTaskActivity(init.body, true);
  try { return await requestAnalysisTask(url, init); }
  finally { notifyTaskActivity(init.body, false); }
}

async function requestAnalysisTask(url: string, init: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (response.status !== 409) return response;
  const payload = await response.clone().json().catch(() => null);
  if (payload?.code !== "TASK_RUNNING") return response;
  const kind = ({ "/api/analyze": "ANALYZE", "/api/compare": "COMPARE", "/api/optimize": "OPTIMIZE", "/api/cover-letter": "COVER_LETTER", "/api/smart-questions": "QUESTIONS", "/api/truth-guard": "TRUTH", "/api/reassess":"REASSESS" } as Record<string, string>)[url];
  if (!kind) return response;
  const { analysisId } = JSON.parse(String(init.body));
  const signal = init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(300_000)]) : AbortSignal.timeout(300_000);
  while (!signal.aborted) {
    await new Promise<void>((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(signal.reason); };
      const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, 2000);
      signal.addEventListener("abort", abort, { once: true });
    });
    const status = await fetch("/api/analysis/" + encodeURIComponent(analysisId) + "/tasks?kind=" + kind, { signal });
    if (!status.ok) return status;
    const task = await status.json();
    if (task.status === "COMPLETED") return Response.json(task.result);
    if (task.status === "FAILED" || task.status === "EXPIRED") return Response.json({ error: "A etapa foi interrompida. Tente novamente para retomar." }, { status: 503 });
  }
  signal.throwIfAborted(); return response;
}
