import test,{mock} from "node:test";
import assert from "node:assert/strict";
type Bucket={key:string;count:number;expiresAt:Date};
const buckets=new Map<string,Bucket>();const invocations:Record<string,unknown>[]=[];
const tx={
  $executeRaw:async()=>1,
  securityRateLimit:{
    findUnique:async({where}:{where:{key:string}})=>buckets.get(where.key)||null,
    upsert:async({where,create,update}:{where:{key:string};create:Bucket;update:{count:number|{increment:number};expiresAt?:Date}})=>{const old=buckets.get(where.key);const value=old?{...old,count:typeof update.count==="number"?update.count:old.count+update.count.increment,...(update.expiresAt?{expiresAt:update.expiresAt}:{})}:create;buckets.set(where.key,value);return value;},
    updateMany:async({where,data}:{where:{key:string;expiresAt:Date;count:{gt:number}};data:{count:{decrement:number}}})=>{const old=buckets.get(where.key);if(!old||old.expiresAt.getTime()!==where.expiresAt.getTime()||old.count<=where.count.gt)return {count:0};old.count-=data.count.decrement;return {count:1};},
  },
  aiInvocation:{create:async({data}:{data:Record<string,unknown>})=>{invocations.push(data);return data;}},
};
mock.module(new URL("../lib/db.ts",import.meta.url).href,{namedExports:{prisma:{...tx,$transaction:async<T>(run:(value:typeof tx)=>Promise<T>)=>run(tx)}}});
const {consumeRateLimit,reserveCapacity}=await import("../lib/security-rate-limit");
const {ChatProvider}=await import("../lib/ai/chat-provider");
const {taskContext}=await import("../lib/task-context");
test.beforeEach(()=>{buckets.clear();invocations.length=0;process.env.JWT_SECRET="synthetic-control-secret-at-least-32-characters";});
test.afterEach(()=>mock.restoreAll());
test("authentication limits are atomic buckets and never store an email or address in their keys",async()=>{await consumeRateLimit("login","private@example.test",2);await consumeRateLimit("login","private@example.test",2);await assert.rejects(()=>consumeRateLimit("login","private@example.test",2),error=>(error as {status:number}).status===429);assert.equal(buckets.size,1);assert.match([...buckets.keys()][0],/^[a-f0-9]{64}$/);});
test("PDF capacity is released once and stale releases cannot decrement a fresh lease",async context=>{context.mock.timers.enable({apis:["Date"]});try{const releaseA=await reserveCapacity("pdf","a",2,1000);const releaseB=await reserveCapacity("pdf","a",2,1000);await assert.rejects(()=>reserveCapacity("pdf","a",2,1000));await releaseA();await releaseA();assert.equal([...buckets.values()][0].count,1);context.mock.timers.setTime(Date.now()+2000);const fresh=await reserveCapacity("pdf","a",2,1000);await releaseB();assert.equal([...buckets.values()][0].count,1);await fresh();assert.equal([...buckets.values()][0].count,0);}finally{context.mock.timers.reset();}});
test("provider telemetry records usage, latency and cost but never prompts or candidate content",async()=>{mock.method(globalThis,"fetch",async()=>Response.json({choices:[{message:{content:'{"ok":true}'}}],usage:{prompt_tokens:123,completion_tokens:45,cost:.012}}));const provider=new ChatProvider("fixture-provider","synthetic-key","fixture-model","https://provider.example.test");const value=await taskContext.run({analysisId:"a",userId:"u",kind:"ANALYZE",token:"test",signal:new AbortController().signal},()=>provider.generateJson({systemPrompt:"Private instructions",userPrompt:"Private candidate material"}));assert.deepEqual(value,{ok:true});assert.equal(invocations.length,1);assert.equal(invocations[0].inputTokens,123);assert.equal(invocations[0].outputTokens,45);assert.equal(invocations[0].costUsd,.012);assert.doesNotMatch(JSON.stringify(invocations),/Private|synthetic-key|candidate material/);});

test("truncated and invalid JSON responses retain their usage and failure code",async()=>{
  for(const [finishReason,content,code] of [["length",'{"ok":true}',"OUTPUT_TRUNCATED"],["stop","{","INVALID_JSON"]]){
    mock.method(globalThis,"fetch",async()=>Response.json({choices:[{finish_reason:finishReason,message:{content}}],usage:{prompt_tokens:12,completion_tokens:8,cost:.003}}));
    const provider=new ChatProvider("fixture-provider","synthetic-key","fixture-model","https://provider.example.test");
    await assert.rejects(taskContext.run({analysisId:"a",userId:"u",kind:"ANALYZE",token:"test",signal:new AbortController().signal},()=>provider.generateJson({systemPrompt:"Private",userPrompt:"Private"})),{message:code});
    assert.equal(invocations.at(-1)?.inputTokens,12);
    assert.equal(invocations.at(-1)?.outputTokens,8);
    assert.equal(invocations.at(-1)?.costUsd,.003);
    assert.equal(invocations.at(-1)?.status,"FAILED");
    assert.equal(invocations.at(-1)?.errorCode,code);
  }
});

test("slow telemetry is awaited and timed separately from provider transport",async context=>{
  context.mock.timers.enable({apis:["Date"]});
  let release:()=>void=()=>{};
  let persisted=false;
  const events:unknown[]=[];
  mock.method(console,"warn",(...args:unknown[])=>events.push(args));
  mock.method(globalThis,"fetch",async()=>Response.json({choices:[{finish_reason:"stop",message:{content:'{"ok":true}'}}]}));
  mock.method(tx.aiInvocation,"create",async({data}:{data:Record<string,unknown>})=>{await new Promise<void>(resolve=>{release=resolve;});invocations.push(data);persisted=true;return data;});
  const provider=new ChatProvider("fixture-provider","synthetic-key","fixture-model","https://provider.example.test");
  const completion=taskContext.run({analysisId:"a",userId:"u",kind:"ANALYZE",token:"test",signal:new AbortController().signal},()=>provider.generateJson({systemPrompt:"Private",userPrompt:"Private"}));
  try{
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(persisted,false);
    context.mock.timers.setTime(Date.now()+1500);
    release();
    assert.deepEqual(await completion,{ok:true});
    assert.equal(persisted,true);
    assert.equal(invocations[0].elapsedMs,0);
    assert.equal(invocations[0].status,"JSON_PARSED");
    assert.match(JSON.stringify(events),/AI telemetry persistence delayed/);
    assert.doesNotMatch(JSON.stringify(events),/Private/);
  }finally{release();context.mock.timers.reset();}
});
