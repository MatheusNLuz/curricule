import { HttpError } from "./http-error";
export function assertRequestOrigin(request:Request){const origin=request.headers.get("origin");if(!origin)return;let expected:string;try{expected=new URL(process.env.APP_URL||request.url).origin;}catch{throw new HttpError(503,"Configure o endereço público do aplicativo.");}if(origin!==expected)throw new HttpError(403,"Esta operação deve ser iniciada no próprio aplicativo.");}
export async function boundedJson(request:Request,maximumBytes=1024*1024){
  assertRequestOrigin(request);
  if(Number(request.headers.get("content-length")||0)>maximumBytes)throw new HttpError(413,"O conteúdo enviado excede o limite desta operação.");
  const reader=request.body?.getReader();if(!reader)throw new HttpError(400,"Envie os dados da operação.");const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>maximumBytes){await reader.cancel();throw new HttpError(413,"O conteúdo enviado excede o limite desta operação.");}chunks.push(value);}}finally{reader.releaseLock();}
  try{return JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{throw new HttpError(400,"Envie dados JSON válidos.");}
}
export async function boundedFormData(request: Request, maximumBytes: number, signal=request.signal) {
  assertRequestOrigin(request);
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Selecione um arquivo.");
  const chunks: Uint8Array[] = []; let size = 0;
  const abort=()=>{void reader.cancel(signal.reason).catch(()=>{});};
  signal.addEventListener("abort",abort,{once:true});
  try {
    signal.throwIfAborted();
    while (true) {
      const { value, done } = await reader.read();signal.throwIfAborted();if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) { await reader.cancel(); throw new HttpError(413, "Envie um PDF de até 10 MB."); }
      chunks.push(value);
    }
  } finally { signal.removeEventListener("abort",abort);reader.releaseLock(); }
  const bytes = Buffer.concat(chunks);
  return new Response(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
}
