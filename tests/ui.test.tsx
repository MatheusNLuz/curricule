import test, { mock } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, writeFileSync } from "node:fs";
function savePreview(name: string, html: string) {
  mkdirSync("scratch/ui", { recursive: true });
  writeFileSync("scratch/ui/" + name + ".html", '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><title>Prévia do formulário — ' + name + '</title></head><body class="bg-background text-foreground font-sans">' + html + '</body></html>');
}
let mode = "OPTIMIZE_FOR_JOB";
mock.module("next/navigation.js", { namedExports: { useRouter: () => ({ push() {}, replace() {} }), useSearchParams: () => new URLSearchParams({ mode }) } });
mock.module(new URL("../components/ui/custom-toast.tsx", import.meta.url).href, { namedExports: { useToast: () => ({ toast() {} }) } });
const { default: NewAnalysisPage } = await import("../app/analysis/new/page.tsx");
test("job form offers a link or pasted description and a separate output locale", () => {
  mode = "OPTIMIZE_FOR_JOB";
  const html = renderToStaticMarkup(React.createElement(NewAnalysisPage));
  savePreview("vaga", html);
  for (const text of ["Link da vaga", "Colar descrição", "Enviar PDF", "Idioma do resultado", "País ou convenção do currículo"]) assert.ok(html.includes(text), text);
  assert.ok(html.includes("pt-PT")); assert.ok(html.includes("en-GB"));
  assert.doesNotMatch(html, /Link do seu perfil do LinkedIn/);
});
test("LinkedIn form starts with public profile URL and includes PDF/text alternatives", () => {
  mode = "LINKEDIN_OPTIMIZATION";
  const html = renderToStaticMarkup(React.createElement(NewAnalysisPage));
  savePreview("linkedin", html);
  for (const text of ["Link do perfil", "Link do seu perfil do LinkedIn", "Ler perfil público", "Enviar PDF", "Colar texto", "somente o conteúdo público"]) assert.ok(html.includes(text), text);
  assert.ok(html.includes("https://www.linkedin.com/in/seu-perfil/"));
  assert.doesNotMatch(html, /A vaga que você quer/);
});
