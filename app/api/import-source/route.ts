import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/http-error";
import { importWebSource, SourceError } from "@/lib/web-source";
import { runAnalysisTask } from "@/lib/analysis-task";

export const runtime = "nodejs";
const Input = z.object({ analysisId: z.string().min(1), kind: z.enum(["job", "linkedin"]), url: z.string().url().max(2048) }).strict();
export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) throw new HttpError(401, "Faça login para importar o conteúdo.");
    const input = Input.parse(await request.json());
    const result = await runAnalysisTask(input.analysisId, session.userId, `IMPORT_${input.kind}`, [input.url, Math.floor(Date.now() / 60_000)], () => importWebSource(input.url, input.kind));
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof SourceError) return NextResponse.json({ error: error.message, fallback: "paste_or_pdf" }, { status: 422 });
    return apiError(error);
  }
}
