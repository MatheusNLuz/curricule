"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AnalysisView, AnalysisQuestion } from "@/lib/analysis-view";
import { Loader2, ArrowLeft, ArrowRight, Download, FileText, Briefcase, HelpCircle, PenTool, Layout } from "@/components/ui/app-icon";
import { useToast } from "@/components/ui/custom-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResumeEditingWorkspace } from "@/components/editor/resume-editing-workspace";
import { ReviewQuestions } from "@/components/analysis/review-questions";
import { AiReviewNotice } from "@/components/analysis/ai-review-notice";
import { WorkspacePage, Journey } from "@/components/workspace/workspace-ui";
import { DownloadDocumentButton } from "@/components/analysis/download-document-button";
import { TaskProgress } from "@/components/analysis/task-progress";
import { PreviewTemplate } from "@/components/preview/preview-template";
import { AnalysisLoading } from "@/components/analysis/analysis-loading";
import { getFetchErrorMessage, getLoginUrl, readApiError, fetchAnalysisTask } from "@/lib/api-client";
import { normalizeTemplateId, TEMPLATE_OPTIONS } from "@/lib/preview-template";
import type { ReviewedTruth } from "@/lib/ats/truth-policy";
import type { OptimizedResume } from "@/lib/schemas/optimize.schema";
import { ResumeFactReview } from "@/components/editor/resume-fact-review";
import { ResumeVersions } from "@/components/editor/resume-versions";
import { GeneratedResumeSummary } from "@/components/editor/generated-resume-summary";
import { isEditorTab, resolveEditorTab, type EditorTab } from "@/lib/editor-tab";

