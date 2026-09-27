"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight01Icon, Briefcase01Icon, CheckmarkCircle02Icon, ClipboardIcon, FileUploadIcon, Loading03Icon, MapPinIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/custom-toast";
import { HugeIcon } from "@/components/ui/huge-icon";
import { RouteLine } from "@/components/ui/route-line";
import { getFetchErrorMessage, readApiError } from "@/lib/api-client";
import { resolveAnalysisMode } from "@/lib/analysis-modes";
import { AnalysisModeGrid } from "@/components/home/analysis-mode-grid";

const MODE_LABELS: Record<string, string> = {
  MAKE_ATS_FRIENDLY: "Otimização para ATS",
  COMPARE_AGAINST_JOB: "Comparação com a Vaga",
  OPTIMIZE_FOR_JOB: "Otimização Completa",
  LINKEDIN_OPTIMIZATION: "Otimização de LinkedIn",
  COVER_LETTER_ONLY: "Carta de Apresentação",
};

const JOB_LOCATIONS = [
  { value: "BR", label: "🇧🇷 Brasil", lang: "pt-BR", format: "Padrão brasileiro (PT-BR)" },
  { value: "US", label: "🇺🇸 Estados Unidos", lang: "en-US", format: "American resume format (EN-US)" },
  { value: "UK", label: "🇬🇧 Reino Unido", lang: "en-US", format: "British CV format (EN-UK)" },
  { value: "CA", label: "🇨🇦 Canadá", lang: "en-US", format: "Canadian resume format (EN-US)" },
  { value: "DE", label: "🇩🇪 Alemanha", lang: "en-US", format: "German Lebenslauf style (EN)" },
  { value: "PT", label: "🇵🇹 Portugal", lang: "pt-BR", format: "Padrão europeu (PT-PT)" },
  { value: "REMOTE", label: "🌍 Remoto (Internacional)", lang: "en-US", format: "International remote format (EN-US)" },
];

const LANGUAGES = [
  { value: "pt-BR", label: "🇧🇷 Português (Brasil)", format: "Sugestões em PT-BR" },
  { value: "en-US", label: "🇺🇸 Inglês (EUA)", format: "Suggestions in EN-US" },
];

function NewAnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const mode = resolveAnalysisMode(searchParams.get("mode"));
  const requiresJob = mode === "COMPARE_AGAINST_JOB" || mode === "OPTIMIZE_FOR_JOB" || mode === "COVER_LETTER_ONLY";
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pdf");
  const [dragActive, setDragActive] = useState(false);
  const [linkedInLanguage, setLinkedInLanguage] = useState("pt-BR");

  if (!mode) {
    return (
      <div className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-8 lg:px-12 lg:pt-14">
        <h1 className="font-heading text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Escolha uma análise</h1>
        <p className="mt-3 max-w-[58ch] text-[14px] leading-7 text-muted-foreground">Selecione o tipo de ajuda para continuar com seu currículo ou perfil.</p>
        <AnalysisModeGrid />
      </div>
    );
  }

  const selectedLocation = JOB_LOCATIONS.find((location) => location.value === jobLocation);
  const hasResume = Boolean(file || pastedText.trim());
  const routeIndex = !hasResume ? 0 : requiresJob && (!jobDescription.trim() || !jobLocation) ? 1 : 2;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.type !== "application/pdf") {
      toast({ title: "Arquivo inválido", description: "Por favor, envie um PDF.", variant: "warning" });
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile?.type === "application/pdf") setFile(droppedFile);
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      const selectedLang = mode === "LINKEDIN_OPTIMIZATION" ? linkedInLanguage : (selectedLocation?.lang || "pt-BR");
      const analysisRes = await fetch("/api/analysis/create", { method: "POST", body: JSON.stringify({ mode, jobLocation, selectedLanguage: selectedLang }), headers: { "Content-Type": "application/json" } });
      if (!analysisRes.ok) {
        throw new Error(await readApiError(analysisRes, "Falha ao criar análise."));
      }
      const analysisData = await analysisRes.json();

      if (activeTab === "pdf" && file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("analysisId", analysisData.id);
        const uploadRes = await fetch("/api/upload-resume", { method: "POST", body: formData });
        if (!uploadRes.ok) throw new Error(await readApiError(uploadRes, "Falha ao fazer upload e extração do currículo."));
        const uploadData = await uploadRes.json();
        if (!uploadData?.file?.id) throw new Error("O upload não retornou um arquivo válido.");
      } else if (activeTab === "paste" && pastedText.trim()) {
        const resumeResponse = await fetch(`/api/analysis/${analysisData.id}`, { method: "PATCH", body: JSON.stringify({ originalResumeText: pastedText, parsedResumeText: pastedText }), headers: { "Content-Type": "application/json" } });
        if (!resumeResponse.ok) throw new Error(await readApiError(resumeResponse, "Falha ao salvar o currículo."));
      }

      if (requiresJob && jobDescription.trim()) {
        const jobResponse = await fetch(`/api/analysis/${analysisData.id}`, { method: "PATCH", body: JSON.stringify({ jobDescription }), headers: { "Content-Type": "application/json" } });
        if (!jobResponse.ok) throw new Error(await readApiError(jobResponse, "Falha ao salvar a descrição da vaga."));
      }
      router.push(`/analysis/${analysisData.id}`);
    } catch (error: unknown) {
      const message = getFetchErrorMessage(error, "Algo deu errado.");
      toast({ title: "Não foi possível continuar", description: message, variant: "error", duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  const isValid = () => {
    if (activeTab === "pdf" && !file) return false;
    if (activeTab === "paste" && pastedText.trim().length < 50) return false;
    if (requiresJob && jobDescription.trim().length < 50) return false;
    if (requiresJob && !jobLocation) return false;
    return true;
  };

  return (
    <div className="mx-auto max-w-5xl px-5 pb-28 pt-10 sm:px-8 lg:px-12 lg:pt-14">
      <div className="max-w-3xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{MODE_LABELS[mode]}</p>
        <h1 className="mt-3 max-w-[17ch] font-heading text-3xl font-semibold leading-tight tracking-[-0.05em] sm:text-4xl">{mode === "LINKEDIN_OPTIMIZATION" ? "Envie seu perfil do LinkedIn" : "Envie seu currículo"}</h1>
        <p className="mt-3 max-w-[58ch] text-[14px] leading-7 text-muted-foreground">{mode === "LINKEDIN_OPTIMIZATION" ? "Vamos extrair as informações do perfil e analisar o SEO/atratividade para recrutadores." : "Vamos extrair o conteúdo e rodar a análise de IA."}</p>
      </div>

      <RouteLine className="mt-10 max-w-3xl" activeIndex={routeIndex} steps={[{ label: "Seu material", description: "Currículo ou perfil" }, { label: "Seu contexto", description: requiresJob ? "Vaga e localidade" : "Uma escolha" }, { label: "Seu próximo passo", description: "A análise começa" }]} />

      <div className="mt-10 max-w-3xl space-y-5">
        <section className="surface rounded-2xl p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Etapa 1</p><h2 className="mt-2 text-[17px] font-semibold">{mode === "LINKEDIN_OPTIMIZATION" ? "Seu perfil do LinkedIn" : "Seu currículo"}</h2><p className="mt-1 text-[12px] text-muted-foreground">Escolha o formato que for mais natural para você.</p></div><span className="grid size-10 place-items-center rounded-xl bg-soft-primary text-primary"><HugeIcon icon={FileUploadIcon} size={19} /></span></div>
          <Tabs defaultValue="pdf" className="mt-6 w-full" onValueChange={setActiveTab}>
            <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-secondary p-1"><TabsTrigger value="pdf" className="gap-2 rounded-lg text-[12px] data-[state=active]:bg-surface data-[state=active]:text-foreground"><HugeIcon icon={FileUploadIcon} size={15} /> Upload de PDF</TabsTrigger><TabsTrigger value="paste" className="gap-2 rounded-lg text-[12px] data-[state=active]:bg-surface data-[state=active]:text-foreground"><HugeIcon icon={ClipboardIcon} size={15} /> Colar Texto</TabsTrigger></TabsList>
            <TabsContent value="pdf" className="mt-4">
              <div className={`flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition-colors ${dragActive ? "border-primary bg-soft-primary" : file ? "border-route bg-route/10" : "border-border bg-background hover:border-primary/50"}`} onDragOver={(event) => { event.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={handleDrop}>
                {file ? <div className="flex max-w-full items-center gap-3"><HugeIcon icon={CheckmarkCircle02Icon} size={22} className="text-route" /><div className="min-w-0 text-left"><p className="truncate text-[13px] font-semibold">{file.name}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p></div><button type="button" onClick={() => setFile(null)} aria-label="Remover arquivo" className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"><HugeIcon icon={Cancel01Icon} size={16} /></button></div> : <><HugeIcon icon={FileUploadIcon} size={25} className="mb-3 text-primary" /><label htmlFor="resume-upload" className="cursor-pointer text-[13px]"><span className="font-semibold text-primary hover:underline">Procurar arquivos</span><span className="text-muted-foreground"> ou arraste e solte</span><input id="resume-upload" type="file" accept="application/pdf" className="sr-only" onChange={handleFileChange} /></label><p className="mt-2 text-[11px] text-muted-foreground">PDF, max 10MB</p></>}
              </div>
            </TabsContent>
            <TabsContent value="paste" className="mt-4"><Textarea aria-label={mode === "LINKEDIN_OPTIMIZATION" ? "Texto do perfil do LinkedIn" : "Texto completo do currículo"} placeholder={mode === "LINKEDIN_OPTIMIZATION" ? "Cole o texto do seu perfil do LinkedIn (Título, Sobre, Experiências)..." : "Cole o texto completo do seu currículo..."} className="min-h-56 resize-y rounded-xl bg-background text-[13px] leading-relaxed" value={pastedText} onChange={(event) => setPastedText(event.target.value)} />{pastedText.length > 0 && pastedText.length < 50 && <p className="mt-2 text-[11px] text-signal">Mínimo de 50 caracteres</p>}</TabsContent>
          </Tabs>
        </section>

        {requiresJob && <section className="surface rounded-2xl p-5 sm:p-7"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-route/15 text-[#4e713f] dark:text-route"><HugeIcon icon={Briefcase01Icon} size={19} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Etapa 2</p><h2 className="mt-2 text-[17px] font-semibold">Descrição da Vaga</h2><p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">Cole a descrição da vaga para comparar seu currículo com o que ela pede.</p></div></div><Textarea aria-label="Descrição da vaga" placeholder="Cole a descrição da vaga aqui..." className="mt-6 min-h-48 resize-y rounded-xl bg-background text-[13px] leading-relaxed" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} />{jobDescription.length > 0 && jobDescription.length < 50 && <p className="mt-2 text-[11px] text-signal">Mínimo de 50 caracteres</p>}<div className="mt-7 border-t border-border pt-6"><div className="flex items-start gap-3"><HugeIcon icon={MapPinIcon} size={18} className="mt-0.5 text-primary" /><div><h3 className="text-[14px] font-semibold">Onde é a vaga?</h3><p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">Selecione o país/região da vaga. Isso define o idioma, o formato do currículo e as convenções locais.</p></div></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{JOB_LOCATIONS.map((location) => <button type="button" key={location.value} onClick={() => setJobLocation(location.value)} className={`rounded-xl border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${jobLocation === location.value ? "border-primary bg-soft-primary" : "border-border bg-background hover:border-primary/40"}`}><span className="block text-[12px] font-semibold">{location.label}</span><span className="mt-1 block text-[10px] leading-relaxed text-muted-foreground">{location.format}</span></button>)}</div>{!jobLocation && <p className="mt-3 text-[11px] text-signal">Selecione a localização da vaga para continuar</p>}</div></section>}

        {mode === "LINKEDIN_OPTIMIZATION" && <section className="surface rounded-2xl p-5 sm:p-7"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-soft-primary text-primary"><HugeIcon icon={MapPinIcon} size={19} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Etapa 2</p><h2 className="mt-2 text-[17px] font-semibold">Qual o idioma do perfil?</h2><p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">Selecione o idioma em que deseja que a IA avalie e gere o texto otimizado (Headline, Resumo e Experiências) para o seu LinkedIn.</p></div></div><div className="mt-6 grid gap-2 sm:grid-cols-2">{LANGUAGES.map((language) => <button type="button" key={language.value} onClick={() => setLinkedInLanguage(language.value)} className={`rounded-xl border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${linkedInLanguage === language.value ? "border-primary bg-soft-primary" : "border-border bg-background hover:border-primary/40"}`}><span className="block text-[12px] font-semibold">{language.label}</span><span className="mt-1 block text-[10px] text-muted-foreground">{language.format}</span></button>)}</div></section>}

        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] leading-relaxed text-muted-foreground">Você poderá revisar o resultado antes de decidir o que usar.</p><button type="button" onClick={handleContinue} disabled={!isValid() || loading} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/15 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">{loading ? <><HugeIcon icon={Loading03Icon} size={17} className="animate-spin" /> Processando...</> : <>Continuar <HugeIcon icon={ArrowRight01Icon} size={17} /> </>}</button></div>
      </div>
    </div>
  );
}

export default function NewAnalysisPage() {
  return <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><HugeIcon icon={Loading03Icon} size={26} className="animate-spin text-primary" /></div>}><NewAnalysisContent /></Suspense>;
}
