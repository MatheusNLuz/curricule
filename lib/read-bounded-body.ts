import { HttpError } from "./http-error";
export async function boundedFormData(request: Request, maximumBytes: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Selecione um arquivo.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) { await reader.cancel(); throw new HttpError(413, "Envie um PDF de até 10 MB."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new Response(new Uint8Array(Buffer.concat(chunks)), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
}
