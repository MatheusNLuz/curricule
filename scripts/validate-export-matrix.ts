import assert from "node:assert/strict";
import { mkdirSync,writeFileSync,readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PDFParse } from "pdf-parse";
import { CanvasFactory,getData } from "pdf-parse/worker";
import JSZip from "jszip";
import { resumeFixture } from "../tests/fixtures/resume-fixture";
import { TEMPLATE_OPTIONS } from "../lib/preview-template";
import { resumeSections } from "../lib/resume/sections";
import { resumeText } from "../lib/resume/resume-text";
PDFParse.setWorker(getData());
const url=new URL(process.env.DATABASE_URL||"");
assert.equal(url.hostname,"127.0.0.1");assert.equal(url.port,"55432");assert.match(url.searchParams.get("schema")||"",/^curricule_review_[a-f0-9]+$/);
const db=new PrismaClient();const base=process.env.EXPORT_BASE_URL||"http://localhost:3002";const target=new URL(base);assert.ok(["localhost","127.0.0.1"].includes(target.hostname)&&["3002","3003"].includes(target.port));const directory="scratch/evolution/exports";mkdirSync(directory,{recursive:true});
const normalize=(value:string)=>value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[\s\u00a0]+/g," ").toLowerCase();
const resumeRun=process.argv.includes("--resume");
const report:Record<string,unknown>[]=resumeRun?JSON.parse(readFileSync(`${directory}/report.json`,"utf8")):[];const smoke=process.argv.includes("--smoke");
try{
  const user=await db.user.findUniqueOrThrow({where:{email:process.env.EXPORT_TEST_EMAIL||(resumeRun?"resume-b@example.test":"resume-a@example.test")}});
  const login=await fetch(base+"/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:user.email,password:"Curricule-Teste-2026!"})});assert.equal(login.status,200,"Login de homologação");const cookie=login.headers.getSetCookie().map(value=>value.split(";")[0]).join("; ");assert.ok(cookie);
  for(const locale of ["pt-BR","pt-PT","en-US","en-GB"])for(const model of TEMPLATE_OPTIONS)for(const long of [false,true]){
    if(smoke&&(locale!=="pt-BR"||model.id!=="basic-ats"||long))continue;
    if(resumeRun&&report.some(item=>item.model===model.id&&item.locale===locale&&item.length===(long?"long":"short")))continue;
    const resume=resumeFixture(locale,long);const key=`${model.id}-${locale}-${long?"long":"short"}`;
    const row=await db.analysis.create({data:{userId:user.id,mode:"MAKE_ATS_FRIENDLY",selectedLanguage:locale,selectedTemplate:model.id,resumeInputType:"PASTED_TEXT",professionalTarget:`Matriz de exportação · ${key}`,parsedResumeText:resumeText(resume,locale),originalResumeText:resumeText(resume,locale),finalResumeJson:JSON.stringify(resume)}});
    const expected=resumeSections(resume,locale,model.id==="direct-ats");
    const pdfResponse=await fetch(base+"/api/export",{method:"POST",headers:{Cookie:cookie,"Content-Type":"application/json"},body:JSON.stringify({analysisId:row.id})});assert.equal(pdfResponse.status,200,`PDF ${key}: ${pdfResponse.status===200?"":await pdfResponse.text()}`);
    const bytes=new Uint8Array(await pdfResponse.arrayBuffer());assert.equal(new TextDecoder().decode(bytes.slice(0,5)),"%PDF-");writeFileSync(`${directory}/${key}.pdf`,bytes);
    const pdfSize=bytes.length;
    const parser=new PDFParse({data:bytes,CanvasFactory});let pages=0;
    try{const text=await parser.getText();const info=await parser.getInfo({parsePageInfo:true});pages=info.total;const normalized=normalize(text.text);assert.ok(normalized.includes(normalize(resume.personalInfo.email)));assert.ok(normalized.includes(normalize(resume.personalInfo.name)));assert.ok(normalized.includes(normalize(resume.personalInfo.phone)));assert.ok(normalized.includes("linkedin.com/in/ana-validacao-exemplo"));assert.ok(text.pages.every(page=>page.text.trim().length>20),`Página vazia em ${key}`);let previous=-1;for(const section of expected){const position=normalized.indexOf(normalize(section.title));assert.ok(position>previous,`Ordem da seção ${section.title} em ${key}`);previous=position;for(const entry of section.entries)for(const item of [entry.title,...entry.text,...entry.bullets].filter(Boolean))assert.ok(normalized.includes(normalize(item)),`Texto ausente em ${key}: ${item}`);}for(const item of resume.experiences){assert.ok(normalized.includes(normalize(item.company)));assert.ok(normalized.includes(item.startDate));}if(long)assert.ok(pages>1);else assert.ok(pages<=2,`Documento curto ficou com ${pages} páginas: ${key}`);if(locale==="pt-BR"){const screenshots=await parser.getScreenshot({partial:long?[1,pages]:[1],desiredWidth:1000,imageDataUrl:false});for(const page of screenshots.pages)writeFileSync(`${directory}/${key}-p${page.pageNumber}.png`,page.data);}}
    finally{await parser.destroy();}
    const wordResponse=await fetch(base+"/api/export",{method:"POST",headers:{Cookie:cookie,"Content-Type":"application/json"},body:JSON.stringify({analysisId:row.id,format:"docx"})});assert.equal(wordResponse.status,200,`DOCX ${key}`);const word=new Uint8Array(await wordResponse.arrayBuffer());writeFileSync(`${directory}/${key}.docx`,word);const zip=await JSZip.loadAsync(word);const xml=await zip.file("word/document.xml")!.async("string");const plain=normalize(xml.replace(/<[^>]*>/g," ").replace(/&amp;/g,"&"));for(const section of expected){assert.ok(plain.includes(normalize(section.title)));for(const entry of section.entries)for(const item of [entry.title,...entry.text,...entry.bullets].filter(Boolean))assert.ok(plain.includes(normalize(item)));}assert.ok(plain.includes(normalize(resume.personalInfo.email)));
    report.push({model:model.id,locale,length:long?"long":"short",pages,pdfBytes:pdfSize,docxBytes:word.length,status:"passed"});writeFileSync(`${directory}/report.json`,JSON.stringify(report,null,2));console.info(`✓ ${report.length}/32 · ${key} · ${pages} páginas · PDF e DOCX`);
  }
}finally{await db.$disconnect();}
