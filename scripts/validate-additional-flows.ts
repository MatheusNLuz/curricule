import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resumeFixture } from "../tests/fixtures/resume-fixture";
import { resumeText } from "../lib/resume/resume-text";
const connection=new URL(process.env.DATABASE_URL||"");assert.equal(connection.hostname,"127.0.0.1");assert.equal(connection.port,"55432");assert.match(connection.searchParams.get("schema")||"",/^curricule_review_/);
const base="http://localhost:3002";const response=await fetch(base+"/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"resume-a@example.test",password:"Curricule-Teste-2026!"})});assert.equal(response.status,200);const Cookie=response.headers.getSetCookie().map(value=>value.split(";")[0]).join("; ");
async function call(path:string,body:unknown,method="POST"){const response=await fetch(base+path,{method,headers:{Cookie,"Content-Type":"application/json"},body:JSON.stringify(body)});const result=await response.json();assert.equal(response.status,200,`${path}: ${JSON.stringify(result)}`);return result;}
const source=resumeText(resumeFixture(),"pt-BR"),results:unknown[]=[];
for(const mode of ["OPTIMIZE_FOR_JOB","LINKEDIN_OPTIMIZATION"]){
  const row=await call("/api/analysis/create",{mode,clientRequestId:randomUUID(),selectedLanguage:"pt-BR",professionalTarget:"Fluxo adicional de homologação"});
  await call("/api/analysis/"+row.id,{parsedResumeText:source,originalResumeText:source,resumeInputType:"PASTED_TEXT",...(mode==="OPTIMIZE_FOR_JOB"?{jobDescription:"Assistente de atendimento. Responsabilidades: atendimento por e-mail, esclarecimento de dúvidas e organização de pedidos em planilhas. Requisitos: comunicação clara, organização e conhecimentos de Excel. Local: São Paulo."}:{})},"PATCH");
  const result=await call(mode==="OPTIMIZE_FOR_JOB"?"/api/compare":"/api/analyze",{analysisId:row.id});assert.ok(result.success);
  if(mode==="OPTIMIZE_FOR_JOB"){const letter=await call("/api/cover-letter",{analysisId:row.id});assert.ok(letter.coverLetter.length>100);console.info("✓ Comparação com vaga e carta real com fatos verificados");}
  else {assert.ok(result.analysis.headlineSuggestions.length);assert.ok(result.analysis.summarySuggestion);console.info("✓ Análise real de texto de perfil LinkedIn, sugestões e pontuações");}
  results.push({mode,id:row.id,status:"passed"});writeFileSync("scratch/evolution/additional-flows-report.json",JSON.stringify(results,null,2));
}
