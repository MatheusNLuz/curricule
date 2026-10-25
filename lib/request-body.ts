import { HttpError } from "./http-error";
export async function readRawBody(request: Request, maxBytes = 16_384) {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new HttpError(413, "Conteúdo excede o limite permitido."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export async function readJsonBody(request: Request) { return JSON.parse((await readRawBody(request)).toString("utf8")); }
