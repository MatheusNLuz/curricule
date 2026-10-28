import test,{mock} from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
let configured=false;
mock.module(new URL("../lib/auth/server.ts",import.meta.url).href,{namedExports:{hasNeonAuthConfig:()=>configured,getNeonAuth:()=>({middleware:()=>async()=>new Response(null,{status:401})})}});
const {proxy}=await import("../proxy");
test("consented anonymous telemetry reaches validation with either authentication provider",async()=>{
  for(const enabled of [false,true]){configured=enabled;const result=await proxy(new NextRequest("http://localhost/api/telemetry",{method:"POST"}));assert.equal(result.headers.get("x-middleware-next"),"1");}
});
test("making telemetry public does not expose account or material APIs",async()=>{
  for(const enabled of [false,true]){configured=enabled;for(const path of ["/api/account/data","/api/analysis/private","/api/support"]){const response=await proxy(new NextRequest("http://localhost"+path));assert.equal(response.status,401);}}
});
