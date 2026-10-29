import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
import { Parser } from "htmlparser2";

export type SourceKind = "job" | "linkedin";
export const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
export class SourceError extends Error { status?: number; }

export function validateSourceUrl(input: string, kind: SourceKind): URL {
  let url: URL;
  try { url = new URL(input); } catch { throw new SourceError("Informe um link completo começando com https://."); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || isIP(host.replace(/[\[\]]/g, "")) || !host.includes(".") || /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)) {
    throw new SourceError("Use um endereço HTTPS público, sem credenciais ou portas especiais.");
  }
  if (kind === "linkedin" && (!(host === "linkedin.com" || host.endsWith(".linkedin.com")) || !/^\/in\/[^/]+\/?$/.test(url.pathname))) {
    throw new SourceError("Use o link do perfil: https://www.linkedin.com/in/seu-perfil/.");
  }
  url.hash = "";
  return url;
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 6) {
    // Accept only ordinary global-unicast IPv6; reject mapped, local and transition ranges.
    const lower = address.toLowerCase();
    const [first, second] = lower.split(":").map(part => parseInt(part || "0", 16));
    return /^[23][0-9a-f]{3}:/.test(lower) && !(first === 0x2001 && (second < 0x200 || second === 0xdb8)) && first !== 0x2002 && first !== 0x3fff;
  }
  if (family !== 4) return false;
  const [a, b, c] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
}

type HostResolver = (host: string, options: { all: true; verbatim: true }) => Promise<{ address: string; family: number }[]>;
export async function resolvePublicHost(host: string, signal: AbortSignal, resolver: HostResolver = lookup) {
  signal.throwIfAborted();
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_resolve, reject) => { onAbort = () => reject(signal.reason); signal.addEventListener("abort", onAbort, { once: true }); });
  try {
    const addresses = await Promise.race([resolver(host, { all: true, verbatim: true }), aborted]);
    signal.throwIfAborted();
    if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) throw new SourceError("Esse endereço não pode ser consultado.");
    return addresses[0];
  } finally { signal.removeEventListener("abort", onAbort); }
}

