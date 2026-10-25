"use client";

import { useState } from "react";
import { languageLabel } from "@/lib/analysis-contract";
import { 
  Copy, 
  Check, 
  Sparkles, 
  Award, 
  Globe, 
  User, 
  BookOpen, 
  Key, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Languages
} from "@/components/ui/app-icon";
import { Badge } from "@/components/ui/badge";
import { LinkedInLogo } from "@/components/ui/linkedin-logo";

interface Props {
  analysis: any;
  scores: any;
  gamification: any;
  analysisId: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button 
      onClick={handleCopy} 
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-[11.5px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
    >
      {copied ? (
        <><Check className="h-3.5 w-3.5 text-route" /> Copiado!</>
      ) : (
        <><Copy className="h-3.5 w-3.5" /> Copiar</>
      )}
    </button>
  );
}

export function LinkedInDashboard({ analysis, scores, gamification, analysisId }: Props) {
  const [activeTab, setActiveTab] = useState<"summary" | "experience">("summary");

  const subScores = [
    { label: "Título / Headline", val: scores?.headline || 0, desc: "Atratividade e uso de keywords no seu cargo principal." },
    { label: "Resumo / Summary", val: scores?.summary || 0, desc: "Estrutura, storytelling e termos técnicos do 'Sobre'." },
    { label: "Experiências", val: scores?.experiences || 0, desc: "Impacto das descrições e uso de fórmulas de resultados (XYZ)." },
    { label: "Score de SEO", val: scores?.seo || 0, desc: "Densidade geral de termos-chave pesquisados por recrutadores." },
  ];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-linkedin/10 text-linkedin dark:bg-linkedin/20" aria-hidden="true"><LinkedInLogo className="size-5" /></span>
          <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Otimização de LinkedIn (SEO)</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Revise as sugestões antes de copiar para o LinkedIn. As notas são estimativas de conteúdo, não previsões de contratação.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {gamification && (
            <Badge variant="secondary" className="text-[12px] bg-linkedin/10 text-linkedin border-linkedin/20 py-1 px-3">
              Nível {gamification.level}: {gamification.levelName}
            </Badge>
          )}
          {analysis.detectedLanguage !== analysis.recommendedLanguage && (
            <Badge variant="outline" className="text-[12px] text-warning border-warning/20 bg-warning/5 py-1 px-3 flex items-center gap-1">
              <Languages className="h-3 w-3" /> Tradução solicitada
            </Badge>
          )}
        </div>
      </div>

      {/* Hero Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main SEO Score */}
        <div className="surface rounded-xl p-6 flex flex-col justify-between items-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-linkedin/5 rounded-full blur-2xl pointer-events-none" />
          <div className="w-full flex flex-col items-center">
            <p className="text-[12px] uppercase tracking-wider text-muted-foreground mb-4 font-semibold">Score Geral de SEO</p>
            <div className="relative flex items-center justify-center h-32 w-32 rounded-full border-4 border-linkedin/20 bg-linkedin/5">
              <span className="text-4xl font-bold font-mono text-linkedin">
                {scores?.overall || 0}
              </span>
              <span className="text-[12px] text-muted-foreground absolute bottom-4">/100</span>
            </div>
          </div>
          <div className="mt-6 w-full">
            <div className="flex items-center gap-1.5 justify-center text-[13px] font-semibold text-linkedin">
              <TrendingUp className="h-4 w-4" /> {scores?.overall >= 80 ? "PERFIL ALTAMENTE OTIMIZADO" : "PONTOS DE ATENÇÃO DETECTADOS"}
            </div>
            <p className="text-[11.5px] text-muted-foreground mt-2 leading-relaxed">
              {scores?.overall >= 80 
                ? "Seu perfil possui ótimo posicionamento. Use as sugestões abaixo para refinamentos finais." 
                : "Seu perfil tem boas bases, mas reescrever o Título e o Resumo aumentará suas impressões em buscas."}
            </p>
          </div>
        </div>

        {/* Sub-scores details */}
        <div className="surface rounded-xl p-6 md:col-span-2 space-y-4">
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Diagnóstico das Seções</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subScores.map((score, i) => (
              <div key={i} className="space-y-1.5 p-3 rounded-lg bg-secondary/30 border border-border/40">
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-semibold text-foreground">{score.label}</span>
                  <span className={`font-mono text-[13px] font-bold ${
                    score.val >= 80 ? "text-route" : score.val >= 60 ? "text-warning" : "text-signal"
                  }`}>{score.val}%</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      score.val >= 80 ? "bg-route" : score.val >= 60 ? "bg-warning" : "bg-signal"
                    }`}
                    style={{ width: `${score.val}%` }} 
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{score.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main suggestions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Headline Optimization */}
          <div className="surface rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3 justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-linkedin" />
                <h3 className="text-[15px] font-bold">Ideias de Título (Headline) Otimizado</h3>
              </div>
              <Badge variant="outline" className="text-[10px] text-linkedin border-linkedin/20 bg-linkedin/5">SEO Máximo</Badge>
            </div>
            <p className="text-[12.5px] text-muted-foreground leading-relaxed">
              O título abaixo do seu nome é a seção mais importante para a busca do LinkedIn. Use formatos que unam sua especialidade técnica a termos-chave procurados por recrutadores:
            </p>
            
            <div className="space-y-2.5 pt-2">
              {analysis?.headlineSuggestions?.map((headline: string, i: number) => (
                <div key={i} className="flex items-start justify-between gap-4 rounded-lg bg-secondary/50 border border-border p-3 hover:border-linkedin/20 transition-all">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-linkedin uppercase tracking-wider">Opção {i + 1}</span>
                    <p className="text-[13px] font-medium text-foreground leading-relaxed">{headline}</p>
                  </div>
                  <CopyButton text={headline} />
                </div>
              ))}
            </div>
          </div>

          {/* Detailed analysis Tab system */}
          <div className="surface rounded-xl overflow-hidden">
            <div className="flex border-b border-border bg-secondary/30">
              <button 
                onClick={() => setActiveTab("summary")}
                className={`px-5 py-3.5 text-[13px] font-semibold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === "summary" 
                    ? "border-linkedin text-linkedin bg-background/50"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <BookOpen className="h-4 w-4" /> Novo Resumo (Sobre)
              </button>
              <button 
                onClick={() => setActiveTab("experience")}
                className={`px-5 py-3.5 text-[13px] font-semibold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === "experience" 
                    ? "border-linkedin text-linkedin bg-background/50"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Briefcase className="h-4 w-4" /> Dicas de Experiência
              </button>
            </div>

            <div className="p-6">
              {activeTab === "summary" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div className="space-y-0.5">
                      <h4 className="text-[14px] font-bold">Texto Sugerido para o "Sobre"</h4>
                      <p className="text-[11.5px] text-muted-foreground">Otimizado para leitura rápida, contendo sua especialidade, principais realizações e nuvem de competências.</p>
                    </div>
                    <CopyButton text={analysis?.summarySuggestion || ""} />
                  </div>
                  <div className="rounded-lg bg-secondary/30 border border-border p-4 font-mono text-[12.5px] whitespace-pre-wrap leading-relaxed text-foreground/90 max-h-[400px] overflow-y-auto">
                    {analysis?.summarySuggestion}
                  </div>
                </div>
              )}

              {activeTab === "experience" && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h4 className="text-[14px] font-bold">Otimização das Suas Experiências (Método XYZ)</h4>
                    <p className="text-[11.5px] text-muted-foreground">Copie as descrições reescritas com foco em impacto e métricas para colar diretamente em cada cargo no LinkedIn:</p>
                  </div>

                  <div className="space-y-4 pt-2">
                    {analysis?.experienceTips?.map((exp: any, i: number) => {
                      const bulletsText = exp.optimizedBullets?.map((b: string) => `• ${b}`).join("\n") || "";
                      return (
                        <div key={i} className="rounded-xl border border-border bg-secondary/20 p-4 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 border-b border-border/40 pb-2">
                            <div>
                              <span className="text-[13px] font-bold text-foreground block">{exp.role}</span>
                              <span className="text-[11.5px] text-muted-foreground font-medium">{exp.company}</span>
                            </div>
                            {bulletsText && <CopyButton text={bulletsText} />}
                          </div>
                          
                          {exp.optimizedBullets && exp.optimizedBullets.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[11px] font-bold text-linkedin uppercase tracking-wider">Descrição Otimizada para Copiar:</span>
                              <div className="rounded bg-secondary/40 p-3 font-mono text-[12px] whitespace-pre-wrap leading-relaxed text-foreground/90 border border-border/30">
                                {bulletsText}
                              </div>
                            </div>
                          )}

                          {exp.tips && exp.tips.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Melhorias Aplicadas:</span>
                              <ul className="space-y-1.5">
                                {exp.tips.map((tip: string, j: number) => (
                                  <li key={j} className="text-[12px] text-muted-foreground flex items-start gap-2 leading-relaxed">
                                    <CheckCircle2 className="h-4 w-4 text-route shrink-0 mt-0.5" />
                                    <span>{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right 1 Col: Keywords, warnings, strengths & weaknesses */}
        <div className="space-y-6">
          
          {/* SEO Keywords Tag Cloud */}
          <div className="surface rounded-xl p-5 space-y-3">
            <h3 className="text-[13.5px] font-bold flex items-center gap-2">
              <Key className="h-4 w-4 text-linkedin" /> Keywords Recomendadas
            </h3>
            <p className="text-[11.5px] text-muted-foreground leading-normal">
              Palavras-chave vitais no seu nicho de mercado. Certifique-se de que elas estejam distribuídas em suas competências e cargos no LinkedIn:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {analysis?.seoKeywords?.map((kw: string, i: number) => (
                <span key={i} className="inline-flex items-center rounded-md bg-linkedin/10 px-2 py-1 text-[11px] font-medium text-linkedin border border-linkedin/10">
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Warnings & Language Consistency */}
          <div className="surface rounded-xl p-5 space-y-4">
            <h3 className="text-[13.5px] font-bold flex items-center gap-2">
              <Languages className="h-4 w-4 text-linkedin" /> Idioma e Consistência
            </h3>
            <div className="space-y-3">
              <div className="rounded-lg bg-secondary/50 p-3 space-y-1 text-[12.5px]">
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Idioma Detectado:</span>
                  <span className="font-bold">{analysis.detectedLanguage === "unknown" ? "Não identificado" : languageLabel(analysis.detectedLanguage)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border/40 mt-1">
                  <span className="font-semibold text-muted-foreground">Idioma escolhido:</span>
                  <span className="font-bold text-linkedin">{languageLabel(analysis.recommendedLanguage)}</span>
                </div>
              </div>

              {analysis?.atsIssues?.map((issue: any, i: number) => (
                <div key={i} className="rounded-lg bg-secondary/30 border border-border p-3 space-y-1.5 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{issue.type}</span>
                    <Badge variant="outline" className={`text-[9px] px-1.5 ${
                      issue.severity === "high" ? "text-signal border-signal/20" :
                      issue.severity === "medium" ? "text-warning border-warning/20" :
                      "text-muted-foreground"
                    }`}>{issue.severity === "high" ? "Grave" : issue.severity === "medium" ? "Médio" : "Leve"}</Badge>
                  </div>
                  <p className="text-muted-foreground leading-normal">{issue.description}</p>
                  <p className="text-linkedin font-medium">Ação: {issue.recommendation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="surface rounded-xl p-5 space-y-4">
            <div className="space-y-2">
              <h4 className="text-[12.5px] font-bold uppercase tracking-wider text-muted-foreground font-semibold">Pontos Fortes</h4>
              <ul className="space-y-1.5">
                {analysis?.strengths?.map((s: string, i: number) => (
                  <li key={i} className="text-[12px] text-muted-foreground flex items-start gap-1.5 leading-normal">
                    <CheckCircle2 className="h-3.5 w-3.5 text-route shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="space-y-2 pt-2 border-t border-border">
              <h4 className="text-[12.5px] font-bold uppercase tracking-wider text-muted-foreground font-semibold">Pontos Fracos</h4>
              <ul className="space-y-1.5">
                {analysis?.weaknesses?.map((w: string, i: number) => (
                  <li key={i} className="text-[12px] text-muted-foreground flex items-start gap-1.5 leading-normal">
                    <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>

      <div className="flex flex-col items-center justify-center pt-8 border-t border-border gap-3 text-center">
        <h3 className="text-[15px] font-bold text-foreground">Quer eliminar os placeholders e adicionar seus números reais?</h3>
        <p className="text-[12.5px] text-muted-foreground max-w-lg leading-relaxed">
          Responda a perguntas estratégicas geradas pela nossa IA para obter dados reais de performance, equipes e projetos e obter um perfil 100% verídico e otimizado.
        </p>
        <button
          onClick={() => window.location.href = `/analysis/${analysisId}/editor`}
          className="inline-flex items-center gap-2 rounded-lg bg-linkedin px-6 py-3 text-[13.5px] font-semibold text-linkedin-foreground hover:bg-linkedin/90 transition-colors shadow-sm cursor-pointer mt-2"
        >
          <Sparkles className="h-4 w-4" /> Responder Perguntas & Inserir Dados Reais
        </button>
      </div>
    </div>
  );
}
