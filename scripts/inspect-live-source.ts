import { mkdirSync, writeFileSync } from "node:fs";
import { Parser } from "htmlparser2";
import { readPublicHtml, validateSourceUrl } from "../lib/web-source.ts";
const targets = [{ kind: "job" as const, url: "https://job-boards.greenhouse.io/apiiro/jobs/6670059003" }, { kind: "linkedin" as const, url: "https://www.linkedin.com/in/williamhgates" }];
mkdirSync("scratch/live", { recursive: true });
for (const [i, target] of targets.entries()) {
  const response = await readPublicHtml(validateSourceUrl(target.url, target.kind), AbortSignal.timeout(12000));
  writeFileSync("scratch/live/raw-" + i + ".html", response.html);
  const labels: string[] = []; let tag = "";
  const parser = new Parser({ onopentag(name) { tag = name; }, ontext(value) { if (["title", "h1", "h2", "h3"].includes(tag)) labels.push(value.trim()); }, onclosetag() { tag = ""; } });
  parser.end(response.html);
  console.log(JSON.stringify({ ...target, status: response.status, length: response.html.length, headings: labels.filter(Boolean).slice(0, 18), jsonLd: (response.html.match(/application\/ld\+json/g) || []).length, loginWall: /authwall|sign in to view|join to view/i.test(response.html) }));
}
