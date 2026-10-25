"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog } from "@/components/ui/custom-alert-dialog";
import { readApiError } from "@/lib/api-client";
export function AnalysisActions({ id, title }: { id: string; title: string | null }) {
  const router = useRouter(); const [editing, setEditing] = useState(false); const [name, setName] = useState(title || "");
  const [confirm, setConfirm] = useState(false); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function change(remove = false) {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/analysis/" + id, { method: remove ? "DELETE" : "PATCH", headers: { "Content-Type": "application/json" }, ...(remove ? {} : { body: JSON.stringify({ professionalTarget: name }) }) });
      if (!response.ok) throw new Error(await readApiError(response, "Não foi possível concluir."));
      setEditing(false); setConfirm(false); router.refresh();
    } catch (error) { setError((error as Error).message); } finally { setPending(false); }
  }
  return <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3"><div className="flex flex-wrap gap-2">{editing ? <><Input aria-label="Novo nome da análise" maxLength={120} value={name} onChange={event => setName(event.target.value)} /><Button variant="outline" disabled={pending || !name.trim()} onClick={() => change()}>Salvar nome</Button><Button variant="ghost" disabled={pending} onClick={() => setEditing(false)}>Cancelar</Button></> : <Button variant="ghost" onClick={() => setEditing(true)}>Renomear</Button>}<Button variant="ghost" disabled={pending} onClick={() => setConfirm(true)}>Excluir análise</Button></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<AlertDialog open={confirm} onClose={() => { if (!pending) setConfirm(false); }} variant="warning" title="Excluir esta análise?" description="O currículo, as respostas, as revisões e os registros associados serão excluídos permanentemente. Essa ação não pode ser desfeita." actionLabel={pending ? "Excluindo…" : "Excluir permanentemente"} onAction={() => { if (!pending) void change(true); }} /></div>;
}
