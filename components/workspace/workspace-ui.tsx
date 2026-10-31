import Link from "next/link";
import { resumeSections } from "@/lib/resume/sections";
import type { ReactNode } from "react";
import { ArrowRight, Check, FileText } from "@/components/ui/app-icon";
import { OptimizedResumeSchema } from "@/lib/schemas/optimize.schema";
import { CurriculeLogo } from "@/components/brand/curricule-logo";
import { Mascot } from "@/components/mascot/mascot";
import type { MascotPose } from "@/lib/mascot-guide";

export function WorkspacePage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`work-ui ${className}`}><div className="mainContent">{children}</div><footer className="workspaceFooter"><Link href="/dashboard" aria-label="Curricule, início" className="workspaceFooterLogo"><CurriculeLogo /></Link><nav aria-label="Links do rodapé"><Link href="/help">Ajuda</Link><Link href="/privacy">Privacidade</Link><Link href="/privacy#termos">Condições de uso</Link></nav></footer></div>;
}
export function PageHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <header className="pageHeading"><div><h1>{title}</h1><p>{description}</p></div>{children && <div className="headingActions">{children}</div>}</header>;
}
export function Sheet({ title, note, children, className = "" }: { title?: string; note?: string; children: ReactNode; className?: string }) {
  return <section className={`sheet ${className}`}>{title && <div className="sheetHeading"><h2>{title}</h2>{note && <span>{note}</span>}</div>}{children}</section>;
}
export function Status({ children, tone = "violet" }: { children: ReactNode; tone?: "violet" | "green" | "amber" | "neutral" }) {
  return <span className={`status ${tone}`}><i />{children}</span>;
}
export function Journey({ current }: { current: number }) {
  return <ol className="journey" aria-label="Etapas da candidatura">{["Seu material", "Análise", "Revisão", "Seu resultado"].map((label, index) => <li key={label} className={index === current ? "current" : index < current ? "complete" : ""} aria-current={index === current ? "step" : undefined}><span>{index < current ? <Check size={15} /> : index + 1}</span><strong>{label}</strong></li>)}</ol>;
}
export function EmptyState({ title, description, href = "/analysis/new", action = "Começar uma análise", mascot = false, mascotPose = "welcome" }: { title: string; description: string; href?: string; action?: string; mascot?: boolean; mascotPose?: MascotPose }) {
  return <div className="emptyState">{mascot ? <Mascot pose={mascotPose} size="medium" /> : <FileText size={30} />}<h2>{title}</h2><p>{description}</p><Link className="button secondary" href={href}>{action}<ArrowRight size={16} /></Link></div>;
}
export function ResumeDocument({ value, language = "pt-BR", compact = false }: { value: string | null; language?: string; compact?: boolean }) {
  let raw: unknown;
  try { raw = JSON.parse(value || "null"); } catch { raw = null; }
  const result = OptimizedResumeSchema.safeParse(raw);
  if (!result.success) return <div className="emptyState"><FileText size={35} /><p>A versão revisada do seu currículo aparecerá aqui.</p></div>;
  const resume = result.data;
  const english = language.startsWith("en");
  return <article className={`resumePaper ${compact?"compact":""}`} aria-label={english?"Resume preview":"Prévia do currículo"}><h2>{resume.personalInfo.name}</h2><p className="paperContact">{Object.values(resume.personalInfo).filter(value=>value&&value!==resume.personalInfo.name).join(" · ")}</p>{resumeSections(resume,language).map(section=><section key={section.title}><h3>{section.title}</h3>{section.entries.map((entry,index)=><div key={index}>{entry.title&&<strong>{entry.title}</strong>}{entry.meta&&<p className="paperEmployer">{entry.meta}</p>}{entry.text.map((text,i)=><p key={i}>{text}</p>)}{!!entry.bullets.length&&<ul>{entry.bullets.filter(Boolean).map((text,i)=><li key={i}>{text}</li>)}</ul>}</div>)}</section>)}</article>;
}
