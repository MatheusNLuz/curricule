import type { Prisma } from "@prisma/client";
export async function recordRevision(tx: Prisma.TransactionClient, analysisId: string, content: string | null, source: string) {
  if (!content) return;
  const latest = await tx.resumeRevision.findFirst({ where: { analysisId }, orderBy: { createdAt: "desc" } });
  if (latest?.content === content) return;
  await tx.resumeRevision.create({ data: { analysisId, content, source } });
  const excess = await tx.resumeRevision.findMany({ where: { analysisId }, orderBy: { createdAt: "desc" }, skip: 20, select: { id: true } });
  if (excess.length) await tx.resumeRevision.deleteMany({ where: { id: { in: excess.map(item => item.id) } } });
}
