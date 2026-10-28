import { boundedJson } from "@/lib/read-bounded-body";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError,HttpError } from "@/lib/http-error";
import { OptimizedResumeSchema } from "@/lib/schemas/optimize.schema";
import { resumeTextFields,changeResumeText,textOrigin } from "@/lib/resume/provenance";
import { readTruth,storedConfirmedClaims,storedRejectedClaims } from "@/lib/ats/truth-policy";
import { recordRevision } from "@/lib/resume-revisions";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){try{const user=await getSessionUser();if(!user)throw new HttpError(401,"Faça login para continuar.");const {id}=await params;const analysis=await prisma.analysis.findFirst({where:{id,userId:user.userId},include:{questions:true}});if(!analysis?.finalResumeJson)throw new HttpError(404,"Documento não encontrado.");const resume=OptimizedResumeSchema.parse(JSON.parse(analysis.finalResumeJson));const answers=analysis.questions.filter(item=>item.confirmed&&item.answer).map(item=>item.answer!);let decisions:Record<string,string>={};try{const saved=JSON.parse(analysis.finalReviewJson||"{}");if(saved.revision===analysis.revision)decisions=saved.decisions||{};}catch{}return NextResponse.json({revision:analysis.revision,fields:resumeTextFields(resume).map(field=>({...field,origin:textOrigin(field.value,analysis.parsedResumeText||"",answers),decision:decisions[field.path]||null}))},{headers:{"Cache-Control":"private, no-store"}});}catch(error){return apiError(error);}}
export async function POST(request:Request,{params}:Context){try{
  const user=await getSessionUser();if(!user)throw new HttpError(401,"Faça login para continuar.");const {id}=await params;
  const input=z.object({path:z.string().max(160),value:z.string().max(6000),decision:z.enum(["accept","edit","reject"]),replacement:z.string().max(6000).optional(),revision:z.number().int().nonnegative()}).strict().parse(await boundedJson(request));
  await prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
    const analysis=await tx.analysis.findFirst({where:{id,userId:user.userId}});if(!analysis?.finalResumeJson)throw new HttpError(404,"Documento não encontrado.");if(analysis.revision!==input.revision)throw new HttpError(409,"O documento mudou. Atualize a comparação antes de revisar.");
    const resume=OptimizedResumeSchema.parse(JSON.parse(analysis.finalResumeJson));const field=resumeTextFields(resume).find(item=>item.path===input.path);if(!field||field.value!==input.value)throw new HttpError(409,"Este trecho mudou. Atualize a revisão.");
    const truth=readTruth(analysis.truthGuardJson);
    const confirmed=storedConfirmedClaims(analysis.confirmedClaimsJson).filter(value=>value!==input.value);
    if(input.decision==="accept"){
      let decisions:Record<string,string>={};try{const previous=JSON.parse(analysis.finalReviewJson||"{}");if(previous.revision===analysis.revision)decisions=previous.decisions||{};}catch{}
      if(truth){truth.blockedClaims=truth.blockedClaims.filter(claim=>claim!==input.value);const previous=truth.claims.find(claim=>claim.claim===input.value);if(previous){previous.source="confirmed_by_user";previous.canUseInResume=true;previous.canUseInCoverLetter=true;delete truth.decisions[truth.claims.indexOf(previous)];}else truth.claims.push({claim:input.value,source:"confirmed_by_user",canUseInResume:true,canUseInCoverLetter:true,explanation:"Informação confirmada explicitamente na revisão do documento."});}
      await tx.analysis.update({where:{id},data:{finalReviewJson:JSON.stringify({revision:analysis.revision,decisions:{...decisions,[input.path]:"accepted"}}),confirmedClaimsJson:JSON.stringify([...new Set([...confirmed,input.value])]),rejectedClaimsJson:JSON.stringify(storedRejectedClaims(analysis.rejectedClaimsJson).filter(value=>value!==input.value)),...(truth?{truthGuardJson:JSON.stringify(truth)}:{})}});return;
    }
    if(input.decision==="edit"&&input.replacement===undefined)throw new HttpError(400,"Informe o texto revisado.");
    if(input.decision==="edit"&&input.replacement?.trim())confirmed.push(input.replacement);
    const updated=changeResumeText(resume,input.path,input.decision==="reject"?"":input.replacement!);
    const rejected=storedRejectedClaims(analysis.rejectedClaimsJson);
    if(input.decision==="reject"){rejected.push(input.value);if(truth)truth.blockedClaims=[...new Set([...truth.blockedClaims,input.value])];}
    await recordRevision(tx,id,analysis.finalResumeJson,"before_review");await recordRevision(tx,id,JSON.stringify(updated),"review");
    await tx.analysis.update({where:{id},data:{finalResumeJson:JSON.stringify(updated),finalReviewJson:null,confirmedClaimsJson:JSON.stringify([...new Set(confirmed)]),rejectedClaimsJson:JSON.stringify([...new Set(rejected)]),finalScores:null,finalAssessmentJson:null,editorDraftJson:null,coverLetter:null,revision:{increment:1},...(truth?{truthGuardJson:JSON.stringify(truth)}:{})}});
  });return NextResponse.json({success:true});
}catch(error){return apiError(error);}}
