import test,{mock} from "node:test";
import assert from "node:assert/strict";
let total=2,calls:number[]=[],destroyed=0;
let texts:string[]=[];
mock.module("pdf-parse",{namedExports:{PDFParse:class {
  static setWorker(){}
  async getInfo(){return {total};}
  async getText({partial}:{partial:number[]}){calls.push(partial[0]);return {pages:[{text:texts[partial[0]-1]}]};}
  async destroy(){destroyed++;}
}}});
mock.module("pdf-parse/worker",{namedExports:{CanvasFactory:{},getData:()=>"worker"}});
const {extractResumePdf}=await import("../lib/resume/pdf-text");
test.beforeEach(()=>{total=2;calls=[];destroyed=0;texts=["Página um com informações profissionais confirmadas e contato.","Página dois com formação e competências confirmadas."];});
test("PDF extraction preserves every page in order and releases the worker",async()=>{assert.equal(await extractResumePdf(new Uint8Array()),texts.join("\n"));assert.deepEqual(calls,[1,2]);assert.equal(destroyed,1);});
test("PDF extraction rejects excessive pages before requesting text",async()=>{total=31;await assert.rejects(()=>extractResumePdf(new Uint8Array()),error=>(error as {status:number}).status===400);assert.deepEqual(calls,[]);assert.equal(destroyed,1);});
test("oversized text stops extraction immediately instead of retaining the remaining document",async()=>{total=10;texts=["x".repeat(60_001)];await assert.rejects(()=>extractResumePdf(new Uint8Array()),error=>(error as {status:number}).status===413);assert.deepEqual(calls,[1]);assert.equal(destroyed,1);});
