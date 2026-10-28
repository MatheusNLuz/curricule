import type { OptimizedResume } from "../schemas/optimize.schema";
export type ResumeTextField={path:string;label:string;value:string;attention:boolean};
export function resumeTextFields(resume:OptimizedResume):ResumeTextField[]{
  const fields:ResumeTextField[]=[];
  function add(path:string,label:string,value:string){if(value.trim())fields.push({path,label,value,attention:/\d|certific|diploma|flu[eê]n|licen[cs]/i.test(value)});}
  add("professionalSummary","Resumo profissional",resume.professionalSummary);
  resume.experiences.forEach((item,index)=>{for(const key of ["title","company","startDate","endDate"] as const)add(`experiences.${index}.${key}`,`Experiência ${index+1} · ${key==="title"?"cargo":key==="company"?"empresa":"data"}`,item[key]);item.description.forEach((text,i)=>add(`experiences.${index}.description.${i}`,`Experiência ${index+1} · atividade ${i+1}`,text));});
  resume.education.forEach((item,index)=>{for(const key of ["degree","institution","startDate","endDate"] as const)add(`education.${index}.${key}`,`Formação ${index+1}`,item[key]);});
  resume.skills.forEach((item,index)=>item.items.forEach((text,i)=>add(`skills.${index}.items.${i}`,`Competência ${i+1}`,text)));
  resume.certifications.forEach((item,index)=>{for(const key of ["name","issuer","date"] as const)if(item[key])add(`certifications.${index}.${key}`,`Certificação ${index+1}`,item[key]!);});
  (resume.projects||[]).forEach((item,index)=>{add(`projects.${index}.name`,`Projeto ${index+1}`,item.name);item.description.forEach((text,i)=>add(`projects.${index}.description.${i}`,`Projeto ${index+1} · contribuição`,text));});
  (resume.languages||[]).forEach((item,index)=>{add(`languages.${index}.name`,`Idioma ${index+1}`,item.name);add(`languages.${index}.proficiency`,`Idioma ${index+1} · nível`,item.proficiency);});
  return fields;
}
export function changeResumeText(resume:OptimizedResume,path:string,replacement:string){
  if(!resumeTextFields(resume).some(field=>field.path===path))throw new Error("Campo não encontrado.");
  const updated=structuredClone(resume);let target:unknown=updated;const parts=path.split(".");
  for(const part of parts.slice(0,-1))target=(target as Record<string,unknown>)[part];
  const last=parts.at(-1)!;
  if(Array.isArray(target)&&!replacement.trim())target.splice(Number(last),1);
  else (target as Record<string,unknown>)[last]=replacement;
  return updated;
}
const normalized=(value:string)=>value.normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();
export function textOrigin(value:string,original:string,confirmed:string[]){
  const text=normalized(value);
  if(normalized(original).includes(text))return {source:"original",label:"Presente no material original"};
  if(confirmed.some(answer=>normalized(answer).includes(text)))return {source:"answer",label:"Presente em resposta confirmada"};
  return {source:"review",label:"Sem correspondência textual direta — confira a reescrita"};
}
