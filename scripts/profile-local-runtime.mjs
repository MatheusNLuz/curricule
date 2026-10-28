import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const connection=new URL(process.env.DATABASE_URL||'');
assert.equal(connection.hostname,'127.0.0.1');assert.equal(connection.port,'55432');assert.match(connection.searchParams.get('schema')||'',/^curricule_review_/);
const db=new PrismaClient(),base='http://localhost:3003';
try{
  const analysis=await db.analysis.findFirstOrThrow({where:{user:{email:'resume-b@example.test'},finalResumeJson:{not:null}},select:{id:true}});
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'resume-b@example.test',password:'Curricule-Teste-2026!'})});assert.equal(login.status,200);
  const Cookie=login.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
  let output='';let profiler;let profilerDone;
  if(process.platform==='win32'){
    let ready;
    const firstSample=new Promise(resolve=>{ready=resolve;});
    profiler=spawn('powershell.exe',['-NoProfile','-File','scripts/sample-process-memory.ps1'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
    profilerDone=new Promise((resolve,reject)=>{profiler.on('error',reject);profiler.on('exit',code=>code===0?resolve():reject(new Error('Process profiler failed')));});
    profiler.stdout.on('data',chunk=>{output+=chunk;if(output.includes('\n'))ready();});
    await Promise.race([firstSample,profilerDone]);
  }
  const started=performance.now();
  const responses=await Promise.all(Array.from({length:3},async()=>{
    const response=await fetch(base+'/api/export',{method:'POST',signal:AbortSignal.timeout(60_000),headers:{Cookie,'Content-Type':'application/json'},body:JSON.stringify({analysisId:analysis.id})});
    const bytes=new Uint8Array(await response.arrayBuffer());assert.equal(response.status,200);assert.equal(new TextDecoder().decode(bytes.subarray(0,5)),'%PDF-');
    return {elapsedMs:Math.round(performance.now()-started),bytes:bytes.length};
  }));
  if(profilerDone)await profilerDone;
  const samples=output.trim()?output.trim().split(/\r?\n/).map(line=>JSON.parse(line)):[];
  const observedBrowser=samples.some(item=>item.browserProcesses>0);
  const report={environment:'Local production standalone, Node heap 256 MB. Windows working-set sums are not Linux physical RAM measurements.',analysisId:analysis.id,concurrentRequests:3,responses,peakNodeMiB:samples.length?Math.round(Math.max(...samples.map(item=>item.nodeBytes))/1048576):null,peakBrowserWorkingSetMiB:observedBrowser?Math.round(Math.max(...samples.map(item=>item.browserBytes))/1048576):null,measurementLimitations:observedBrowser?'Sampling may miss short peaks; does not include PostgreSQL or the OS.':'Browser child processes were not observed. No total RAM bound can be claimed.',samples};
  writeFileSync('scratch/optimization/runtime-pressure.json',JSON.stringify(report,null,2));console.info(JSON.stringify({...report,samples:samples.length}));
}finally{await db.$disconnect();}
