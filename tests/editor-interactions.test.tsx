import test,{mock} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";
import { OptimizedResumeSchema } from "../lib/schemas/optimize.schema";
const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"http://localhost/",pretendToBeVisual:true});
Object.defineProperty(globalThis,"navigator",{value:dom.window.navigator,configurable:true});
Object.assign(globalThis,{window:dom.window,localStorage:dom.window.localStorage,document:dom.window.document,HTMLElement:dom.window.HTMLElement,HTMLInputElement:dom.window.HTMLInputElement,Node:dom.window.Node,Event:dom.window.Event,MutationObserver:dom.window.MutationObserver,getComputedStyle:dom.window.getComputedStyle.bind(dom.window),requestAnimationFrame:dom.window.requestAnimationFrame.bind(dom.window),cancelAnimationFrame:dom.window.cancelAnimationFrame.bind(dom.window)});
const destinations:string[]=[];const router={push:(value:string)=>destinations.push(value),replace:()=>{},refresh:()=>{}};const toast=()=>{};
mock.module("next/navigation.js",{namedExports:{useRouter:()=>router,useSearchParams:()=>new URLSearchParams(),usePathname:()=>"/analysis/test/editor"}});
mock.module(new URL("../components/ui/custom-toast.tsx",import.meta.url).href,{namedExports:{useToast:()=>({toast})}});
const {render,screen,within,cleanup,waitFor,act}=await import("@testing-library/react");
const {default:userEvent}=await import("@testing-library/user-event");
const {StructuredResumeEditor}=await import("../components/editor/structured-resume-editor");
const {EditorClient}=await import("../app/analysis/[id]/editor/client");
const {MeasurementControl}=await import("../components/analytics/measurement");
const {SourceLinkInput}=await import("../components/analysis/source-link-input");
const {TaskProgress}=await import("../components/analysis/task-progress");
const {notifyTaskActivity}=await import("../lib/task-events");
test.afterEach(()=>{cleanup();mock.restoreAll();dom.window.localStorage.clear();destinations.length=0;});

