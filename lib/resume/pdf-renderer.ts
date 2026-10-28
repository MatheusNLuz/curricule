import { existsSync } from "node:fs";
import type { Browser } from "puppeteer-core";
import { HttpError } from "../http-error";

async function launchBrowser() {
  const { default: puppeteer } = await import("puppeteer-core");
  const executablePath = process.env.CHROME_EXECUTABLE_PATH || [
    "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ].find(existsSync);
  if (executablePath) return puppeteer.launch({ executablePath, headless: true });
  if (process.platform !== "linux") throw new HttpError(503, "Configure o navegador de exportação. Você ainda pode baixar o DOCX.");
  const { default: chromium } = await import("@sparticuz/chromium");
  return puppeteer.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true });
}

async function closeBrowser(browser: Browser) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([browser.close(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Browser cleanup timeout")), 5000);
    })]);
  } catch {
    browser.process()?.kill();
  } finally { clearTimeout(timer); }
}

export async function renderResumePdf(html: string, signal?: AbortSignal): Promise<Uint8Array> {
  signal?.throwIfAborted();
  const browser = await launchBrowser();
  const abort = () => { void browser.close().catch(() => browser.process()?.kill()); };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    signal?.throwIfAborted();
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", request => { void request.abort(); });
    await page.setContent(html, { waitUntil: "load", timeout: 10_000 });
    await page.emulateMediaType("print");
    return await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, timeout: 20_000 });
  } finally {
    signal?.removeEventListener("abort", abort);
    await closeBrowser(browser);
  }
}
