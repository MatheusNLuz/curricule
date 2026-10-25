"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function UserAccessForm({ user }: { user: { id: string; role: string; status: string; email: string } }) {
  const router = useRouter();
  const [role, setRole] = useState(user.role), [status, setStatus] = useState(user.status);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const changed = role !== user.role || status !== user.status;
  async function save() {
    if (!window.confirm(`Alterar o acesso de ${user.email}? Permissão: ${role === "ADMIN" ? "administrador" : "usuário"}. Conta: ${status === "ACTIVE" ? "ativa" : "suspensa"}.`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, status }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "Não foi possível salvar.");
      router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Tente novamente."); }
    finally { setBusy(false); }
  }
  return <div className="min-w-56"><div className="flex flex-wrap gap-2"><select aria-label={`Permissão de ${user.email}`} disabled={busy} value={role} onChange={event => setRole(event.target.value)} className="rounded-lg border border-border bg-background px-2 py-2 text-xs"><option value="USER">Usuário</option><option value="ADMIN">Administrador</option></select><select aria-label={`Estado de ${user.email}`} disabled={busy} value={status} onChange={event => setStatus(event.target.value)} className="rounded-lg border border-border bg-background px-2 py-2 text-xs"><option value="ACTIVE">Ativo</option><option value="SUSPENDED">Suspenso</option></select><button type="button" onClick={save} disabled={busy || !changed} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40">{busy ? "Salvando…" : "Salvar"}</button></div>{error && <p role="alert" className="mt-2 max-w-72 text-xs text-signal">{error}</p>}</div>;
}
