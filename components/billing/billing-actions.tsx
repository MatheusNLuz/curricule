"use client";
import { useState } from "react";
export function BillingActions({ hasCustomer }: { hasCustomer: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function open(kind: "checkout" | "portal") {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/billing/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Tente novamente.");
      window.location.assign(data.url);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Tente novamente."); setBusy(false); }
  }
  return <div><div className="mt-5 flex flex-wrap gap-3"><button disabled={busy} onClick={() => open("checkout")} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Abrindo…" : "Ativar acesso"}</button>{hasCustomer && <button disabled={busy} onClick={() => open("portal")} className="rounded-xl border border-border px-4 py-3 text-sm">Gerenciar cobrança</button>}</div>{error && <p role="alert" className="mt-3 text-sm text-signal">{error}</p>}</div>;
}
