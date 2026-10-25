"use client";

import { useEffect, useState } from "react";
import type { OptimizedResume } from "@/lib/schemas/optimize.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "@/components/ui/app-icon";
import { useToast } from "@/components/ui/custom-toast";

export function StructuredResumeEditor({ initialData, draftData, onSave, onDraftSave }: { initialData: OptimizedResume; draftData?: OptimizedResume; onSave: (data: OptimizedResume) => Promise<void>; onDraftSave: (data: OptimizedResume) => Promise<void> }) {
  const { toast } = useToast();
  const [data, setData] = useState(draftData || initialData);
  const [draftStatus, setDraftStatus] = useState(draftData ? "Rascunho recuperado. Salve para atualizar o PDF final." : "");
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(data) !== JSON.stringify(initialData);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(async () => {
      setDraftStatus("Salvando rascunho…");
      try { await onDraftSave(data); setDraftStatus("Rascunho salvo na sua conta. Salve as alterações para atualizar o PDF."); }
      catch { setDraftStatus("Rascunho não salvo. Mantenha esta aba aberta e tente salvar novamente."); }
    }, 1000);
    return () => clearTimeout(timer);
  }, [data, dirty, onDraftSave]);

  const handleContactChange = (field: keyof OptimizedResume["personalInfo"], value: string) => {
    setData({ ...data, personalInfo: { ...data.personalInfo, [field]: value } });
  };

  const handleSummaryChange = (value: string) => {
    setData({ ...data, professionalSummary: value });
  };

  const handleExperienceChange = <K extends keyof OptimizedResume["experiences"][number]>(index: number, field: K, value: OptimizedResume["experiences"][number][K]) => {
    const newExp = data.experiences.map((entry, current) => current === index ? { ...entry, [field]: value } : entry);
    setData({ ...data, experiences: newExp });
  };

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(data); toast({ title: "Salvo", description: "Alterações confirmadas pelo servidor.", variant: "success" }); }
    catch { /* The parent presents the error; keep the user's local edit intact. */ }
    finally { setSaving(false); }
  };

  if (!data) return null;

  return (
    <div className="surface space-y-8 rounded-2xl p-4 sm:p-6">
      <p role="status" className="text-xs text-muted-foreground">{draftStatus}</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Ajustar estrutura</h2>
          <p className="text-[13px] text-muted-foreground">Edite os campos livremente. Eles serão atualizados no PDF final.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">
          <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="text-[14px] font-semibold border-b border-border pb-2">Contato</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="contact-name" className="text-[12px] font-medium text-muted-foreground">Nome completo</label>
            <Input id="contact-name" aria-label="Nome completo" value={data.personalInfo?.name || ""} onChange={(e) => handleContactChange("name", e.target.value)} className="h-10 text-[13px]" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contact-email" className="text-[12px] font-medium text-muted-foreground">E-mail</label>
            <Input id="contact-email" aria-label="E-mail" value={data.personalInfo?.email || ""} onChange={(e) => handleContactChange("email", e.target.value)} className="h-10 text-[13px]" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contact-phone" className="text-[12px] font-medium text-muted-foreground">Telefone</label>
            <Input id="contact-phone" aria-label="Telefone" value={data.personalInfo?.phone || ""} onChange={(e) => handleContactChange("phone", e.target.value)} className="h-10 text-[13px]" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contact-location" className="text-[12px] font-medium text-muted-foreground">Localização</label>
            <Input id="contact-location" aria-label="Localização" value={data.personalInfo?.location || ""} onChange={(e) => handleContactChange("location", e.target.value)} className="h-10 text-[13px]" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contact-linkedin" className="text-[12px] font-medium text-muted-foreground">LinkedIn</label>
            <Input id="contact-linkedin" aria-label="LinkedIn" value={data.personalInfo?.linkedin || ""} onChange={(e) => handleContactChange("linkedin", e.target.value)} className="h-10 text-[13px]" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contact-portfolio" className="text-[12px] font-medium text-muted-foreground">Portfólio</label>
            <Input id="contact-portfolio" aria-label="Portfólio" value={data.personalInfo?.portfolio || ""} onChange={(e) => handleContactChange("portfolio", e.target.value)} className="h-10 text-[13px]" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <label htmlFor="professional-summary" className="block text-[14px] font-semibold border-b border-border pb-2">Resumo profissional</label>
        <Textarea 
          id="professional-summary"
          aria-label="Resumo profissional"
          value={data.professionalSummary || ""} 
          onChange={(e) => handleSummaryChange(e.target.value)}
          className="min-h-[100px] text-[13px]"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-[14px] font-semibold border-b border-border pb-2">Experiência Profissional</h3>
        <div className="space-y-6">
          {(data.experiences || []).map((exp, i: number) => (
            <div key={i} className="p-4 bg-secondary/30 rounded-lg border border-border space-y-4 relative">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor={`experience-${i}-company`} className="text-[12px] font-medium text-muted-foreground">Empresa</label>
                  <Input id={`experience-${i}-company`} aria-label={`Empresa da experiência ${i + 1}`} value={exp.company || ""} onChange={(e) => handleExperienceChange(i, "company", e.target.value)} className="h-10 text-[13px]" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`experience-${i}-title`} className="text-[12px] font-medium text-muted-foreground">Cargo</label>
                  <Input id={`experience-${i}-title`} aria-label={`Cargo da experiência ${i + 1}`} value={exp.title || ""} onChange={(e) => handleExperienceChange(i, "title", e.target.value)} className="h-10 text-[13px]" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`experience-${i}-description`} className="text-[12px] font-medium text-muted-foreground">Descrição</label>
                <Textarea 
                  id={`experience-${i}-description`}
                  aria-label={`Descrição da experiência ${i + 1}`}
                  value={Array.isArray(exp.description) ? exp.description.join('\n') : (exp.description || "")} 
                  onChange={(e) => handleExperienceChange(i, "description", e.target.value.split('\n').filter(Boolean))} 
                  className="min-h-24 text-[13px]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
