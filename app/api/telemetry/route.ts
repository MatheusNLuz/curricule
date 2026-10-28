import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { boundedJson,assertRequestOrigin } from "@/lib/read-bounded-body";
import { consumeRateLimit } from "@/lib/security-rate-limit";
import { TelemetrySchema } from "@/lib/telemetry";
import { apiError } from "@/lib/http-error";
export async function POST(request:Request){try{
  const input=TelemetrySchema.parse(await boundedJson(request,4096));const session=await getSessionUser();
  if(session){const user=await prisma.user.findUnique({where:{id:session.userId},select:{analyticsConsent:true}});if(!user?.analyticsConsent)return new NextResponse(null,{status:204});}
  const store=await cookies();const existing=store.get("curricule-metrics")?.value;const visitorId=existing&&/^[a-f0-9-]{36}$/i.test(existing)?existing:randomUUID();
  await consumeRateLimit("telemetry-global","global",3000);await consumeRateLimit("telemetry",session?.userId||visitorId,200);
  await prisma.productEvent.create({data:{userId:session?.userId||null,visitorId,name:input.name,source:input.source,device:input.device,value:input.value}});
  const response=new NextResponse(null,{status:204});response.cookies.set("curricule-metrics",visitorId,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",maxAge:30*86400,path:"/"});return response;
}catch(error){return apiError(error);}}
export async function DELETE(request:Request){try{assertRequestOrigin(request);const [session,store]=await Promise.all([getSessionUser(),cookies()]);const visitorId=store.get("curricule-metrics")?.value;const owners=[...(session?[{userId:session.userId}]:[]),...(visitorId?[{visitorId,userId:null}]:[])];if(owners.length)await prisma.productEvent.deleteMany({where:{OR:owners}});const response=new NextResponse(null,{status:204});response.cookies.delete("curricule-metrics");return response;}catch(error){return apiError(error);}}
