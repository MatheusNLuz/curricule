"use client";
import { useState } from "react";
import { readApiError } from "@/lib/api-client";
import { Loader2 } from "@/components/ui/app-icon";
export function DownloadDocumentButton({analysisId,format="docx"}:{analysisId:string;format?:"pdf"|"docx"}){
  const [pending,setPending]=useState(false),[error,setError]=useState("");
  async function download(){setPending(true);setError("");try{
    const response=await fetch("/api/export",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({analysisId,format})});
    if(!response.ok)throw new Error(await readApiError(response,"Não foi possível exportar o documento."));
    const url=URL.createObjectURL(await response.blob());const link=document.createElement("a");link.href=url;link.download=`Curricule_Resume_${analysisId}.${format}`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(failure){setError(failure instanceof Error?failure.message:"Tente novamente.");}finally{setPending(false);}}
  return <div><button className="button secondary" disabled={pending} onClick={download}>{pending?<><Loader2 size={16}/>Preparando arquivo…</>:`Baixar ${format.toUpperCase()}`}</button>{error&&<p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}</div>;
}
