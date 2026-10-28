import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { assertRequestOrigin } from "@/lib/read-bounded-body";
import { apiError } from "@/lib/http-error";
// Retired clients may still send events from an older open tab. Discard them
// without opening a database connection or reading candidate/session data.
export async function POST(){const response=new NextResponse(null,{status:204,headers:{"Cache-Control":"no-store"}});response.cookies.delete("curricule-metrics");return response;}
export async function DELETE(request:Request){try{assertRequestOrigin(request);const [session,store]=await Promise.all([getSessionUser(),cookies()]);const visitorId=store.get("curricule-metrics")?.value;const owners=[...(session?[{userId:session.userId}]:[]),...(visitorId?[{visitorId,userId:null}]:[])];if(owners.length)await prisma.productEvent.deleteMany({where:{OR:owners}});const response=new NextResponse(null,{status:204});response.cookies.delete("curricule-metrics");return response;}catch(error){return apiError(error);}}
