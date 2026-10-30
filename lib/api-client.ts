import { ANALYSIS_REQUEST_HEADER } from "./analysis-request.ts";

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
  const kind = ({ "/api/analyze": "ANALYZE", "/api/compare": "COMPARE", "/api/optimize": "OPTIMIZE", "/api/cover-letter": "COVER_LETTER", "/api/smart-questions": "QUESTIONS", "/api/truth-guard": "TRUTH", "/api/reassess":"REASSESS" } as Record<string, string>)[url];
  let analysisId: unknown;
  try { analysisId = JSON.parse(String(init.body)).analysisId; } catch { /* Untracked requests use ordinary fetch. */ }
  if (!kind || typeof analysisId !== "string" || !analysisId) return fetch(url, init);
  init.signal?.throwIfAborted();
  const requestId = crypto.randomUUID();
  const headers = new Headers(init.headers);
  headers.set(ANALYSIS_REQUEST_HEADER, requestId);
  let response: Response | undefined, networkError: unknown;
  try { response = await fetch(url, { ...init, headers }); }
  catch (error) {
    init.signal?.throwIfAborted();
    if (!(error instanceof TypeError)) throw error;
    networkError = error;
  }
  if (response && response.status !== 409 && ![408, 499, 502, 503, 504].includes(response.status)) return response;
  const payload = response ? await response.clone().json().catch(() => null) : null;
  const alreadyRunning = response?.status === 409 && payload?.code === "TASK_RUNNING";
  const lostResponse = !response || ([408, 499, 502, 503, 504].includes(response.status) && !payload?.code);
  if (!alreadyRunning && !lostResponse) return response!;
  const fallback = () => { if (response) return response; throw networkError; };
  const signal = init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(300_000)]) : AbortSignal.timeout(300_000);
  let failures = 0;
  while (!signal.aborted) {
    try {
      const status = await fetch("/api/analysis/" + encodeURIComponent(analysisId) + "/tasks?kind=" + kind, { cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]) });
      if ([401, 403].includes(status.status)) return status;
      if (!status.ok) throw new Error("Task status unavailable");
      const task = await status.json();
      // A previous result must never masquerade as this request's new output.
      if (lostResponse && task.requestId !== requestId) return fallback();
      if (task.status === "COMPLETED" && task.result != null) return Response.json(kind === "TRUTH" ? { success: true, truthGuard: task.result } : task.result);
      if (task.status === "FAILED" || task.status === "EXPIRED") return response && !alreadyRunning ? response : Response.json({ error: "A etapa foi interrompida. Seu conteúdo foi preservado; retome pelo histórico.", code: "TASK_INTERRUPTED" }, { status: 503 });
      if (task.status !== "RUNNING") return fallback();
      failures = 0;
    } catch (error) {
      signal.throwIfAborted();
      // Preserve a failed initial request when recovery cannot identify it.
      if (error === networkError || ++failures >= 5) return fallback();
    }
    await waitForTaskPoll(signal, Math.min(16_000, 2000 * 2 ** failures));
  }
  signal.throwIfAborted(); return fallback();
}

function waitForTaskPoll(signal: AbortSignal, delay: number): Promise<void> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, delay);
    signal.addEventListener("abort", abort, { once: true });
  });
}
