import { boundedJson } from "@/lib/read-bounded-body";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/http-error";
import { importWebSource, SourceError } from "@/lib/web-source";
import { runAnalysisTask,commitTask } from "@/lib/analysis-task";

export const runtime = "nodejs";
const Input = z.object({ analysisId: z.string().min(1), kind: z.enum(["job", "linkedin"]), url: z.string().url().max(2048) }).strict();
export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) throw new HttpError(401, "Faça login para importar o conteúdo.");
    const input = Input.parse(await boundedJson(request));
    const result = await runAnalysisTask(input.analysisId, session.userId, `IMPORT_${input.kind}`, [input.url, Math.floor(Date.now() / 60_000)], async () => {
      const source=await importWebSource(input.url,input.kind);
      await commitTask(async tx=>{
        const current=await tx.analysis.findUniqueOrThrow({where:{id:input.analysisId}});
        let previous:Record<string,unknown>={};try{previous=JSON.parse(current.importedSourceJson||"{}");}catch{}
        await tx.analysis.update({where:{id:input.analysisId},data:{importedSourceJson:JSON.stringify({...previous,[input.kind]:{...source,text:undefined}})}});
      });
      return source;
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof SourceError) return NextResponse.json({ error: error.message, fallback: "paste_or_pdf" }, { status: 422 });
    return apiError(error);
  }
}
