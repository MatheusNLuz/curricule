import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { MODES } from "../analysis-contract";
import { HISTORY_PAGE_SIZE } from "../history-query";

export type HistorySummary = {
  id: string; mode: string; professionalTarget: string | null;
  selectedLanguage: string; applicationStatus: string;
  parentAnalysisId: string | null; jobUrl: string | null;
  createdAt: Date; updatedAt: Date;
  initialScores: string | null; finalScores: string | null;
  hasAnalysis: boolean; hasResume: boolean; hasLetter: boolean;
  taskStatus: string | null; taskLeaseUntil: Date | null;
};

/** List metadata only. Full CVs and AI payloads belong in the owned detail
 * reader, not in every row of a history page. All filters remain parameters. */
export function readHistory(userId: string, query: { q: string; mode: string; cursor: string }) {
  const search = query.q ? Prisma.sql`AND a."professionalTarget" ILIKE ${"%" + query.q + "%"}` : Prisma.empty;
  const mode = MODES.includes(query.mode as typeof MODES[number]) ? Prisma.sql`AND a.mode = ${query.mode}` : Prisma.empty;
  const cursor = query.cursor ? Prisma.sql`AND (a."createdAt", a.id) < (
    SELECT "createdAt", id FROM "Analysis" WHERE id = ${query.cursor} AND "userId" = ${userId}
  )` : Prisma.empty;
  return prisma.$queryRaw<HistorySummary[]>(Prisma.sql`
    SELECT a.id, a.mode, a."professionalTarget", a."selectedLanguage",
      a."applicationStatus", a."parentAnalysisId", a."jobUrl", a."createdAt", a."updatedAt",
      a."initialScores", a."finalScores",
      COALESCE(a."analysisJson" <> '', false) AS "hasAnalysis",
      COALESCE(a."finalResumeJson" <> '', false) AS "hasResume",
      COALESCE(a."coverLetter" <> '', false) AS "hasLetter",
      task.status AS "taskStatus", task."leaseUntil" AS "taskLeaseUntil"
    FROM "Analysis" a
    LEFT JOIN LATERAL (
      SELECT status, "leaseUntil" FROM "AnalysisTask" WHERE "analysisId" = a.id ORDER BY "updatedAt" DESC LIMIT 1
    ) task ON true
    WHERE a."userId" = ${userId} ${search} ${mode} ${cursor}
    ORDER BY a."createdAt" DESC, a.id DESC LIMIT ${HISTORY_PAGE_SIZE + 1}
  `);
}
