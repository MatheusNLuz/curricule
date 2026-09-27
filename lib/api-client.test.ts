import assert from "node:assert/strict";
import test from "node:test";
import { getFetchErrorMessage, getLoginUrl, getOAuthCallbackUrl, readApiError } from "./api-client.ts";

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
