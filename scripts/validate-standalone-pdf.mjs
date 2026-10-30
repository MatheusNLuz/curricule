import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve, relative, isAbsolute } from "node:path";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const root = resolve(process.argv[2] || ".next/standalone");
const require = createRequire(resolve(root, "server.js"));
for (const name of ["@napi-rs/canvas"]) {
  const path = relative(root, require.resolve(name));
  assert.ok(!path.startsWith("..") && !isAbsolute(path), `Dependency missing from standalone: ${name}`);
}
require("@napi-rs/canvas");
// Match the application's dynamic ESM imports; CJS entries need not be traced.
const pdfRoot = resolve(root, "node_modules/pdf-parse");
const pdfPackage = JSON.parse(readFileSync(resolve(pdfRoot, "package.json"), "utf8"));
const { PDFParse } = await import(pathToFileURL(resolve(pdfRoot, pdfPackage.exports["."].import.default)).href);
const { CanvasFactory, getData } = await import(pathToFileURL(resolve(pdfRoot, pdfPackage.exports["./worker"].import.default)).href);

const lines = [
  "Synthetic Candidate. Professional experience: developed PHP services and React interfaces.",
  "Education: Information Systems. Skills: Git and PHP. No real candidate information.",
];
const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ...lines.map(text => {
    const stream = `BT /F1 10 Tf 30 720 Td (${text}) Tj ET`;
    return `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`;
  }),
];
let pdf = "%PDF-1.4\n";
const offsets = [0];
for (const [index, object] of objects.entries()) {
  offsets.push(Buffer.byteLength(pdf));
  pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
}
const xref = Buffer.byteLength(pdf);
pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

PDFParse.setWorker(getData());
const parser = new PDFParse({ data: new Uint8Array(Buffer.from(pdf)), CanvasFactory });
try {
  assert.equal((await parser.getInfo()).total, 2);
  for (const [index, expected] of lines.entries()) {
    const page = await parser.getText({ partial: [index + 1], pageJoiner: "" });
    assert.equal(page.pages.map(item => item.text).join("\n").trim(), expected);
  }
  console.info("Standalone PDF check passed: native canvas and two-page text extraction.");
} finally { await parser.destroy(); }
