"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ReviewedTruth } from "@/lib/ats/truth-policy";

export function TruthGuardPanel({ truthGuardData, onApprove, onEditAnswers }: { truthGuardData: ReviewedTruth; onApprove: (decisions: Record<string, boolean>) => Promise<void>; onEditAnswers: () => void }) {
  const [decisions, setDecisions] = useState<Record<string, boolean>>(truthGuardData.decisions || {});
  const [pending, setPending] = useState(false);
  const incomplete = truthGuardData.claims.some((claim, index) => claim.source === "low_confidence_inference" && decisions[index] === undefined);
  async function approve() { setPending(true); try { await onApprove(decisions); } finally { setPending(false); } }
  return <section className="surface flex flex-col gap-5 rounded-xl border border-border p-5">
    <div><h2 className="text-lg font-semibold">Revisão de fatos</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Confirme apenas o que você pode sustentar. Suas rejeições serão salvas e aplicadas à reescrita e à carta. Requisitos da vaga não comprovam experiência.</p></div>
    {truthGuardData.claims.map((claim, index) => <div key={index} className="rounded-lg bg-secondary/40 p-4"><p className="text-sm font-medium">{claim.claim}</p><p className="mt-2 text-xs leading-6 text-muted-foreground">{claim.explanation}</p>{claim.source === "low_confidence_inference" ? <div className="mt-3 flex flex-wrap gap-2"><Button variant={decisions[index] === true ? "default" : "outline"} aria-pressed={decisions[index] === true} disabled={pending} onClick={() => setDecisions(current => ({ ...current, [index]: true }))}>Confirmo esse fato</Button><Button variant={decisions[index] === false ? "destructive" : "outline"} aria-pressed={decisions[index] === false} disabled={pending} onClick={() => setDecisions(current => ({ ...current, [index]: false }))}>Rejeitar</Button></div> : <p className="mt-2 text-xs font-medium">{["missing", "forbidden_to_use"].includes(claim.source) ? "Bloqueado — não será usado. Se a informação for real, esclareça nas respostas e valide novamente." : "Confirmado nas fontes informadas."}</p>}</div>)}
    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between"><Button variant="outline" disabled={pending} onClick={onEditAnswers}>Editar respostas</Button><Button disabled={pending || incomplete} onClick={approve}>{pending ? "Verificando e reescrevendo…" : incomplete ? "Revise as inferências acima" : "Salvar decisões e otimizar"}</Button></div>
  </section>;
}
