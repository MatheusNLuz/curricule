import { createHash, randomUUID } from "node:crypto";
import { prisma } from "./db";
import { HttpError } from "./http-error";
import { requireAnalysisAccess } from "./billing/service";
import { LANGUAGE_POLICY_VERSION } from "./ai/output-language";

export function inputHash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

export async function runAnalysisTask<T>(analysisId: string, userId: string, kind: string, input: unknown, run: () => Promise<T>): Promise<T> {
  const hash = inputHash([LANGUAGE_POLICY_VERSION, input]); const token = randomUUID();
  const cached = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${analysisId}))`;
    const analysis = await tx.analysis.findFirst({ where: { id: analysisId, userId }, select: { id: true } });
    if (!analysis) throw new HttpError(404, "Análise não encontrada.");
    const previous = await tx.analysisTask.findUnique({ where: { analysisId_kind: { analysisId, kind } } });
    if (previous?.status === "RUNNING" && previous.leaseUntil > new Date()) throw new HttpError(409, "Esta etapa já está sendo processada. Aguarde alguns segundos.", "TASK_RUNNING");
    if (previous?.status === "COMPLETED" && previous.inputHash === hash && previous.resultJson) return { value: JSON.parse(previous.resultJson) as T };
    await requireAnalysisAccess(tx, userId);
    const since = new Date(); since.setUTCHours(0, 0, 0, 0);
    await tx.analysisUsage.deleteMany({ where: { userId, createdAt: { lt: new Date(Date.now() - 30 * 86_400_000) } } });
    const used = await tx.analysisUsage.count({ where: { userId, createdAt: { gte: since } } });
    const limit = Math.max(1, Number(process.env.ANALYSIS_DAILY_LIMIT) || 40);
    if (used >= limit) throw new HttpError(429, "Você atingiu o limite diário de processamento. Tente novamente amanhã.");
    await tx.analysisUsage.create({ data: { analysisId, userId, kind } });
    const data = { userId, inputHash: hash, status: "RUNNING", token, leaseUntil: new Date(Date.now() + 240_000), resultJson: null };
    await tx.analysisTask.upsert({ where: { analysisId_kind: { analysisId, kind } }, create: { ...data, analysisId, kind }, update: data });
    return null;
  });
  if (cached) return cached.value;
  const started = Date.now();
  try {
    const result = await run();
    await prisma.analysisTask.updateMany({ where: { analysisId, kind, token }, data: { status: "COMPLETED", resultJson: JSON.stringify(result) } });
    console.info("Task completed", { kind, elapsedMs: Date.now() - started });
    return result;
  } catch (error) {
    await prisma.analysisTask.updateMany({ where: { analysisId, kind, token }, data: { status: "FAILED", resultJson: null } });
    throw error;
  }
}
