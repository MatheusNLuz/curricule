"use client";
import { useState } from "react";
import { OptimizedResumeSchema } from "@/lib/schemas/optimize.schema";
import { Button } from "@/components/ui/button";
import { readApiError } from "@/lib/api-client";
type Version = { id: string; content: string; source: string; createdAt: string };
const SECTIONS = { personalInfo: "Contato", professionalSummary: "Resumo", experiences: "Experiências", education: "Formação", skills: "Competências", certifications: "Certificações", projects:"Projetos", languages:"Idiomas" } as const;
export function ResumeVersions({ analysisId, current, revision, onRestore }: { analysisId: string; current: string; revision: number; onRestore: () => Promise<void> }) {
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [selected, setSelected] = useState(""); const [sections, setSections] = useState<string[]>([]);
  const [pending, setPending] = useState(false); const [error, setError] = useState("");
  const currentResume = OptimizedResumeSchema.safeParse(JSON.parse(current));
  const previous = versions?.find(item => item.id === selected);
  const previousResume = previous ? OptimizedResumeSchema.safeParse(JSON.parse(previous.content)) : null;
  async function load() {
    setPending(true); setError("");
    try { const response = await fetch("/api/analysis/" + analysisId + "/revisions"); if (!response.ok) throw new Error(await readApiError(response, "Falha ao carregar versões.")); setVersions(await response.json()); }
    catch (error) { setError((error as Error).message); } finally { setPending(false); }
  }
  async function restore() {
    if (!currentResume.success || !previousResume?.success || !sections.length) return;
    setPending(true); setError("");
    try {
      const merged = { ...currentResume.data } as Record<string, unknown>;
      for (const field of sections) merged[field] = previousResume.data[field as keyof typeof SECTIONS];
      const response = await fetch("/api/analysis/" + analysisId, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ finalResumeJson: JSON.stringify(merged), revision }) });
      if (!response.ok) throw new Error(await readApiError(response, "Não foi possível restaurar."));
      await onRestore(); setVersions(null); setSelected(""); setSections([]);
    } catch (error) { setError((error as Error).message); } finally { setPending(false); }
  }
  if (!currentResume.success) return null;
  return <details className="mb-6 rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-semibold">Comparar e recuperar versões</summary><div className="mt-4 flex flex-col gap-4"><p className="text-xs leading-6 text-muted-foreground">As últimas 20 revisões ficam na sua conta. Compare uma revisão com o currículo atual e escolha quais seções recuperar. A restauração cria outra revisão e remove notas e carta que ficaram desatualizadas.</p>{!versions && <Button variant="outline" disabled={pending} onClick={load}>{pending ? "Carregando…" : "Carregar revisões"}</Button>}{versions && <label className="flex flex-col gap-2 text-sm">Revisão para comparar<select className="h-11 rounded-lg border border-border bg-background px-3" value={selected} onChange={event => { setSelected(event.target.value); setSections([]); }}><option value="">Selecione uma revisão</option>{versions.map(item => <option key={item.id} value={item.id}>{new Date(item.createdAt).toLocaleString("pt-BR")} · {item.source === "ai" ? "IA" : "Edição / versão anterior"}</option>)}</select></label>}
    {previousResume?.success && Object.entries(SECTIONS).map(([field, label]) => {
      const key = field as keyof typeof SECTIONS; const old = previousResume.data[key]; const now = currentResume.data[key]; const changed = JSON.stringify(old) !== JSON.stringify(now);
      return <details key={field} className="border-t border-border py-3"><summary className="cursor-pointer text-sm">{label} · {changed ? "Diferente" : "Sem alteração"}</summary><div className="mt-3 grid gap-4 md:grid-cols-2"><div><h3 className="text-xs font-semibold">Atual</h3><pre className="mt-2 whitespace-pre-wrap break-words font-sans text-xs leading-6">{JSON.stringify(now, null, 2)}</pre></div><div><h3 className="text-xs font-semibold">Revisão selecionada</h3><pre className="mt-2 whitespace-pre-wrap break-words font-sans text-xs leading-6">{JSON.stringify(old, null, 2)}</pre></div></div>{changed && <label className="mt-3 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={sections.includes(field)} onChange={event => setSections(values => event.target.checked ? [...values, field] : values.filter(value => value !== field))} />Recuperar {label.toLowerCase()} desta revisão</label>}</details>;
    })}
    {previous && <Button disabled={pending || !sections.length} onClick={restore}>{pending ? "Restaurando…" : "Restaurar seções selecionadas"}</Button>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div></details>;
}
