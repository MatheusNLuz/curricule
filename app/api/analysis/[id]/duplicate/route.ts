import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { boundedJson } from "@/lib/read-bounded-body";
import { apiError,HttpError } from "@/lib/http-error";
import { OptimizedResumeSchema } from "@/lib/schemas/optimize.schema";
import { resumeText } from "@/lib/resume/resume-text";
import { MODES } from "@/lib/analysis-contract";
import { consumeRateLimit } from "@/lib/security-rate-limit";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{
  const session=await getSessionUser();if(!session)throw new HttpError(401,"Faça login para continuar.");await consumeRateLimit("duplicate",session.userId,20);
  const {id}=await params;const input=z.object({clientRequestId:z.string().uuid().optional(),mode:z.enum(MODES).default("OPTIMIZE_FOR_JOB")}).strict().parse(await boundedJson(request,4096));
  const source=await prisma.analysis.findFirst({where:{id,userId:session.userId}});if(!source?.parsedResumeText)throw new HttpError(404,"Material de origem não encontrado.");
  let text=source.parsedResumeText;
  if(source.finalResumeJson&&source.mode!=="LINKEDIN_OPTIMIZATION"){const parsed=OptimizedResumeSchema.safeParse(JSON.parse(source.finalResumeJson));if(parsed.success)text=resumeText(parsed.data,source.selectedLanguage);}
  const requestId=input.clientRequestId||randomUUID();
  const result=await prisma.analysis.upsert({where:{clientRequestId:requestId},update:{},create:{clientRequestId:requestId,userId:session.userId,parentAnalysisId:source.id,professionalTarget:("Nova candidatura · "+(source.professionalTarget||"Meu currículo")).slice(0,120),mode:input.mode,selectedLanguage:source.selectedLanguage,selectedTemplate:source.selectedTemplate,jobLocation:source.jobLocation,resumeInputType:"PASTED_TEXT",parsedResumeText:text,originalResumeText:text,draftJson:JSON.stringify({pastedText:text,jobDescription:"",jobUrl:"",profileUrl:"",activeTab:"paste",jobInput:"text",jobLocation:source.jobLocation||"",selectedLanguage:source.selectedLanguage,title:("Nova candidatura · "+(source.professionalTarget||"Meu currículo")).slice(0,120)})}});
  if(result.userId!==session.userId)throw new HttpError(404,"Candidatura não encontrada.");return NextResponse.json({id:result.id,mode:result.mode});
}catch(error){return apiError(error);}}
