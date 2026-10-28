"use client";
import { useCallback,useEffect,useState,useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { acquisitionSource } from "@/lib/acquisition-source";
const changed="curricule-consent-change";
function permitted(){try{return localStorage.getItem("curricule-measurement")==="yes";}catch{return false;}}
function subscribe(callback:()=>void){window.addEventListener(changed,callback);window.addEventListener("storage",callback);return()=>{window.removeEventListener(changed,callback);window.removeEventListener("storage",callback);};}
export function useMeasurementConsent(){return useSyncExternalStore(subscribe,permitted,()=>false);}
function event(name:string,value?:number){if(!permitted())return;void fetch("/api/telemetry",{method:"POST",headers:{"Content-Type":"application/json"},keepalive:true,body:JSON.stringify({consent:true,name,value,source:acquisitionSource(new URLSearchParams(location.search).get("utm_source")),device:innerWidth<768?"mobile":innerWidth<1100?"tablet":"desktop"})}).catch(()=>{});}
export function MeasurementReporter(){const enabled=useMeasurementConsent();const pathname=usePathname();const report=useCallback((metric:{name:string;value:number})=>{if(["LCP","INP","CLS","FCP","TTFB"].includes(metric.name))event(metric.name,metric.value);},[]);useReportWebVitals(report);useEffect(()=>{if(!enabled)return;const name=pathname==="/"?"PAGE_LANDING":pathname==="/register"?"PAGE_REGISTER":pathname.includes("/editor")?"PAGE_EDITOR":pathname.startsWith("/analysis")?"PAGE_ANALYSIS":pathname==="/dashboard"?"PAGE_WORKSPACE":null;if(name)event(name);},[enabled,pathname]);return null;}
export function MeasurementControl({signedIn=false}:{signedIn?:boolean}){
  const enabled=useMeasurementConsent();const [pending,setPending]=useState(false),[status,setStatus]=useState("");
  async function toggle(){const next=!enabled;setPending(true);setStatus("");
    try{
      if(!next){localStorage.setItem("curricule-measurement","no");window.dispatchEvent(new Event(changed));}
      if(signedIn){const response=await fetch("/api/account",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({analyticsConsent:next})});if(!response.ok)throw new Error("Não foi possível atualizar a preferência da conta.");}
      if(!next){const removed=await fetch("/api/telemetry",{method:"DELETE"});if(!removed.ok)throw new Error("A exclusão dos eventos ainda não foi confirmada.");}
      if(next){localStorage.setItem("curricule-measurement","yes");window.dispatchEvent(new Event(changed));}
      setStatus(next?"Medição opcional permitida. Nenhum texto de currículo ou formulário é enviado.":"Medição desativada. Eventos associados à sessão foram removidos.");
    }catch(error){setStatus((!next?"Medição local desativada. ":"")+(error instanceof Error?error.message:"Tente novamente."));}finally{setPending(false);}
  }
  return <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-3 px-5 py-5 text-center text-xs text-muted-foreground"><button className="min-h-11 rounded-lg border border-border px-4" disabled={pending} onClick={toggle}>{pending?"Atualizando…":enabled?"Desativar medição opcional":"Permitir medição opcional"}</button><span>{enabled?"Uso e desempenho, sem conteúdo dos seus materiais.":"Medição de navegação desativada por padrão."}</span>{status&&<p role="status" className="w-full">{status}</p>}</div>;
}
