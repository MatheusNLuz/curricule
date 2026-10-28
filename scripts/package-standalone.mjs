import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { resolve, relative } from "node:path";

const root = resolve(".next/standalone");
if (!existsSync(resolve(root, "server.js"))) throw new Error("Execute npm run build antes de preparar o pacote.");
// Next traces .env into standalone. A deployable artifact must not carry the
// developer's database passwords or provider keys; inject them at runtime.
for (const entry of readdirSync(root, { withFileTypes: true })) {
  if (entry.isFile() && /^\.env(?:\.|$)/.test(entry.name)) {
    const target = resolve(root, entry.name);
    if (relative(root, target).startsWith("..")) throw new Error("Invalid artifact path");
    rmSync(target);
  }
}
cpSync("public", resolve(root, "public"), { recursive: true });
cpSync(".next/static", resolve(root, ".next/static"), { recursive: true });
console.info("Standalone preparado com recursos estáticos e sem arquivos .env. Configure os segredos no servidor.");