test("progress polling pauses in hidden tabs and wakes immediately for task activity",async context=>{
  context.mock.timers.enable({apis:["setTimeout"]});
  Object.defineProperty(dom.window.document,"visibilityState",{value:"visible",configurable:true});
  const requests=mock.method(globalThis,"fetch",async()=>Response.json({tasks:[]}));
  try{
    await act(async()=>{render(<TaskProgress analysisId="progress-test"/>);});
    assert.equal(requests.mock.callCount(),1);
    await act(async()=>{context.mock.timers.tick(3000);});assert.equal(requests.mock.callCount(),1);
    await act(async()=>{notifyTaskActivity('{"analysisId":"progress-test"}',true);context.mock.timers.tick(0);});assert.equal(requests.mock.callCount(),2);
    await act(async()=>{context.mock.timers.tick(3000);});assert.equal(requests.mock.callCount(),3);
    Object.defineProperty(dom.window.document,"visibilityState",{value:"hidden",configurable:true});
    await act(async()=>{dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange"));context.mock.timers.tick(60_000);});assert.equal(requests.mock.callCount(),3);
    Object.defineProperty(dom.window.document,"visibilityState",{value:"visible",configurable:true});
    await act(async()=>{dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange"));context.mock.timers.tick(0);});assert.equal(requests.mock.callCount(),4);
  }finally{cleanup();context.mock.timers.reset();Object.defineProperty(dom.window.document,"visibilityState",{value:"visible",configurable:true});}
});
const fixture=()=>OptimizedResumeSchema.parse({personalInfo:{name:"Ana Validação"},professionalSummary:"Experiência em atendimento ao cliente.",experiences:[{company:"Empresa A",title:"Cargo A",startDate:"01/2021",endDate:"12/2022",description:["Atendimento por e-mail."]},{company:"Empresa B",title:"Cargo B",startDate:"01/2023",endDate:"",description:["Organização de pedidos."]}]});
test("editor saves every section, supports reorder and undo, without changing dates implicitly",async()=>{
  const initial=fixture();let saved:typeof initial|null=null;
  render(<StructuredResumeEditor initialData={initial} onSave={async value=>{saved=structuredClone(value);}} onDraftSave={async()=>{}}/>);
  const user=userEvent.setup({document:dom.window.document});
  await user.click(screen.getByRole("button",{name:"Mover registro 2 de Experiências profissionais para cima"}));
  await user.click(screen.getByRole("button",{name:"Remover registro 2 de Experiências profissionais"}));
  await user.click(screen.getByRole("button",{name:"Desfazer remoção"}));
  for(const [group,label,value] of [["Formação acadêmica","Curso ou título","Administração"],["Competências","Grupo de competências","Ferramentas"],["Certificações","Certificação","Excel"],["Projetos (opcional)","Nome do projeto","Arquivo organizado"],["Idiomas (opcional)","Idioma","Português"]]){
    await user.click(screen.getByRole("button",{name:"Adicionar em "+group}));
    await user.type(screen.getByLabelText(label,{exact:true}),value);
  }
  await user.type(screen.getByLabelText("Competências do grupo",{exact:false}),"Excel{Enter}Atendimento");
  await user.click(screen.getAllByRole("button",{name:"Salvar alterações"})[0]);
  assert.ok(saved);const result=OptimizedResumeSchema.parse(saved);
  assert.deepEqual(result.experiences.map(entry=>entry.title),["Cargo B","Cargo A"]);
  assert.equal(result.experiences[1].startDate,"01/2021");assert.equal(result.education[0].degree,"Administração");assert.deepEqual(result.skills[0].items,["Excel","Atendimento"]);assert.equal(result.certifications[0].name,"Excel");assert.equal(result.projects?.[0].name,"Arquivo organizado");assert.equal(result.languages?.[0].name,"Português");
});
for(const status of [403,404,500])test(`editor initial ${status} has persistent recovery instead of infinite loading`,async()=>{
  const fetcher=mock.method(globalThis,"fetch",async()=>Response.json({error:status===404?"Análise não encontrada.":"Serviço indisponível."},{status}));
  render(<EditorClient analysisId="test"/>);
  const alert=await screen.findByRole("alert");assert.match(alert.textContent||"",/rascunhos salvos não foram removidos/);
  const user=userEvent.setup({document:dom.window.document});await user.click(within(alert).getByRole("button",{name:"Tentar novamente"}));await waitFor(()=>assert.equal(fetcher.mock.callCount(),2));assert.ok(await screen.findByRole("button",{name:"Voltar ao histórico"}));
});
test("editor network failure explains connection and expired session preserves the return destination",async()=>{
  const fetcher=mock.method(globalThis,"fetch",async()=>{throw new TypeError("Failed to fetch");});render(<EditorClient analysisId="test"/>);assert.match((await screen.findByRole("alert")).textContent||"",/Verifique sua conexão/);cleanup();fetcher.mock.restore();
  mock.method(globalThis,"fetch",async()=>Response.json({error:"Expired"},{status:401}));render(<EditorClient analysisId="test"/>);await waitFor(()=>assert.equal(destinations.length,1));assert.match(destinations[0],/login\?next=%2Fanalysis%2Ftest%2Feditor/);
});
test("withdrawal stops local telemetry even if server deletion fails",async()=>{
  dom.window.localStorage.setItem("curricule-measurement","yes");mock.method(globalThis,"fetch",async()=>new Response(null,{status:503}));render(<MeasurementControl/>);const user=userEvent.setup({document:dom.window.document});await user.click(screen.getByRole("button",{name:"Desativar medição opcional"}));await screen.findByText(/Medição local desativada/);assert.equal(dom.window.localStorage.getItem("curricule-measurement"),"no");assert.ok(screen.getByRole("button",{name:"Permitir medição opcional"}));
});
function SourceHarness(){const [url,setUrl]=React.useState("https://jobs.example.test/vaga"),[text,setText]=React.useState(""),[reviewed,setReviewed]=React.useState(false);return <SourceLinkInput kind="job" url={url} onUrlChange={setUrl} content={text} onContentChange={setText} reviewed={reviewed} onReviewedChange={setReviewed} ensureAnalysis={async()=>"a"}/>;}
test("a blocked source never becomes successful or reviewed, and a partial source stays visible for review",async()=>{
  let blocked=true;mock.method(globalThis,"fetch",async()=>blocked?Response.json({error:"Página exige login. Cole o texto."},{status:422}):Response.json({text:"Requisitos: Excel. "+"Descrição pública da vaga. ".repeat(10),title:"Analista",company:null,url:"https://jobs.example.test/vaga",extractedAt:"2026-10-25T12:00:00Z",requirements:"Requisitos: Excel",responsibilities:null,warnings:["Confira as responsabilidades: bloco não identificado."]}));
  render(<SourceHarness/>);const user=userEvent.setup({document:dom.window.document});await user.click(screen.getByRole("button",{name:"Ler descrição da vaga"}));assert.match((await screen.findByRole("alert")).textContent||"",/exige login/);assert.equal(screen.queryByRole("checkbox"),null);blocked=false;await user.click(screen.getByRole("button",{name:"Ler descrição da vaga"}));await screen.findByText(/bloco não identificado/);const checkbox=screen.getByRole("checkbox");assert.equal((checkbox as HTMLInputElement).checked,false);await user.click(checkbox);assert.equal((checkbox as HTMLInputElement).checked,true);
});
