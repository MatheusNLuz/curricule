/* eslint-disable @next/next/no-head-element, @next/next/no-css-tags -- Standalone static HTML, outside Next.js rendering. */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { ScreenReview } from "../design/screen-review/preview";

const target = "public/screen-review";
mkdirSync(target, { recursive: true });
const markup = renderToStaticMarkup(<html lang="pt-BR" data-theme="light"><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex,nofollow" /><title>Curricule · Prévia das telas</title><link rel="icon" href="/brand/curricule-symbol.svg" /><link rel="stylesheet" href="/screen-review/preview.css" /></head><body><ScreenReview /><script src="/screen-review/preview.js" defer /></body></html>);
const contract = `<!-- THESIS: Curricule's internal workspace connects source, facts, revision and final material. OWN-WORLD: approved logo, violet #5d4fd0, cool paper surfaces, one sans family, restrained HugeIcons. STORY: pick an objective, review the evidence, confirm context, edit the document. FIRST VIEWPORT: responsive task header and a useful workspace; sidebar becomes bottom navigation on mobile. FORM: extension of the approved Curricule identity, code-led approval prototype. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance -->`;
writeFileSync(`${target}/index.html`, "<!doctype html>\n" + markup.replace("<body>", "<body>" + contract));
for (const file of ["preview.css", "preview.js"]) copyFileSync(`design/screen-review/${file}`, `${target}/${file}`);
console.info("Preview: http://localhost:3000/screen-review/index.html — 17 screens, light/dark, no APIs.");
