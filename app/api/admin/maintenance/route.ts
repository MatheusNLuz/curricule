import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/http-error";
export async function POST(){try{const actor=await requireAdmin();const cutoff=new Date(Date.now()-30*86400_000);const deleted=await prisma.$transaction(async tx=>{const [calls,events,usage,rates]=await Promise.all([tx.aiInvocation.deleteMany({where:{createdAt:{lt:cutoff}}}),tx.productEvent.deleteMany({where:{createdAt:{lt:cutoff}}}),tx.analysisUsage.deleteMany({where:{createdAt:{lt:cutoff}}}),tx.securityRateLimit.deleteMany({where:{expiresAt:{lt:new Date()}}})]);const total=calls.count+events.count+usage.count+rates.count;await tx.adminAudit.create({data:{actorId:actor.id,targetUserId:actor.id,action:"MAINTENANCE",details:JSON.stringify({cutoff,deleted:total})}});return total;});return NextResponse.json({deleted});}catch(error){return apiError(error);}}
