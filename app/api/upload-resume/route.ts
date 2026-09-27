import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import pdf from "pdf-parse";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const analysisId = formData.get("analysisId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file received" }, { status: 400 });
    }

    if (!analysisId) {
      return NextResponse.json({ error: "No analysisId provided" }, { status: 400 });
    }

    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

    const analysis = await prisma.analysis.findFirst({ where: { id: analysisId, userId: session.userId }, select: { id: true } });
    if (!analysis) return NextResponse.json({ error: "Análise não encontrada." }, { status: 404 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Polyfill DOM objects required by pdf-parse in serverless environments
    if (typeof global !== "undefined") {
      if (!global.DOMMatrix) {
        global.DOMMatrix = class DOMMatrix {
          a=1; b=0; c=0; d=1; e=0; f=0;
        } as any;
      }
      if (!global.ImageData) {
        global.ImageData = class ImageData {
          data = new Uint8ClampedArray();
          width = 0;
          height = 0;
        } as any;
      }
      if (!global.Path2D) {
        global.Path2D = class Path2D {} as any;
      }
    }

    // Parse PDF in-memory (no disk writes, required for Vercel)
    const data = await pdf(buffer);
    const extractedText = data.text;

    if (!extractedText || extractedText.trim() === "") {
      return NextResponse.json({ error: "Could not extract text from this PDF. It might be scanned or image-based." }, { status: 400 });
    }

    // Save metadata to database
    const fileAsset = await prisma.fileAsset.create({
      data: {
        analysisId: analysisId,
        type: "ORIGINAL_RESUME",
        fileName: file.name,
        mimeType: file.type,
        path: "memory", // No physical path
        size: file.size,
      },
    });

    // Save parsed text directly to Analysis
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { parsedResumeText: extractedText }
    });

    return NextResponse.json({ success: true, file: fileAsset });
  } catch (error) {
    console.error("Error uploading resume:", error);
    return NextResponse.json({ error: "Não foi possível processar o PDF. Confira o arquivo e tente novamente." }, { status: 503 });
  }
}
