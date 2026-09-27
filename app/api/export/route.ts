import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { analysisId } = await req.json();
    if (!analysisId) return NextResponse.json({ error: "Analysis ID required" }, { status: 400 });

    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

    const analysis = await prisma.analysis.findFirst({ where: { id: analysisId, userId: session.userId } });
    if (!analysis || !analysis.finalResumeJson) {
      return NextResponse.json({ error: "Optimized resume not found" }, { status: 404 });
    }

    // Determine the host URL dynamically based on the request
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const url = `${protocol}://${host}/analysis/${analysisId}/preview?export=true`;

    // Configure Sparticuz Chromium for Serverless
    const isLocal = process.env.NODE_ENV === "development";
    let executablePath = null;
    
    if (isLocal) {
      // Local development fallback (assuming Windows/Mac Chrome path or relying on a globally installed browser)
      // For Windows, this is a common Chrome path. You can customize this if needed.
      executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    } else {
      executablePath = await chromium.executablePath();
    }

    const browserArgs = isLocal ? ["--no-sandbox", "--disable-setuid-sandbox"] : (await chromium.args) as string[];

    const browser = await puppeteer.launch({
      args: browserArgs,
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: executablePath || undefined,
      headless: true,
    });
    
    const page = await browser.newPage();
    
    // Wait for the page to load completely
    await page.goto(url, { waitUntil: "networkidle2" });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true
    });

    await browser.close();

    // Save export record
    await prisma.pdfExport.create({
      data: {
        analysisId,
        fileName: `Curriculy_Resume_${analysisId}.pdf`,
        path: "memory", // Can be updated if saving to disk later
      }
    });

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Curriculy_Resume_${analysisId}.pdf"`
      }
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json({ error: "Failed to generate PDF: " + String((error as any).message || error) }, { status: 500 });
  }
}
