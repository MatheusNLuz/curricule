"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { readApiError } from "@/lib/api-client";

export function SourceLinkInput({ kind, url, onUrlChange, content, onContentChange, ensureAnalysis, reviewed, onReviewedChange }: {
  kind: "job" | "linkedin"; url: string; onUrlChange: (value: string) => void;
  content: string; onContentChange: (value: string) => void; ensureAnalysis: () => Promise<string>;
  reviewed: boolean; onReviewedChange: (value: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [loadedUrl, setLoadedUrl] = useState("");
  async function load() {
    setPending(true); setError(""); onReviewedChange(false);
    try {
      const analysisId = await ensureAnalysis();
      const response = await fetch("/api/import-source", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysisId, kind, url }) });
      if (!response.ok) throw new Error(await readApiError(response, "Não foi possível ler o link."));
      const data = await response.json();
      onContentChange(data.text); setLoadedUrl(url);
    } catch (error) { setError(error instanceof Error ? error.message : "Não foi possível ler o link. Cole o texto ou envie um PDF."); }
    finally { setPending(false); }
  }
  const validContent = !!loadedUrl && loadedUrl === url;
  const label = kind === "job" ? "Link da vaga" : "Link do seu perfil do LinkedIn";
  return <div className="flex flex-col gap-4">
    <label className="flex flex-col gap-2 text-sm font-medium">{label}
      <Input type="url" maxLength={2048} value={url} disabled={pending} onChange={event => { onUrlChange(event.target.value); onReviewedChange(false); setError(""); }} placeholder={kind === "job" ? "https://empresa.com/carreiras/vaga" : "https://www.linkedin.com/in/seu-perfil/"} />
    </label>
    <Button type="button" variant="outline" className="self-start" disabled={pending || !url.trim()} onClick={load}>{pending ? "Lendo a página…" : kind === "job" ? "Ler descrição da vaga" : "Ler perfil público"}</Button>
    <p className="text-xs leading-6 text-muted-foreground">{kind === "job" ? "Vamos ler a página pública e mostrar a descrição para você conferir. Se ela exigir login ou não disponibilizar o texto, use Colar descrição." : "Lemos somente o conteúdo público do perfil. Se o LinkedIn bloquear o acesso ou exibir conteúdo incompleto, use Colar texto ou envie o PDF exportado do perfil."}</p>
    {error && <p role="alert" className="text-sm leading-6 text-destructive">{error}</p>}
    {content && validContent && <>
      <label className="flex flex-col gap-2 text-sm font-medium">{kind === "job" ? "Descrição lida — revise e ajuste se necessário" : "Conteúdo público lido — confira se o perfil está completo"}<Textarea value={content} maxLength={60000} onChange={event => { onContentChange(event.target.value); onReviewedChange(false); }} className="min-h-60" /></label>
      <label className="flex min-h-11 items-start gap-3 text-sm leading-6"><input className="mt-1 size-4 accent-primary" type="checkbox" checked={reviewed} onChange={event => onReviewedChange(event.target.checked)} />Conferi o conteúdo e quero usá-lo na análise.</label>
    </>}
  </div>;
}
