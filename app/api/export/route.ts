import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/http-error";
import { OptimizedResumeSchema } from "@/lib/schemas/optimize.schema";
import { normalizeTemplateId } from "@/lib/preview-template";
import { boundedJson } from "@/lib/read-bounded-body";
import { consumeRateLimit } from "@/lib/security-rate-limit";
import { withDocumentCapacity } from "@/lib/runtime/document-capacity";

export const maxDuration = 60;
const ExportRequest = z.object({ analysisId: z.string().min(1), format: z.enum(["pdf", "docx"]).default("pdf") }).strict();

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) throw new HttpError(401, "Faça login para continuar.");
    const { analysisId, format } = ExportRequest.parse(await boundedJson(request, 16 * 1024));
    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, userId: session.userId },
      select: { mode: true, finalResumeJson: true, selectedLanguage: true, selectedTemplate: true },
    });
    if (!analysis?.finalResumeJson || analysis.mode === "LINKEDIN_OPTIMIZATION") throw new HttpError(404, "Currículo salvo não encontrado.");
    const resume = OptimizedResumeSchema.parse(JSON.parse(analysis.finalResumeJson));
    const template = normalizeTemplateId(analysis.selectedTemplate);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(55_000)]);
    await consumeRateLimit("document-export", session.userId, 120, 3600_000);
    const file = await withDocumentCapacity(async () => {
      if (format === "docx") {
        const { resumeDocx } = await import("@/lib/resume/docx");
        return resumeDocx(resume, analysis.selectedLanguage, template);
      }
      const [{ resumeDocumentHtml }, { renderResumePdf }] = await Promise.all([
        import("@/lib/resume/document-html"), import("@/lib/resume/pdf-renderer"),
      ]);
      return renderResumePdf(resumeDocumentHtml(resume, analysis.selectedLanguage, template), signal);
    }, signal);
    signal.throwIfAborted();
    const name = `Curricule_Resume_${analysisId}.${format}`;
    await prisma.pdfExport.create({ data: { analysisId, fileName: name, path: "memory" } });
    return new NextResponse(new Uint8Array(file), { headers: {
      "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store",
    } });
  } catch (error) { return apiError(error, "Não foi possível gerar o documento. O conteúdo salvo foi preservado."); }
}
