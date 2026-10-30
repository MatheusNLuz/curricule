import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/http-error";
import { analysisRequestId } from "@/lib/analysis-request";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser(); if (!session) throw new HttpError(401, "Faça login para continuar.");
    const { id } = await params; const kind = new URL(request.url).searchParams.get("kind") || "";
    if(!kind){
      const analysis=await prisma.analysis.findFirst({where:{id,userId:session.userId},select:{id:true}});
      if(!analysis)throw new HttpError(404,"Análise não encontrada.");
      const tasks=await prisma.analysisTask.findMany({where:{analysisId:id,userId:session.userId},select:{kind:true,status:true,leaseUntil:true,updatedAt:true}});
      return NextResponse.json({tasks:tasks.map(task=>({kind:task.kind,status:task.status==="RUNNING"&&task.leaseUntil<new Date()?"EXPIRED":task.status,elapsedSeconds:Math.max(0,Math.round((Date.now()-task.updatedAt.getTime())/1000))}))},{headers:{"Cache-Control":"private, no-store"}});
    }
    const task = await prisma.analysisTask.findFirst({ where: { analysisId: id, kind, userId: session.userId, analysis: { userId: session.userId } } });
    if (!task) throw new HttpError(404, "Etapa não encontrada.");
    return NextResponse.json({ requestId: analysisRequestId(task.token), status: task.status === "RUNNING" && task.leaseUntil < new Date() ? "EXPIRED" : task.status, result: task.status === "COMPLETED" && task.resultJson ? JSON.parse(task.resultJson) : null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
