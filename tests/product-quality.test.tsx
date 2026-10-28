import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResumeAnalysisSchema,resumeAssessmentSchema } from "../lib/schemas/analysis.schema";
import { OptimizedResumeSchema } from "../lib/schemas/optimize.schema";
import { ScoreEngine } from "../lib/ats/score-engine";
import { resumeSections,safeResumeLink } from "../lib/resume/sections";
import { changeResumeText,textOrigin } from "../lib/resume/provenance";
import { storedRejectedClaims } from "../lib/ats/truth-policy";
import { AtsTemplate } from "../components/preview/ats-template";
import { TEMPLATE_OPTIONS,normalizeTemplateId } from "../lib/preview-template";
import { boundedJson,assertRequestOrigin } from "../lib/read-bounded-body";
import { TelemetrySchema } from "../lib/telemetry";
import { acquisitionSource } from "../lib/acquisition-source";
import { resumeDocx } from "../lib/resume/docx";
import JSZip from "jszip";
const source="Atendimento a clientes por e-mail. Organização de pedidos em Excel.";
const assessment=ResumeAnalysisSchema.parse({scores:{ats:95,impact:99},rubric:["ats","structure","clarity","impact","keywords"].map(criterion=>({criterion,level:3,foundText:"Atendimento a clientes por e-mail.",reason:"Há evidência na fonte."}))});
const resume=OptimizedResumeSchema.parse({personalInfo:{name:"Camila Validação",email:"camila@example.test",linkedin:"linkedin.com/in/camila-validacao"},professionalSummary:source,skills:[{category:"Ferramentas",items:["Excel"]}],experiences:[{company:"Horizonte Exemplo Ltda.",title:"Assistente",description:["Atendimento a clientes."]}],projects:[{name:"Organização do arquivo",description:["Organização de pedidos confirmada pela candidata."]}],languages:[{name:"Português",proficiency:"Nativo"}]});
test("score uses structured levels and cannot be changed by translated explanations or duplicated issues",()=>{
  const expected=ScoreEngine.evaluate(assessment);assert.equal(expected.overall,75);assert.equal(expected.impact,75);
  for(const wording of ["Resultados e métricas", "Sem números informados", "Outcomes and records", "Organised customer files"]){const changed=structuredClone(assessment);changed.strengths=[wording];changed.rubric!.forEach(item=>item.reason=wording);changed.atsIssues=Array.from({length:4},()=>({type:"Mesmo problema",severity:"high" as const,description:wording,recommendation:wording}));assert.deepEqual(ScoreEngine.evaluate(changed),expected);}
});
test("assessment requires one criterion per key and refuses invented source quotations",()=>{
  const schema=resumeAssessmentSchema(source);assert.equal(schema.safeParse(assessment).success,true);
  const invented=structuredClone(assessment);invented.rubric![0].foundText="Liderou uma equipe de 40 pessoas";assert.equal(schema.safeParse(invented).success,false);
  const duplicate=structuredClone(assessment);duplicate.rubric![0].criterion="structure";assert.equal(schema.safeParse(duplicate).success,false);
  const missing=structuredClone(assessment);missing.rubric![0].foundText="";assert.equal(schema.safeParse(missing).success,false);
});
test("all templates preserve content and exact locale without tables, photos or hidden contact blocks",()=>{
  for(const locale of ["pt-BR","pt-PT","en-US","en-GB"])for(const option of TEMPLATE_OPTIONS){assert.equal(normalizeTemplateId(option.id),option.id);const html=renderToStaticMarkup(<AtsTemplate resume={resume} templateId={option.id} language={locale}/>);assert.match(html,/Camila Validação/);assert.match(html,/camila@example.test/);assert.match(html,/Organização do arquivo/);assert.match(html,/linkedin.com\/in\/camila-validacao/);assert.ok(html.includes(`lang="${locale}"`));assert.doesNotMatch(html,/<(?:table|img|canvas)\b/);const skills=html.indexOf(locale.startsWith("pt")?">Competências<":">Skills<"),experience=html.indexOf(locale.startsWith("pt")?">Experiência profissional<":">Professional Experience<");assert.ok(option.id==="direct-ats"?skills<experience:experience<skills);}
});
test("empty optional sections do not create empty headings and unsafe links are not activated",()=>{
  const blank=OptimizedResumeSchema.parse({personalInfo:{},projects:[{name:""}],languages:[{name:""}]});assert.equal(resumeSections(blank,"pt-BR").length,0);assert.equal(safeResumeLink("javascript:alert(1)"),undefined);assert.equal(safeResumeLink("linkedin.com/in/example"),"https://linkedin.com/in/example");
});
test("provenance does not claim paraphrases are exact evidence and edits reject arbitrary paths",()=>{
  assert.equal(textOrigin("pedidos em Excel",source,[]).source,"original");assert.equal(textOrigin("Fechamento mensal",source,["Fiz fechamento mensal"]).source,"answer");assert.equal(textOrigin("Liderança de equipe",source,[]).source,"review");assert.throws(()=>changeResumeText(resume,"__proto__.polluted","x"));const edited=changeResumeText(resume,"experiences.0.description.0","");assert.equal(edited.experiences[0].description.length,0);assert.equal(resume.experiences[0].description.length,1);assert.deepEqual(storedRejectedClaims('["Declinei este fato",null,12]'),["Declinei este fato"]);
});
test("DOCX contains the same optional sections and body contact, with no document header",async()=>{
  const bytes=await resumeDocx(resume,"pt-BR","executive-ats");const zip=await JSZip.loadAsync(bytes);const xml=await zip.file("word/document.xml")!.async("string");assert.match(xml,/Camila Validação/);assert.match(xml,/camila@example.test/);assert.match(xml,/Organização do arquivo/);assert.match(xml,/Português/);assert.doesNotMatch(xml,/<w:tbl\b/);assert.equal(Object.keys(zip.files).some(name=>/word\/header\d/.test(name)),false);
});
test("bounded JSON rejects oversized chunked bodies and foreign-origin mutations",async()=>{
  const request=new Request("https://app.example/api/test",{method:"POST",body:JSON.stringify({text:"x".repeat(100)})});await assert.rejects(()=>boundedJson(request,40),error=>(error as {status:number}).status===413);
  const before=process.env.APP_URL;process.env.APP_URL="https://app.example";try{assert.throws(()=>assertRequestOrigin(new Request("https://app.example/api/test",{headers:{origin:"https://other.example"}})));assert.doesNotThrow(()=>assertRequestOrigin(new Request("https://app.example/api/test",{headers:{origin:"https://app.example"}})));}finally{if(before===undefined)delete process.env.APP_URL;else process.env.APP_URL=before;}
});
test("optional telemetry accepts only limited metadata, never free-form resume content",()=>{
  const event={consent:true,name:"LCP",source:"linkedin",device:"mobile",value:1200};assert.equal(TelemetrySchema.safeParse(event).success,true);assert.equal(TelemetrySchema.safeParse({...event,resume:"Private material"}).success,false);assert.equal(TelemetrySchema.safeParse({...event,consent:false}).success,false);assert.equal(TelemetrySchema.safeParse({...event,source:"https://example.test/private-job"}).success,false);assert.equal(acquisitionSource("user@example.test"),"other");
});
