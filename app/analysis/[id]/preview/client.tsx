"use client";

import { useEffect, useState } from "react";
import { Loader2, Printer, ChevronLeft } from "@/components/ui/app-icon";
import { useRouter } from "next/navigation";

export function PreviewClient({ analysisId }: { analysisId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resumeData, setResumeData] = useState<any>(null);

  useEffect(() => {
    async function loadResume() {
      try {
        const res = await fetch(`/api/analysis/${analysisId}`);
        const record = await res.json();
        if (record.finalResumeJson) {
          setResumeData(JSON.parse(record.finalResumeJson));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadResume();
  }, [analysisId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!resumeData) return <div className="min-h-screen bg-background p-6 text-foreground">Nenhum currículo otimizado encontrado. Volte ao editor.</div>;

  const { contact, summary, experience, education, skills, projects } = resumeData;

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Non-printable toolbar */}
      <div className="sticky top-0 z-50 flex flex-col gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md print:hidden sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <button 
          onClick={() => router.push(`/analysis/${analysisId}/editor`)}
          className="inline-flex min-h-10 items-center gap-2 self-start text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar ao editor
        </button>
        <button 
          onClick={handlePrint}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Printer className="h-4 w-4" /> Exportar PDF
        </button>
      </div>

      {/* A4 Paper Container for Preview & Print */}
      <div className="mx-auto mt-4 max-w-[850px] overflow-x-auto px-3 sm:mt-8 sm:px-0 print:m-0 print:p-0">
        <div className="bg-white text-black shadow-2xl print:shadow-none">
        {/* ATS Optimized Invisible Table Layout */}
        <table className="w-full border-collapse border-0 p-0 m-0" style={{ tableLayout: "fixed" }}>
          <tbody>
            <tr>
              <td className="p-5 align-top sm:p-10">
                {/* Header */}
                <div className="mb-6 text-center">
                  <h1 className="mb-1 text-3xl font-bold uppercase tracking-wide text-zinc-900">{contact.fullName}</h1>
                  <div className="text-[13px] text-zinc-700">
                    {contact.location && <span>{contact.location} • </span>}
                    {contact.email && <span>{contact.email} • </span>}
                    {contact.phone && <span>{contact.phone}</span>}
                    <br />
                    {contact.linkedin && <span>{contact.linkedin} • </span>}
                    {contact.github && <span>{contact.github}</span>}
                  </div>
                </div>

                {/* Summary */}
                {summary && (
                  <div className="mb-5">
                    <h2 className="mb-2 border-b border-zinc-300 pb-1 text-sm font-bold uppercase tracking-wider text-zinc-900">
                      Resumo profissional
                    </h2>
                    <p className="text-[13px] leading-relaxed text-zinc-800">{summary}</p>
                  </div>
                )}

                {/* Experience */}
                {experience && experience.length > 0 && (
                  <div className="mb-5">
                    <h2 className="mb-2 border-b border-zinc-300 pb-1 text-sm font-bold uppercase tracking-wider text-zinc-900">
                      Experiência
                    </h2>
                    {experience.map((exp: any, i: number) => (
                      <div key={i} className="mb-4 break-inside-avoid">
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="text-[14px] font-bold text-zinc-900">{exp.title}</h3>
                          <span className="text-[12px] font-medium text-zinc-600">
                            {exp.startDate} – {exp.current ? "Atual" : exp.endDate}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline mb-2">
                          <span className="text-[13px] font-semibold text-zinc-800">{exp.company}</span>
                          <span className="text-[12px] text-zinc-600">{exp.location}</span>
                        </div>
                        <ul className="list-disc pl-5 text-[13px] leading-snug text-zinc-800">
                          {exp.bullets.map((bullet: string, j: number) => (
                            <li key={j} className="mb-1 pl-1">{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* Projects */}
                {projects && projects.length > 0 && (
                  <div className="mb-5">
                    <h2 className="mb-2 border-b border-zinc-300 pb-1 text-sm font-bold uppercase tracking-wider text-zinc-900">
                      Projetos
                    </h2>
                    {projects.map((proj: any, i: number) => (
                      <div key={i} className="mb-3 break-inside-avoid">
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="text-[14px] font-bold text-zinc-900">{proj.name}</h3>
                          <span className="text-[12px] text-zinc-600">{proj.link}</span>
                        </div>
                        <ul className="list-disc pl-5 text-[13px] leading-snug text-zinc-800">
                          {proj.bullets.map((bullet: string, j: number) => (
                            <li key={j} className="mb-1 pl-1">{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* Skills */}
                {skills && skills.length > 0 && (
                  <div className="mb-5">
                    <h2 className="mb-2 border-b border-zinc-300 pb-1 text-sm font-bold uppercase tracking-wider text-zinc-900">
                      Competências
                    </h2>
                    <div className="text-[13px] leading-relaxed text-zinc-800">
                      {skills.map((group: any, i: number) => (
                        <div key={i} className="mb-1">
                          <span className="font-bold">{group.group}:</span> {group.items.join(", ")}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {education && education.length > 0 && (
                  <div className="mb-5">
                    <h2 className="mb-2 border-b border-zinc-300 pb-1 text-sm font-bold uppercase tracking-wider text-zinc-900">
                      Formação
                    </h2>
                    {education.map((edu: any, i: number) => (
                      <div key={i} className="mb-2 break-inside-avoid flex justify-between items-baseline">
                        <div>
                          <h3 className="text-[14px] font-bold text-zinc-900">{edu.institution}</h3>
                          <div className="text-[13px] text-zinc-800">{edu.degree} {edu.field && `in ${edu.field}`}</div>
                        </div>
                        <span className="text-[12px] font-medium text-zinc-600">
                          {edu.startDate} – {edu.endDate}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      {/* Print styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background-color: white !important; }
          .print\\:hidden { display: none !important; }
          @page { margin: 0; size: A4 portrait; }
        }
      `}} />
    </div>
  );
}
