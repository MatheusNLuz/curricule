import { Document,ExternalHyperlink,HeadingLevel,Packer,Paragraph,TextRun } from "docx";
import type { OptimizedResume } from "../schemas/optimize.schema";
import { resumeSections,safeResumeLink } from "./sections";
import type { TemplateId } from "../preview-template";

export async function resumeDocx(resume:OptimizedResume,language:string,template:TemplateId){
  const headingFont=template==="executive-ats"?"Georgia":"Arial";
  const children:Paragraph[]=[new Paragraph({heading:HeadingLevel.TITLE,alignment:template==="basic-ats"?"center":"left",children:[new TextRun({text:resume.personalInfo.name,font:headingFont,size:template==="executive-ats"?54:48,bold:template!=="executive-ats"})]})];
  children.push(new Paragraph({children:[new TextRun({text:[resume.personalInfo.location,resume.personalInfo.phone,resume.personalInfo.email].filter(Boolean).join(" · "),size:19})]}));
  for(const value of [resume.personalInfo.linkedin,resume.personalInfo.portfolio])if(value){const link=safeResumeLink(value);children.push(new Paragraph({children:link?[new ExternalHyperlink({link,children:[new TextRun({text:value,size:19})]})]:[new TextRun({text:value,size:19})]}));}
  for(const section of resumeSections(resume,language,template==="direct-ats")){
    children.push(new Paragraph({heading:HeadingLevel.HEADING_1,keepNext:true,spacing:{before:220,after:120},children:[new TextRun({text:section.title,font:headingFont,bold:template!=="executive-ats",size:25,color:template==="modern-ats"?"4F46E5":"202124"})]}));
    for(const entry of section.entries){
      if(entry.title)children.push(new Paragraph({keepNext:true,children:[new TextRun({text:entry.title,bold:true})]}));
      if(entry.meta)children.push(new Paragraph({keepNext:!!entry.text.length||!!entry.bullets.length,children:[new TextRun({text:entry.meta,size:19,color:"43464D"})]}));
      for(const text of entry.text)if(text.trim())children.push(new Paragraph({text}));
      for(const text of entry.bullets)if(text.trim())children.push(new Paragraph({text,bullet:{level:0}}));
    }
  }
  const doc=new Document({creator:"Curricule",title:resume.personalInfo.name,styles:{default:{document:{run:{font:"Arial",size:22,color:"202124"},paragraph:{spacing:{after:100,line:270}}}}},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:907,bottom:907,left:907,right:907}}},children}]});
  return Packer.toBuffer(doc);
}
