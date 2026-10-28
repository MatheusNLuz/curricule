import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { prisma } from "../lib/db";
import { readHistory } from "../lib/analyses/history-reader";
const connection=new URL(process.env.DATABASE_URL||"");assert.equal(connection.hostname,"127.0.0.1");assert.equal(connection.port,"55432");assert.match(connection.searchParams.get("schema")||"",/^curricule_review_/);
const query={q:"",mode:"",cursor:""};
try{
  const user=await prisma.user.findUniqueOrThrow({where:{email:"resume-a@example.test"}});
  const first=await readHistory(user.id,query);
  assert.ok(first.length>1);
  const originals=await prisma.analysis.findMany({where:{id:{in:first.map(item=>item.id)},userId:user.id},select:{id:true,analysisJson:true,finalResumeJson:true,coverLetter:true}});
  assert.equal(first.length,originals.length);
  for(const summary of first){const source=originals.find(item=>item.id===summary.id)!;assert.equal(summary.hasAnalysis,!!source.analysisJson);assert.equal(summary.hasResume,!!source.finalResumeJson);assert.equal(summary.hasLetter,!!source.coverLetter);assert.ok(!("finalResumeJson" in summary));assert.ok(!("analysisJson" in summary));}
  const second=await readHistory(user.id,{...query,cursor:first.at(-1)!.id});assert.ok(second.every(item=>!first.some(previous=>previous.id===item.id)));
  const foreign=await prisma.analysis.findFirstOrThrow({where:{userId:{not:user.id}}});assert.deepEqual(await readHistory(user.id,{...query,cursor:foreign.id}),[]);
  assert.deepEqual(await readHistory(user.id,{...query,q:"%' OR 1=1; --"}),[]);
  const plan=await prisma.$queryRaw`EXPLAIN (FORMAT JSON) SELECT id FROM "Analysis" WHERE "userId"=${user.id} ORDER BY "updatedAt" DESC,id DESC LIMIT 3`;
  const report={status:"passed",rows:first.length,summaryBytes:Buffer.byteLength(JSON.stringify(first)),previousLargeFieldsBytes:Buffer.byteLength(JSON.stringify(originals)),paginationAndOwnerIsolation:true,sqlInjectionRefused:true,dashboardPlan:plan};
  writeFileSync("scratch/optimization/history-query.json",JSON.stringify(report,null,2));console.info(JSON.stringify({...report,dashboardPlan:"Saved in report"}));
}finally{await prisma.$disconnect();}
