import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/http-error";

export const maxDuration = 60;
export async function POST(request: Request) {
  let browser: Browser | undefined;
  try {
    const session = await getSessionUser();
    if (!session) throw new HttpError(401, "Faça login para continuar.");
    const { analysisId } = await request.json();
    if (typeof analysisId !== "string") throw new HttpError(400, "Informe a análise.");
    const analysis = await prisma.analysis.findFirst({ where: { id: analysisId, userId: session.userId } });
    if (!analysis?.finalResumeJson || analysis.mode === "LINKEDIN_OPTIMIZATION") throw new HttpError(404, "Currículo otimizado não encontrado.");
    const local = process.env.NODE_ENV === "development";
    const origin = process.env.APP_URL || (local ? "http://localhost:3000" : "");
    if (!origin) throw new HttpError(503, "A exportação precisa ser configurada pelo administrador.");
    const target = new URL("/analysis/" + encodeURIComponent(analysisId) + "/preview?export=true", origin);
    if (!local && target.protocol !== "https:") throw new HttpError(503, "A exportação precisa de uma origem HTTPS configurada.");
    browser = await puppeteer.launch({ args: local ? [] : chromium.args, executablePath: local ? (process.env.CHROME_EXECUTABLE_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe") : await chromium.executablePath(), headless: true });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ Cookie: request.headers.get("cookie") || "" });
    await page.setRequestInterception(true);
    page.on("request", outgoing => {
      const url = outgoing.url();
      if (url.startsWith("data:") || new URL(url).origin === target.origin) void outgoing.continue(); else void outgoing.abort();
    });
    const response = await page.goto(target.href, { waitUntil: "networkidle0", timeout: 30_000 });
    if (response?.status() !== 200 || new URL(page.url()).pathname !== target.pathname) throw new HttpError(401, "Sua sessão expirou. Entre novamente para baixar o PDF.");
    await page.waitForSelector("[data-resume-preview]", { timeout: 10_000 });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    await prisma.pdfExport.create({ data: { analysisId, fileName: "Curricule_Resume_" + analysisId + ".pdf", path: "memory" } });
    return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="Curricule_Resume_' + analysisId + '.pdf"', "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error, "Não foi possível gerar o PDF. Tente novamente."); }
  finally { await browser?.close(); }
}
