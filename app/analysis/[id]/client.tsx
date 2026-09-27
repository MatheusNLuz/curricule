"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, ArrowRight, ShieldAlert, BarChart3, Download, RefreshCw, FileText } from "@/components/ui/app-icon";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/custom-toast";
import { RouteLine } from "@/components/ui/route-line";
import { getFetchErrorMessage, getLoginUrl, readApiError } from "@/lib/api-client";

const LinkedInDashboard = dynamic(
  () => import("@/components/analysis/linkedin-dashboard").then((module) => module.LinkedInDashboard),
  { loading: () => <div className="surface rounded-2xl p-6 text-sm text-muted-foreground">Carregando painel do LinkedIn...</div> },
);

interface Props { analysisId: string; }

export function AnalysisDashboardClient({ analysisId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState("Loading...");
  const [analysisData, setAnalysisData] = useState<any>(null);
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
      const res = await fetch(`/api/cover-letter`, {
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
          const resCl = await fetch(`/api/cover-letter`, {
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
        const r = await fetch("/api/analyze", { method: "POST", body: JSON.stringify({ analysisId }), headers: { "Content-Type": "application/json" }, signal });
        if (!r.ok) throw new Error(await readApiError(r, "Análise de ATS falhou"));
      }

      if (record.mode !== "MAKE_ATS_FRIENDLY" && record.jobDescription && !record.comparisonJson) {
        setStep("Comparando com a vaga...");
        const r = await fetch("/api/compare", { method: "POST", body: JSON.stringify({ analysisId }), headers: { "Content-Type": "application/json" }, signal });
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

  const parse = (v: any) => typeof v === "string" ? JSON.parse(v) : v;
  const analysis = parse(analysisData.analysisJson);
  const gamification = parse(analysisData.gamificationJson);
  const scores = parse(analysisData.initialScores);
  const finalScores = parse(analysisData.finalScores);

  if (analysisData.mode === "COVER_LETTER_ONLY") {
    return (
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold">Carta de Apresentação</h1>
            <p className="text-[13px] text-muted-foreground">Gerada com base no seu currículo e na vaga</p>
          </div>
          {analysisData.coverLetter && (
            <button
              onClick={handleDownloadCoverLetter}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/85 transition-colors"
            >
              <FileText className="h-4 w-4" /> Baixar Carta (.txt)
            </button>
          )}
        </div>
        <div className="surface mt-6 rounded-2xl p-4 sm:p-6">
           <textarea 
             className="w-full h-[60vh] bg-transparent resize-none outline-none text-[14px] leading-relaxed text-foreground" 
             value={analysisData.coverLetter || "Nenhuma carta gerada ainda."}
             readOnly
           />
        </div>
      </div>
    );
  }

  if (analysisData.mode === "LINKEDIN_OPTIMIZATION") {
    return (
      <LinkedInDashboard 
        analysis={analysis} 
        scores={scores} 
        gamification={gamification} 
        analysisId={analysisId} 
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-5 pb-24 pt-8 sm:px-8 lg:px-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Resultados da Análise</h1>
          <p className="text-[13px] text-muted-foreground">{analysisData.professionalTarget || "Otimização Geral"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {finalScores && (
            <Badge variant="outline" className="text-[12px] text-route border-route/20 bg-route/5">
              Otimizado
            </Badge>
          )}
          {gamification && (
            <Badge variant="secondary" className="text-[12px]">
              Nível {gamification.level}: {gamification.levelName}
            </Badge>
          )}
        </div>
      </div>

      {/* Optimization Banner */}
      {finalScores && (
        <div className="flex flex-col gap-3 rounded-2xl bg-route/10 border border-route/20 p-4 text-[13px] text-route sm:flex-row sm:items-center sm:justify-between">
          <div className="leading-relaxed">
            <span className="font-bold text-route">✨ Currículo otimizado com sucesso!</span> Suas respostas foram incorporadas. O score geral subiu de <span className="font-bold text-muted-foreground line-through">{scores?.overall}</span> para <span className="font-bold text-route">{finalScores?.overall}</span>.
          </div>
          <button 
            onClick={() => router.push(`/analysis/${analysisId}/preview`)}
            className="text-[12px] font-semibold text-route hover:text-route/80 underline"
          >
            Visualizar PDF
          </button>
        </div>
      )}

      {/* Visual Score Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Score Principal */}
        <div className="surface rounded-xl p-6 flex flex-col justify-between items-center text-center">
          <div className="w-full flex flex-col items-center">
            <p className="text-[12px] uppercase tracking-wider text-muted-foreground mb-4">Score Geral ATS</p>
            <div className="relative flex items-center justify-center h-32 w-32 rounded-full border-4 border-muted/30">
              <span className={`text-4xl font-bold font-mono ${finalScores ? "text-route" : scores?.overall && scores.overall < 60 ? "text-warning" : "text-primary"}`}>
                {finalScores ? finalScores.overall : scores?.overall || 0}
              </span>
              <span className="text-[12px] text-muted-foreground absolute bottom-4">/100</span>
            </div>
          </div>
          <div className="mt-4">
            {finalScores ? (
              <p className="text-[13px] font-semibold text-route flex items-center gap-1.5 justify-center">
                <CheckCircle2 className="h-4 w-4" /> CURRÍCULO OTIMIZADO
              </p>
            ) : (
              <p className="text-[13px] font-semibold text-warning flex items-center gap-1.5 justify-center">
                <AlertCircle className="h-4 w-4" /> RECOMENDA-SE OTIMIZAÇÃO
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
              {finalScores 
                ? "Seu currículo foi reorganizado com os fatos e as métricas que você confirmou."
                : "Seu currículo atual tem boa base, mas faltam termos específicos e métricas de impacto."}
            </p>
          </div>
        </div>

        {/* Card 2 & 3: Comparativo de Progresso */}
        <div className="surface rounded-xl p-6 md:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-[14px] font-semibold">
              {finalScores ? "Evolução Confirmada das Métricas" : "Potencial de Score após Otimização por Vaga"}
            </h3>
            <span className="text-[11px] font-mono text-muted-foreground uppercase">
              {finalScores ? "Antes vs Depois" : "Score Atual vs Previsão"}
            </span>
          </div>

          <div className="space-y-4">
            {/* Geral */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[12px]">
                <span className="font-medium text-muted-foreground">Score Geral</span>
                <span className="font-mono text-[11px] font-semibold">
                  {scores?.overall} % {finalScores ? `→ ${finalScores.overall} %` : "→ 85 % (Previsão)"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                    <span>Antes</span>
                    <span>{scores?.overall || 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-warning/50" style={{ width: `${scores?.overall || 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                    <span>{finalScores ? "Depois" : "Previsão"}</span>
                    <span>{finalScores ? finalScores.overall : 85}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${finalScores ? "bg-route" : "bg-primary/40"}`} style={{ width: `${finalScores ? finalScores.overall : 85}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* ATS */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[12px]">
                <span className="font-medium text-muted-foreground">Compatibilidade ATS</span>
                <span className="font-mono text-[11px] font-semibold">
                  {scores?.ats} % {finalScores ? `→ ${finalScores.ats} %` : "→ 85 % (Previsão)"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                    <span>Antes</span>
                    <span>{scores?.ats || 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-warning/50" style={{ width: `${scores?.ats || 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                    <span>{finalScores ? "Depois" : "Previsão"}</span>
                    <span>{finalScores ? finalScores.ats : 85}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${finalScores ? "bg-route" : "bg-primary/40"}`} style={{ width: `${finalScores ? finalScores.ats : 85}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Estrutura */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[12px]">
                <span className="font-medium text-muted-foreground">Estrutura e Formatação</span>
                <span className="font-mono text-[11px] font-semibold">
                  {scores?.structure} % {finalScores ? `→ ${finalScores.structure} %` : "→ 90 % (Previsão)"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                    <span>Antes</span>
                    <span>{scores?.structure || 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-warning/50" style={{ width: `${scores?.structure || 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                    <span>{finalScores ? "Depois" : "Previsão"}</span>
                    <span>{finalScores ? finalScores.structure : 90}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${finalScores ? "bg-route" : "bg-primary/40"}`} style={{ width: `${finalScores ? finalScores.structure : 90}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Impacto */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[12px]">
                <span className="font-medium text-muted-foreground">Métricas de Impacto</span>
                <span className="font-mono text-[11px] font-semibold">
                  {scores?.impact} % {finalScores ? `→ ${finalScores.impact} %` : "→ 80 % (Previsão)"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                    <span>Antes</span>
                    <span>{scores?.impact || 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-warning/50" style={{ width: `${scores?.impact || 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                    <span>{finalScores ? "Depois" : "Previsão"}</span>
                    <span>{finalScores ? finalScores.impact : 80}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${finalScores ? "bg-route" : "bg-primary/40"}`} style={{ width: `${finalScores ? finalScores.impact : 80}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Barra da Esquerda: Score Atual (Original)</span>
            <span>Barra da Direita: {finalScores ? "Score Otimizado" : "Projeção após Respostas"}</span>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Issues */}
        <div className="lg:col-span-3 space-y-6">
          <div className="surface rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-4 w-4 text-warning" />
              <h2 className="text-[14px] font-semibold">Problemas com ATS</h2>
            </div>
            <p className="text-[12px] text-muted-foreground mb-4">Problemas que podem bloquear a leitura por robôs (ATS).</p>
            <div className="space-y-2">
              {(!analysis?.atsIssues || analysis.atsIssues.length === 0) ? (
                <div className="flex items-center gap-2 rounded-lg bg-route/5 border border-route/10 p-3 text-[13px] text-route">
                  <CheckCircle2 className="h-4 w-4" /> Nenhum problema grave encontrado.
                </div>
              ) : (
                analysis.atsIssues.map((issue: any, i: number) => (
                  <div key={i} className="rounded-lg bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium">{issue.type}</span>
                      <Badge variant="outline" className={`text-[10px] ${
                        issue.severity === "high" ? "text-signal border-signal/20" :
                        issue.severity === "medium" ? "text-warning border-warning/20" :
                        "text-muted-foreground"
                      }`}>{issue.severity}</Badge>
                    </div>
                    <p className="text-[12px] text-muted-foreground">{issue.description}</p>
                    <p className="text-[12px] text-primary">Corrigir: {issue.recommendation}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {analysis?.sensitiveDataWarnings?.length > 0 && (
            <div className="surface rounded-xl p-5 border border-signal/10">
              <h2 className="text-[14px] font-semibold text-signal mb-3 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Dados Sensíveis</h2>
              <div className="space-y-2">
                {analysis.sensitiveDataWarnings.map((w: any, i: number) => (
                  <div key={i} className="rounded-lg bg-signal/5 border border-signal/10 p-3 text-[12px]">
                    <span className="font-medium text-signal">{w.type}:</span> <span className="text-signal/80">{w.recommendation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Strengths/Weaknesses */}
        <div className="lg:col-span-2 space-y-6">
          <div className="surface rounded-xl p-5">
            <h2 className="text-[14px] font-semibold mb-3">Pontos Fortes</h2>
            <ul className="space-y-2">
              {analysis?.strengths?.map((s: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-route mt-0.5 shrink-0" />{s}
                </li>
              ))}
            </ul>
          </div>
          <div className="surface rounded-xl p-5">
            <h2 className="text-[14px] font-semibold mb-3">Fraquezas</h2>
            <ul className="space-y-2">
              {analysis?.weaknesses?.map((w: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <AlertCircle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />{w}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 pt-6 border-t border-border">
        {finalScores ? (
          <>
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-[14px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Baixar PDF
            </button>
            {analysisData?.coverLetter ? (
              <button
                onClick={handleDownloadCoverLetter}
                className="inline-flex items-center gap-2 rounded-lg bg-route px-6 py-3 text-[14px] font-medium text-background hover:bg-route/90 transition-colors"
              >
                <FileText className="h-4 w-4" /> Baixar Carta de Apresentação
              </button>
            ) : (
              <button
                onClick={handleGenerateCoverLetter}
                disabled={generatingLetter}
                className="inline-flex items-center gap-2 rounded-lg bg-route px-6 py-3 text-[14px] font-medium text-background hover:bg-route/90 transition-colors disabled:opacity-50"
              >
                {generatingLetter ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                ✨ Gerar Carta de Apresentação
              </button>
            )}
            <button
              onClick={() => router.push(`/analysis/${analysisId}/editor`)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-6 py-3 text-[14px] font-medium text-foreground hover:bg-secondary/80 transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> Otimizar Novamente
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push(`/analysis/${analysisId}/editor`)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-[14px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Corrigir e Otimizar Currículo <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
