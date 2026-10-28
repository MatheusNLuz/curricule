import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError,HttpError } from "@/lib/http-error";
import { boundedJson } from "@/lib/read-bounded-body";
import { logoutCurrentUser } from "@/lib/auth/logout";
import { consumeRateLimit } from "@/lib/security-rate-limit";
import { cookies } from "next/headers";
export async function PATCH(request:Request){try{const session=await getSessionUser();if(!session)throw new HttpError(401,"Faça login para continuar.");const input=z.object({analyticsConsent:z.boolean()}).strict().parse(await boundedJson(request,4096));await prisma.$transaction(async tx=>{await tx.user.update({where:{id:session.userId},data:input});if(!input.analyticsConsent)await tx.productEvent.deleteMany({where:{userId:session.userId}});});return NextResponse.json({success:true});}catch(error){return apiError(error);}}
export async function DELETE(request:Request){try{
  const session=await getSessionUser();if(!session)throw new HttpError(401,"Faça login para continuar.");await consumeRateLimit("delete-account",session.userId,3);
  const visitorId=(await cookies()).get("curricule-metrics")?.value;
  const input=z.object({confirmation:z.literal("EXCLUIR MEUS DADOS")}).strict().parse(await boundedJson(request,4096));void input;
  const result=await prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${session.userId}))`;
    const user=await tx.user.findUnique({where:{id:session.userId}});if(!user||user.status!=="ACTIVE")throw new HttpError(401,"Sua conta não está ativa.");
    if(user.role==="ADMIN")throw new HttpError(409,"Transfira suas responsabilidades administrativas antes de desativar esta conta.");
    if(await tx.analysisTask.findFirst({where:{userId:session.userId,status:"RUNNING",leaseUntil:{gt:new Date()}}}))throw new HttpError(409,"Aguarde os processamentos em andamento terminarem antes de excluir seus dados.");
    if(await tx.billingEntitlement.findFirst({where:{userId:session.userId,status:"ACTIVE"}}))throw new HttpError(409,"Há um acesso comercial ativo. Solicite o encerramento pela ajuda antes de excluir a conta.");
    await tx.analysis.deleteMany({where:{userId:session.userId}});await tx.analysisUsage.deleteMany({where:{userId:session.userId}});await tx.aiInvocation.deleteMany({where:{userId:session.userId}});await tx.productEvent.deleteMany({where:{OR:[{userId:session.userId},...(visitorId?[{visitorId,userId:null}]:[])]}});await tx.supportRequest.deleteMany({where:{userId:session.userId}});
    await tx.user.update({where:{id:session.userId},data:{name:null,email:`deleted-${user.id}@curricule.invalid`,password:null,status:"DELETED",analyticsConsent:false}});
    const identityPending=!!user.neonAuthId;
    if(identityPending)await tx.supportRequest.create({data:{userId:user.id,category:"IDENTITY_DELETION",message:"Materiais e perfil do aplicativo excluídos. Verificar exclusão da identidade no provedor de autenticação e retenção de cópias externas. Não reativar a conta.",reference:user.neonAuthId}});
    return {identityPending};
  });
  try{await logoutCurrentUser();}catch{console.warn("Dados excluídos; a revogação da sessão externa deve ser verificada.");}
  const response=NextResponse.json({success:true,...result},{headers:{"Cache-Control":"private, no-store"}});response.cookies.delete("curricule-metrics");return response;
}catch(error){return apiError(error);}}
