/** Rebuild the downloadable SVG brand assets from the same component used on the site. */
import { mkdirSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CurriculeLogo, CurriculeMark } from "../components/brand/curricule-logo.tsx";

mkdirSync("public/brand", { recursive: true });
const logo = (color: string) => renderToStaticMarkup(createElement(CurriculeLogo, { style: { color } }));
const mark = renderToStaticMarkup(createElement(CurriculeMark, { role: "img", "aria-label": "Curricule", "aria-hidden": undefined }));
writeFileSync("public/brand/curricule-logo.svg", logo("#282238"));
writeFileSync("public/brand/curricule-logo-light.svg", logo("#F3F3FB"));
writeFileSync("public/brand/curricule-symbol.svg", mark);
writeFileSync("app/icon.svg", mark);
console.log("Curricule SVG assets and favicon updated.");
