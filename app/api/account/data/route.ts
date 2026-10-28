import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError,HttpError } from "@/lib/http-error";
import { consumeRateLimit } from "@/lib/security-rate-limit";
export async function GET(request:Request){try{
  const session=await getSessionUser();if(!session)throw new HttpError(401,"Faça login para continuar.");await consumeRateLimit("account-export",session.userId,5000,3600_000);
  const query=new URL(request.url).searchParams;const resource=z.enum(["analyses","requests","aiCalls","events"]).parse(query.get("resource")||"analyses");const cursor=query.get("cursor");const pagination={take:51,orderBy:{id:"asc" as const},...(cursor?{cursor:{id:cursor},skip:1}:{})};
  const account=await prisma.user.findUnique({where:{id:session.userId},select:{name:true,email:true,status:true,createdAt:true,analyticsConsent:true}});
  const records=resource==="analyses"?await prisma.analysis.findMany({where:{userId:session.userId},...pagination,include:{questions:true,revisions:true,files:{select:{fileName:true,mimeType:true,size:true,createdAt:true}},exports:{select:{fileName:true,createdAt:true}},usage:true}}):resource==="requests"?await prisma.supportRequest.findMany({where:{userId:session.userId},...pagination}):resource==="aiCalls"?await prisma.aiInvocation.findMany({where:{userId:session.userId},...pagination}):await prisma.productEvent.findMany({where:{userId:session.userId},...pagination});
  const more=records.length>50;const items=records.slice(0,50);
  return NextResponse.json({account,resource,items,nextCursor:more?items.at(-1)!.id:null},{headers:{"Cache-Control":"private, no-store"}});
}catch(error){return apiError(error);}}
