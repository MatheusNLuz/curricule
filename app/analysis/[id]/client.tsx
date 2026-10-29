"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { parseAnalysisJson, type AnalysisView } from "@/lib/analysis-view";
import type { ResumeAnalysis, LinkedInAnalysis } from "@/lib/schemas/analysis.schema";
import { Loader2, AlertCircle, FileText } from "@/components/ui/app-icon";
import { ResumeAnalysisView } from "@/components/analysis/resume-analysis-view";
import { WorkspacePage, PageHeading, Sheet } from "@/components/workspace/workspace-ui";
import { useToast } from "@/components/ui/custom-toast";
import { RouteLine } from "@/components/ui/route-line";
import { getFetchErrorMessage, getLoginUrl, readApiError, fetchAnalysisTask } from "@/lib/api-client";
import { AiReviewNotice } from "@/components/analysis/ai-review-notice";

const LinkedInDashboard = dynamic(
  () => import("@/components/analysis/linkedin-dashboard").then((module) => module.LinkedInDashboard),
  { loading: () => <div className="surface rounded-2xl p-6 text-sm text-muted-foreground">Carregando painel do LinkedIn...</div> },
);

interface Props { analysisId: string; }

export function AnalysisDashboardClient({ analysisId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState("Preparando sua análise…");
  const [analysisData, setAnalysisData] = useState<AnalysisView|null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const analysisRequestRef = useRef<AbortController | null>(null);

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        body: JSON.stringify({ analysisId }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(await readApiError(res, "Falha ao gerar PDF"));
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Resume_${analysisId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "PDF baixado!", description: "O currículo otimizado foi baixado com sucesso.", variant: "success" });
    } catch (error: unknown) {
      toast({ title: "Erro ao exportar", description: getFetchErrorMessage(error, "Tente novamente em instantes."), variant: "error" });
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDownloadCoverLetter = () => {
    if (!analysisData?.coverLetter) return;
    const blob = new Blob([analysisData.coverLetter], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CoverLetter_${analysisId}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast({ title: "Carta baixada!", description: "Sua carta de apresentação foi baixada.", variant: "success" });
  };

  const handleGenerateCoverLetter = async () => {
    setGeneratingLetter(true);
    try {
      const res = await fetchAnalysisTask(`/api/cover-letter`, {
        method: "POST", body: JSON.stringify({ analysisId }), headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error(await readApiError(res, "Falha ao gerar a carta de apresentação."));
      const d = await res.json();
      if (d.success) {
        const finalRes = await fetch(`/api/analysis/${analysisId}`);
        if (!finalRes.ok) throw new Error(await readApiError(finalRes, "Falha ao atualizar a análise."));
        setAnalysisData(await finalRes.json());
        toast({ title: "Sucesso", description: "Carta de apresentação gerada com sucesso!", variant: "success" });
      } else {
        throw new Error(d.error || "Falha ao gerar");
      }
    } catch (error: unknown) {
      toast({ title: "Erro", description: getFetchErrorMessage(error, "Falha ao gerar carta de apresentação"), variant: "error" });
    } finally {
      setGeneratingLetter(false);
    }
  };

// Translated lines only
  const runAnalysis = useCallback(async () => {
    analysisRequestRef.current?.abort();
    const controller = new AbortController();
    analysisRequestRef.current = controller;
    const { signal } = controller;
    setLoading(true);
    setError(null);
    try {
      setStep("Verificando status...");
      const res = await fetch(`/api/analysis/${analysisId}`, { signal });
      if (res.status === 401) {
        router.push(getLoginUrl(`/analysis/${analysisId}`));
        return;
      }
      if (!res.ok) throw new Error(await readApiError(res, "Falha ao carregar registro da análise"));
      const record = await res.json();

      if (record.mode === "COVER_LETTER_ONLY") {
        if (!record.coverLetter) {
          setStep("Gerando Carta de Apresentação...");
          const resCl = await fetchAnalysisTask(`/api/cover-letter`, {
            method: "POST", body: JSON.stringify({ analysisId }), signal
          });
          if (!resCl.ok) throw new Error(await readApiError(resCl, "Falha ao gerar carta de apresentação"));
        }
        setStep("Concluído");
        const finalRes = await fetch(`/api/analysis/${analysisId}`, { signal });
        if (!finalRes.ok) throw new Error(await readApiError(finalRes, "Falha ao carregar o resultado da análise"));
        setAnalysisData(await finalRes.json());
        setLoading(false);
        return;
      }

      if (!record.analysisJson) {
        setStep("Rodando análise de ATS...");
        const r = await fetchAnalysisTask("/api/analyze", { method: "POST", body: JSON.stringify({ analysisId }), headers: { "Content-Type": "application/json" }, signal });
        if (!r.ok) throw new Error(await readApiError(r, "Análise de ATS falhou"));
      }

      if (record.mode !== "MAKE_ATS_FRIENDLY" && record.jobDescription && !record.comparisonJson) {
        setStep("Comparando com a vaga...");
        const r = await fetchAnalysisTask("/api/compare", { method: "POST", body: JSON.stringify({ analysisId }), headers: { "Content-Type": "application/json" }, signal });
        if (!r.ok) throw new Error(await readApiError(r, "Comparação falhou"));
      }

      setStep("Concluído");
      const finalRes = await fetch(`/api/analysis/${analysisId}`);
      if (!finalRes.ok) throw new Error(await readApiError(finalRes, "Falha ao carregar o resultado da análise"));
      setAnalysisData(await finalRes.json());
    } catch (error: unknown) {
      if (signal.aborted) return;
      const message = getFetchErrorMessage(error, "A análise não foi concluída.");
      setError(message);
      toast({ title: "Análise falhou", description: message, variant: "error" });
    } finally {
      if (analysisRequestRef.current === controller) {
        analysisRequestRef.current = null;
        setLoading(false);
      }
    }
  }, [analysisId, router, toast]);

  useEffect(() => {
    // The effect starts a cancellable network request; loading/error reflect that request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runAnalysis();
    return () => {
      const controller = analysisRequestRef.current;
      analysisRequestRef.current = null;
      controller?.abort();
    };
  }, [runAnalysis]);

  if (loading) {
    const activeRoute = step.includes("Comparando") ? 1 : step.includes("Concluído") ? 2 : 0;
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center gap-8 px-5 sm:px-8">
        <div className="text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-soft-primary text-primary"><Loader2 className="h-7 w-7 animate-spin" /></div><p className="mt-5 font-heading text-xl font-semibold tracking-[-0.03em]">{step}</p><p className="mt-2 text-[12px] text-muted-foreground">Isso pode levar alguns segundos.</p></div>
        <RouteLine activeIndex={activeRoute} steps={[{ label: "Lendo o material" }, { label: "Entendendo o contexto" }, { label: "Organizando o resultado" }]} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-5">
        <div className="surface max-w-sm rounded-2xl p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-signal" />
          <h2 className="text-[15px] font-semibold mb-1">Análise falhou</h2>
          <p className="text-[13px] text-muted-foreground mb-5">{error}</p>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <button onClick={() => router.push("/")} className="h-10 rounded-xl bg-secondary px-4 text-[13px] font-medium text-foreground hover:bg-secondary/80">Início</button>
            <button onClick={runAnalysis} className="h-10 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/85">Tentar novamente</button>
          </div>
        </div>
      </div>
    );
  }

  if (!analysisData) return null;
  const analysis=parseAnalysisJson<ResumeAnalysis>(analysisData.analysisJson);
  const gamification=parseAnalysisJson<unknown>(analysisData.gamificationJson);
  const scores=parseAnalysisJson<Record<string,number>>(analysisData.initialScores);
  const finalScores=parseAnalysisJson<Record<string,number>>(analysisData.finalScores);

  if (analysisData.mode === "COVER_LETTER_ONLY") {
    return <WorkspacePage><PageHeading title="Uma apresentação com a sua voz." description="Conecte sua experiência à oportunidade. Revise o tom e os fatos antes de enviar.">{analysisData.coverLetter&&<button onClick={handleDownloadCoverLetter} className="button primary"><FileText size={17}/>Baixar carta (.txt)</button>}</PageHeading><div className="letterLayout"><Sheet className="letterSheet"><div className="letterMeta"><span>Carta de apresentação</span><span>Texto para sua revisão</span></div><p className="sourceText">{analysisData.coverLetter||"Nenhuma carta gerada ainda."}</p></Sheet><aside className="contextAside"><h2>Antes de enviar.</h2><p>Confira o nome da empresa, o tom da apresentação e as informações da sua trajetória.</p></aside></div></WorkspacePage>;
  }

  if (analysisData.mode === "LINKEDIN_OPTIMIZATION") {
    return (
      <><div className="mx-auto max-w-6xl px-5 pt-5">{analysisData.reviewStatuses?.ANALYZE === "unavailable" && <AiReviewNotice subject="analysis" />}</div><LinkedInDashboard 
        analysis={parseAnalysisJson<LinkedInAnalysis>(analysisData.finalResumeJson||analysisData.analysisJson)!}
        scores={finalScores || scores || {}}
        gamification={gamification} 
        analysisId={analysisId}
        language={analysisData.selectedLanguage}
        title={analysisData.professionalTarget}
      /></>
    );
  }

  return <>{analysisData.reviewStatuses?.ANALYZE === "unavailable" && <div className="mx-auto max-w-6xl px-5 pt-5"><AiReviewNotice subject="analysis" /></div>}<ResumeAnalysisView analysisId={analysisId} record={analysisData} analysis={analysisData.finalAssessmentJson?parseAnalysisJson<ResumeAnalysis>(analysisData.finalAssessmentJson):analysis} scores={scores} finalScores={finalScores} onExport={handleExportPdf} exporting={exportingPdf} onGenerateLetter={handleGenerateCoverLetter} generatingLetter={generatingLetter} onDownloadLetter={handleDownloadCoverLetter} onRefresh={runAnalysis}/></>;
}
