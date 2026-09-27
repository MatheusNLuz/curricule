"use client";

import { useState } from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2, ArrowRight } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";

export function TruthGuardPanel({ truthGuardData, onApprove, onEditAnswers }: { truthGuardData: any, onApprove: () => void, onEditAnswers: () => void }) {
  const [approvedClaims, setApprovedClaims] = useState<Record<string, boolean>>({});

  if (!truthGuardData || !truthGuardData.claims) return null;

  const toggleApproval = (index: number) => {
    setApprovedClaims({ ...approvedClaims, [index]: !approvedClaims[index] });
  };

  const hasUnreviewedLowConfidence = truthGuardData.claims.some(
    (c: any, i: number) => c.source === "low_confidence_inference" && approvedClaims[i] === undefined
  );

  return (
    <div className="surface rounded-xl p-6 border border-warning/30">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-5 h-5 text-warning" />
        <h2 className="text-[16px] font-semibold">Truth Guard: Revisão de Fatos</h2>
      </div>
      
      <p className="text-[13px] text-muted-foreground mb-6">
        A IA identificou algumas informações que não estão explicitamente claras no seu currículo original. 
        Para manter a integridade, você deve aprovar ou rejeitar estas adições antes de reescrevermos o currículo.
      </p>

      <div className="space-y-4 mb-6">
        {truthGuardData.claims.map((claim: any, i: number) => {
          if (claim.source === "confirmed_by_resume" || claim.source === "confirmed_by_user") {
            return (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-route/10 border border-route/20">
                <ShieldCheck className="w-4 h-4 text-route shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-medium text-route">{claim.claim}</p>
                  <p className="text-[11px] text-route/70 mt-0.5">{claim.explanation}</p>
                </div>
              </div>
            );
          }
          
          if (claim.source === "forbidden_to_use" || claim.source === "missing") {
            return (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-signal/10 border border-signal/20">
                <AlertTriangle className="w-4 h-4 text-signal shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-medium text-signal line-through">{claim.claim}</p>
                  <p className="text-[11px] text-signal/70 mt-0.5">{claim.explanation}</p>
                </div>
              </div>
            );
          }

          // Low confidence inference
          const isApproved = approvedClaims[i];
          return (
            <div key={i} className={`flex gap-3 p-4 rounded-lg border transition-colors ${isApproved ? 'bg-primary/10 border-primary/30' : 'bg-warning/5 border-warning/20'}`}>
              <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isApproved ? 'text-primary' : 'text-warning'}`} />
              <div className="flex-1">
                <p className="text-[13px] font-medium mb-1">{claim.claim}</p>
                <p className="text-[11px] text-muted-foreground mb-3">{claim.explanation}</p>
                
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant={isApproved === true ? "default" : "outline"}
                    className={isApproved === true ? "bg-primary text-primary-foreground" : ""}
                    onClick={() => setApprovedClaims({ ...approvedClaims, [i]: true })}
                  >
                    Aprovar Adição
                  </Button>
                  <Button 
                    size="sm" 
                    variant={isApproved === false ? "destructive" : "outline"}
                    onClick={() => setApprovedClaims({ ...approvedClaims, [i]: false })}
                  >
                    Rejeitar
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between pt-4 border-t border-border mt-6">
        <Button 
          variant="outline"
          onClick={onEditAnswers} 
          className="text-muted-foreground"
        >
          Voltar e Editar Respostas
        </Button>
        <Button 
          onClick={onApprove} 
          disabled={hasUnreviewedLowConfidence}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {hasUnreviewedLowConfidence ? "Revise as inferências acima" : "Aprovar e Reescrever Currículo"} <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
