import { HttpError } from "../http-error";
import { MAX_TEXT } from "../analysis-contract";
import { MAX_PDF_PAGES } from "../upload-validation";

export async function extractResumePdf(bytes: Uint8Array, signal?: AbortSignal) {
  const [{ PDFParse }, { CanvasFactory, getData }] = await Promise.all([import("pdf-parse"), import("pdf-parse/worker")]);
  PDFParse.setWorker(getData());
  const parser = new PDFParse({ data: bytes, CanvasFactory });
  let destroyed:Promise<void>|undefined;
  const destroy=()=>destroyed??=parser.destroy();
  const abort=()=>{void destroy().catch(()=>{});};
  signal?.addEventListener("abort",abort,{once:true});
  try {
    signal?.throwIfAborted();
    const { total } = await parser.getInfo();
    if (total > MAX_PDF_PAGES) throw new HttpError(400, "O PDF pode ter até 30 páginas. Envie somente o currículo.");
    const pages: string[] = [];
    let length = 0;
    for (let number = 1; number <= total; number++) {
      signal?.throwIfAborted();
      const page = await parser.getText({ partial: [number], pageJoiner: "" });
      const text = page.pages.map(item => item.text).join("\n");
      length += text.length + 1;
      if (length > MAX_TEXT) throw new HttpError(413, "O currículo pode ter até 60 mil caracteres.");
      pages.push(text);
    }
    const text = pages.join("\n").trim();
    if (text.length < 50) throw new HttpError(422, "Não encontramos texto suficiente nesse PDF. Se ele for uma imagem, use a opção Colar texto.");
    return text;
  } finally { signal?.removeEventListener("abort",abort);await destroy(); }
}