export async function readPublicHtml(url: URL, signal: AbortSignal) {
  const pinned = await resolvePublicHost(url.hostname, signal);
  return new Promise<{ status: number; location?: string; html: string }>((resolve, reject) => {
    const req = request(url, {
      signal, method: "GET", agent: false,
      headers: { "User-Agent": "Curricule/1.0 (public page reader)", Accept: "text/html", "Accept-Encoding": "identity" },
      // DNS pinning closes the gap between validation and connecting to the host.
      lookup: (_hostname, options, callback) => {
        if (options.all) callback(null, [pinned]);
        else callback(null, pinned.address, pinned.family);
      },
    }, response => {
      const status = response.statusCode || 502;
      if (status >= 300 && status < 400) { response.resume(); resolve({ status, location: response.headers.location, html: "" }); return; }
      if (status === 999 && (url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com"))) {
        response.resume(); reject(Object.assign(new SourceError("O LinkedIn bloqueou a leitura pública deste perfil. Cole o texto do perfil ou envie o PDF exportado do LinkedIn."), { status })); return;
      }
      if (status !== 200 || !/text\/html|application\/xhtml\+xml/i.test(response.headers["content-type"] || "") || Number(response.headers["content-length"] || 0) > MAX_SOURCE_BYTES || ![undefined, "identity"].includes(response.headers["content-encoding"])) {
        response.resume(); reject(Object.assign(new SourceError("A página não disponibilizou conteúdo legível. Cole o texto ou envie um PDF."), { status })); return;
      }
      const chunks: Buffer[] = []; let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_SOURCE_BYTES) { response.destroy(); reject(new SourceError("A página é muito grande. Cole somente o conteúdo relevante.")); }
        else chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => resolve({ status, html: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", reject); req.end();
  });
}

function structuredEntries(value: unknown): Record<string, unknown>[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(structuredEntries);
  const object = value as Record<string, unknown>;
  return [object, ...Object.values(object).filter(item => typeof item === "object").flatMap(structuredEntries)];
}

export function extractSourceText(html: string, kind: SourceKind) {
  const all: string[] = [], main: string[] = [], profile: string[] = [], jobContent: string[] = [], title: string[] = [], blocks: string[] = [];
  const stack: { name: string; skip: boolean; main: boolean; profile: boolean; jobContent: boolean; title: boolean; json: boolean }[] = [];
  let jobContentRoots = 0;
  let script = "";
  const parser = new Parser({
    onopentag(name, attrs) {
      const parent = stack.at(-1);
      const json = name === "script" && attrs.type === "application/ld+json";
      const classes = attrs.class || "";
      const jobRoot = /(?:^|\s)(?:description__text|job-description|jobsearch-jobDescriptionText)(?:\s|$)/i.test(classes) || /^(?:job-description|jobDescriptionText)$/i.test(attrs.id || "");
      if (jobRoot && !parent?.jobContent) jobContentRoots++;
      stack.push({ name, skip: !!parent?.skip || /sign-in-modal|signup|authwall/.test(classes) || ["script", "style", "nav", "footer", "header", "noscript", "svg", "form", "button"].includes(name), main: !!parent?.main || name === "main" || name === "article", profile: !!parent?.profile || /(?:top-card-layout__(?:title|headline)|pp-section\s+(?:summary|experience|education)|experience__list|education__list)/.test(classes), jobContent: !!parent?.jobContent || jobRoot, title: !!parent?.title || name === "title", json });
      if (json) script = "";
      if (["p", "div", "li", "h1", "h2", "h3", "br"].includes(name)) { all.push("\n"); main.push("\n"); profile.push("\n"); if (stack.at(-1)?.jobContent) jobContent.push("\n"); }
    },
    ontext(text) {
      const current = stack.at(-1);
      if (current?.json) script += text;
      if (current?.title) title.push(text);
      if (!current?.skip) { all.push(text); if (current?.main) main.push(text); if (current?.profile) profile.push(text); if (current?.jobContent) jobContent.push(text); }
    },
    onclosetag() { const current = stack.pop(); if (current?.json) blocks.push(script); },
  }, { decodeEntities: true });
  parser.write(html); parser.end();
  const entries = blocks.flatMap(block => { try { return structuredEntries(JSON.parse(block)); } catch { return []; } });
  const jobs = entries.filter(entry => [entry["@type"]].flat().includes("JobPosting"));
  if (kind === "job" && jobs.length > 1) throw new SourceError("A página contém mais de uma vaga. Abra uma vaga específica ou cole a descrição para continuar.");
  const job = jobs[0];
  const hasStructuredDescription = typeof job?.description === "string" && !!job.description.trim();
  let text = main.join("").trim().length >= 200 ? main.join("") : all.join("");
  if (kind === "job" && !hasStructuredDescription && jobContentRoots > 1) throw new SourceError("A página contém mais de uma descrição de vaga. Abra uma vaga específica ou cole a descrição para continuar.");
  if (kind === "job" && !hasStructuredDescription && jobContentRoots === 1) text = jobContent.join("");
  const publicProfile = kind === "linkedin" && profile.join("").trim().length >= 200;
  if (publicProfile) text = profile.join("");
  if (kind === "job" && job && hasStructuredDescription && typeof job.description === "string") {
    // Parse the description as HTML too: schema.org descriptions commonly contain markup.
    const pieces: string[] = [];
    let ignored = 0;
    const descriptionParser = new Parser({ onopentag: name => { if (["script", "style", "button"].includes(name)) ignored++; }, ontext: value => { if (!ignored) pieces.push(value); }, onclosetag: name => { if (["script", "style", "button"].includes(name)) ignored = Math.max(0, ignored - 1); pieces.push("\n"); } }, { decodeEntities: true });
    descriptionParser.end(job.description);
    text = [typeof job.title === "string" ? job.title : "", ...pieces].join("\n");
  }
  text = text.replace(/[\t ]+/g, " ").replace(/^\s*(?:show more|show less|ver mais|ver menos|mostrar más|mostrar menos)\s*$/gim, "").replace(/\n\s*\n+/g, "\n\n").trim();
  const truncated = text.length > 60_000;
  text = text.slice(0, 60_000);
  const pageTitle = title.join("").trim();
  const blocked = /sign in|log in|linkedin login|entrar|security verification|just a moment|access denied|verificação de segurança|attention required/i.test(pageTitle) || (kind === "linkedin" && !publicProfile && /sign in to view|join to view|entre para ver|faça login para ver|sign up to view/i.test(text));
  const relevant = kind === "job" ? !!job || /responsabil|requisit|qualifica|requirements|responsibilit|what you (?:will do|bring)|what you['’]re about|about (?:the|this) (?:role|job)|vaga|job description/i.test(text) : /experi[eê]ncia|experience|sobre|about|forma[çc][aã]o|education/i.test(text);
  if (blocked || text.length < 200 || !relevant) throw new SourceError(kind === "linkedin" ? "Não conseguimos ler um perfil completo nesse link. Ele pode exigir login. Cole o texto do perfil ou envie o PDF exportado do LinkedIn." : "Não encontramos a descrição completa da vaga. O site pode exigir login ou carregar por JavaScript. Cole a descrição para continuar.");
  const company=job?.hiringOrganization&&typeof job.hiringOrganization==="object"&&"name" in job.hiringOrganization&&typeof job.hiringOrganization.name==="string"?job.hiringOrganization.name.slice(0,160):null;
  const lines=text.split(/\n+/);
  function section(pattern:RegExp){const start=lines.findIndex(line=>pattern.test(line.trim()));if(start<0)return null;const next=lines.findIndex((line,index)=>index>start&&/^(?:requisitos|responsabilidades|qualifica|requirements|responsibilities|qualifications|benef[ií]cios|benefits|we offer|what we offer|create a job alert|sobre a empresa|about the company|como ser[aá] o seu dia a dia|o que voc[eê] precisa)\b/i.test(line.trim())&&!(index===start+1&&pattern.test(line.trim())));return lines.slice(start,next<0?Math.min(lines.length,start+18):next).join("\n").slice(0,3000);}
  const requirements=kind==="job"?section(/^(?:requisitos|qualifica|requirements|qualifications|o que (?:buscamos|esperamos|voc[eê] precisa))\b/i):null;
  const responsibilities=kind==="job"?section(/^(?:responsabilidades|responsibilities|atividades|o que voc[eê] vai fazer|como ser[aá] o seu dia a dia)\b/i):null;
  const warnings:string[]=[];
  if(truncated)warnings.push("O conteúdo ultrapassou o limite de leitura e foi cortado. Confira a fonte e cole a descrição completa se necessário.");
  if(kind==="job" && !hasStructuredDescription && !jobContentRoots && main.join("").trim().length < 200)warnings.push("A página não identificou uma área principal de descrição; confira se o texto corresponde à vaga e está completo.");
  if(kind==="job"&&!requirements)warnings.push("Não identificamos uma seção explícita de requisitos. Confira se o texto da vaga está completo.");
  if(kind==="job"&&!responsibilities)warnings.push("Não identificamos uma seção explícita de responsabilidades. Revise o conteúdo antes de confirmar.");
  if(kind==="linkedin")warnings.push("A leitura cobre apenas o conteúdo público. Confira experiências, formação e resumo; partes privadas podem não aparecer.");
  return { text, title: (typeof job?.title === "string" ? job.title : pageTitle).slice(0, 160),company,requirements,responsibilities,warnings };
}

export async function importWebSource(input: string, kind: SourceKind, readPage = readPublicHtml) {
  let url = validateSourceUrl(input, kind);
  const signal = AbortSignal.timeout(12_000);
  try {
    for (let redirect = 0; redirect <= 3; redirect++) {
      const response = await readPage(url, signal);
      if (response.status >= 300 && response.status < 400) {
        if (!response.location) break;
        const destination = new URL(response.location, url);
        if (kind === "linkedin" && (destination.hostname === "linkedin.com" || destination.hostname.endsWith(".linkedin.com")) && /^\/(?:authwall|login|signup|checkpoint)(?:\/|$)/i.test(destination.pathname)) {
          throw new SourceError("O LinkedIn exige acesso para mostrar este perfil. Cole o texto do perfil ou envie o PDF exportado do LinkedIn.");
        }
        url = validateSourceUrl(destination.href, kind); continue;
      }
      return { ...extractSourceText(response.html, kind), url: url.href,extractedAt:new Date().toISOString() };
    }
    throw new SourceError("A página redirecionou muitas vezes. Cole o texto para continuar.");
  } catch (error) {
    if (error instanceof SourceError) throw error;
    throw new SourceError("Não foi possível ler esse link agora. Cole o texto ou envie um PDF para continuar.", { cause: error });
  }
}
