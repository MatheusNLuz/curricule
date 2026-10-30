import assert from "node:assert/strict";
import test from "node:test";
import { fetchAnalysisTask, getFetchErrorMessage, getLoginUrl, getOAuthCallbackUrl, readApiError } from "./api-client.ts";

test("keeps safe in-app destinations for OAuth and rejects external redirects", () => {
  assert.equal(getOAuthCallbackUrl("/analysis/new?mode=OPTIMIZE_FOR_JOB"), "/analysis/new?mode=OPTIMIZE_FOR_JOB");
  assert.equal(getOAuthCallbackUrl("//attacker.example"), "/");
  assert.equal(getOAuthCallbackUrl("https://attacker.example"), "/");
});

test("preserves the requested analysis route in the login URL", () => {
  assert.equal(
    getLoginUrl("/analysis/new?mode=OPTIMIZE_FOR_JOB"),
    "/login?next=%2Fanalysis%2Fnew%3Fmode%3DOPTIMIZE_FOR_JOB",
  );
});

test("reads an API error response instead of exposing a generic fetch failure", async () => {
  const response = new Response(JSON.stringify({ error: "Sessão expirada" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });

  assert.equal(await readApiError(response, "Não foi possível concluir a operação."), "Sessão expirada");
});

test("uses an actionable fallback when a request has no response body", async () => {
  const response = new Response("temporarily unavailable", { status: 503 });

  assert.equal(
    await readApiError(response, "Não foi possível concluir a operação."),
    "O serviço está indisponível no momento. Tente novamente em instantes.",
  );
});

test("turns a browser network error into a useful recovery message", () => {
  assert.equal(
    getFetchErrorMessage(new TypeError("Failed to fetch"), "Não foi possível concluir a operação."),
    "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
  );
});

const taskInit = { method: "POST", body: JSON.stringify({ analysisId: "analysis-a" }) };

test("a lost rewrite response recovers the matching task without another POST", async t => {
  const calls: string[] = [];
  let requestId: string | null = null;
  t.mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    calls.push(url);
    if (url === "/api/optimize") {
      requestId = new Headers(init?.headers).get("X-Analysis-Request-Id");
      throw new TypeError("Failed to fetch");
    }
    assert.ok(requestId);
    assert.equal(init?.method ?? "GET", "GET");
    return Response.json({ status: "COMPLETED", requestId, result: { success: true, optimized: { saved: true } } });
  });
  const result = await fetchAnalysisTask("/api/optimize", taskInit);
  assert.deepEqual(await result.json(), { success: true, optimized: { saved: true } });
  assert.deepEqual(calls, ["/api/optimize", "/api/analysis/analysis-a/tasks?kind=OPTIMIZE"]);
});

test("an intermediary 503 can recover a saved rewrite, but never a stale task", async t => {
  let match = true;
  let requestId: string | null = null;
  t.mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    if (url === "/api/optimize") {
      requestId = new Headers(init?.headers).get("X-Analysis-Request-Id");
      return new Response("Service unavailable", { status: 503 });
    }
    return Response.json({ status: "COMPLETED", requestId: match ? requestId : "old-request", result: { success: true } });
  });
  assert.equal((await fetchAnalysisTask("/api/optimize", taskInit)).status, 200);
  match = false;
  assert.equal((await fetchAnalysisTask("/api/optimize", taskInit)).status, 503);
});

test("recovery waits for the same running task and tolerates a temporary status failure", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let requestId: string | null = null, reads = 0, posts = 0;
  t.mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    if (url === "/api/optimize") {
      posts++;
      requestId = new Headers(init?.headers).get("X-Analysis-Request-Id");
      return new Response("Gateway timeout", { status: 504 });
    }
    reads++;
    if (reads === 2) throw new TypeError("Temporary network interruption");
    return Response.json({ status: reads === 1 ? "RUNNING" : "COMPLETED", requestId, result: reads > 2 ? { success: true } : null });
  });
  const pending = fetchAnalysisTask("/api/optimize", taskInit);
  await new Promise(resolve => setImmediate(resolve));
  t.mock.timers.tick(2000);
  await new Promise(resolve => setImmediate(resolve));
  t.mock.timers.tick(4000);
  assert.deepEqual(await (await pending).json(), { success: true });
  assert.equal(posts, 1);
  assert.equal(reads, 3);
});

test("recovering an already-running fact review preserves its API response shape", async t => {
  t.mock.method(globalThis, "fetch", async (url: string) => url === "/api/truth-guard"
    ? Response.json({ code: "TASK_RUNNING" }, { status: 409 })
    : Response.json({ status: "COMPLETED", result: { claims: [], sourceHash: "saved" } }));
  assert.deepEqual(await (await fetchAnalysisTask("/api/truth-guard", taskInit)).json(), { success: true, truthGuard: { claims: [], sourceHash: "saved" } });
});

test("explicit factual rejection and server task timeout are preserved without recovery", async t => {
  for (const [status, code] of [[422, "OUTPUT_UNCONFIRMED"], [504, "TASK_TIMEOUT"]] as const) {
    const mocked = t.mock.method(globalThis, "fetch", async () => Response.json({ code }, { status }));
    const result = await fetchAnalysisTask("/api/optimize", taskInit);
    assert.equal(result.status, status);
    assert.deepEqual(await result.json(), { code });
    assert.equal(mocked.mock.callCount(), 1);
    mocked.mock.restore();
  }
});

test("navigation cancellation never starts recovery requests", async t => {
  const controller = new AbortController();
  const mocked = t.mock.method(globalThis, "fetch", async () => { controller.abort(); throw new TypeError("Connection closed"); });
  await assert.rejects(fetchAnalysisTask("/api/optimize", { ...taskInit, signal: controller.signal }), { name: "AbortError" });
  assert.equal(mocked.mock.callCount(), 1);
});

test("a lost response never recovers a stale result and expired authentication is preserved", async t => {
  let expired = false;
  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url === "/api/optimize") throw new TypeError("Connection closed");
    return expired ? Response.json({ error: "Faça login" }, { status: 401 }) : Response.json({ status: "COMPLETED", requestId: "old", result: { stale: true } });
  });
  await assert.rejects(fetchAnalysisTask("/api/optimize", taskInit), /Connection closed/);
  expired = true;
  assert.equal((await fetchAnalysisTask("/api/optimize", taskInit)).status, 401);
});

test("failed matching tasks are not displayed as successful rewrites", async t => {
  let requestId: string | null = null;
  t.mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    if (url === "/api/optimize") { requestId = new Headers(init?.headers).get("X-Analysis-Request-Id"); throw new TypeError("Connection closed"); }
    return Response.json({ status: "FAILED", requestId, result: null });
  });
  const result = await fetchAnalysisTask("/api/optimize", taskInit);
  assert.equal(result.status, 503);
  assert.equal((await result.json()).code, "TASK_INTERRUPTED");
});

test("status retries stop after five failures without replaying a POST", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let posts = 0, reads = 0;
  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url === "/api/optimize") { posts++; return new Response("Unavailable", { status: 503 }); }
    reads++; throw new TypeError("Status unreachable");
  });
  const pending = fetchAnalysisTask("/api/optimize", taskInit);
  for (const delay of [4000, 8000, 16000, 16000]) {
    await new Promise(resolve => setImmediate(resolve));
    t.mock.timers.tick(delay);
  }
  assert.equal((await pending).status, 503);
  assert.equal(posts, 1);
  assert.equal(reads, 5);
});
