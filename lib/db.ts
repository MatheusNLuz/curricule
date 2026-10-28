import { PrismaClient } from "@prisma/client";
import { databaseConnectionUrl } from "./runtime/settings";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [],
    ...(process.env.DATABASE_URL ? { datasources: { db: { url: databaseConnectionUrl(process.env.DATABASE_URL) } } } : {}),
  });

globalForPrisma.prisma = prisma;
