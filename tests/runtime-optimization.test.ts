import test from "node:test";
import assert from "node:assert/strict";
import { WorkQueue } from "../lib/runtime/work-queue";
import { boundedSetting, databaseConnectionUrl } from "../lib/runtime/settings";
import { taskPollDelay } from "../lib/task-polling";
import { resumeDocumentHtml } from "../lib/resume/document-html";
import { resumeFixture } from "./fixtures/resume-fixture";
import { TEMPLATE_OPTIONS } from "../lib/preview-template";

function deferred() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }

test("document queue is FIFO, bounds pressure and releases capacity after failure",async()=>{
  const queue=new WorkQueue({concurrency:1,maximumWaiting:2,waitMs:1000});
  const gate=deferred(),order:number[]=[];let active=0,peak=0;
  const work=async(index:number)=>{active++;peak=Math.max(peak,active);order.push(index);try{if(index===1)await gate.promise;if(index===2)throw new Error("Controlled failure");return index;}finally{active--;}};
  const first=queue.run(()=>work(1)),second=queue.run(()=>work(2)),third=queue.run(()=>work(3));
  const secondRejected=assert.rejects(second,/Controlled failure/);
  await assert.rejects(queue.run(()=>work(4)),error=>(error as {code:string}).code==="PROCESSING_BUSY");
  gate.release();assert.equal(await first,1);await secondRejected;assert.equal(await third,3);assert.equal(await queue.run(()=>work(5)),5);
  assert.deepEqual(order,[1,2,3,5]);assert.equal(peak,1);
});

test("cancelled and expired queued work never runs or consumes the next slot",async()=>{
  const queue=new WorkQueue({concurrency:1,maximumWaiting:2,waitMs:15});
  const gate=deferred();const first=queue.run(()=>gate.promise);const controller=new AbortController();let calls=0;
  const cancelled=queue.run(async()=>{calls++;},controller.signal);const rejected=assert.rejects(cancelled,/cancelled/);
  controller.abort(new Error("cancelled"));await rejected;
  await assert.rejects(queue.run(async()=>{calls++;}),error=>(error as {status:number}).status===429);
  gate.release();await first;await queue.run(async()=>{calls++;});assert.equal(calls,1);
});

test("an aborted running task holds its slot until its actual cleanup finishes",async()=>{
  const queue=new WorkQueue({concurrency:1,maximumWaiting:1,waitMs:1000});const gate=deferred(),controller=new AbortController();let secondStarted=false;
  const first=queue.run(async()=>{await gate.promise;},controller.signal);await Promise.resolve();controller.abort();
  const second=queue.run(async()=>{secondStarted=true;});await Promise.resolve();assert.equal(secondStarted,false);gate.release();await first;await second;assert.equal(secondStarted,true);
});

test("database pool defaults remain bounded and preserve explicit connection settings",()=>{
  assert.equal(boundedSetting("NaN",3,20),3);assert.equal(boundedSetting("0",3,20),3);assert.equal(boundedSetting("90",3,20),20);
  const basic=new URL(databaseConnectionUrl("postgresql://user:secret@localhost/db?schema=review&sslmode=require")!);assert.ok(Number(basic.searchParams.get("connection_limit"))<=20);assert.equal(basic.searchParams.get("pool_timeout"),"10");assert.equal(basic.searchParams.get("schema"),"review");assert.equal(basic.searchParams.get("sslmode"),"require");
  const custom=new URL(databaseConnectionUrl("postgresql://localhost/db?connection_limit=2&pool_timeout=20")!);assert.equal(custom.searchParams.get("connection_limit"),"2");assert.equal(custom.searchParams.get("pool_timeout"),"20");assert.equal(databaseConnectionUrl(undefined),undefined);
});

test("idle progress does not poll and repeated failures pause bounded retries",()=>{
  assert.equal(taskPollDelay(false,0),null);assert.equal(taskPollDelay(true,0),3000);assert.equal(taskPollDelay(true,1),6000);assert.equal(taskPollDelay(true,4),48_000);assert.equal(taskPollDelay(true,5),null);
});

test("print-only HTML preserves every model and locale, escapes input and needs no scripts or assets",()=>{
  for(const language of ["pt-BR","pt-PT","en-US","en-GB"])for(const template of TEMPLATE_OPTIONS){const resume=resumeFixture(language);resume.personalInfo.name='<img src="https://evil.example/image" onerror="alert(1)">';resume.professionalSummary='</style><script>alert(1)</script> & resumo';const html=resumeDocumentHtml(resume,language,template.id);assert.ok(html.includes('lang="'+language+'"'));assert.ok(html.includes("&lt;script&gt;"));assert.ok(!html.includes("<script"));assert.ok(!html.includes("<img"));assert.ok(!html.includes("/_next/"));assert.ok(html.includes("default-src 'none'"));assert.ok(html.includes("doc-entry"));assert.ok(html.includes("ana.validacao@example.test"));}
});
