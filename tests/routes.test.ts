import test, { mock } from "node:test";
import assert from "node:assert/strict";
import type { SessionUser } from "../lib/auth.ts";
let user: SessionUser | null = null;
let writes: Record<string, unknown>[] = [];
const original = { id: "analysis-a", userId: "owner", mode: "MAKE_ATS_FRIENDLY", revision: 0, parsedResumeText: "Resume", analysisJson: null, finalResumeJson: JSON.stringify({ personalInfo: { name: "Test" }, professionalSummary: "", experiences: [], education: [], skills: [], certifications: [] }), truthGuardJson: null, selectedTemplate: "basic-ats", selectedLanguage: "pt-BR" };
let row = { ...original };
type TaskState = { status: string; inputHash: string; token: string; leaseUntil: Date; resultJson: string | null };
let task: TaskState | null = null;
let used = 0;
const db = {
  $executeRaw: async () => 1,
  analysis: {
    findFirst: async ({ where }: { where: { id: string; userId: string } }) => where.id === row.id && where.userId === row.userId ? { ...row } : null,
    update: async ({ data }: { data: Record<string, unknown> }) => { writes.push(data); return { ...row, ...data }; },
    deleteMany: async ({ where }: { where: { id: string; userId: string } }) => ({ count: where.id === row.id && where.userId === row.userId ? 1 : 0 }),
  },
  analysisTask: {
    findFirst: async () => null,
    findUnique: async () => task ? { ...task } : null,
    upsert: async ({ create, update }: { create: TaskState; update: TaskState }) => { task = task ? { ...task, ...update } : create; return task; },
    updateMany: async ({ where, data }: { where: { token: string }; data: Partial<TaskState> }) => { if (task?.token === where.token) { task = { ...task, ...data }; return { count: 1 }; } return { count: 0 }; },
  },
  analysisUsage: { count: async () => used, create: async () => { used++; return {}; }, deleteMany: async () => ({ count: 0 }) },
  resumeRevision: { findFirst: async () => null, create: async () => ({}), findMany: async () => [] },
};
const prisma = { ...db, $transaction: async <T>(operation: (tx: typeof db) => Promise<T>): Promise<T> => operation(db) };
mock.module(new URL("../lib/db.ts", import.meta.url).href, { namedExports: { prisma } });
mock.module(new URL("../lib/auth.ts", import.meta.url).href, { namedExports: { getSessionUser: async () => user } });
mock.module("next/navigation.js", { namedExports: { redirect: () => { throw new Error("REDIRECT_LOGIN"); }, notFound: () => { throw new Error("NOT_FOUND"); } } });
mock.module(new URL("../components/preview/preview-template.tsx", import.meta.url).href, { namedExports: { PreviewTemplate: () => null } });
mock.module("puppeteer-core", { defaultExport: { launch: async () => { throw new Error("Browser must not launch in this test"); } } });
mock.module("@sparticuz/chromium", { defaultExport: {} });
mock.module("pdf-parse", { namedExports: { PDFParse: class { static setWorker() {} } } });
mock.module("pdf-parse/worker", { namedExports: { CanvasFactory: {}, getData: () => "" } });
const route = await import("../app/api/analysis/[id]/route.ts");
const upload = await import("../app/api/upload-resume/route.ts");
const exporting = await import("../app/api/export/route.ts");
const importing = await import("../app/api/import-source/route.ts");
const { default: preview } = await import("../app/analysis/[id]/preview/page.tsx");
const { runAnalysisTask, inputHash } = await import("../lib/analysis-task.ts");
const context = { params: Promise.resolve({ id: "analysis-a" }) };
const jsonRequest = (body: unknown) => new Request("https://app.example/api/analysis/analysis-a", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
test.beforeEach(() => { user = { userId: "owner", email: "owner@example.com" }; row = { ...original }; writes = []; task = null; used = 0; });

test("language policy discards legacy cache and separates selected locales", async () => {
  const input = ["same source", "pt-BR"];
  task = { status: "COMPLETED", inputHash: inputHash(input), token: "old", leaseUntil: new Date(), resultJson: JSON.stringify({ content: "Legacy mixed prose" }) };
  let calls = 0;
  const generate = async () => { calls++; return { content: "Verificado" }; };
  assert.deepEqual(await runAnalysisTask(row.id, "owner", "ANALYZE", input, generate), { content: "Verificado" });
  await runAnalysisTask(row.id, "owner", "ANALYZE", input, generate);
  assert.equal(calls, 1);
  await runAnalysisTask(row.id, "owner", "ANALYZE", ["same source", "en-GB"], generate);
  assert.equal(calls, 2);
});

test("GET and PATCH require a session and owner", async () => {
  user = null;
  assert.equal((await route.GET(new Request("https://app.example"), context)).status, 401);
  assert.equal((await route.PATCH(jsonRequest({ selectedTemplate: "modern-ats" }), context)).status, 401);
  user = { userId: "other", email: "other@example.com" };
  assert.equal((await route.GET(new Request("https://app.example"), context)).status, 404);
  assert.equal((await route.PATCH(jsonRequest({ selectedTemplate: "modern-ats" }), context)).status, 404);
  assert.equal(writes.length, 0);
});
test("PATCH refuses mass assignment but accepts a valid template change", async () => {
  for (const body of [{ userId: "other" }, { finalScores: "{}" }, { initialScores: "{}" }]) assert.equal((await route.PATCH(jsonRequest(body), context)).status, 400);
  assert.equal(writes.length, 0);
  assert.equal((await route.PATCH(jsonRequest({ selectedTemplate: "modern-ats" }), context)).status, 200);
  assert.equal(writes[0].selectedTemplate, "modern-ats");
});
test("PATCH prevents overwriting a newer resume revision", async () => {
  row.revision = 2;
  assert.equal((await route.PATCH(jsonRequest({ finalResumeJson: row.finalResumeJson, revision: 1 }), context)).status, 409);
  assert.equal(writes.length, 0);
});
test("export=true never bypasses session or owner in the real preview page", async () => {
  const props = { params: Promise.resolve({ id: row.id }), searchParams: Promise.resolve({ export: "true" }) };
  user = null; await assert.rejects(() => preview(props), /REDIRECT_LOGIN/);
  user = { userId: "other", email: "other@example.com" }; await assert.rejects(() => preview(props), /NOT_FOUND/);
  user = { userId: "owner", email: "owner@example.com" }; assert.ok(await preview(props));
});
test("export route checks session, ownership and trusted APP_URL before launching Chrome", async () => {
  user = null; assert.equal((await exporting.POST(jsonRequest({ analysisId: row.id }))).status, 401);
  user = { userId: "other", email: "other@example.com" }; assert.equal((await exporting.POST(jsonRequest({ analysisId: row.id }))).status, 404);
  const before = process.env.APP_URL; const mode = process.env.NODE_ENV;
  process.env.APP_URL = ""; Reflect.set(process.env, "NODE_ENV", "production");
  user = { userId: "owner", email: "owner@example.com" }; assert.equal((await exporting.POST(jsonRequest({ analysisId: row.id }))).status, 503);
  if (before === undefined) delete process.env.APP_URL; else process.env.APP_URL = before;
  if (mode === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Reflect.set(process.env, "NODE_ENV", mode);
});
test("upload and source import reject unauthenticated requests before parsing or networking", async () => {
  user = null;
  assert.equal((await upload.POST(new Request("https://app.example/upload", { method: "POST", body: "not multipart" }))).status, 401);
  assert.equal((await importing.POST(jsonRequest({ analysisId: row.id, kind: "job", url: "https://example.com" }))).status, 401);
});
test("upload refuses forged PDFs and excessive request bodies", async () => {
  const oversized = new Request("https://app.example/upload", { method: "POST", headers: { "Content-Length": String(11 * 1024 * 1024) } });
  assert.equal((await upload.POST(oversized)).status, 413);
  const form = new FormData(); form.append("analysisId", row.id); form.append("file", new File(["<html>not a PDF</html>"], "cv.pdf", { type: "application/pdf" }));
  assert.equal((await upload.POST(new Request("https://app.example/upload", { method: "POST", body: form }))).status, 400);
  assert.equal(writes.length, 0);
});
test("chunked uploads cannot bypass the total body size limit", async () => {
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(11 * 1024 * 1024)); controller.close(); } });
  const request = new Request("https://app.example/upload", { method: "POST", body, duplex: "half", headers: { "Content-Type": "multipart/form-data; boundary=test" } } as RequestInit);
  assert.equal((await upload.POST(request)).status, 413);
});
test("persistent task blocks simultaneous work and reuses a completed response", async () => {
  let release: (() => void) | undefined; let started: (() => void) | undefined;
  const running = new Promise<void>(resolve => { started = resolve; });
  let calls = 0;
  const first = runAnalysisTask(row.id, "owner", "ANALYZE", "same input", async () => { calls++; started?.(); await new Promise<void>(resolve => { release = resolve; }); return { success: true }; });
  await running;
  await assert.rejects(() => runAnalysisTask(row.id, "owner", "ANALYZE", "same input", async () => ({ success: false })), error => (error as { code?: string }).code === "TASK_RUNNING");
  release?.(); await first;
  assert.deepEqual(await runAnalysisTask(row.id, "owner", "ANALYZE", "same input", async () => { calls++; return { success: false }; }), { success: true });
  assert.equal(calls, 1); assert.equal(used, 1);
});
test("task quotas, ownership and failed-attempt recovery are enforced", async () => {
  await assert.rejects(() => runAnalysisTask(row.id, "other", "ANALYZE", "x", async () => null), error => (error as { status?: number }).status === 404);
  const limit = Number(process.env.ANALYSIS_DAILY_LIMIT) || 40; used = limit;
  await assert.rejects(() => runAnalysisTask(row.id, "owner", "ANALYZE", "x", async () => null), error => (error as { status?: number }).status === 429);
  used = 0;
  await assert.rejects(() => runAnalysisTask(row.id, "owner", "ANALYZE", "x", async () => { throw new Error("Provider failure"); }));
  assert.equal((task as TaskState | null)?.status, "FAILED");
  assert.deepEqual(await runAnalysisTask(row.id, "owner", "ANALYZE", "x", async () => ({ success: true })), { success: true }); assert.equal(used, 2);
});
