"use client";
import { useEffect, useMemo, useState } from "react";
import type { OptimizedResume } from "@/lib/schemas/optimize.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/custom-toast";

type Collection = "experiences" | "education" | "skills" | "certifications" | "projects" | "languages";
type Entry = Record<string, string | string[]>;
type Group = { key: Collection; title: string; empty: Entry; fields: { key: string; label: string; lines?: boolean; hint?: string }[] };
const GROUPS: Group[] = [
  {key:"experiences",title:"Experiências profissionais",empty:{company:"",title:"",startDate:"",endDate:"",location:"",description:[]},fields:[{key:"title",label:"Cargo"},{key:"company",label:"Empresa"},{key:"startDate",label:"Início",hint:"Ex.: 03/2023"},{key:"endDate",label:"Término",hint:"Use Atual se estiver em curso; deixe vazio se não souber"},{key:"location",label:"Localização"},{key:"description",label:"Atividades e resultados confirmados",lines:true,hint:"Uma atividade por linha. Inclua somente informações que você possa confirmar."}]},
  {key:"education",title:"Formação acadêmica",empty:{institution:"",degree:"",startDate:"",endDate:""},fields:[{key:"degree",label:"Curso ou título"},{key:"institution",label:"Instituição"},{key:"startDate",label:"Início"},{key:"endDate",label:"Término"}]},
  {key:"skills",title:"Competências",empty:{category:"",items:[]},fields:[{key:"category",label:"Grupo de competências"},{key:"items",label:"Competências do grupo",lines:true,hint:"Uma competência por linha."}]},
  {key:"certifications",title:"Certificações",empty:{name:"",issuer:"",date:""},fields:[{key:"name",label:"Certificação"},{key:"issuer",label:"Instituição emissora"},{key:"date",label:"Data"}]},
  {key:"projects",title:"Projetos (opcional)",empty:{name:"",description:[],url:"",startDate:"",endDate:""},fields:[{key:"name",label:"Nome do projeto"},{key:"url",label:"Link do projeto"},{key:"startDate",label:"Início"},{key:"endDate",label:"Término"},{key:"description",label:"Sua participação",lines:true,hint:"Uma contribuição por linha. Não acrescente resultados sem confirmação."}]},
  {key:"languages",title:"Idiomas (opcional)",empty:{name:"",proficiency:""},fields:[{key:"name",label:"Idioma"},{key:"proficiency",label:"Nível informado por você"}]},
];
const CONTACT = [["name","Nome completo"],["email","E-mail"],["phone","Telefone"],["location","Localização"],["linkedin","LinkedIn"],["portfolio","Portfólio"]] as const;
function entries(resume: OptimizedResume, key: Collection) { return (resume[key] || []) as unknown as Entry[]; }
export function StructuredResumeEditor({ initialData, draftData, onSave, onDraftSave, onPreviewChange, onDirtyChange }: { initialData: OptimizedResume; draftData?: OptimizedResume; onSave: (data: OptimizedResume) => Promise<void>; onDraftSave: (data: OptimizedResume) => Promise<void>; onPreviewChange?: (data: OptimizedResume) => void; onDirtyChange?:(value:boolean)=>void }) {
  const { toast } = useToast();
  const [data,setData]=useState(draftData||initialData);
  const [saving,setSaving]=useState(false);
  const [undo,setUndo]=useState<{key:Collection;entry:Entry;index:number}|null>(null);
  const [draftStatus,setDraftStatus]=useState(draftData?"Rascunho recuperado. Salve para atualizar o documento final.":"");
  const savedContent=useMemo(()=>JSON.stringify(initialData),[initialData]);
  const currentContent=useMemo(()=>JSON.stringify(data),[data]);
  const dirty=currentContent!==savedContent;
  useEffect(()=>{onDirtyChange?.(dirty);},[dirty,onDirtyChange]);
  useEffect(()=>{onPreviewChange?.(data);},[data,onPreviewChange]);
  useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue="";}};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[dirty]);
  useEffect(()=>{
    if(!dirty)return;
    let active=true;
    const timer=setTimeout(async()=>{setDraftStatus("Salvando rascunho…");try{await onDraftSave(data);if(active)setDraftStatus("Rascunho salvo na sua conta. Salve as alterações para atualizar PDF e DOCX.");}catch{if(active)setDraftStatus("Rascunho não salvo. Mantenha esta aba aberta e tente salvar novamente.");}},1000);
    return()=>{active=false;clearTimeout(timer);};
  },[data,dirty,onDraftSave]);
  function change(key:Collection,index:number,field:string,value:string|string[]){setData(current=>({...current,[key]:entries(current,key).map((entry,i)=>i===index?{...entry,[field]:value}:entry)}));}
  function move(key:Collection,index:number,delta:number){setData(current=>{const list=[...entries(current,key)];const target=index+delta;if(target<0||target>=list.length)return current;[list[index],list[target]]=[list[target],list[index]];return {...current,[key]:list};});}
  function remove(key:Collection,index:number){setUndo({key,entry:entries(data,key)[index],index});setData(current=>({...current,[key]:entries(current,key).filter((_,i)=>i!==index)}));setDraftStatus("Registro removido do rascunho. Você pode desfazer a remoção.");}
  function restore(){if(!undo)return;setData(current=>{const list=[...entries(current,undo.key)];list.splice(Math.min(undo.index,list.length),0,undo.entry);return {...current,[undo.key]:list};});setUndo(null);}
  async function save(){setSaving(true);try{await onSave(data);setDraftStatus("Alterações salvas. O documento final foi atualizado; a nota pode ser reavaliada separadamente.");toast({title:"Salvo",description:"Alterações confirmadas pelo servidor.",variant:"success"});}catch{/* O pai preserva o rascunho e apresenta o erro. */}finally{setSaving(false);}}
  return <div className="sheet padded structuredEditor space-y-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">Editar meu currículo</h2><p className="finePrint">Seções opcionais vazias ficam fora do documento. A ordem dos registros é a que você escolher.</p></div><Button disabled={saving} onClick={save}>{saving?"Salvando…":"Salvar alterações"}</Button></div><p role="status" aria-live="polite" className="finePrint">{draftStatus}</p>{undo&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"><p className="text-sm">Um registro foi removido.</p><Button variant="outline" onClick={restore}>Desfazer remoção</Button></div>}
    <section><h3 className="mb-4 border-b border-border pb-2 font-semibold">Contato</h3><div className="grid gap-4 sm:grid-cols-2">{CONTACT.map(([key,label])=><label key={key} className="grid gap-2 text-sm">{label}<Input autoComplete={key==="name"?"name":key==="email"?"email":"off"} value={data.personalInfo[key]||""} onChange={event=>setData(current=>({...current,personalInfo:{...current.personalInfo,[key]:event.target.value}}))}/></label>)}</div></section>
    <label className="grid gap-2 text-sm font-semibold">Resumo profissional<Textarea value={data.professionalSummary} onChange={event=>setData(current=>({...current,professionalSummary:event.target.value}))} className="min-h-36"/></label>
    {GROUPS.map(group=><section key={group.key} className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3"><h3 className="font-semibold">{group.title}</h3><Button variant="outline" onClick={()=>setData(current=>({...current,[group.key]:[...entries(current,group.key),structuredClone(group.empty)]}))} aria-label={`Adicionar em ${group.title}`}>Adicionar</Button></div>{!entries(data,group.key).length&&<p className="finePrint">Nenhum registro. Adicione somente se fizer parte da sua trajetória.</p>}{entries(data,group.key).map((entry,index)=><details key={index} open={index===0} className="rounded-lg border border-border p-4"><summary className="min-h-11 cursor-pointer text-sm font-semibold">{String(entry.title||entry.name||entry.degree||entry.category||`Registro ${index+1}`)}</summary><div className="mt-4 grid gap-4 sm:grid-cols-2">{group.fields.map(field=><label key={field.key} className={`grid gap-2 text-sm ${field.lines?"sm:col-span-2":""}`}>{field.label}{field.lines?<Textarea value={Array.isArray(entry[field.key])?(entry[field.key] as string[]).join("\n"):String(entry[field.key]||"")} onChange={event=>change(group.key,index,field.key,event.target.value.split("\n"))} className="min-h-28"/>:<Input value={String(entry[field.key]||"")} onChange={event=>change(group.key,index,field.key,event.target.value)}/>} {field.hint&&<span className="text-xs font-normal text-muted-foreground">{field.hint}</span>}</label>)}</div><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" disabled={index===0} onClick={()=>move(group.key,index,-1)} aria-label={`Mover registro ${index+1} de ${group.title} para cima`}>Subir</Button><Button variant="outline" disabled={index===entries(data,group.key).length-1} onClick={()=>move(group.key,index,1)} aria-label={`Mover registro ${index+1} de ${group.title} para baixo`}>Descer</Button><Button variant="ghost" onClick={()=>remove(group.key,index)} aria-label={`Remover registro ${index+1} de ${group.title}`}>Remover</Button></div></details>)}</section>)}
    <div className="border-t border-border pt-5"><Button disabled={saving} onClick={save}>{saving?"Salvando…":"Salvar alterações"}</Button></div></div>;
}
