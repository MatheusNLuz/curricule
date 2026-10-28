import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/http-error";
import { hasPdfSignature, MAX_PDF_BYTES, pdfFileError } from "@/lib/upload-validation";
import { boundedFormData } from "@/lib/read-bounded-body";
import { withDocumentCapacity } from "@/lib/runtime/document-capacity";

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) throw new HttpError(401, "Faça login para continuar.");
    if (Number(request.headers.get("content-length") || 0) > MAX_PDF_BYTES + 64 * 1024) throw new HttpError(413, "Envie um PDF de até 10 MB.");
    const signal=AbortSignal.any([request.signal,AbortSignal.timeout(55_000)]);
    const input = await withDocumentCapacity(async () => {
      const form = await boundedFormData(request, MAX_PDF_BYTES + 64 * 1024,signal);
      const file = form.get("file"), analysisId = form.get("analysisId");
      if (!(file instanceof File) || typeof analysisId !== "string") throw new HttpError(400, "Selecione um PDF e uma análise válida.");
      const validation = pdfFileError(file);
      if (validation) throw new HttpError(400, validation);
      const analysis = await prisma.analysis.findFirst({ where: { id: analysisId, userId: session.userId }, select: { analysisJson: true } });
      if (!analysis) throw new HttpError(404, "Análise não encontrada.");
      if (analysis.analysisJson) throw new HttpError(409, "Crie outra análise para substituir o currículo.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!hasPdfSignature(bytes)) throw new HttpError(400, "O conteúdo do arquivo não é um PDF válido.");
      const { extractResumePdf } = await import("@/lib/resume/pdf-text");
      const text = await extractResumePdf(bytes, signal);
      return { analysisId, text, fileName: file.name, size: file.size };
    }, signal);
    const result = await prisma.$transaction(async tx => {
      // Recheck under the same lock as editor/task writes: parsing may have
      // waited in the queue while another tab started this analysis.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.analysisId}))`;
      const current = await tx.analysis.findFirst({ where: { id: input.analysisId, userId: session.userId }, select: { analysisJson: true } });
      if (!current) throw new HttpError(404, "Análise não encontrada.");
      if (current.analysisJson || await tx.analysisTask.findFirst({ where: { analysisId: input.analysisId, status: "RUNNING", leaseUntil: { gt: new Date() } } })) throw new HttpError(409, "Crie outra análise para substituir o currículo.");
      const asset = await tx.fileAsset.create({ data: { analysisId: input.analysisId, type: "ORIGINAL_RESUME", fileName: input.fileName, mimeType: "application/pdf", path: "memory", size: input.size } });
      await tx.analysis.update({ where: { id: input.analysisId }, data: { parsedResumeText: input.text, originalResumeText: input.text, resumeInputType: "PDF_UPLOAD", revision: { increment: 1 } } });
      return asset;
    });
    return NextResponse.json({ success: true, file: result });
  } catch (error) { return apiError(error, "Não foi possível processar o PDF. Confira o arquivo ou cole seu texto."); }
}
