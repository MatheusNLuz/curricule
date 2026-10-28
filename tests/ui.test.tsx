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
mock.module("next/navigation.js", { namedExports: { useRouter: () => ({ push() {}, replace() {}, refresh() {} }), useSearchParams: () => new URLSearchParams({ mode }), usePathname: () => "/", redirect: () => { throw new Error("Unexpected redirect"); } } });
mock.module(new URL("../components/ui/custom-toast.tsx", import.meta.url).href, { namedExports: { useToast: () => ({ toast() {} }), ToastProvider: ({children}:{children:React.ReactNode}) => children } });
mock.module(new URL("../lib/auth.ts", import.meta.url).href, { namedExports: { getSessionUser: async () => null } });
mock.module(new URL("../components/app-shell/topbar.tsx", import.meta.url).href, { namedExports: { Topbar: () => null } });
const { default: NewAnalysisPage } = await import("../app/analysis/new/page.tsx");
const { default: LoginPage } = await import("../app/login/page.tsx");
const { default: RegisterPage } = await import("../app/register/page.tsx");
const { default: HomePage } = await import("../app/page.tsx");
const { default: RootLayout } = await import("../app/layout.tsx");
const { ThemeProvider } = await import("../components/theme-provider");
test("login and registration expose only the supported email/password flow", () => {
  for (const Page of [LoginPage, RegisterPage]) {
    const html=renderToStaticMarkup(React.createElement(ThemeProvider,null,React.createElement(Page)));
    assert.ok(html.includes('type="email"'));assert.ok(html.includes('type="password"'));
    assert.doesNotMatch(html,/Google|googleButton/);
  }
});
test("landing renders the interactive writing example before any viewport event", async () => {
  const html=renderToStaticMarkup(await HomePage());
  assert.ok(html.includes("Laboratório de escrita"));assert.ok(html.includes("Confirmar essa informação no exemplo"));
  assert.doesNotMatch(html,/será carregado ao chegar|Carregando sua análise/);
});
test("application shell no longer renders optional measurement controls", async () => {
  const html=renderToStaticMarkup(await RootLayout({children:React.createElement('p',null,'Conteúdo')}));
  assert.doesNotMatch(html,/Permitir medição|Medição de navegação|Desativar medição/);
});
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
