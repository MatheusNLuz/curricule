import { registerHooks } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import ts from "typescript";
const root = fileURLToPath(new URL("../", import.meta.url));
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.includes("/node_modules/")) return next(specifier, context);
    if (specifier === "next/image") return { url: "test:next-image", shortCircuit: true };
    if (specifier.startsWith("next/") && !path.extname(specifier) && existsSync(path.join(root, "node_modules", specifier + ".js"))) return next(specifier + ".js", context);
    let candidate;
    if (specifier.startsWith("@/")) candidate = path.join(root, specifier.slice(2));
    else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) candidate = fileURLToPath(new URL(specifier, context.parentURL));
    if (candidate) for (const suffix of ["", ".ts", ".tsx", ".js"]) {
      if (existsSync(candidate + suffix) && !path.extname(candidate + suffix)) continue;
      if (existsSync(candidate + suffix)) return next(pathToFileURL(candidate + suffix).href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    // Node exposes this CJS entry as a namespace; Next's bundler unwraps its default.
    if (url === "test:next-image") {
      const entry = pathToFileURL(path.join(root, "node_modules/next/image.js")).href;
      return { format: "module", source: `import imageModule from ${JSON.stringify(entry)}; export default imageModule.default; export const getImageProps = imageModule.getImageProps;`, shortCircuit: true };
    }
    if (/\.css(?:\?|$)/.test(url) && url.startsWith(pathToFileURL(root).href)) {
      return { format: "module", source: 'export default new Proxy({}, { get: (_target, name) => String(name) });', shortCircuit: true };
    }
    if (/\.tsx?(?:\?|$)/.test(url) && url.startsWith(pathToFileURL(root).href) && !url.includes("/node_modules/")) {
      return { format: "module", source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { fileName: fileURLToPath(url), compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, shortCircuit: true };
    }
    return next(url, context);
  },
});
