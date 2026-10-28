"use client";
import Link from "next/link";
import { WorkspacePage, PageHeading, Journey, FactualNote } from "@/components/workspace/workspace-ui";
import { FileText, ArrowRight } from "@/components/ui/app-icon";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ObjectiveGuide } from "@/components/home/objective-guide";
import { AnalysisModeGrid } from "@/components/home/analysis-mode-grid";
import { SourceLinkInput } from "@/components/analysis/source-link-input";
import { useToast } from "@/components/ui/custom-toast";
import { resolveAnalysisMode } from "@/lib/analysis-modes";
import { DraftSchema, languageLabel, LOCALES, MAX_TEXT } from "@/lib/analysis-contract";
import { pdfFileError } from "@/lib/upload-validation";
import { readApiError } from "@/lib/api-client";
import { hasSourceText, isSourceUrl } from "@/lib/source-input";

const REGIONS = [{ value: "BR", label: "Brasil" }, { value: "US", label: "Estados Unidos" }, { value: "UK", label: "Reino Unido" }, { value: "CA", label: "Canadá" }, { value: "DE", label: "Alemanha" }, { value: "PT", label: "Portugal" }, { value: "REMOTE", label: "Remoto internacional" }];
type MaterialTab = "pdf" | "paste" | "link";

function NewAnalysisContent() {
  const params = useSearchParams(); const router = useRouter(); const { toast } = useToast();
  const mode = resolveAnalysisMode(params.get("mode"));
  const isLinkedIn = mode === "LINKEDIN_OPTIMIZATION";
  const requiresJob = mode === "COMPARE_AGAINST_JOB" || mode === "OPTIMIZE_FOR_JOB" || mode === "COVER_LETTER_ONLY";
  const [initialDraft] = useState(params.get("draft"));
  const idRef = useRef(initialDraft); const creating = useRef<Promise<string> | null>(null);
  const [clientRequestId] = useState(() => crypto.randomUUID());
  const [hydrated, setHydrated] = useState(!initialDraft);
  const [title, setTitle] = useState(""); const [pastedText, setPastedText] = useState("");
  const [jobDescription, setJobDescription] = useState(""); const [jobUrl, setJobUrl] = useState(""); const [profileUrl, setProfileUrl] = useState("");
  const [activeTab, setActiveTab] = useState<MaterialTab>(isLinkedIn ? "link" : "pdf");
  const [jobInput, setJobInput] = useState<"text" | "link">("text");
  const [selectedLanguage, setLanguage] = useState("pt-BR"); const [jobLocation, setRegion] = useState("BR");
  const [file, setFile] = useState<File | null>(null); const [storedPdf, setStoredPdf] = useState(false);
  const [loading, setLoading] = useState(false); const [saveStatus, setSaveStatus] = useState("");
  const [savedDraft, setSavedDraft] = useState("");
  const [profileReviewed, setProfileReviewed] = useState(false); const [jobReviewed, setJobReviewed] = useState(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const ensureAnalysis = useCallback(async () => {
    if (idRef.current) return idRef.current;
    if (!mode) throw new Error("Escolha uma análise.");
    if (!creating.current) creating.current = (async () => {
      const response = await fetch("/api/analysis/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, selectedLanguage, jobLocation, professionalTarget: title, clientRequestId }) });
      if (!response.ok) throw new Error(await readApiError(response, "Não foi possível salvar o rascunho."));
      const record = await response.json(); idRef.current = record.id;
      window.history.replaceState(null, "", "/analysis/new?mode=" + mode + "&draft=" + record.id);
      return record.id as string;
    })().catch(error => { creating.current = null; throw error; });
    return creating.current;
  }, [mode, selectedLanguage, jobLocation, title, clientRequestId]);

  useEffect(() => {
    if (!initialDraft) return;
    const controller = new AbortController();
    async function restore() {
      try {
        const response = await fetch("/api/analysis/" + initialDraft, { signal: controller.signal });
        if (!response.ok) throw new Error(await readApiError(response, "Não foi possível recuperar o rascunho."));
        const record = await response.json();
        if (record.mode !== mode) throw new Error("Esse rascunho pertence a outro tipo de análise.");
        if (record.analysisJson || record.coverLetter) { router.replace("/analysis/" + record.id); return; }
        if (record.draftJson) {
          const draft = DraftSchema.parse(JSON.parse(record.draftJson));
          setTitle(draft.title); setPastedText(draft.pastedText); setJobDescription(draft.jobDescription); setJobUrl(draft.jobUrl); setProfileUrl(draft.profileUrl); setActiveTab(draft.activeTab); setJobInput(draft.jobInput); setRegion(draft.jobLocation); setLanguage(draft.selectedLanguage); setSavedDraft(JSON.stringify(draft));
        }
        setStoredPdf(record.resumeInputType === "PDF_UPLOAD" && !!record.parsedResumeText);
        setSaveStatus("Rascunho recuperado. Confira novamente os conteúdos importados por link."); setHydrated(true);
      } catch (error) { if (!controller.signal.aborted) { setSaveStatus(error instanceof Error ? error.message : "Falha ao recuperar rascunho."); } }
    }
    void restore(); return () => controller.abort();
  }, [initialDraft, mode, router]);

  const draftJson = JSON.stringify({ pastedText, jobDescription, jobUrl, profileUrl, activeTab, jobInput, jobLocation, selectedLanguage, title });
  const hasDraft = !!(title || pastedText || jobDescription || jobUrl || profileUrl || file || storedPdf);
  useEffect(() => {
    if (!hydrated || !mode || !hasDraft || loading) return;
    const timer = setTimeout(() => {
      setSaveStatus("Salvando rascunho…");
      queue.current = queue.current.catch(() => {}).then(async () => {
        const id = await ensureAnalysis();
        const response = await fetch("/api/analysis/" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftJson, professionalTarget: title }) });
        if (!response.ok) throw new Error(await readApiError(response, "Rascunho não salvo."));
        setSavedDraft(draftJson);
        setSaveStatus(file && !storedPdf ? "Textos salvos. O PDF será enviado ao continuar; se sair agora, selecione o arquivo novamente." : "Rascunho salvo na sua conta.");
      }).catch(error => { setSaveStatus(error instanceof Error ? error.message : "Rascunho não salvo. Mantenha esta aba aberta."); });
    }, 800);
    return () => clearTimeout(timer);
  }, [draftJson, title, ensureAnalysis, hydrated, hasDraft, mode, loading, file, storedPdf]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (hasDraft && (savedDraft !== draftJson || (!!file && !storedPdf))) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [hasDraft, savedDraft, draftJson, file, storedPdf]);

  function chooseFile(candidate?: File) {
    if (!candidate) return; const error = pdfFileError(candidate);
    if (error) { toast({ title: "Arquivo inválido", description: error, variant: "warning" }); return; }
    setFile(candidate); setStoredPdf(false);
  }
  async function continueAnalysis() {
    setLoading(true);
    try {
      await queue.current; const id = await ensureAnalysis();
      const update: Record<string, unknown> = { professionalTarget: title, selectedLanguage, jobLocation, draftJson, ...(requiresJob ? { jobDescription, jobUrl: jobInput === "link" ? jobUrl : null } : {}) };
      if (activeTab !== "pdf") Object.assign(update, { parsedResumeText: pastedText, originalResumeText: pastedText, resumeInputType: activeTab === "link" ? "LINKEDIN_URL" : "PASTED_TEXT", profileUrl: activeTab === "link" ? profileUrl : null });
      const saved = await fetch("/api/analysis/" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update) });
      if (!saved.ok) throw new Error(await readApiError(saved, "Não foi possível salvar o material."));
      if (activeTab === "pdf" && file) {
        const form = new FormData(); form.append("analysisId", id); form.append("file", file);
        const uploaded = await fetch("/api/upload-resume", { method: "POST", body: form });
        if (!uploaded.ok) throw new Error(await readApiError(uploaded, "Não foi possível enviar o PDF."));
        setStoredPdf(true);
      }
      router.push("/analysis/" + id);
    } catch (error) { toast({ title: "Não foi possível continuar", description: error instanceof Error ? error.message : "Tente novamente.", variant: "error" }); setLoading(false); }
  }
  if (!mode) return <WorkspacePage><PageHeading title="Vamos preparar seu próximo passo." description="Escolha o objetivo que faz sentido para o seu momento."/><ObjectiveGuide/><details><summary className="min-h-11 cursor-pointer text-sm font-semibold">Ver todos os objetivos</summary><AnalysisModeGrid/></details></WorkspacePage>;
  if (!hydrated) return <div className="p-8" role="status">{saveStatus || "Recuperando seu rascunho…"}</div>;
  const hasMaterial = activeTab === "pdf" ? !!file || storedPdf : hasSourceText(pastedText) && (activeTab !== "link" || profileReviewed);
  const validJob = !requiresJob || (hasSourceText(jobDescription) && (jobInput !== "link" || jobReviewed));
  return <WorkspacePage><PageHeading title={isLinkedIn?"Vamos melhorar seu LinkedIn.":"Vamos preparar seu próximo passo."} description="Traga seu material. Você confere o conteúdo antes de continuar."><Link href="/analysis/new" className="textLink">Alterar objetivo <ArrowRight size={15}/></Link></PageHeading><Journey current={0}/><div className="formLayout"><div className="legacyPanels space-y-5">
    <label className="flex flex-col gap-2 text-sm font-medium">Nome desta candidatura ou análise<Input maxLength={120} value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Analista financeiro — Empresa" /></label>
    <section className="sheet padded flex flex-col gap-5 rounded-2xl p-5 sm:p-7"><h2 className="text-lg font-semibold">{isLinkedIn ? "Seu perfil" : "Seu currículo"}</h2>
      <Tabs value={activeTab} onValueChange={value => setActiveTab(value as MaterialTab)}>
        <TabsList className="flowTabs">{isLinkedIn && <TabsTrigger value="link">Link do perfil</TabsTrigger>}<TabsTrigger value="pdf">Enviar PDF</TabsTrigger><TabsTrigger value="paste">Colar texto</TabsTrigger></TabsList>
        {isLinkedIn && <TabsContent value="link"><SourceLinkInput kind="linkedin" url={profileUrl} onUrlChange={setProfileUrl} content={pastedText} onContentChange={setPastedText} ensureAnalysis={ensureAnalysis} reviewed={profileReviewed} onReviewedChange={setProfileReviewed} /></TabsContent>}
        <TabsContent value="pdf"><label className="dropzone" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();chooseFile(event.dataTransfer.files[0]);}}><FileText size={35}/><strong>{file?file.name:storedPdf?"Seu PDF está salvo":isLinkedIn?"Seu perfil começa aqui":"Seu currículo começa aqui"}</strong><span>{storedPdf?"Você pode continuar ou selecionar outro arquivo.":"Arraste um PDF ou toque para selecionar."}</span><b>Escolher arquivo</b><small>PDF · até 10 MB e 30 páginas</small><input id="resume-upload" aria-label={isLinkedIn?"PDF exportado do LinkedIn":"Arquivo do currículo"} type="file" accept="application/pdf,.pdf" onChange={event=>chooseFile(event.target.files?.[0])}/></label></TabsContent>
        <TabsContent value="paste"><label className="flex flex-col gap-2 text-sm font-medium">{isLinkedIn ? "Texto do perfil (título, sobre e experiências)" : "Texto completo do currículo"}<Textarea value={pastedText} maxLength={MAX_TEXT} onChange={event => setPastedText(event.target.value)} className="min-h-60" /></label><p className="mt-2 text-xs text-muted-foreground">Mínimo de 50 caracteres. Máximo de 60 mil.</p></TabsContent>
      </Tabs>
    </section>
    {requiresJob && <section className="sheet padded flex flex-col gap-5 rounded-2xl p-5 sm:p-7"><h2 className="text-lg font-semibold">A vaga que você quer</h2><p className="text-sm text-muted-foreground">Escolha uma opção: link da página da vaga ou descrição em texto.</p><Tabs value={jobInput} onValueChange={value => setJobInput(value as "text" | "link")}><TabsList className="flowTabs"><TabsTrigger value="text">Colar descrição</TabsTrigger><TabsTrigger value="link">Link da vaga</TabsTrigger></TabsList><TabsContent value="text"><label className="flex flex-col gap-2 text-sm font-medium">Descrição da vaga<Textarea value={jobDescription} onPaste={event => { const text = event.clipboardData.getData("text").trim(); if (isSourceUrl(text)) { event.preventDefault(); setJobUrl(text); setJobInput("link"); setJobReviewed(false); } }} maxLength={MAX_TEXT} onChange={event => setJobDescription(event.target.value)} className="min-h-48" placeholder="Cole responsabilidades, requisitos e qualificações…" /></label><p className="mt-2 text-xs text-muted-foreground">Mínimo de 50 caracteres. Um endereço sozinho não é uma descrição.</p></TabsContent><TabsContent value="link"><SourceLinkInput kind="job" url={jobUrl} onUrlChange={setJobUrl} content={jobDescription} onContentChange={setJobDescription} ensureAnalysis={ensureAnalysis} reviewed={jobReviewed} onReviewedChange={setJobReviewed} /></TabsContent></Tabs></section>}
    <section className="sheet padded grid gap-5 rounded-2xl p-5 sm:grid-cols-2 sm:p-7"><label className="flex flex-col gap-2 text-sm font-medium">Idioma do resultado<select className="h-11 rounded-lg border border-border bg-background px-3" value={selectedLanguage} onChange={event => setLanguage(event.target.value)}>{LOCALES.map(locale => <option key={locale} value={locale}>{languageLabel(locale)}</option>)}</select></label>{!isLinkedIn && <label className="flex flex-col gap-2 text-sm font-medium">País ou convenção do currículo<select className="h-11 rounded-lg border border-border bg-background px-3" value={jobLocation} onChange={event => setRegion(event.target.value)}>{REGIONS.map(region => <option key={region.value} value={region.value}>{region.label}</option>)}</select><span className="text-xs font-normal text-muted-foreground">O país não altera o idioma escolhido.</span></label>}</section>
    <div className="flex flex-col gap-4 border-t border-border pt-5"><p className="text-xs leading-6 text-muted-foreground">Ao iniciar, o conteúdo informado será processado pelos provedores de IA configurados para gerar sua análise. Revise dados pessoais antes de enviar. Consulte a política de privacidade no menu da conta. Seus resultados são estimativas de conteúdo, não garantias de contratação.</p><p className="text-xs text-muted-foreground" role="status">{saveStatus}</p><Button className="min-h-12 self-end" disabled={loading || !hasMaterial || !validJob} onClick={continueAnalysis}>{loading ? "Salvando e preparando análise…" : "Iniciar análise"}</Button></div></div><aside className="contextAside"><h2>Um caminho simples.</h2><p>Você traz a experiência. O Curricule ajuda a apresentá-la com mais clareza.</p><ol className="expectations"><li><span>1</span><div><strong>Entenda seu material</strong><p>Veja pontos fortes e o que merece atenção.</p></div></li><li><span>2</span><div><strong>Complete o contexto</strong><p>Responda com fatos da sua trajetória.</p></div></li><li><span>3</span><div><strong>Revise e use</strong><p>Edite o texto e prepare seu próximo PDF.</p></div></li></ol><FactualNote/></aside></div></WorkspacePage>;}
export default function NewAnalysisPage() { return <Suspense fallback={<div className="p-8">Carregando…</div>}><NewAnalysisContent /></Suspense>; }
