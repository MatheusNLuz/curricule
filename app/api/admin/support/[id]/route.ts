import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { apiError,HttpError } from "@/lib/http-error";
import { boundedJson } from "@/lib/read-bounded-body";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const actor=await requireAdmin();const {id}=await params;const input=z.object({status:z.enum(["OPEN","IN_PROGRESS","RESOLVED"]),reply:z.string().trim().min(3).max(3000)}).strict().parse(await boundedJson(request,16*1024));await prisma.$transaction(async tx=>{const record=await tx.supportRequest.findUnique({where:{id}});if(!record)throw new HttpError(404,"Solicitação não encontrada.");await tx.supportRequest.update({where:{id},data:input});await tx.adminAudit.create({data:{actorId:actor.id,targetUserId:record.userId,action:"SUPPORT_UPDATED",details:JSON.stringify({requestId:id,status:input.status})}});});return NextResponse.json({success:true});}catch(error){return apiError(error);}}
