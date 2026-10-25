import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PDFParse } from "pdf-parse";
import { CanvasFactory, getData } from "pdf-parse/worker";
import { getSessionUser } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/http-error";
import { hasPdfSignature, MAX_PDF_BYTES, MAX_PDF_PAGES, pdfFileError } from "@/lib/upload-validation";
import { MAX_TEXT } from "@/lib/analysis-contract";
import { boundedFormData } from "@/lib/read-bounded-body";
PDFParse.setWorker(getData());
export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) throw new HttpError(401, "Faça login para continuar.");
    if (Number(request.headers.get("content-length") || 0) > MAX_PDF_BYTES + 64 * 1024) throw new HttpError(413, "Envie um PDF de até 10 MB.");
    const form = await boundedFormData(request, MAX_PDF_BYTES + 64 * 1024); const file = form.get("file"); const analysisId = form.get("analysisId");
    if (!(file instanceof File) || typeof analysisId !== "string") throw new HttpError(400, "Selecione um PDF e uma análise válida.");
    const validation = pdfFileError(file);
    if (validation) throw new HttpError(400, validation);
    const analysis = await prisma.analysis.findFirst({ where: { id: analysisId, userId: session.userId } });
    if (!analysis) throw new HttpError(404, "Análise não encontrada.");
    if (analysis.analysisJson) throw new HttpError(409, "Crie outra análise para substituir o currículo.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasPdfSignature(bytes)) throw new HttpError(400, "O conteúdo do arquivo não é um PDF válido.");
    const parser = new PDFParse({ data: bytes, CanvasFactory }); let text: string;
    try {
      if ((await parser.getInfo()).total > MAX_PDF_PAGES) throw new HttpError(400, "O PDF pode ter até 30 páginas. Envie somente o currículo.");
      text = (await parser.getText()).text.trim();
    } finally { await parser.destroy(); }
    if (text.length < 50) throw new HttpError(422, "Não encontramos texto suficiente nesse PDF. Se ele for uma imagem, use a opção Colar texto.");
    if (text.length > MAX_TEXT) throw new HttpError(413, "O currículo pode ter até 60 mil caracteres.");
    const result = await prisma.$transaction(async tx => {
      const asset = await tx.fileAsset.create({ data: { analysisId, type: "ORIGINAL_RESUME", fileName: file.name, mimeType: "application/pdf", path: "memory", size: file.size } });
      await tx.analysis.update({ where: { id: analysisId }, data: { parsedResumeText: text, originalResumeText: text, resumeInputType: "PDF_UPLOAD", revision: { increment: 1 } } }); return asset;
    });
    return NextResponse.json({ success: true, file: result });
  } catch (error) { return apiError(error, "Não foi possível processar o PDF. Confira o arquivo ou cole seu texto."); }
}
