import test, { mock } from "node:test";
import assert from "node:assert/strict";
let databaseCalls=0, rateCalls=0, sessionCalls=0;
let session: {userId:string;email:string;name:string;role:string}|null=null;
const prisma=new Proxy({}, {get(){databaseCalls++;throw new Error("Unexpected database access");}});
mock.module(new URL("../lib/db.ts",import.meta.url).href,{namedExports:{prisma}});
mock.module(new URL("../lib/auth.ts",import.meta.url).href,{namedExports:{getSessionUser:async()=>{sessionCalls++;return session;},hashPassword:async()=>"unused",signToken:async()=>"unused",verifyPassword:async()=>false}});
mock.module(new URL("../lib/auth/server.ts",import.meta.url).href,{namedExports:{getNeonAuth:()=>null}});
mock.module(new URL("../lib/security-rate-limit.ts",import.meta.url).href,{namedExports:{consumeRateLimit:async()=>{rateCalls++;}}});
mock.module("next/headers.js",{namedExports:{cookies:async()=>({get:()=>undefined})}});
const login=await import("../app/api/auth/login/route");
const registration=await import("../app/api/auth/register/route");
const telemetry=await import("../app/api/telemetry/route");
const identity=await import("../app/api/auth/me/route");
test.beforeEach(()=>{databaseCalls=0;rateCalls=0;sessionCalls=0;session=null;});
test("malformed, invalid and oversized auth input is rejected before database-backed limits",async()=>{
  for(const route of [login,registration])for(const body of ['{','{}','x'.repeat(17*1024)]){
    const response=await route.POST(new Request("https://app.example/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body}));
    assert.ok([400,413].includes(response.status));
  }
  assert.equal(databaseCalls,0);assert.equal(rateCalls,0);
});
test("retired optional telemetry discards old client events without reading session or database",async()=>{
  for(let index=0;index<10;index++)assert.equal((await telemetry.POST()).status,204);
  assert.equal(databaseCalls,0);assert.equal(rateCalls,0);assert.equal(sessionCalls,0);
});
test("profile endpoint reuses the validated identity without a duplicate database read",async()=>{
  session={userId:"owner",email:"owner@example.test",name:"Pessoa",role:"ADMIN"};
  const response=await identity.GET();
  assert.deepEqual(await response.json(),{user:{id:"owner",email:"owner@example.test",name:"Pessoa",image:null}});
  assert.match(response.headers.get("Cache-Control")||"",/no-store/);
  assert.equal(databaseCalls,0);assert.equal(sessionCalls,1);
});
