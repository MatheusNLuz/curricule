"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ReviewedTruth } from "@/lib/ats/truth-policy";

export function TruthGuardPanel({ truthGuardData, onApprove, onEditAnswers }: { truthGuardData: ReviewedTruth; onApprove: (decisions: Record<string, boolean>) => Promise<void>; onEditAnswers: () => void }) {
  const [decisions, setDecisions] = useState<Record<string, boolean>>(truthGuardData.decisions || {});
  const [pending, setPending] = useState(false);
  const indexed = truthGuardData.claims.map((claim, index) => ({ claim, index }));
  const toReview = indexed.filter(({ claim }) => claim.source === "low_confidence_inference");
  const confirmed = indexed.filter(({ claim }) => claim.source === "confirmed_by_resume" || claim.source === "confirmed_by_user");
  const blocked = indexed.filter(({ claim }) => claim.source === "missing" || claim.source === "forbidden_to_use");
  const extraBlocked = truthGuardData.blockedClaims.filter(text => !blocked.some(({ claim }) => claim.claim === text));
  const incomplete = toReview.some(({ index }) => decisions[index] === undefined);
  async function approve() { setPending(true); try { await onApprove(decisions); } finally { setPending(false); } }

  return <section className="surface flex flex-col gap-5 rounded-xl border border-border p-5 sm:p-7" aria-labelledby="fact-review-title">
    <div>
      <h2 id="fact-review-title" className="text-lg font-semibold">Revisão de fatos</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Confira o que será considerado na reescrita. Requisitos da vaga não comprovam experiência.</p>
    </div>

    {toReview.length > 0 ? <div>
      <h3 className="text-sm font-semibold">Precisam da sua confirmação <span className="text-muted-foreground">· {toReview.length}</span></h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Escolha se cada informação é verdadeira para você.</p>
      <div className="mt-3 divide-y divide-border border-y border-border">
        {toReview.map(({ claim, index }) => <div key={index} className="py-4">
          <p className="text-sm font-medium leading-6">{claim.claim}</p>
          {claim.explanation && <p className="mt-1 text-xs leading-5 text-muted-foreground">{claim.explanation}</p>}
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`Decisão sobre: ${claim.claim}`}>
            <Button variant={decisions[index] === true ? "default" : "outline"} aria-pressed={decisions[index] === true} disabled={pending} onClick={() => setDecisions(current => ({ ...current, [index]: true }))}>Confirmo esse fato</Button>
            <Button variant={decisions[index] === false ? "destructive" : "outline"} aria-pressed={decisions[index] === false} disabled={pending} onClick={() => setDecisions(current => ({ ...current, [index]: false }))}>Rejeitar</Button>
          </div>
        </div>)}
      </div>
    </div> : <p className="rounded-lg bg-secondary/50 px-4 py-3 text-sm">Nenhum fato precisa da sua confirmação nesta etapa.</p>}

    {confirmed.length > 0 && <details className="rounded-lg border border-border px-4">
      <summary className="cursor-pointer py-3 text-sm font-semibold">Informações encontradas nas fontes <span className="font-normal text-muted-foreground">· {confirmed.length}</span></summary>
      <ul className="divide-y divide-border border-t border-border">{confirmed.map(({ claim, index }) => <li key={index} className="py-3"><p className="text-sm leading-6">{claim.claim}</p>{claim.explanation && <p className="mt-1 text-xs leading-5 text-muted-foreground">{claim.explanation}</p>}</li>)}</ul>
    </details>}

    {(blocked.length > 0 || extraBlocked.length > 0) && <details className="rounded-lg border border-border px-4">
      <summary className="cursor-pointer py-3 text-sm font-semibold">Informações que não serão usadas <span className="font-normal text-muted-foreground">· {blocked.length + extraBlocked.length}</span></summary>
      <p className="border-t border-border pt-3 text-xs leading-5 text-muted-foreground">Se alguma delas for verdadeira, esclareça nas respostas e valide novamente.</p>
      <ul className="divide-y divide-border">{blocked.map(({ claim, index }) => <li key={index} className="py-3"><p className="text-sm leading-6">{claim.claim}</p>{claim.explanation && <p className="mt-1 text-xs leading-5 text-muted-foreground">{claim.explanation}</p>}</li>)}{extraBlocked.map((claim, index) => <li key={`blocked-${index}`} className="py-3 text-sm leading-6">{claim}</li>)}</ul>
    </details>}

    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between"><Button variant="outline" disabled={pending} onClick={onEditAnswers}>Editar respostas</Button><Button disabled={pending || incomplete} onClick={approve}>{pending ? "Verificando e reescrevendo…" : incomplete ? "Revise as informações acima" : "Salvar decisões e otimizar"}</Button></div>
  </section>;
}
