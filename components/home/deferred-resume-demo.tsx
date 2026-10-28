"use client";
import dynamic from "next/dynamic";
import { useEffect,useRef,useState } from "react";
const Demo=dynamic(()=>import("./resume-demo").then(module=>module.ResumeDemo));
export function DeferredResumeDemo(){
  const container=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(false);
  useEffect(()=>{if(!("IntersectionObserver" in window)){const frame=requestAnimationFrame(()=>setVisible(true));return()=>cancelAnimationFrame(frame);}const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:"240px"});if(container.current)observer.observe(container.current);return()=>observer.disconnect();},[]);
  return <div ref={container} style={{minHeight:520}}>{visible?<Demo/>:<p role="status">O laboratório de escrita será carregado ao chegar nesta seção.</p>}<noscript>Ative JavaScript para experimentar a revisão interativa de um exemplo.</noscript></div>;
}
