export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_PAGES = 30;
export function pdfFileError(file: { size: number; name: string; type: string }) {
  if (!file.size || file.size > MAX_PDF_BYTES) return "Envie um PDF de até 10 MB.";
  if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) return "Envie um arquivo PDF válido.";
  return null;
}
export function hasPdfSignature(bytes: Uint8Array) {
  return new TextDecoder("ascii").decode(bytes.slice(0, 5)) === "%PDF-";
}
