import { z, type ZodType } from "zod";
import { createHash } from "node:crypto";

export function schemaContract(schema: ZodType) {
  // Refinements still run on the server; JSON Schema describes the structure.
  return z.toJSONSchema(schema, { io: "output", unrepresentable: "any" });
}

export function schemaIdentifier(schema: ZodType) {
  return createHash("sha256").update(JSON.stringify(schemaContract(schema))).digest("hex").slice(0, 12);
}

export function knownSchemaPaths(schema: ZodType, enumOnly = false): Set<string> {
  const paths = new Set<string>(enumOnly ? [] : ["$"]);
  const contract = schemaContract(schema);
  function visit(node: unknown, path: string, depth: number) {
    if (!node || typeof node !== "object" || depth > 24) return;
    const value = node as Record<string, unknown>;
    if (enumOnly && (Array.isArray(value.enum) || Object.hasOwn(value, "const"))) paths.add(path);
    if (typeof value.$ref === "string" && value.$ref.startsWith("#/$defs/")) {
      visit(contract.$defs?.[value.$ref.slice(8)], path, depth + 1);
    }
    if (value.properties && typeof value.properties === "object") {
      for (const [key, child] of Object.entries(value.properties)) {
        const next = path === "$" ? key : `${path}.${key}`;
        if (!enumOnly) paths.add(next);
        visit(child, next, depth + 1);
      }
    }
    if (value.items) { if (!enumOnly) paths.add(`${path}[]`); visit(value.items, `${path}[]`, depth + 1); }
    for (const key of ["anyOf", "oneOf", "allOf"]) {
      if (Array.isArray(value[key])) for (const child of value[key]) visit(child, path, depth + 1);
    }
  }
  visit(contract, "$", 0);
  return paths;
}

export function safeFieldPath(path: readonly PropertyKey[], allowed: Set<string>): string | undefined {
  const field = path.map(part => typeof part === "number" ? "[]" : typeof part === "string" ? part : "?").join(".").replaceAll(".[]", "[]");
  return allowed.has(field || "$") ? field || "$" : undefined;
}