export function EditorClient({ analysisId }: { analysisId: string }) {
  const router = useRouter();
  const params=useSearchParams();
  const { toast } = useToast();
  const [data, setData] = useState<AnalysisView|null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError,setLoadError]=useState<{status:number;message:string}|null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab | null>(() => { const tab=params.get("tab");return isEditorTab(tab)?tab:null; });

  const [questions, setQuestions] = useState<AnalysisQuestion[]>([]);
  const [questionReview, setQuestionReview] = useState<"approved" | "unavailable" | undefined>();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [truthGuardData, setTruthGuardData] = useState<ReviewedTruth | null>(null);
  const [answerSaveStatus, setAnswerSaveStatus] = useState("");
  const [runningTruthGuard, setRunningTruthGuard] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editorDirty,setEditorDirty]=useState(false);
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const generatingRef = useRef(false);
  const templateRequestRef = useRef(0);
  const savedAnswersRef = useRef<string | null>(null);

  function changeTab(value: string) {
    if (!isEditorTab(value)) return;
    setActiveTab(value);
    const query = new URLSearchParams(params.toString());
    query.set("tab", value);
    router.replace(`/analysis/${analysisId}/editor?${query}`, { scroll: false });
  }


  const fetchQuestions = useCallback(async () => {
    setGeneratingQuestions(true);
    try {
      const res = await fetchAnalysisTask(`/api/smart-questions`, {
        method: "POST", body: JSON.stringify({ analysisId }), headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error(await readApiError(res, "Não foi possível gerar as perguntas."));
      const d = await res.json();
      if (d.success) {
        if (d.review === "approved" || d.review === "unavailable") setQuestionReview(d.review);
        setQuestions(d.questions);
        const initialAnswers: Record<string, string> = {};
        d.questions.forEach((q: AnalysisQuestion) => {
          if (q.answer) initialAnswers[q.id] = q.answer;
        });
        savedAnswersRef.current = JSON.stringify(initialAnswers);
        setAnswers(initialAnswers);
      }
    } catch (error: unknown) {
      toast({ title: "Não foi possível gerar as perguntas", description: getFetchErrorMessage(error, "Tente novamente em instantes."), variant: "error" });
    } finally {
      setGeneratingQuestions(false);
    }
  },[analysisId,toast]);
  const fetchData=useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/analysis/${analysisId}`);
      if (res.status === 401) {
        router.push(getLoginUrl(`/analysis/${analysisId}/editor`));
        return;
      }
      if (!res.ok) throw Object.assign(new Error(await readApiError(res, "Não foi possível carregar a análise.")),{status:res.status});
      const d = await res.json() as AnalysisView;
      setData(d);
      setQuestionReview(d.reviewStatuses?.QUESTIONS);
      
      setQuestions(d.questions || []);
      const initialAnswers: Record<string, string> = {};
      d.questions?.forEach((q: AnalysisQuestion) => { if (q.answer) initialAnswers[q.id] = q.answer; });
      savedAnswersRef.current = JSON.stringify(initialAnswers);
      setAnswers(initialAnswers);
      if (!d.finalResumeJson && (!d.jobDescription || d.comparisonJson) && !d.questions?.length) {
        if (!generatingRef.current) {
          generatingRef.current = true;
          void fetchQuestions();
        }
      }
    } catch (error: unknown) {
      setLoadError({status:error&&typeof error==="object"&&"status" in error?Number(error.status):0,message:getFetchErrorMessage(error,"Tente novamente em instantes.")});
    } finally {
      setLoading(false);
    }
  },[analysisId,router,fetchQuestions]);
  // Starts the authenticated user-data loading workflow; request status belongs to that workflow.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {generatingRef.current=false;void fetchData();},[fetchData]);

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

      const res = await fetchAnalysisTask(`/api/truth-guard`, {
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

  const handleOptimize = async (decisions: Record<string, boolean>) => {
    try {
      if(!data) throw new Error("O material ainda não foi carregado.");
      // First save typed answers
      const saveResponse = await fetch(`/api/smart-questions/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId, answers })
      });
      if (!saveResponse.ok) throw new Error(await readApiError(saveResponse, "Não foi possível salvar suas respostas."));

      const decisionResponse = await fetch("/api/truth-guard/decisions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysisId, sourceHash: truthGuardData?.sourceHash, decisions }) });
      if (!decisionResponse.ok) throw new Error(await readApiError(decisionResponse, "Não foi possível salvar suas decisões."));
      const savedDecision = await decisionResponse.json();
      if (typeof savedDecision.sourceHash === "string") setTruthGuardData(current => current ? { ...current, sourceHash: savedDecision.sourceHash, decisions } : current);

      setOptimizing(true);
      const res = await fetchAnalysisTask(`/api/optimize`, {
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
          await fetchData();
          changeTab("preview");
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
      a.download = `Curricule_Resume_${analysisId}.pdf`;
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
      const res = await fetchAnalysisTask(`/api/cover-letter`, {
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

  const handleSaveDraft = useCallback(async (newData: OptimizedResume) => {
    const response = await fetch(`/api/analysis/${analysisId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ editorDraftJson: JSON.stringify(newData), revision: data?.revision }) });
    if (!response.ok) throw new Error("Não foi possível salvar o rascunho.");
  }, [analysisId, data?.revision]);

  const handleSaveManualEdit = async (newData: OptimizedResume) => {
    try {
      if(!data) throw new Error("O material ainda não foi carregado.");
      const res = await fetch(`/api/analysis/${analysisId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalResumeJson: JSON.stringify(newData), revision: data.revision }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Falha ao salvar as alterações."));
      await fetchData();
    } catch (error: unknown) {
      toast({ title: "Não foi possível salvar", description: getFetchErrorMessage(error, "Tente novamente em instantes."), variant: "error" });
      throw error;
    }
  };

  const handleTemplateChange = async (value: string) => {
    if (!data) return;

    const templateId = normalizeTemplateId(value);
    const previousTemplateId = normalizeTemplateId(data.selectedTemplate);
    const requestId = ++templateRequestRef.current;

    setData((current) => current ? { ...current, selectedTemplate: templateId } : current);

    try {
      const res = await fetch(`/api/analysis/${analysisId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedTemplate: templateId }),
      });

      if (!res.ok) throw new Error(await readApiError(res, "Não foi possível salvar o template."));
    } catch (error: unknown) {
      if (requestId !== templateRequestRef.current) return;

      setData((current) => current ? { ...current, selectedTemplate: previousTemplateId } : current);
      toast({ title: "Template não salvo", description: getFetchErrorMessage(error, "Tente novamente em instantes."), variant: "error" });
    }
  };

  useEffect(() => {
    const snapshot = JSON.stringify(answers);
    if (!questions.length || savedAnswersRef.current === snapshot) return;
    const timer = setTimeout(async () => {
      setAnswerSaveStatus("Salvando respostas…");
      try {
        const response = await fetch("/api/smart-questions/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysisId, answers }) });
        if (!response.ok) throw new Error(await readApiError(response, "Respostas não salvas."));
        savedAnswersRef.current = snapshot;
        setAnswerSaveStatus("Respostas salvas na sua conta.");
      } catch { setAnswerSaveStatus("Não foi possível salvar. Mantenha esta aba aberta e tente validar os fatos novamente."); }
    }, 900);
    return () => clearTimeout(timer);
  }, [analysisId, answers, questions]);

  if (!data && loadError) return <WorkspacePage><section className="sheet padded" role="alert"><h1 className="text-2xl font-semibold">{loadError.status===404?"Análise não encontrada":loadError.status===403?"Acesso indisponível":"Não foi possível abrir o editor"}</h1><p className="my-4">{loadError.message} Seus rascunhos salvos não foram removidos.</p><div className="flex flex-wrap gap-3"><button className="button primary" onClick={()=>{setLoading(true);void fetchData();}}>Tentar novamente</button><button className="button secondary" onClick={()=>router.push("/history")}>Voltar ao histórico</button></div></section></WorkspacePage>;
  if (optimizing) return <AnalysisLoading step={data?.mode === "LINKEDIN_OPTIMIZATION" ? "Estamos reescrevendo seu perfil." : "Estamos reescrevendo seu currículo."} description={data?.jobDescription ? "Seu histórico é a base. A vaga orienta o foco, e o idioma escolhido orienta a escrita." : "Reescrevemos o conteúdo no idioma escolhido, preservando os fatos do seu histórico."} writing />;
  if (loading || !data) return <AnalysisLoading step="Preparando seu espaço de edição." description="Estamos organizando seu material para você revisar e editar." />;

  const match = data.comparisonJson ? JSON.parse(data.comparisonJson) : null;
  const optimized = data.finalResumeJson ? JSON.parse(data.finalResumeJson) : null;

  const isLinkedIn = data.mode === "LINKEDIN_OPTIMIZATION";

  return (
    <WorkspacePage>
      <TaskProgress analysisId={analysisId}/>
      {loadError&&<p role="alert" className="callout">{loadError.message} O conteúdo em edição foi preservado. <button className="textLink" onClick={()=>void fetchData()}>Tentar atualizar</button></p>}
      <div className="mb-8">
        <button 
          onClick={() => router.push(`/analysis/${analysisId}`)}
          className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-lg text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para o Painel de Resultados
        </button>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {isLinkedIn ? "Vamos completar seu perfil." : optimized ? "Sua história, pronta para revisar." : "Sua experiência, nas suas palavras."}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {isLinkedIn 
            ? "Responda perguntas estratégicas para traduzir sua experiência em evidências reais de performance."
            : optimized ? "Veja a avaliação da nova versão, confira o currículo e baixe seu arquivo." : "Responda perguntas, ajuste o conteúdo e leve uma versão pronta para cada oportunidade."}
        </p>
        {!optimized && <Journey current={2}/>}
      </div>

      {optimized && !isLinkedIn && <GeneratedResumeSummary initialScores={data.initialScores} finalScores={data.finalScores} analysisId={analysisId}/>}
      {answerSaveStatus && <p role="status" className="mb-5 text-xs text-muted-foreground">{answerSaveStatus}</p>}
      {!optimized && <>
      <details className="mb-6 rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-semibold">Conferir o material original</summary><p className="mt-3 text-xs leading-6 text-muted-foreground">Compare as sugestões e a prévia com o conteúdo que você forneceu. Revise especialmente empresas, datas e resultados antes de usar.</p><pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-7">{data.parsedResumeText}</pre></details>
      </>}

      {isLinkedIn ? (<>{questionReview === "unavailable" && <AiReviewNotice subject="questions" />}<ReviewQuestions questions={questions} answers={answers} generating={generatingQuestions} validating={runningTruthGuard} truth={truthGuardData} onAnswer={(id,value)=>{setAnswers(current=>({...current,[id]:value}));setTruthGuardData(null);}} onValidate={handleTruthGuard} onApprove={handleOptimize} onEditAnswers={()=>setTruthGuardData(null)} onRetry={fetchQuestions}/></>
      ) : (
        <Tabs value={resolveEditorTab(activeTab, Boolean(optimized), Boolean(match))} onValueChange={changeTab} className="w-full legacyPanels">
        <TabsList className="flowTabs">
          {match && <TabsTrigger value="match" className="shrink-0 text-xs sm:text-[13px]"><Briefcase className="mr-2 h-3.5 w-3.5" /> Comparação com a vaga</TabsTrigger>}
          <TabsTrigger value="questions" className="shrink-0 text-xs sm:text-[13px]"><HelpCircle className="mr-2 h-3.5 w-3.5" /> Perguntas e fatos</TabsTrigger>
          {optimized && <TabsTrigger value="edit" className="shrink-0 text-xs sm:text-[13px]"><PenTool className="mr-2 h-3.5 w-3.5" /> Editar currículo</TabsTrigger>}
          <TabsTrigger value="preview" disabled={!optimized} className="shrink-0 text-xs sm:text-[13px]"><Layout className="mr-2 h-3.5 w-3.5" /> Prévia e PDF</TabsTrigger>
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
              <button onClick={() => changeTab("questions")} className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto">
                Continuar para as Perguntas <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </button>
            </div>
          </TabsContent>
        )}

        <TabsContent value="questions">{questionReview === "unavailable" && <AiReviewNotice subject="questions" />}<ReviewQuestions questions={questions} answers={answers} generating={generatingQuestions} validating={runningTruthGuard} truth={truthGuardData} onAnswer={(id,value)=>{setAnswers(current=>({...current,[id]:value}));setTruthGuardData(null);}} onValidate={handleTruthGuard} onApprove={handleOptimize} onEditAnswers={()=>setTruthGuardData(null)} onRetry={fetchQuestions}/></TabsContent>

        {optimized && (
          <TabsContent value="edit" className="space-y-6">
            <ResumeEditingWorkspace onDirtyChange={setEditorDirty} key={data.revision} initialData={optimized} draftData={data.editorDraftJson ? JSON.parse(data.editorDraftJson) : undefined} language={data.selectedLanguage} onSave={handleSaveManualEdit} onDraftSave={handleSaveDraft}/>
          </TabsContent>
        )}

        <TabsContent value="preview" className="space-y-6">
          {exporting ? <AnalysisLoading step="Preparando seu PDF." variant="export" compact /> : <>
          <div className="surface rounded-2xl p-4 sm:p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold">Prévia do currículo</h2>
              {optimized && (
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <select
                    aria-label="Modelo do currículo"
                    className="h-11 w-full rounded-lg border border-border bg-secondary px-3 text-sm sm:h-9 sm:w-auto"
                    value={normalizeTemplateId(data.selectedTemplate)}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                  >
                    {TEMPLATE_OPTIONS.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}
                  </select>
                  <button onClick={handleExport} disabled={exporting} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                    {exporting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5" />} Baixar PDF
                  </button>
                </div>
              )}
            </div>
            {optimized&&<DownloadDocumentButton analysisId={analysisId}/>}
            {!optimized ? (
              <div className="text-[13px] text-muted-foreground text-center py-12">O currículo ainda não foi otimizado. Volte e clique em Reescrever Currículo.</div>
            ) : (
              <div className="previewDocument min-h-[600px] rounded-xl border bg-white p-2 text-black sm:p-8">
                <PreviewTemplate
                  resume={optimized}
                  templateId={data.selectedTemplate}
                  language={data.selectedLanguage}
                />
              </div>
            )}
          </div>
          </>}
        </TabsContent>

        <TabsContent value="coverletter" className="space-y-6">
          {generatingLetter ? <AnalysisLoading step="Estamos escrevendo sua carta." variant="letter" compact /> : <>
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
          </>}
        </TabsContent>
      </Tabs>
      )}
      {optimized && <details className="sheet padded mt-8"><summary className="cursor-pointer text-sm font-semibold">Conferir fontes e versões anteriores</summary>
        <details className="mt-5 rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-semibold">Conferir o material original</summary><pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-7">{data.parsedResumeText}</pre></details>
        <ResumeFactReview key={data.revision} analysisId={analysisId} revision={data.revision} disabled={editorDirty} onUpdated={async()=>{setTruthGuardData(null);await fetchData();}}/>
        <ResumeVersions analysisId={analysisId} current={data.finalResumeJson||""} revision={data.revision} onRestore={fetchData}/>
      </details>}
    </WorkspacePage>
  );
}
