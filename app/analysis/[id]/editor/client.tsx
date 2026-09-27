"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, ArrowRight, Sparkles, Download, FileText, Briefcase, HelpCircle, PenTool, Layout } from "@/components/ui/app-icon";
import { useToast } from "@/components/ui/custom-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StructuredResumeEditor } from "@/components/editor/structured-resume-editor";
import { TruthGuardPanel } from "@/components/analysis/truth-guard-panel";
import { PreviewTemplate } from "@/components/preview/preview-template";
import { RouteLine } from "@/components/ui/route-line";
import { getFetchErrorMessage, getLoginUrl, readApiError } from "@/lib/api-client";
import { normalizeTemplateId } from "@/lib/preview-template";

export function EditorClient({ analysisId }: { analysisId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("match");

  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [truthGuardData, setTruthGuardData] = useState<any>(null);
  const [runningTruthGuard, setRunningTruthGuard] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const generatingRef = useRef(false);
  const templateRequestRef = useRef(0);

  useEffect(() => {
    fetchData();
  }, [analysisId]);

  async function fetchData() {
    try {
      const res = await fetch(`/api/analysis/${analysisId}`);
      if (res.status === 401) {
        router.push(getLoginUrl(`/analysis/${analysisId}/editor`));
        return;
      }
      if (!res.ok) throw new Error(await readApiError(res, "Não foi possível carregar a análise."));
      const d = await res.json();
      setData(d);
      
      if (d.mode === "LINKEDIN_OPTIMIZATION") {
        setActiveTab("questions");
      } else if (!d.comparisonJson && d.jobDescription) {
        // Needs match
      } else if (!d.questions || d.questions.length === 0) {
        // Generate questions if not exist
        if (!generatingRef.current) {
          generatingRef.current = true;
          fetchQuestions();
        }
      } else {
        setQuestions(d.questions);
        // Load existing answers into state
        const initialAnswers: Record<string, string> = {};
        d.questions.forEach((q: any) => {
          if (q.answer) initialAnswers[q.id] = q.answer;
          else if (q.suggestedAnswer) initialAnswers[q.id] = q.suggestedAnswer;
        });
        setAnswers(initialAnswers);
      }
    } catch (error: unknown) {
      toast({ title: "Não foi possível carregar", description: getFetchErrorMessage(error, "Tente novamente em instantes."), variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  const fetchQuestions = async () => {
    setGeneratingQuestions(true);
    try {
      const res = await fetch(`/api/smart-questions`, {
        method: "POST", body: JSON.stringify({ analysisId }), headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error(await readApiError(res, "Não foi possível gerar as perguntas."));
      const d = await res.json();
      if (d.success) {
        setQuestions(d.questions);
        const initialAnswers: Record<string, string> = {};
        d.questions.forEach((q: any) => {
          if (q.answer) initialAnswers[q.id] = q.answer;
        });
        setAnswers(initialAnswers);
      }
    } catch (error: unknown) {
      toast({ title: "Não foi possível gerar as perguntas", description: getFetchErrorMessage(error, "Tente novamente em instantes."), variant: "error" });
    } finally {
      setGeneratingQuestions(false);
    }
  };

// Translate the editor UI
  const handleTruthGuard = async () => {
    setRunningTruthGuard(true);
    try {
      // First save typed answers
      const saveResponse = await fetch(`/api/smart-questions/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId, answers })
      });
      if (!saveResponse.ok) throw new Error(await readApiError(saveResponse, "Não foi possível salvar suas respostas."));

      const res = await fetch(`/api/truth-guard`, {
        method: "POST", body: JSON.stringify({ analysisId }), headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error(await readApiError(res, "Falha ao verificar a integridade do conteúdo."));
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Falha ao verificar a integridade do conteúdo.");
      setTruthGuardData(d.truthGuard);
    } catch (error: unknown) {
      toast({ title: "Não foi possível validar os fatos", description: getFetchErrorMessage(error, "Tente novamente em instantes."), variant: "error" });
    } finally {
      setRunningTruthGuard(false);
    }
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      // First save typed answers
      const saveResponse = await fetch(`/api/smart-questions/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId, answers })
      });
      if (!saveResponse.ok) throw new Error(await readApiError(saveResponse, "Não foi possível salvar suas respostas."));

      const res = await fetch(`/api/optimize`, {
        method: "POST", body: JSON.stringify({ analysisId }), headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error(await readApiError(res, "Falha ao otimizar o currículo."));
      const d = await res.json();
      if (d.success) {
        if (data.mode === "LINKEDIN_OPTIMIZATION") {
          toast({ title: "Sucesso", description: "Perfil do LinkedIn otimizado com sucesso!", variant: "success" });
          router.push(`/analysis/${analysisId}`);
        } else {
          toast({ title: "Sucesso", description: "Currículo otimizado!", variant: "success" });
          fetchData();
          setActiveTab("preview");
        }
      } else {
        throw new Error(d.error || "Falha ao otimizar o currículo.");
      }
    } catch (error: unknown) {
      toast({ title: "Não foi possível otimizar", description: getFetchErrorMessage(error, "Tente novamente em instantes."), variant: "error" });
    } finally {
      setOptimizing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/export`, {
        method: "POST", body: JSON.stringify({ analysisId })
      });
      if (!res.ok) throw new Error(await readApiError(res, "Falha ao exportar o PDF."));
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Curriculy_Resume_${analysisId}.pdf`;
      a.click();
      toast({ title: "Exportado", description: "Seu PDF está pronto.", variant: "success" });
    } catch (error: unknown) {
      toast({ title: "Não foi possível exportar", description: getFetchErrorMessage(error, "Tente novamente em instantes."), variant: "error" });
    } finally {
      setExporting(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    setGeneratingLetter(true);
    try {
      const res = await fetch(`/api/cover-letter`, {
        method: "POST", body: JSON.stringify({ analysisId }), headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error(await readApiError(res, "Falha ao gerar a carta de apresentação."));
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Falha ao gerar a carta de apresentação.");
      await fetchData();
    } catch (error: unknown) {
      toast({ title: "Não foi possível gerar a carta", description: getFetchErrorMessage(error, "Tente novamente em instantes."), variant: "error" });
    } finally {
      setGeneratingLetter(false);
    }
  };

  const handleSaveManualEdit = async (newData: any) => {
    try {
      const res = await fetch(`/api/analysis/${analysisId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalResumeJson: JSON.stringify(newData) }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Falha ao salvar as alterações."));
      await fetchData();
    } catch (error: unknown) {
      toast({ title: "Não foi possível salvar", description: getFetchErrorMessage(error, "Tente novamente em instantes."), variant: "error" });
    }
  };

  const handleTemplateChange = async (value: string) => {
    if (!data) return;

    const templateId = normalizeTemplateId(value);
    const previousTemplateId = normalizeTemplateId(data.selectedTemplate);
    const requestId = ++templateRequestRef.current;

    setData((current: any) => current ? { ...current, selectedTemplate: templateId } : current);

    try {
      const res = await fetch(`/api/analysis/${analysisId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedTemplate: templateId }),
      });

      if (!res.ok) throw new Error(await readApiError(res, "Não foi possível salvar o template."));
    } catch (error: unknown) {
      if (requestId !== templateRequestRef.current) return;

      setData((current: any) => current ? { ...current, selectedTemplate: previousTemplateId } : current);
      toast({ title: "Template não salvo", description: getFetchErrorMessage(error, "Tente novamente em instantes."), variant: "error" });
    }
  };

  if (loading || !data) return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-5 py-16">
      <div className="surface w-full rounded-2xl p-6 text-center sm:p-8">
        <Loader2 className="mx-auto h-9 w-9 animate-spin text-primary" />
        <p className="mt-4 text-sm font-semibold">Preparando seu espaço de edição</p>
        <p className="mt-1 text-xs text-muted-foreground">Estamos organizando as próximas decisões do seu currículo.</p>
        <RouteLine
          className="mt-8 text-left"
          activeIndex={1}
          steps={[
            { label: "Leitura", description: "Currículo recebido" },
            { label: "Edição", description: "Espaço sendo preparado" },
            { label: "Exportação", description: "Disponível depois" },
          ]}
        />
      </div>
    </div>
  );

  const match = data.comparisonJson ? JSON.parse(data.comparisonJson) : null;
  const optimized = data.finalResumeJson ? JSON.parse(data.finalResumeJson) : null;

  const isLinkedIn = data.mode === "LINKEDIN_OPTIMIZATION";

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-6 sm:px-8 lg:px-12 lg:pb-12">
      <div className="mb-8">
        <button 
          onClick={() => router.push(`/analysis/${analysisId}`)}
          className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-lg text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para o Painel de Resultados
        </button>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {isLinkedIn ? "Otimizar Perfil do LinkedIn" : "Editor de Currículo e Otimização"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {isLinkedIn 
            ? "Responda perguntas estratégicas para traduzir sua experiência em evidências reais de performance."
            : "Responda perguntas, ajuste o conteúdo e leve uma versão pronta para cada oportunidade."}
        </p>
        <RouteLine
          className="mt-7 max-w-3xl"
          activeIndex={isLinkedIn ? 1 : activeTab === "preview" || activeTab === "coverletter" ? 2 : 1}
          steps={[
            { label: "Entender", description: "Contexto e compatibilidade" },
            { label: "Ajustar", description: "Conteúdo com intenção" },
            { label: "Levar", description: "Preview e exportação" },
          ]}
        />
      </div>

      {isLinkedIn ? (
        <div className="space-y-6 animate-fade-in">
          <div className="surface rounded-2xl p-4 sm:p-6">
            <h2 className="mb-4 text-base font-semibold">Perguntas Estratégicas (Smart Questions)</h2>
            <p className="mb-6 max-w-3xl text-sm leading-6 text-muted-foreground">
              Responda sobre suas experiências para transformar responsabilidades em descrições com contexto, impacto e dados reais — sem inventar informações.
            </p>
            {generatingQuestions ? (
                <div className="flex flex-col items-center justify-center space-y-4 rounded-xl bg-secondary/30 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-center text-sm font-medium text-primary animate-pulse">
                  Organizando perguntas a partir do seu perfil...
                </div>
              </div>
            ) : questions.length === 0 ? (
              <div className="text-[13px] text-muted-foreground">Nenhuma pergunta gerada.</div>
            ) : (
              <div className="space-y-5">
                {questions.map((q: any, i: number) => (
                  <div key={q.id} className="rounded-xl border border-border/70 bg-secondary/30 p-4 sm:p-5">
                    <p className="text-[14px] font-semibold mb-2">{i + 1}. {q.question}</p>
                    <p className="mb-3 text-xs font-medium text-primary">Por que isso importa: {q.reason}</p>
                    {q.suggestedAnswer && (
                      <button
                        type="button"
                        onClick={() => setAnswers({ ...answers, [q.id]: q.suggestedAnswer })}
                        className="mb-2 inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20 cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Usar Sugestão da IA
                      </button>
                    )}
                    <Textarea 
                      aria-label={`Resposta para a pergunta ${i + 1}`}
                      className="text-[13px] bg-background" 
                      placeholder="Sua resposta…"
                      value={answers[q.id] || ""}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6">
              {!truthGuardData ? (
                <button onClick={handleTruthGuard} disabled={runningTruthGuard} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:w-auto cursor-pointer">
                  {runningTruthGuard ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Verificando Integridade...</> : <>Validar Fatos & Otimizar Perfil <ArrowRight className="ml-2 h-3.5 w-3.5" /></>}
                </button>
              ) : (
                <TruthGuardPanel 
                  truthGuardData={truthGuardData} 
                  onApprove={handleOptimize} 
                  onEditAnswers={() => setTruthGuardData(null)}
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="-mx-1 mb-6 flex w-[calc(100%+0.5rem)] overflow-x-auto rounded-xl bg-secondary p-1 sm:w-auto">
          {match && <TabsTrigger value="match" className="shrink-0 text-xs sm:text-[13px]"><Briefcase className="mr-2 h-3.5 w-3.5" /> Compatibilidade com a Vaga</TabsTrigger>}
          <TabsTrigger value="questions" className="shrink-0 text-xs sm:text-[13px]"><HelpCircle className="mr-2 h-3.5 w-3.5" /> Smart Questions</TabsTrigger>
          {optimized && <TabsTrigger value="edit" className="shrink-0 text-xs sm:text-[13px]"><PenTool className="mr-2 h-3.5 w-3.5" /> Editar Estrutura</TabsTrigger>}
          <TabsTrigger value="preview" className="shrink-0 text-xs sm:text-[13px]"><Layout className="mr-2 h-3.5 w-3.5" /> Preview & Exportar</TabsTrigger>
          <TabsTrigger value="coverletter" className="shrink-0 text-xs sm:text-[13px]"><FileText className="mr-2 h-3.5 w-3.5" /> Carta de Apresentação</TabsTrigger>
        </TabsList>

        {match && (
          <TabsContent value="match" className="space-y-6">
            <div className="surface rounded-2xl p-4 sm:p-6">
              <h2 className="mb-4 text-base font-semibold">Análise de Compatibilidade</h2>
              <div className="mb-6 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="text-4xl font-bold tracking-tight text-primary">{match.matchPercentage}%</div>
                <div className="text-sm text-muted-foreground">Uma leitura inicial do quanto seu currículo conversa com esta oportunidade.</div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-secondary/50 p-4">
                  <h3 className="mb-2 text-sm font-medium">Habilidades obrigatórias ausentes</h3>
                  <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                    {match.missingMandatorySkills.map((s: string) => <li key={s}>{s}</li>)}
                  </ul>
                </div>
                <div className="rounded-xl bg-secondary/50 p-4">
                  <h3 className="mb-2 text-sm font-medium">Lacunas de experiência</h3>
                  <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                    {match.experienceGaps.map((s: string) => <li key={s}>{s}</li>)}
                  </ul>
                </div>
              </div>
              <button onClick={() => setActiveTab("questions")} className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto">
                Continuar para as Perguntas <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </button>
            </div>
          </TabsContent>
        )}

        <TabsContent value="questions" className="space-y-6">
          <div className="surface rounded-2xl p-4 sm:p-6">
            <h2 className="mb-4 text-base font-semibold">Perguntas estratégicas</h2>
            <p className="mb-6 max-w-3xl text-sm leading-6 text-muted-foreground">Responda estas perguntas para preencher as lacunas mais importantes do seu currículo.</p>
            {generatingQuestions ? (
              <div className="flex flex-col items-center justify-center space-y-4 rounded-xl bg-secondary/30 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-center text-sm font-medium text-primary animate-pulse">
                  Organizando perguntas a partir do seu currículo...
                </div>
              </div>
            ) : questions.length === 0 ? (
              <div className="text-[13px] text-muted-foreground">Nenhuma pergunta gerada.</div>
            ) : (
              <div className="space-y-5">
                {questions.map((q: any, i: number) => (
                  <div key={q.id} className="rounded-xl border border-border/70 bg-secondary/30 p-4 sm:p-5">
                    <p className="text-[14px] font-medium mb-2">{i + 1}. {q.question}</p>
                    <p className="mb-3 text-xs font-medium text-primary">Por que isso importa: {q.reason}</p>
                    {q.suggestedAnswer && (
                      <button
                        type="button"
                        onClick={() => setAnswers({ ...answers, [q.id]: q.suggestedAnswer })}
                        className="mb-2 inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20 cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Usar sugestão
                      </button>
                    )}
                    <Textarea 
                      aria-label={`Resposta para a pergunta ${i + 1}`}
                      className="text-[13px] bg-background" 
                      placeholder="Sua resposta…"
                      value={answers[q.id] || ""}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6">
              {!truthGuardData ? (
                <button onClick={handleTruthGuard} disabled={runningTruthGuard} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto">
                  {runningTruthGuard ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Verificando Integridade...</> : <>Validar Fatos (Truth Guard) <ArrowRight className="ml-2 h-3.5 w-3.5" /></>}
                </button>
              ) : (
                <TruthGuardPanel 
                  truthGuardData={truthGuardData} 
                  onApprove={handleOptimize} 
                  onEditAnswers={() => setTruthGuardData(null)}
                />
              )}
            </div>
          </div>
        </TabsContent>

        {optimized && (
          <TabsContent value="edit" className="space-y-6">
            <StructuredResumeEditor initialData={optimized} onSave={handleSaveManualEdit} />
          </TabsContent>
        )}

        <TabsContent value="preview" className="space-y-6">
          <div className="surface rounded-2xl p-4 sm:p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold">Preview do Currículo</h2>
              {optimized && (
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <select
                    className="h-11 w-full rounded-lg border border-border bg-secondary px-3 text-sm sm:h-9 sm:w-auto"
                    value={normalizeTemplateId(data.selectedTemplate)}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                  >
                    <option value="basic-ats">Basic ATS Template</option>
                    <option value="modern-ats">Modern ATS Template</option>
                  </select>
                  <button onClick={handleExport} disabled={exporting} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                    {exporting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5" />} Baixar PDF
                  </button>
                </div>
              )}
            </div>
            
            {!optimized ? (
              <div className="text-[13px] text-muted-foreground text-center py-12">O currículo ainda não foi otimizado. Volte e clique em Reescrever Currículo.</div>
            ) : (
              <div className="min-h-[600px] overflow-x-auto rounded-xl border bg-white p-2 text-black shadow-sm sm:min-h-[800px] sm:p-8">
                <PreviewTemplate
                  resume={optimized}
                  templateId={data.selectedTemplate}
                  language={data.selectedLanguage}
                />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="coverletter" className="space-y-6">
          <div className="surface rounded-2xl p-4 sm:p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold">Carta de Apresentação</h2>
              {optimized && (
                <button onClick={handleGenerateCoverLetter} disabled={generatingLetter} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto">
                  {generatingLetter ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <PenTool className="mr-2 h-3.5 w-3.5" />} {data.coverLetter ? "Regerar Carta" : "Gerar Carta"}
                </button>
              )}
            </div>
            
            {!data.coverLetter ? (
              <div className="text-[13px] text-muted-foreground text-center py-12">
                {!optimized ? "Otimize o seu currículo primeiro." : "Clique em gerar para escrever uma carta de apresentação baseada na vaga."}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-background p-4 text-sm leading-7 whitespace-pre-wrap sm:p-6">
                {data.coverLetter}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}
