import { createHash,randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./http-error";
import { requireAnalysisAccess } from "./billing/service";
import { LANGUAGE_POLICY_VERSION } from "./ai/output-language";
import { taskContext } from "./task-context";
import { withAnalysisCapacity } from "./runtime/analysis-capacity";
export const TASK_POLICY_VERSION="bounded-rubric-v4";
export function inputHash(value:unknown){return createHash("sha256").update(JSON.stringify(value)).digest("hex");}
export function taskBudgetMs(){return Math.min(240_000,Math.max(10_000,Number(process.env.ANALYSIS_TASK_TIMEOUT_MS)||240_000));}
export function dailyWindow(now=new Date()){const since=new Date(now);since.setUTCHours(0,0,0,0);return {since,resetsAt:new Date(since.getTime()+86_400_000)};}
export async function commitTask<T>(operation:(tx:Prisma.TransactionClient)=>Promise<T>){
  const context=taskContext.getStore();
  if(!context)throw new HttpError(409,"Esta etapa precisa ser iniciada novamente.","TASK_EXPIRED");
  context.signal.throwIfAborted();
  return prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${context.analysisId}))`;
    const task=await tx.analysisTask.findUnique({where:{analysisId_kind:{analysisId:context.analysisId,kind:context.kind}}});
    context.signal.throwIfAborted();
    if(task?.token!==context.token||task.status!=="RUNNING"||task.leaseUntil<=new Date())throw new HttpError(409,"A etapa expirou. Retome para gerar uma nova tentativa.","TASK_EXPIRED");
    return operation(tx);
  });
}
export async function runAnalysisTask<T>(analysisId:string,userId:string,kind:string,input:unknown,run:()=>Promise<T>):Promise<T>{
  const hash=inputHash([LANGUAGE_POLICY_VERSION,TASK_POLICY_VERSION,input]);const token=randomUUID();const budget=taskBudgetMs();
  const cached=await prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${analysisId}))`;
    const analysis=await tx.analysis.findFirst({where:{id:analysisId,userId},select:{id:true}});
    if(!analysis)throw new HttpError(404,"Análise não encontrada.");
    const previous=await tx.analysisTask.findUnique({where:{analysisId_kind:{analysisId,kind}}});
    if(previous?.status==="RUNNING"&&previous.leaseUntil>new Date())throw new HttpError(409,"Esta etapa já está sendo processada. Você pode aguardar ou retomar pelo histórico.","TASK_RUNNING");
    if(previous?.status==="COMPLETED"&&previous.inputHash===hash&&previous.resultJson)return {value:JSON.parse(previous.resultJson) as T};
    const imported=kind.startsWith("IMPORT_");
    if(!imported)await requireAnalysisAccess(tx,userId);
    const {since,resetsAt}=dailyWindow();
    const used=await tx.analysisUsage.count({where:{userId,createdAt:{gte:since},kind:imported?{startsWith:"IMPORT_"}:{not:{startsWith:"IMPORT_"}}}});
    const limit=imported?Math.max(1,Number(process.env.SOURCE_DAILY_LIMIT)||80):Math.max(1,Number(process.env.ANALYSIS_DAILY_LIMIT)||40);
    if(used>=limit){
      const renewal=resetsAt.toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"});
      throw new HttpError(429,imported?`Limite diário de ${limit} leituras atingido. Renova em ${renewal} (horário de Brasília). Cole o texto para continuar.`:`Limite diário de ${limit} etapas de processamento atingido. Renova em ${renewal} (horário de Brasília). Cada etapa e tentativa, inclusive com falha, entra nessa contagem.`,"DAILY_PROCESSING_LIMIT");
    }
    const usage=await tx.analysisUsage.create({data:{analysisId,userId,kind,status:"STARTED"}});
    const data={userId,inputHash:hash,status:"RUNNING",token,leaseUntil:new Date(Date.now()+budget+30_000),resultJson:null};
    await tx.analysisTask.upsert({where:{analysisId_kind:{analysisId,kind}},create:{...data,analysisId,kind},update:data});
    return {usageId:usage.id};
  });
  if("value" in cached)return cached.value as T;
  const started=Date.now();const controller=new AbortController();const correlationId=randomUUID();
  const timer=setTimeout(()=>controller.abort(new HttpError(504,"A etapa excedeu o tempo disponível. O conteúdo anterior foi preservado; retome pelo histórico.","TASK_TIMEOUT")),budget);
  let abortHandler:()=>void=()=>{};
  const aborted=new Promise<never>((_,reject)=>{abortHandler=()=>reject(controller.signal.reason);controller.signal.addEventListener("abort",abortHandler,{once:true});});
  try{
    const result=await Promise.race([withAnalysisCapacity(()=>taskContext.run({analysisId,userId,kind,token,signal:controller.signal,correlationId},run),controller.signal),aborted]);
    controller.signal.throwIfAborted();
    const completed=await prisma.analysisTask.updateMany({where:{analysisId,kind,token,status:"RUNNING"},data:{status:"COMPLETED",resultJson:JSON.stringify(result)}});
    if(!completed.count)throw new HttpError(409,"A etapa foi retomada em outra sessão. Atualize para conferir o resultado.","TASK_EXPIRED");
    await prisma.analysisUsage.updateMany({where:{id:cached.usageId},data:{status:"SUCCEEDED",completedAt:new Date(),elapsedMs:Date.now()-started}});
    console.info("Analysis task completed",{correlationId,status:"SUCCEEDED",elapsedMs:Date.now()-started});
    return result;
  }catch(error){
    console.warn("Analysis task failed",{correlationId,status:"FAILED",elapsedMs:Date.now()-started,code:error instanceof HttpError?error.code||"TASK_FAILED":"TASK_FAILED"});
    await prisma.analysisTask.updateMany({where:{analysisId,kind,token,status:"RUNNING"},data:{status:"FAILED",resultJson:null}});
    await prisma.analysisUsage.updateMany({where:{id:cached.usageId},data:{status:"FAILED",completedAt:new Date(),elapsedMs:Date.now()-started,errorCode:error instanceof HttpError?error.code||"TASK_FAILED":"TASK_FAILED"}});
    throw error;
  }finally{clearTimeout(timer);controller.signal.removeEventListener("abort",abortHandler);}
}
