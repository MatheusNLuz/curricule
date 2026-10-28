import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { boundedJson } from "@/lib/read-bounded-body";
import { consumeRateLimit } from "@/lib/security-rate-limit";
import { apiError,HttpError } from "@/lib/http-error";
export async function POST(request:Request){try{const user=await getSessionUser();if(!user)throw new HttpError(401,"Entre na conta para abrir uma solicitação.");await consumeRateLimit("support",user.userId,10,86_400_000);const input=z.object({category:z.enum(["PRIVACY","ACCESS","PROCESSING","OTHER"]),message:z.string().trim().min(10).max(3000),reference:z.string().max(160).optional()}).strict().parse(await boundedJson(request,16*1024));const record=await prisma.supportRequest.create({data:{userId:user.userId,...input},select:{id:true}});return NextResponse.json({success:true,id:record.id});}catch(error){return apiError(error);}}
